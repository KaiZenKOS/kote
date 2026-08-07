import { erreurDepuisPostgrest, supabase } from "./client";

export interface Produit {
  id: string;
  marchand_id: string;
  nom: string;
  description: string | null;
  prix_fcfa: number | null;
  est_nouveaute: boolean;
  cree_le: string;
}

export async function produitsPublics(marchandId: string): Promise<Produit[]> {
  const { data, error } = await supabase.from("produit_marchand_public")
    .select("id,marchand_id,nom,description,prix_fcfa,est_nouveaute,cree_le")
    .eq("marchand_id", marchandId).order("est_nouveaute", { ascending: false }).order("cree_le", { ascending: false }).limit(12);
  if (error) throw erreurDepuisPostgrest(error);
  return (data ?? []) as Produit[];
}

export async function mesProduits(marchandId: string): Promise<Produit[]> {
  const { data, error } = await supabase.from("produit_marchand")
    .select("id,marchand_id,nom,description,prix_fcfa,est_nouveaute,cree_le")
    .eq("marchand_id", marchandId).order("cree_le", { ascending: false });
  if (error) throw erreurDepuisPostgrest(error);
  return (data ?? []) as Produit[];
}

export async function ajouterProduit(p: Omit<Produit, "id" | "cree_le">): Promise<void> {
  const { error } = await supabase.from("produit_marchand").insert(p);
  if (error) throw erreurDepuisPostgrest(error);
}
