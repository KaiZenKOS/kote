/**
 * Construction du QueryClient.
 *
 * Les durees ne sont pas fixees ici mais dans politique.ts, et appliquees par
 * prefixe de cle : `setQueryDefaults(["fiche"], ...)` couvre toutes les cles
 * commencant par « fiche ». Ajouter une requete dans un domaine existant, c'est
 * hériter automatiquement de la bonne politique.
 */

import { QueryClient } from "@tanstack/react-query";
import { ErreurApi } from "../api/erreurs";
import { POLITIQUE } from "./politique";

export function creerQueryClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        /**
         * « offlineFirst » plutot que « online » : la detection de
         * connectivite ment souvent ici. Une puce peut se declarer connectee
         * au reseau mobile sans qu'aucune donnee ne passe, et inversement une
         * connexion faible peut etre signalee comme absente. On tente donc
         * toujours une fois, et on ne met en pause qu'ensuite.
         */
        networkMode: "offlineFirst",

        /**
         * Chaque nouvelle tentative est un forfait entame. Deux au maximum,
         * et jamais sur une erreur qui ne se resoudra pas d'elle-meme.
         */
        retry: (nombreEchecs, erreur) => {
          if (erreur instanceof ErreurApi && erreur.estDefinitive) return false;
          return nombreEchecs < 2;
        },
        retryDelay: (tentative) => Math.min(1000 * 2 ** tentative, 8000),

        /**
         * Desactive volontairement : sur mobile, un aller-retour vers WhatsApp
         * et retour declencherait un rechargement complet. C'est le
         * comportement le plus courant de l'application -- et il serait
         * facture a l'utilisateur a chaque fois.
         */
        refetchOnWindowFocus: false,

        /** Au retour du reseau, en revanche, on rafraichit ce qui est perime. */
        refetchOnReconnect: true,

        refetchOnMount: true,
      },
      mutations: {
        networkMode: "offlineFirst",
        retry: (nombreEchecs, erreur) => {
          if (erreur instanceof ErreurApi && erreur.estDefinitive) return false;
          return nombreEchecs < 2;
        },
      },
    },
  });

  for (const [domaine, reglage] of Object.entries(POLITIQUE)) {
    client.setQueryDefaults([domaine], {
      staleTime: reglage.staleTime,
      gcTime: reglage.gcTime,
    });
  }

  return client;
}
