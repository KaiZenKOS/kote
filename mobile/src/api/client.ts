/**
 * Client d'API.
 *
 * Deux chemins distincts vers le backend :
 *
 *  - PostgREST, pour tout ce qui se lit : referentiels, vue publique des
 *    fiches, fonctions de recherche. Le role anonyme n'a aucun privilege sur la
 *    table `marchand`, donc rien de sensible ne peut sortir par la.
 *  - Les fonctions edge, pour tout ce qui s'ecrit ou engage une action :
 *    mise en relation, signalement, journal d'usage. Elles seules disposent du
 *    role de service, appliquent les quotas et journalisent.
 */

import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ErreurApi, ErreurReseau } from "./erreurs";

const URL_SUPABASE = process.env.EXPO_PUBLIC_SUPABASE_URL;
const CLE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!URL_SUPABASE || !CLE_ANON) {
  throw new Error(
    "EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY sont requis. " +
      "Copier .env.example en .env avant de lancer l'application.",
  );
}

export const supabase: SupabaseClient = createClient(URL_SUPABASE, CLE_ANON, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    // Il n'y a pas d'URL de redirection sur mobile.
    detectSessionInUrl: false,
  },
});

/**
 * Appel d'une fonction edge.
 *
 * On passe par `fetch` plutot que par `functions.invoke` pour recuperer le code
 * de statut exact : c'est lui qui decide s'il faut reessayer ou abandonner, et
 * chaque tentative inutile est de la donnee facturee a l'utilisateur.
 */
export async function appelerFonction<T>(
  nom: string,
  corps: unknown,
  options: { methode?: "POST" | "GET"; signal?: AbortSignal } = {},
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const jeton = data.session?.access_token ?? CLE_ANON;

  let reponse: Response;
  try {
    reponse = await fetch(`${URL_SUPABASE}/functions/v1/${nom}`, {
      method: options.methode ?? "POST",
      headers: {
        apikey: CLE_ANON!,
        Authorization: `Bearer ${jeton}`,
        "Content-Type": "application/json",
      },
      body: options.methode === "GET" ? undefined : JSON.stringify(corps),
      signal: options.signal,
    });
  } catch (cause) {
    // Echec de transport : ni statut, ni corps. Distinct d'une erreur metier.
    throw new ErreurReseau(
      cause instanceof Error ? cause.message : "Connexion indisponible",
    );
  }

  const texte = await reponse.text();
  const charge = texte ? safeJson(texte) : null;

  if (!reponse.ok) {
    const message =
      (charge as { erreur?: string } | null)?.erreur ??
      `Echec de l'appel a ${nom}`;
    const code = (charge as { code?: string } | null)?.code;
    throw new ErreurApi(message, reponse.status, code);
  }

  return charge as T;
}

function safeJson(texte: string): unknown {
  try {
    return JSON.parse(texte);
  } catch {
    return null;
  }
}

/** Convertit une erreur PostgREST en ErreurApi, pour unifier la gestion. */
export function erreurDepuisPostgrest(erreur: {
  message: string;
  code?: string;
}): ErreurApi {
  // PostgREST expose des codes SQLSTATE. 42501 = privilege insuffisant.
  const statut = erreur.code === "42501" ? 403 : 500;
  return new ErreurApi(erreur.message, statut, erreur.code);
}
