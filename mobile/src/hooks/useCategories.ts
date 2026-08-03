import { useQuery } from "@tanstack/react-query";

import { compterParCategorie, listerCategories } from "../api/marchands";
import { cles } from "../query/cles";
import type { Position } from "../api/types";

/**
 * Referentiel des categories.
 *
 * Volontairement sans `enabled` : cette requete doit partir des le premier
 * rendu et rester en cache un mois. Sans elle, l'ecran d'accueil est vide hors
 * ligne, et c'est le premier ecran que voit l'utilisateur.
 */
export function useCategories() {
  return useQuery({
    queryKey: cles.categories(),
    queryFn: listerCategories,
  });
}

/**
 * Compteurs par categorie autour d'une position.
 *
 * La cle est calee sur une grille d'environ 220 m : marcher quelques pas ne
 * declenche pas une nouvelle requete. Voir politique.ts.
 */
export function useComptages(position: Position | null, rayonM: number) {
  return useQuery({
    queryKey: position
      ? cles.comptages(position.latitude, position.longitude, rayonM)
      : ["comptages", "sans-position"],
    queryFn: () =>
      compterParCategorie(position!.latitude, position!.longitude, rayonM),
    enabled: position !== null,
  });
}
