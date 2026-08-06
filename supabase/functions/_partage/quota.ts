// ---------------------------------------------------------------------------
// Limitation d'appels.
//
// Tous les points d'entree ouverts sont plafonnes. Sans cela, le journal
// d'usage devient gonflable et la commission a J+30 fraudable (CDC 7.3, 9.3),
// et la base devient aspirable point par point.
// ---------------------------------------------------------------------------

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function consommerQuota(
  client: SupabaseClient,
  cle: string,
  plafond: number,
  fenetreMinutes = 60,
): Promise<boolean> {
  const { data, error } = await client.rpc("consommer_quota", {
    p_cle: cle,
    p_plafond: plafond,
    p_fenetre_minutes: fenetreMinutes,
  });

  if (error) {
    // En cas de doute, on bloque. Laisser passer transformerait une panne du
    // garde-fou en fenetre d'extraction de numeros ou de gonflage des mesures.
    console.error("consommer_quota", error.message);
    return false;
  }

  return data === true;
}
