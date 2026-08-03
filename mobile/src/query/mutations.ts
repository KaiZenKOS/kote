/**
 * Cles de mutation.
 *
 * Elles servent a deux choses : identifier une mutation en cours, et surtout
 * decider laquelle survit a la fermeture de l'application. Voir persistance.ts.
 */

export const CLES_MUTATION = {
  /**
   * Mise en relation WhatsApp.
   *
   * NE DOIT JAMAIS ETRE PERSISTEE. Une mutation `contact` rejouee au prochain
   * lancement enregistrerait un contact client qui n'a pas eu lieu. Or ce
   * compteur est l'indicateur central du produit, et il conditionne la seconde
   * part de commission de l'ambassadeur : le gonfler, meme accidentellement,
   * corromprait la paie et l'indicateur.
   */
  contact: ["contact"] as const,

  /**
   * Signalement d'une fiche fausse ou fermee.
   *
   * Persistee, elle : le client est souvent devant une boutique fermee, donc
   * loin d'une bonne connexion, et c'est precisement la qu'il faut capter
   * l'information. Le rejeu est sans danger, le serveur deduplique par
   * appareil et par motif.
   */
  signalement: ["signalement"] as const,

  /**
   * Creation d'une fiche par un ambassadeur.
   *
   * Persistee, et c'est le cas d'usage qui justifie le mecanisme : un
   * ambassadeur inscrit dix marchands dans un marche sans couverture, ferme
   * l'application, et tout doit partir au retour du reseau. Le rejeu est sans
   * danger grace a la cle d'idempotence generee cote client -- rejouer la meme
   * saisie relit la fiche existante au lieu d'en creer une seconde.
   */
  creationFiche: ["creation-fiche"] as const,

  /** Confirmation d'activite. Rejouable sans effet de bord. */
  confirmation: ["confirmation"] as const,
} as const;

/** Mutations ecrites sur le disque et rejouees au retour du reseau. */
export const MUTATIONS_PERSISTEES: readonly string[] = [
  CLES_MUTATION.signalement[0],
  CLES_MUTATION.creationFiche[0],
  CLES_MUTATION.confirmation[0],
];
