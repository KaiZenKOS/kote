/**
 * Fabrique de cles de requete.
 *
 * Toutes les cles passent par ici. La premiere entree de chaque cle est le
 * domaine de cache defini dans politique.ts : c'est ce qui permet d'appliquer
 * automatiquement les bonnes durees et de decider ce qui est persiste.
 */

import { caseGrille, type DomaineCache } from "./politique";

export const cles = {
  categories: () => ["categories"] as const,

  comptages: (latitude: number, longitude: number, rayonM: number) => {
    const { lat, lng } = caseGrille(latitude, longitude);
    return ["comptages", { lat, lng, rayonM }] as const;
  },

  recherche: (p: {
    latitude: number;
    longitude: number;
    rayonM: number;
    categorie?: string | null;
    q?: string | null;
    limite?: number;
  }) => {
    const { lat, lng } = caseGrille(p.latitude, p.longitude);
    return [
      "recherche",
      {
        lat,
        lng,
        rayonM: p.rayonM,
        categorie: p.categorie ?? null,
        // La limite fait partie de la cle : l'apercu « Pres de vous » en
        // demande trois, l'ecran de resultats vingt. Sans elle, le premier
        // arrive imposerait sa taille au second depuis le cache.
        limite: p.limite ?? 20,
        // Normalise pour que « Couturière », « couturiere » et « couturiere  »
        // partagent la meme entree de cache.
        q: p.q?.trim().toLocaleLowerCase("fr") || null,
      },
    ] as const;
  },

  fiche: (id: string) => ["fiche", id] as const,
  photos: (marchandId: string) => ["photos", marchandId] as const,

  mesFiches: () => ["espace", "mes-fiches"] as const,
  monAmbassadeur: () => ["espace", "ambassadeur"] as const,
  mesCommissions: () => ["espace", "commissions"] as const,
  statistiques: (marchandId: string, jours: number) =>
    ["statistiques", marchandId, jours] as const,
} as const;

/** Domaine de cache porte par une cle, ou null si la cle est inconnue. */
export function domaineDeLaCle(cle: readonly unknown[]): DomaineCache | null {
  const racine = cle[0];
  if (typeof racine !== "string") return null;
  const connus: DomaineCache[] = [
    "categories",
    "comptages",
    "recherche",
    "fiche",
    "photos",
    "espace",
    "statistiques",
  ];
  return connus.includes(racine as DomaineCache)
    ? (racine as DomaineCache)
    : null;
}
