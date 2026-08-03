/**
 * Branchement de l'etat reseau sur TanStack Query.
 *
 * Sans ce branchement, la bibliotheque se fie a l'evenement `online` du
 * navigateur, qui n'existe pas en React Native : elle se croirait connectee en
 * permanence et empilerait des requetes vouees a l'echec, chacune facturee en
 * tentative de connexion.
 */

import { AppState, type AppStateStatus } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { focusManager, onlineManager } from "@tanstack/react-query";

export function brancherEtatReseau(): () => void {
  /**
   * `setEventListener` ne renvoie rien : c'est la fonction de configuration
   * qui rend le desabonnement, et le gestionnaire s'en charge lui-meme lors du
   * remplacement de l'ecouteur. Rien a liberer ici.
   */
  onlineManager.setEventListener((definirEnLigne) =>
    NetInfo.addEventListener((etat) => {
      /**
       * `isInternetReachable` vaut null tant que la sonde n'a pas abouti. On
       * traite ce cas comme « en ligne » : bloquer sur une incertitude
       * reviendrait a refuser de tenter alors que la connexion fonctionne
       * peut-etre. Seul un `false` explicite fait basculer hors ligne.
       */
      const joignable = etat.isInternetReachable !== false;
      definirEnLigne(Boolean(etat.isConnected) && joignable);
    }),
  );

  const abonnementFocus = AppState.addEventListener(
    "change",
    (statut: AppStateStatus) => {
      focusManager.setFocused(statut === "active");
    },
  );

  return () => {
    abonnementFocus.remove();
  };
}

/** Etat instantane, pour les ecrans qui doivent afficher le mode hors ligne. */
export function estEnLigne(): boolean {
  return onlineManager.isOnline();
}
