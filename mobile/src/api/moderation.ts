import { supabase, erreurDepuisPostgrest } from "./client";

export interface SignalementModeration {
  signalement_id: string;
  marchand_id: string;
  nom_enseigne: string;
  motif: "ferme" | "demenage" | "infos_fausses" | "abus";
  commentaire: string | null;
  cree_le: string;
}

export async function lireFileModeration(): Promise<SignalementModeration[]> {
  const { data, error } = await supabase.rpc("file_moderation", { p_limite: 50 });
  if (error) throw erreurDepuisPostgrest(error);
  return data ?? [];
}

export async function traiterSignalement(
  signalementId: string,
  decision: "conserve" | "mise_a_confirmer" | "retiree",
): Promise<void> {
  const { error } = await supabase.rpc("traiter_signalement", {
    p_signalement_id: signalementId, p_decision: decision, p_note: null,
  });
  if (error) throw erreurDepuisPostgrest(error);
}
