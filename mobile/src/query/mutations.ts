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
} as const;
