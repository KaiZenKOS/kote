/**
 * Erreurs d'API.
 *
 * La distinction qui compte pour le reseau togolais : une erreur est-elle
 * definitive, ou vaut-elle la peine d'etre retentee ? Retenter coute de la
 * donnee a l'utilisateur ; ne pas retenter sur une coupure passagere lui coute
 * le service.
 */

export class ErreurApi extends Error {
  readonly statut: number;
  readonly code?: string;

  constructor(message: string, statut: number, code?: string) {
    super(message);
    this.name = "ErreurApi";
    this.statut = statut;
    this.code = code;
  }

  /**
   * Une erreur definitive ne se resoudra pas en reessayant : requete malformee,
   * acces refuse, ressource absente, quota atteint. On abandonne tout de suite
   * plutot que de consommer trois fois le forfait pour le meme echec.
   *
   * 408 et 429 sont exclus : le premier est une temporisation, le second est
   * une limite de debit qui se libere avec le temps.
   */
  get estDefinitive(): boolean {
    if (this.statut === 408 || this.statut === 429) return false;
    return this.statut >= 400 && this.statut < 500;
  }

  /** Fiche retiree, fermee ou jamais existante. */
  get estIntrouvable(): boolean {
    return this.statut === 404;
  }
}

export class ErreurReseau extends Error {
  constructor(message = "Connexion indisponible") {
    super(message);
    this.name = "ErreurReseau";
  }
}
