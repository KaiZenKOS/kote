/**
 * Jumeau web de la gestion du fond de carte hors ligne.
 *
 * Le navigateur n'a pas de paquet de tuiles telechargeable : c'est une notion
 * propre au mobile, et c'est justement la ou elle compte -- un forfait prepaye
 * ne se recharge pas d'un clic. La version web se contente donc du style, et
 * les fonctions de paquet sont neutres.
 *
 * Ce fichier existe pour que le bundle web ne tire jamais
 * @maplibre/maplibre-react-native, qui est du code natif sans equivalent
 * navigateur.
 */

import styleSombre from "./style-sombre.json";

export const STYLE_SOMBRE = styleSombre as unknown as Record<string, unknown>;

export const EMPRISE_LOME: [number, number, number, number] = [
  1.08, 6.07, 1.33, 6.29,
];

export interface EtatTelechargement {
  pourcentage: number;
  octets: number;
  termine: boolean;
}

export async function paquetInstalle(): Promise<boolean> {
  return false;
}

export async function poidsPaquet(): Promise<number> {
  return 0;
}

export async function supprimerPaquet(): Promise<void> {
  // Sans objet sur le web.
}

export async function telechargerPaquet(
  _onProgres: (etat: EtatTelechargement) => void,
  onErreur: (message: string) => void,
): Promise<void> {
  onErreur("La carte hors ligne n'existe que sur l'application mobile.");
}

export function formaterOctets(octets: number): string {
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}
