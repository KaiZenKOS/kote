/**
 * Politique de cache.
 *
 * C'est le fichier le plus important de la couche de donnees, et il merite
 * d'etre lu avant d'ajouter la moindre requete.
 *
 * Au Togo, la donnee mobile s'achete par forfaits prepayes de petite taille et
 * le reseau tombe. Deux consequences :
 *
 *  1. Une requete evitee vaut mieux qu'une requete rapide. Le cache n'est pas
 *     une optimisation de confort, c'est une economie directe pour
 *     l'utilisateur.
 *  2. Le cas d'usage hors ligne le plus frequent n'est pas « ouvrir l'app sans
 *     reseau ». C'est « consulter la fiche EN MARCHANT vers la boutique »,
 *     moment ou l'on perd le signal entre deux quartiers. D'ou une duree de
 *     conservation tres longue sur les fiches : c'est precisement la donnee
 *     dont on a besoin quand on ne peut plus la charger.
 *
 * `staleTime` : duree pendant laquelle la donnee est consideree fraiche, donc
 *   aucune requete reseau n'est declenchee.
 * `gcTime` : duree de conservation en cache une fois inutilisee. C'est ce qui
 *   determine ce qu'on retrouve en rouvrant l'application.
 * `fenetrePersistance` : age maximal au-dela duquel l'entree n'est plus ecrite
 *   sur le disque. Limite la taille du stockage sur des telephones ou il est
 *   rare.
 */

const MINUTE = 1000 * 60;
const HEURE = MINUTE * 60;
const JOUR = HEURE * 24;

export interface ReglageCache {
  staleTime: number;
  gcTime: number;
  fenetrePersistance: number;
}

export const POLITIQUE = {
  /**
   * Referentiel quasi immuable. Doit etre disponible hors ligne des le premier
   * lancement, sinon l'ecran d'accueil est vide sans reseau.
   */
  categories: {
    staleTime: JOUR,
    gcTime: JOUR * 30,
    fenetrePersistance: JOUR * 30,
  },

  /**
   * Compteurs par categorie autour de la position. Bougent lentement, et une
   * valeur legerement perimee ne coute rien : c'est une pastille indicative.
   */
  comptages: {
    staleTime: MINUTE * 10,
    gcTime: JOUR * 7,
    fenetrePersistance: JOUR * 3,
  },

  /**
   * Resultats de recherche. Conserves une semaine pour que rouvrir
   * l'application sans reseau montre la derniere recherche plutot qu'un ecran
   * vide, mais persistes seulement un jour pour ne pas saturer le stockage.
   */
  recherche: {
    staleTime: MINUTE * 5,
    gcTime: JOUR * 7,
    fenetrePersistance: JOUR,
  },

  /**
   * Fiche commercant. La duree la plus longue du lot, volontairement.
   * C'est la donnee que l'utilisateur consulte en chemin, quand il ne peut
   * plus la recharger.
   */
  fiche: {
    staleTime: MINUTE * 15,
    gcTime: JOUR * 30,
    fenetrePersistance: JOUR * 30,
  },

  photos: {
    staleTime: HEURE,
    gcTime: JOUR * 30,
    fenetrePersistance: JOUR * 30,
  },
} as const satisfies Record<string, ReglageCache>;

export type DomaineCache = keyof typeof POLITIQUE;

/**
 * Taille de la grille de mise en cache geographique, en degres.
 *
 * Sans cet arrondi, chaque metre de derive GPS produirait une cle de cache
 * differente : le cache ne servirait jamais et chaque retour sur l'ecran
 * refacturerait une requete a l'utilisateur. 0,002 degre vaut environ 220 m,
 * soit un pas suffisamment fin pour que les resultats restent pertinents et
 * suffisamment grossier pour que le cache serve vraiment.
 *
 * Effet de bord utile : la position exacte de l'utilisateur ne sert jamais de
 * cle, ce qui va dans le sens de la minimisation des donnees.
 */
export const PAS_GRILLE_DEG = 0.002;

export function caseGrille(latitude: number, longitude: number) {
  const arrondi = (v: number) =>
    Math.round(v / PAS_GRILLE_DEG) * PAS_GRILLE_DEG;
  return {
    lat: Number(arrondi(latitude).toFixed(4)),
    lng: Number(arrondi(longitude).toFixed(4)),
  };
}
