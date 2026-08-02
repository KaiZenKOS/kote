// ---------------------------------------------------------------------------
// Journal d'usage, envoye par lots.
//
// Le client accumule les evenements localement et les envoie groupes. Un appel
// reseau par vue de fiche couterait de la donnee a l'utilisateur pour un besoin
// qui n'est pas le sien (CDC 2.4, 8). Le lot fonctionne aussi apres une periode
// hors ligne, ce qui est un cas nominal et non un cas d'erreur (CDC 2.2).
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
  texteBorne,
} from "../_partage/http.ts";

const TYPES_ADMIS = new Set(["recherche", "vue_fiche", "clic_itineraire"]);
// `clic_whatsapp` est volontairement absent : il n'est ecrit que par la
// fonction `contact`, qui seule constate la mise en relation reelle.

const LOT_MAX = 50;
const PLAFOND_HORAIRE = 30;

interface EvenementEntrant {
  type?: string;
  marchand_id?: string;
  categorie_slug?: string;
  requete?: string;
  latitude?: number;
  longitude?: number;
}

interface Demande {
  appareil_hash?: string;
  evenements?: EvenementEntrant[];
}

Deno.serve(async (requete) => {
  const reponsePrevol = prevol(requete);
  if (reponsePrevol) return reponsePrevol;

  if (requete.method !== "POST") return erreur("Methode non autorisee", 405);

  const corps = await corpsJson<Demande>(requete);
  if (!corps) return erreur("Corps JSON invalide", 400);
  if (!estEmpreinte(corps.appareil_hash)) return erreur("appareil_hash invalide", 400);
  if (!Array.isArray(corps.evenements) || corps.evenements.length === 0) {
    return erreur("evenements manquants", 400);
  }
  if (corps.evenements.length > LOT_MAX) {
    return erreur(`Lot limite a ${LOT_MAX} evenements`, 413);
  }

  const client = clientService();

  const autorise = await consommerQuota(
    client,
    `evenement:${corps.appareil_hash}`,
    PLAFOND_HORAIRE,
  );
  if (!autorise) return erreur("Trop de demandes, reessayez plus tard", 429, "quota");

  const lignes = corps.evenements
    .filter((e) => typeof e.type === "string" && TYPES_ADMIS.has(e.type))
    .map((e) => {
      const position = positionApprochee(e.latitude, e.longitude);
      return {
        type: e.type,
        marchand_id: estUuid(e.marchand_id) ? e.marchand_id : null,
        categorie_slug: texteBorne(e.categorie_slug, 40),
        // La requete de recherche est conservee pour mesurer les recherches
        // infructueuses, qui signalent un manque de densite (CDC 12).
        requete: texteBorne(e.requete, 120),
        appareil_hash: corps.appareil_hash,
        localisation_approx: position
          ? `SRID=4326;POINT(${position.lng} ${position.lat})`
          : null,
      };
    });

  if (lignes.length === 0) return json({ enregistres: 0 });

  const { error } = await client.from("evenement_usage").insert(lignes);
  if (error) {
    console.error("insertion evenements", error.message);
    return erreur("Service indisponible", 503);
  }

  return json({ enregistres: lignes.length });
});
