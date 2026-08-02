// ---------------------------------------------------------------------------
// Signalement client : "ferme", "a demenage", "informations fausses".
//
// Deuxieme source de nettoyage de la base apres la confirmation par le marchand
// (CDC 6). Le client qui se deplace pour rien est le premier a savoir qu'une
// fiche est morte : c'est la source la plus rapide, a condition qu'elle tienne
// en un geste.
// ---------------------------------------------------------------------------

import { clientService } from "../_partage/client.ts";
import { consommerQuota } from "../_partage/quota.ts";
import {
  corpsJson,
  erreur,
  estEmpreinte,
  estUuid,
  json,
  prevol,
  texteBorne,
} from "../_partage/http.ts";

const MOTIFS_ADMIS = new Set(["ferme", "demenage", "infos_fausses", "abus"]);
const PLAFOND_JOURNALIER = 10;

interface Demande {
  marchand_id?: string;
  motif?: string;
  appareil_hash?: string;
  commentaire?: string;
}

Deno.serve(async (requete) => {
  const reponsePrevol = prevol(requete);
  if (reponsePrevol) return reponsePrevol;

  if (requete.method !== "POST") return erreur("Methode non autorisee", 405);

  const corps = await corpsJson<Demande>(requete);
  if (!corps) return erreur("Corps JSON invalide", 400);
  if (!estUuid(corps.marchand_id)) return erreur("marchand_id invalide", 400);
  if (!corps.motif || !MOTIFS_ADMIS.has(corps.motif)) return erreur("motif invalide", 400);
  if (!estEmpreinte(corps.appareil_hash)) return erreur("appareil_hash invalide", 400);

  const client = clientService();

  const autorise = await consommerQuota(
    client,
    `signalement:${corps.appareil_hash}`,
    PLAFOND_JOURNALIER,
    24 * 60,
  );
  if (!autorise) return erreur("Trop de signalements, reessayez demain", 429, "quota");

  const { error } = await client.from("signalement").insert({
    marchand_id: corps.marchand_id,
    motif: corps.motif,
    appareil_hash: corps.appareil_hash,
    commentaire: texteBorne(corps.commentaire, 300),
  });

  if (error) {
    // 23505 : le meme appareil a deja signale cette fiche pour ce motif. Ce
    // n'est pas une erreur du point de vue de l'utilisateur, son signalement
    // est deja pris en compte.
    if (error.code === "23505") return json({ enregistre: true, deja_signale: true });
    // 23503 : fiche inexistante.
    if (error.code === "23503") return erreur("Fiche introuvable", 404);

    console.error("insertion signalement", error.message);
    return erreur("Service indisponible", 503);
  }

  return json({ enregistre: true, deja_signale: false });
});
