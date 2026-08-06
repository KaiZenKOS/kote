// ---------------------------------------------------------------------------
// Mise en relation WhatsApp.
//
// C'est le point d'entree le plus important du produit : le nombre de contacts
// WhatsApp par marchand actif et par semaine est l'indicateur central du projet
// (CDC 12). C'est la seule preuve que la plateforme cree de la valeur pour le
// marchand, et la condition de la seconde part de commission de l'ambassadeur.
//
// Le numero n'est jamais renvoye au client sous forme brute exploitable en
// masse : il ne sort qu'a l'unite, dans un lien, apres journalisation et
// verification de quota.
// ---------------------------------------------------------------------------

import { clientService } from "../_partage/client.ts";
import { consommerQuota } from "../_partage/quota.ts";
import {
  corpsJson,
  erreur,
  estEmpreinte,
  estUuid,
  json,
  positionApprochee,
  prevol,
} from "../_partage/http.ts";

const NOM_APPLICATION = Deno.env.get("NOM_APPLICATION") ?? "l'application";
const PLAFOND_HORAIRE = 40;

interface Demande {
  marchand_id?: string;
  appareil_hash?: string;
  latitude?: number;
  longitude?: number;
}

Deno.serve(async (requete) => {
  const reponsePrevol = prevol(requete);
  if (reponsePrevol) return reponsePrevol;

  if (requete.method !== "POST") return erreur("Methode non autorisee", 405);

  const corps = await corpsJson<Demande>(requete);
  if (!corps) return erreur("Corps JSON invalide", 400);

  if (!estUuid(corps.marchand_id)) return erreur("marchand_id invalide", 400);
  if (!estEmpreinte(corps.appareil_hash)) return erreur("appareil_hash invalide", 400);

  const client = clientService();
  const autorisation = requete.headers.get("Authorization");
  const jeton = autorisation?.startsWith("Bearer ") ? autorisation.slice(7) : null;
  if (!jeton) return erreur("Profil requis pour contacter un commerce", 401, "auth");
  const { data: auth, error: erreurAuth } = await client.auth.getUser(jeton);
  if (erreurAuth || !auth.user) return erreur("Profil requis pour contacter un commerce", 401, "auth");

  const autorise = await consommerQuota(
    client,
    `contact:${auth.user.id}:${corps.appareil_hash}`,
    PLAFOND_HORAIRE,
  );
  if (!autorise) return erreur("Trop de demandes, reessayez plus tard", 429, "quota");

  // On relit la fiche en role de service pour acceder au numero, mais on
  // refuse explicitement toute fiche qui n'est pas visible publiquement.
  const { data: fiche, error } = await client
    .from("marchand")
    .select("id, nom_enseigne, telephone_whatsapp, statut")
    .eq("id", corps.marchand_id)
    .in("statut", ["active", "a_confirmer"])
    .maybeSingle();

  if (error) {
    console.error("lecture marchand", error.message);
    return erreur("Service indisponible", 503);
  }
  if (!fiche) return erreur("Fiche introuvable", 404);

  const position = positionApprochee(corps.latitude, corps.longitude);

  const { error: erreurJournal } = await client.from("evenement_usage").insert({
    type: "clic_whatsapp",
    marchand_id: fiche.id,
    appareil_hash: corps.appareil_hash,
    localisation_approx: position
      ? `SRID=4326;POINT(${position.lng} ${position.lat})`
      : null,
  });

  // La journalisation ne doit jamais empecher la mise en relation : le client a
  // un besoin immediat, la statistique peut attendre.
  if (erreurJournal) console.error("journal contact", erreurJournal.message);

  const numero = fiche.telephone_whatsapp.replace(/^\+/, "");
  // Phrase la plus lue du produit : c'est par elle que chaque marchand
  // decouvre la plateforme. Elle est courte, polie et accentuee correctement.
  const message =
    `Bonjour, je vous ai trouvé sur ${NOM_APPLICATION}. ` +
    `Êtes-vous disponible ?`;

  return json({
    nom_enseigne: fiche.nom_enseigne,
    lien: `https://wa.me/${numero}?text=${encodeURIComponent(message)}`,
  });
});
