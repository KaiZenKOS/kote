import { useMemo } from "react";

import { useCategories } from "./useCategories";

/**
 * Libelles lisibles des categories, indexes par slug.
 *
 * Le backend renvoie des slugs (« couture »), pas des libelles. Les traduire
 * cote client evite de les dupliquer dans chaque reponse d'API : la liste est
 * en cache trente jours, la faire voyager a chaque resultat de recherche serait
 * de la donnee payee pour rien.
 */
export function useLibellesCategories() {
  const { data } = useCategories();

  return useMemo(() => {
    const table = new Map<string, string>();
    for (const c of data ?? []) table.set(c.slug, c.libelle_fr);
    return table;
  }, [data]);
}
