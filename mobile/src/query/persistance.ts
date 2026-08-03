/**
 * Persistance du cache sur le disque.
 *
 * Sans elle, fermer l'application vide tout : le lendemain, l'utilisateur
 * repaie l'integralite des donnees qu'il avait deja telechargees. Avec elle,
 * rouvrir l'application sans reseau montre la derniere recherche et les fiches
 * consultees.
 *
 * Contrainte de stockage : AsyncStorage est plafonne a 6 Mo par defaut sur
 * Android, et le stockage est une ressource rare sur les telephones vises --
 * une application qui grossit finit desinstallee. D'ou le filtrage strict
 * ci-dessous : on n'ecrit sur le disque que ce qui a une chance de resservir.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { PersistQueryClientOptions } from "@tanstack/react-query-persist-client";

import { domaineDeLaCle } from "./cles";
import { MUTATIONS_PERSISTEES } from "./mutations";
import { POLITIQUE } from "./politique";

const CLE_STOCKAGE = "kote:cache";

/**
 * A incrementer des que la forme des donnees mises en cache change : cela
 * invalide d'un coup tous les caches deja installes sur les telephones.
 * Sans ce garde-fou, une migration de schema fait planter les anciennes
 * versions sur des donnees devenues incompatibles.
 */
const VERSION_CACHE = "1";

const JOUR = 1000 * 60 * 60 * 24;

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: CLE_STOCKAGE,
  /**
   * Ecrire a chaque changement userait la memoire flash et bloquerait le fil
   * principal sur un appareil lent. Deux secondes de regroupement suffisent.
   */
  throttleTime: 2000,
});

export const optionsPersistance: Omit<PersistQueryClientOptions, "queryClient"> =
  {
    persister,
    maxAge: JOUR * 30,
    buster: VERSION_CACHE,
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => {
        // Une erreur ne se met pas en cache : sinon l'utilisateur rouvre
        // l'application sur l'echec de la veille.
        if (query.state.status !== "success") return false;

        const domaine = domaineDeLaCle(query.queryKey);
        if (!domaine) return false;

        // Chaque domaine a sa propre fenetre d'ecriture. Une recherche d'il y a
        // trois jours n'a plus d'interet ; une fiche consultee il y a trois
        // semaines en a encore.
        const age = Date.now() - query.state.dataUpdatedAt;
        return age <= POLITIQUE[domaine].fenetrePersistance;
      },

      shouldDehydrateMutation: (mutation) => {
        const cle = mutation.options.mutationKey;
        if (!Array.isArray(cle) || typeof cle[0] !== "string") return false;
        // Liste blanche explicite. Tout ce qui n'y figure pas est perdu a la
        // fermeture, ce qui est le comportement voulu par defaut -- notamment
        // pour `contact`, dont le rejeu fausserait l'indicateur central.
        return MUTATIONS_PERSISTEES.includes(cle[0]);
      },
    },
  };

/**
 * Vide le cache disque. Utilise par l'ecran d'aide (« liberer de l'espace ») et
 * lors d'une deconnexion.
 */
export async function viderCacheDisque(): Promise<void> {
  await persister.removeClient();
}
