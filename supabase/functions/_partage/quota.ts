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
    // Un incident sur le compteur ne doit pas rendre le service indisponible :
    // on laisse passer, l'evenement reste tracable cote journaux.
    console.error("consommer_quota", error.message);
    return true;
  }

  return data === true;
}
