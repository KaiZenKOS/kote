import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "../api/client";

/**
 * Session courante.
 *
 * Elle est persistee dans AsyncStorage par le client Supabase : un marchand ne
 * se reconnecte pas a chaque ouverture. C'est important -- chaque nouvelle
 * demande de code coute un SMS a la plateforme, et une manipulation a une
 * utilisatrice qui n'en a pas envie.
 */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    let vivant = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!vivant) return;
      setSession(data.session);
      setChargement(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_evenement, nouvelle) => {
      setSession(nouvelle);
      setChargement(false);
    });

    return () => {
      vivant = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    utilisateurId: session?.user.id ?? null,
    telephone: session?.user.phone ?? null,
    connecte: session !== null,
    chargement,
  };
}
