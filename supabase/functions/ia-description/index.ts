// ---------------------------------------------------------------------------
// Assistance a la redaction de la description de fiche.
//
// Le marchand saisit trois mots-cles, l'assistant propose trois formulations.
// Il choisit, il ne redige pas : la cible est une utilisatrice peu a l'aise
// avec l'ecrit (CDC 2.4).
//
// Trois garde-fous economiques, imposes par le contexte (CDC 7.1 : le revenu
// attendu par marchand se compte en centaines de FCFA par mois) :
//   1. cache par (categorie, mots-cles) -- les memes mots reviennent souvent ;
//   2. quota journalier par fiche ;
//   3. modele economique par requete, choisi explicitement.
//
// Garde-fou editorial : le modele ne doit inventer ni prix, ni delai, ni
// qualification professionnelle. Une description qui promet ce que le marchand
// ne tient pas detruit la confiance du client envers toute la plateforme.
// ---------------------------------------------------------------------------

import { clientService, clientUtilisateur } from "../_partage/client.ts";
import { corpsJson, erreur, estUuid, json, prevol, texteBorne } from "../_partage/http.ts";

const CLE_ANTHROPIC = Deno.env.get("ANTHROPIC_API_KEY");
// Modele choisi pour son cout par requete, pas pour sa puissance : la tache est
// une reformulation courte et cadree.
const MODELE = Deno.env.get("MODELE_IA") ?? "claude-haiku-4-5-20251001";

interface Demande {
  marchand_id?: string;
  mots_cles?: string[];
}

function normaliserMots(mots: unknown): string[] | null {
  if (!Array.isArray(mots)) return null;
  const propres = mots
    .map((m) => texteBorne(m, 40))
    .filter((m): m is string => m !== null)
    .map((m) => m.toLocaleLowerCase("fr"))
    .slice(0, 5);
  return propres.length >= 1 ? propres : null;
}

async function empreinte(categorie: string, mots: string[]): Promise<string> {
  const source = `${categorie}|${[...mots].sort().join(",")}`;
  const octets = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  return Array.from(new Uint8Array(octets))
    .map((o) => o.toString(16).padStart(2, "0"))
    .join("");
}

const CONSIGNE = `Tu rediges des descriptions courtes de commerces et d'artisans au Togo, destinees a des clients de quartier.

Regles imperatives :
- Trois propositions distinctes, en francais simple, 140 a 240 caracteres chacune.
- N'invente jamais un prix, un delai, une garantie, un diplome ni une annee d'experience.
- N'utilise que les informations fournies. Si elles sont maigres, reste general.
- Ton direct et concret, pas de superlatif publicitaire.
- Aucun emoji, aucun caractere decoratif, aucune majuscule d'insistance.
- Reponds uniquement par un objet JSON de la forme {"propositions":["...","...","..."]}.`;

async function genererPropositions(
  categorie: string,
  mots: string[],
): Promise<{ propositions: string[]; entree: number; sortie: number }> {
  const reponse = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": CLE_ANTHROPIC!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODELE,
      max_tokens: 700,
      system: CONSIGNE,
      messages: [{
        role: "user",
        content: `Categorie : ${categorie}\nMots-cles du marchand : ${mots.join(", ")}`,
      }],
    }),
  });

  if (!reponse.ok) {
    throw new Error(`Fournisseur IA : ${reponse.status} ${await reponse.text()}`);
  }

  const donnees = await reponse.json();
  const texte: string = donnees?.content?.[0]?.text ?? "";
  const extrait = texte.match(/\{[\s\S]*\}/);
  if (!extrait) throw new Error("Reponse IA non exploitable");

  const analyse = JSON.parse(extrait[0]);
  const propositions: string[] = Array.isArray(analyse?.propositions)
    ? analyse.propositions
      .filter((p: unknown): p is string => typeof p === "string")
      .map((p: string) => p.trim().slice(0, 600))
      .slice(0, 3)
    : [];

  if (propositions.length === 0) throw new Error("Aucune proposition exploitable");

  return {
    propositions,
    entree: donnees?.usage?.input_tokens ?? 0,
    sortie: donnees?.usage?.output_tokens ?? 0,
  };
}

Deno.serve(async (requete) => {
  const reponsePrevol = prevol(requete);
  if (reponsePrevol) return reponsePrevol;

  if (requete.method !== "POST") return erreur("Methode non autorisee", 405);

  const entete = requete.headers.get("Authorization");
  if (!entete) return erreur("Authentification requise", 401);

  const corps = await corpsJson<Demande>(requete);
  if (!corps) return erreur("Corps JSON invalide", 400);
  if (!estUuid(corps.marchand_id)) return erreur("marchand_id invalide", 400);

  const mots = normaliserMots(corps.mots_cles);
  if (!mots) return erreur("mots_cles invalides", 400);

  // Verification de propriete par RLS : si l'appelant ne peut pas lire la
  // fiche, il ne peut pas la faire rediger.
  const utilisateur = clientUtilisateur(entete);
  const { data: fiche, error: erreurFiche } = await utilisateur
    .from("marchand")
    .select("id, categorie_slug")
    .eq("id", corps.marchand_id)
    .maybeSingle();

  if (erreurFiche) {
    console.error("lecture fiche", erreurFiche.message);
    return erreur("Service indisponible", 503);
  }
  if (!fiche) return erreur("Fiche introuvable ou acces refuse", 403);

  const service = clientService();
  const cle = await empreinte(fiche.categorie_slug, mots);

  // 1. Cache. Une generation payee une fois sert a plusieurs fiches.
  const { data: enCache } = await service
    .from("cache_ia")
    .select("propositions, reutilisations")
    .eq("empreinte", cle)
    .maybeSingle();

  if (enCache) {
    await service
      .from("cache_ia")
      .update({ reutilisations: (enCache.reutilisations ?? 0) + 1 })
      .eq("empreinte", cle);

    await service.from("generation_ia").insert({
      marchand_id: fiche.id,
      depuis_cache: true,
    });

    return json({ propositions: enCache.propositions, depuis_cache: true });
  }

  // 2. Quota journalier, uniquement pour les generations reellement payantes.
  const { data: restant, error: erreurQuota } = await service.rpc("quota_ia_restant", {
    p_marchand_id: fiche.id,
  });

  if (erreurQuota) {
    console.error("quota ia", erreurQuota.message);
    return erreur("Service indisponible", 503);
  }
  if ((restant ?? 0) <= 0) {
    return erreur("Quota de generations atteint pour aujourd'hui", 429, "quota_ia");
  }

  if (!CLE_ANTHROPIC) {
    return erreur("Assistance a la redaction indisponible", 503, "ia_non_configuree");
  }

  // 3. Generation, avec repli explicite : le marchand doit pouvoir publier sa
  // fiche meme si le fournisseur est injoignable.
  try {
    const resultat = await genererPropositions(fiche.categorie_slug, mots);

    await service.from("cache_ia").insert({
      empreinte: cle,
      categorie_slug: fiche.categorie_slug,
      mots_cles: mots,
      propositions: resultat.propositions,
    });

    await service.from("generation_ia").insert({
      marchand_id: fiche.id,
      depuis_cache: false,
      jetons_entree: resultat.entree,
      jetons_sortie: resultat.sortie,
    });

    return json({
      propositions: resultat.propositions,
      depuis_cache: false,
      quota_restant: (restant ?? 1) - 1,
    });
  } catch (e) {
    console.error("generation ia", e instanceof Error ? e.message : String(e));
    return erreur(
      "L'assistance a la redaction est momentanement indisponible",
      503,
      "ia_indisponible",
    );
  }
});
