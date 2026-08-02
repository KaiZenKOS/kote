// ---------------------------------------------------------------------------
// Tache d'entretien quotidienne.
//
// Fait tourner la boucle de fraicheur (CDC 6), evalue les commissions arrivees
// a echeance (CDC 7.3), purge les compteurs de limitation, et renvoie la liste
// des fiches a relancer.
//
// L'envoi effectif des relances WhatsApp n'est pas implemente ici : le canal
// reste a arbitrer (CDC 14, decision 3). La fonction produit la liste et les
// jetons a usage unique ; le connecteur d'envoi viendra s'y brancher.
//
// Protection : cette fonction n'est pas destinee au public. Elle exige un
// secret partage, et doit etre deployee avec --no-verify-jwt puisqu'elle est
// appelee par un planificateur et non par un utilisateur.
// ---------------------------------------------------------------------------

import { clientService } from "../_partage/client.ts";
import { erreur, json, prevol } from "../_partage/http.ts";

const CLE_ENTRETIEN = Deno.env.get("CLE_ENTRETIEN");

Deno.serve(async (requete) => {
  const reponsePrevol = prevol(requete);
  if (reponsePrevol) return reponsePrevol;

  if (!CLE_ENTRETIEN) return erreur("Tache d'entretien non configuree", 503);
  if (requete.headers.get("x-cle-entretien") !== CLE_ENTRETIEN) {
    return erreur("Acces refuse", 403);
  }

  const client = clientService();
  const rapport: Record<string, unknown> = {};

  const { data: transitions, error: erreurTransitions } = await client.rpc(
    "appliquer_transitions_fraicheur",
  );
  if (erreurTransitions) {
    console.error("transitions fraicheur", erreurTransitions.message);
    return erreur("Echec des transitions de fraicheur", 500);
  }
  rapport.fraicheur = Array.isArray(transitions) ? transitions[0] : transitions;

  const { data: commissions, error: erreurCommissions } = await client.rpc(
    "evaluer_commissions_j30",
  );
  if (erreurCommissions) console.error("commissions j30", erreurCommissions.message);
  rapport.commissions_evaluees = commissions ?? null;

  const { data: purgees, error: erreurPurge } = await client.rpc("purger_limitations");
  if (erreurPurge) console.error("purge limitations", erreurPurge.message);
  rapport.limitations_purgees = purgees ?? null;

  const { data: relances, error: erreurRelances } = await client.rpc("fiches_a_relancer", {
    p_limite: 200,
  });
  if (erreurRelances) {
    console.error("fiches a relancer", erreurRelances.message);
    rapport.relances = null;
  } else {
    // On ne renvoie ni les numeros ni les jetons dans le rapport : ils partiront
    // directement vers le connecteur d'envoi quand il existera. Ici, seul le
    // volume est expose.
    rapport.relances_a_envoyer = Array.isArray(relances) ? relances.length : 0;
  }

  return json({ execute_le: new Date().toISOString(), ...rapport });
});
