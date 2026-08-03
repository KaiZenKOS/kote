/**
 * Types de l'API, miroirs du schema backend.
 *
 * Aucun de ces types ne porte de numero de telephone : l'API publique ne
 * l'expose pas, et le lien WhatsApp ne s'obtient qu'a l'unite via la fonction
 * `contact`.
 */

export type StatutMarchand = "active" | "a_confirmer";

export interface Categorie {
  slug: string;
  libelle_fr: string;
  libelle_gen: string | null;
  libelle_ee: string | null;
  icone: string;
  ordre: number;
}

export interface ComptageCategorie {
  categorie_slug: string;
  libelle_fr: string;
  icone: string;
  nombre: number;
}

/** Resultat de `rechercher_marchands`. */
export interface ResultatRecherche {
  id: string;
  nom_enseigne: string;
  categorie_slug: string;
  description: string | null;
  /** Point de repere en texte libre. Il n'y a pas d'adresse a Lome. */
  repere: string;
  latitude: number;
  longitude: number;
  distance_m: number;
  statut: StatutMarchand;
  jours_depuis_confirmation: number;
  photo_principale: string | null;
}

/** Vue `marchand_public`. */
export interface FicheMarchand {
  id: string;
  nom_enseigne: string;
  categorie_slug: string;
  description: string | null;
  repere: string;
  latitude: number;
  longitude: number;
  localisation_ajustee: boolean;
  horaires: Record<string, string> | null;
  statut: StatutMarchand;
  zone_id: string | null;
  derniere_confirmation: string;
  jours_depuis_confirmation: number;
  photo_principale: string | null;
  cree_le: string;
}

export interface PhotoMarchand {
  id: string;
  marchand_id: string;
  chemin: string;
  ordre: number;
  largeur: number | null;
  hauteur: number | null;
}

export interface Position {
  latitude: number;
  longitude: number;
}

export interface ParametresRecherche extends Position {
  rayonM: number;
  categorie?: string | null;
  q?: string | null;
  limite?: number;
}

export type MotifSignalement = "ferme" | "demenage" | "infos_fausses" | "abus";

export interface ReponseContact {
  nom_enseigne: string;
  /** Lien wa.me deja construit et journalise cote serveur. */
  lien: string;
}

export type TypeEvenement = "recherche" | "vue_fiche" | "clic_itineraire";

export interface EvenementUsage {
  type: TypeEvenement;
  marchand_id?: string | null;
  categorie_slug?: string | null;
  requete?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}
