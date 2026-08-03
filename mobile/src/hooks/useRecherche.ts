import { useQuery } from "@tanstack/react-query";

import { rechercherMarchands } from "../api/marchands";
import { journaliser } from "../journal/file";
import { cles } from "../query/cles";
import type { Position, ResultatRecherche } from "../api/types";

export interface OptionsRecherche {
  position: Position | null;
  rayonM: number;
  categorie?: string | null;
  q?: string | null;
  limite?: number;
  actif?: boolean;
}

/**
 * Recherche de proximite.
 *
 * La journalisation est faite dans la fonction de requete, donc uniquement
 * lorsqu'un appel reseau a reellement lieu. Une reprise depuis le cache dans
 * les cinq minutes n'est pas une nouvelle recherche : c'est un retour arriere,
 * et le compter fausserait la mesure des recherches infructueuses, qui sert a
 * detecter les zones ou la densite de commerces est insuffisante.
 */
export function useRecherche({
  position,
  rayonM,
  categorie = null,
  q = null,
  limite = 20,
  actif = true,
}: OptionsRecherche) {
  return useQuery<ResultatRecherche[]>({
    queryKey: position
      ? cles.recherche({
          latitude: position.latitude,
          longitude: position.longitude,
          rayonM,
          categorie,
          q,
          limite,
        })
      : ["recherche", "sans-position"],
    enabled: actif && position !== null,
    queryFn: async () => {
      const resultats = await rechercherMarchands({
        latitude: position!.latitude,
        longitude: position!.longitude,
        rayonM,
        categorie,
        q,
        limite,
      });

      void journaliser({
        type: "recherche",
        requete: q,
        categorie_slug: categorie,
        latitude: position!.latitude,
        longitude: position!.longitude,
      });

      return resultats;
    },
    /**
     * Garde les resultats precedents affiches pendant qu'une nouvelle recherche
     * charge. Sur une connexion lente, l'alternative serait un ecran vide a
     * chaque frappe.
     */
    placeholderData: (precedent) => precedent,
  });
}
