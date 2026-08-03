/**
 * Actions passant par les fonctions edge.
 *
 * Elles ne sont pas de simples ecritures : chacune applique un quota, une
 * journalisation ou une deduplication cote serveur. Le client ne fait que
 * transmettre.
 */

import { appelerFonction } from "./client";
import { empreinteAppareil } from "./../appareil";
import type { MotifSignalement, Position, ReponseContact } from "./types";

/**
 * Mise en relation WhatsApp.
 *
 * Le numero n'existe nulle part dans l'application : il est assemble par le
 * serveur, dans un lien, apres journalisation. C'est ce qui empeche
 * l'extraction en masse de la base de numeros -- le risque qui detruirait la
 * confiance des marchands, donc le produit.
 */
export async function demanderContact(
  marchandId: string,
  position?: Position | null,
): Promise<ReponseContact> {
  return appelerFonction<ReponseContact>("contact", {
    marchand_id: marchandId,
    appareil_hash: await empreinteAppareil(),
    latitude: position?.latitude,
    longitude: position?.longitude,
  });
}

export interface ResultatSignalement {
  enregistre: boolean;
  deja_signale: boolean;
}

export async function signaler(
  marchandId: string,
  motif: MotifSignalement,
  commentaire?: string,
): Promise<ResultatSignalement> {
  return appelerFonction<ResultatSignalement>("signalement", {
    marchand_id: marchandId,
    motif,
    appareil_hash: await empreinteAppareil(),
    commentaire: commentaire?.trim() || undefined,
  });
}
