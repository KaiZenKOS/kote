/**
 * Fournisseur de la couche de donnees.
 *
 * Assemble le QueryClient, la persistance disque et l'ecoute du reseau. A
 * monter une seule fois, a la racine de l'application.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { onlineManager, type QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

import { creerQueryClient } from "./client";
import { optionsPersistance } from "./persistance";
import { brancherEtatReseau } from "./reseau";
import { demarrerJournal } from "../journal/file";

interface Props {
  children: ReactNode;
}

export function FournisseurDonnees({ children }: Props) {
  const [client] = useState<QueryClient>(() => creerQueryClient());
  const journalArrete = useRef<(() => void) | null>(null);

  useEffect(() => {
    const debrancherReseau = brancherEtatReseau();
    journalArrete.current = demarrerJournal();
    return () => {
      debrancherReseau();
      journalArrete.current?.();
    };
  }, []);

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={optionsPersistance}
      onSuccess={() => {
        /**
         * Le cache disque vient d'etre restaure. C'est le moment de rejouer les
         * mutations mises en pause faute de reseau -- typiquement un
         * signalement saisi devant une boutique fermee, hors couverture.
         */
        void client.resumePausedMutations();
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

/** Rejoue la file d'attente des que la connexion revient. */
export function useReprisesAuRetourDuReseau(client: QueryClient) {
  useEffect(() => {
    return onlineManager.subscribe((enLigne) => {
      if (enLigne) void client.resumePausedMutations();
    });
  }, [client]);
}
