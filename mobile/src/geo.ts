import type { Position } from "./api/types";

const RAYON_TERRE_M = 6_371_000;

/**
 * Distance a vol d'oiseau entre deux points.
 *
 * Calculee sur le telephone plutot que demandee au serveur : la fiche est
 * souvent lue depuis le cache, sans reseau, et la distance doit rester juste
 * pendant que l'utilisateur marche vers la boutique.
 */
export function distanceM(a: Position, b: Position): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const lat1 = rad(a.latitude);
  const lat2 = rad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return Math.round(2 * RAYON_TERRE_M * Math.asin(Math.sqrt(h)));
}
