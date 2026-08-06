import { useCallback, useEffect, useState } from "react";
import * as Location from "expo-location";

import type { Position } from "../api/types";

export type EtatPosition =
  | { statut: "chargement" }
  | { statut: "refusee" }
  | { statut: "indisponible" }
  | { statut: "prete"; position: Position };

/**
 * Position de l'utilisateur.
 *
 * Deux principes, imposes par le parc d'appareils vise :
 *
 *  1. On demande d'abord la derniere position connue du systeme. Elle est
 *     instantanee et gratuite en energie. Sur un telephone d'entree de gamme,
 *     une acquisition GPS complete prend plusieurs secondes pendant lesquelles
 *     l'ecran resterait vide.
 *  2. Le GPS n'est jamais actif en tache de fond, et jamais en haute precision.
 *     L'autonomie est une ressource rare, et une application qui vide la
 *     batterie est desinstallee. La precision « equilibree » suffit largement
 *     pour un rayon de quelques centaines de metres.
 */
export function usePosition(): EtatPosition & {
  /** Renvoie la coordonnee effectivement recue, pour recentrer une carte. */
  rafraichir: () => Promise<Position | null>;
} {
  const [etat, setEtat] = useState<EtatPosition>({ statut: "chargement" });

  const acquerir = useCallback(async () => {
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        setEtat({ statut: "refusee" });
        return null;
      }

      const derniere = await Location.getLastKnownPositionAsync({
        maxAge: 5 * 60 * 1000,
      });
      if (derniere) {
        setEtat({
          statut: "prete",
          position: {
            latitude: derniere.coords.latitude,
            longitude: derniere.coords.longitude,
          },
        });
      }

      const actuelle = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setEtat({
        statut: "prete",
        position: {
          latitude: actuelle.coords.latitude,
          longitude: actuelle.coords.longitude,
        },
      });
      return {
        latitude: actuelle.coords.latitude,
        longitude: actuelle.coords.longitude,
      };
    } catch {
      setEtat((precedent) =>
        precedent.statut === "prete" ? precedent : { statut: "indisponible" },
      );
      return null;
    }
  }, []);

  useEffect(() => {
    void acquerir();
  }, [acquerir]);

  return { ...etat, rafraichir: acquerir };
}

/** Repli sur le centre de Lome quand la position est refusee ou indisponible. */
export const CENTRE_LOME: Position = { latitude: 6.1319, longitude: 1.2228 };
