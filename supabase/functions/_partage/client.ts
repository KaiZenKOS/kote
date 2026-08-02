// ---------------------------------------------------------------------------
// Fabriques de clients Supabase.
//
// Deux usages, a ne jamais confondre :
//
//  - `clientService` contourne RLS. Reserve aux ecritures qu'un client anonyme
//    ne doit pas pouvoir faire directement : journal d'usage, signalements,
//    confirmations par relance. C'est ce qui rend les statistiques d'une fiche
//    non gonflables, donc la commission ambassadeur non fraudable (CDC 7.3).
//
//  - `clientUtilisateur` rejoue le jeton de l'appelant et reste soumis a RLS.
//    Utilise des qu'il faut verifier qu'une personne a bien le droit d'agir sur
//    une fiche.
// ---------------------------------------------------------------------------

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const URL_SUPABASE = Deno.env.get("SUPABASE_URL");
const CLE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const CLE_ANON = Deno.env.get("SUPABASE_ANON_KEY");

function exigee(valeur: string | undefined, nom: string): string {
  if (!valeur) throw new Error(`Variable d'environnement manquante : ${nom}`);
  return valeur;
}

export function clientService(): SupabaseClient {
  return createClient(
    exigee(URL_SUPABASE, "SUPABASE_URL"),
    exigee(CLE_SERVICE, "SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export function clientUtilisateur(entete: string | null): SupabaseClient {
  return createClient(
    exigee(URL_SUPABASE, "SUPABASE_URL"),
    exigee(CLE_ANON, "SUPABASE_ANON_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: entete ? { Authorization: entete } : {} },
    },
  );
}
