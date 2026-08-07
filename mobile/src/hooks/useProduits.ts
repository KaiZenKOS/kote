import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ajouterProduit, mesProduits, produitsPublics, type Produit } from "../api/produits";

export function useProduitsPublics(marchandId: string | null) {
  return useQuery({ queryKey: ["produits", marchandId], queryFn: () => produitsPublics(marchandId!), enabled: Boolean(marchandId) });
}

export function useMesProduits(marchandId: string | null) {
  return useQuery({ queryKey: ["espace", "produits", marchandId], queryFn: () => mesProduits(marchandId!), enabled: Boolean(marchandId) });
}

export function useAjouterProduit() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ajouterProduit,
    onSuccess: (_r, p) => { void client.invalidateQueries({ queryKey: ["espace", "produits", p.marchand_id] }); void client.invalidateQueries({ queryKey: ["produits", p.marchand_id] }); },
  });
}
