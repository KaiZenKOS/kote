/**
 * Fond de carte hors ligne du Grand Lome.
 *
 * C'est la raison principale du choix de MapLibre plutot qu'un service facture
 * au chargement : on telecharge une fois les tuiles du Grand Lome et on ne les
 * repaie plus jamais, ni en argent ni en forfait data. Le cahier des charges
 * l'exige explicitement (section 2.4).
 *
 * Le telechargement est TOUJOURS declenche par l'utilisateur, jamais
 * automatiquement. Consommer plusieurs mega-octets a son insu est exactement le
 * comportement qui fait desinstaller une application ici.
 */

import {
  OfflineManager,
  type LngLatBounds,
  type StyleSpecification,
} from "@maplibre/maplibre-react-native";

import styleSombre from "./style-sombre.json";

/** Style de rendu, embarque dans l'application : quelques kilo-octets, jamais retelecharges. */
export const STYLE_SOMBRE = styleSombre as unknown as StyleSpecification;

/**
 * Style servant UNIQUEMENT au telechargement du paquet.
 *
 * L'API native n'accepte qu'une URL, pas un style en ligne. On pointe donc un
 * style public adosse a la MEME source de tuiles que le notre
 * (`tiles.openfreemap.org/planet`) : les tuiles telechargees sont indexees par
 * leur URL, elles servent donc ensuite au rendu sombre sans etre rechargees.
 */
const STYLE_TELECHARGEMENT = "https://tiles.openfreemap.org/styles/positron";

const MARQUE = "kote:grand-lome";

/**
 * Emprise du Grand Lome, volontairement serree : chaque dixieme de degre
 * supplementaire alourdit le telechargement, et le MVP est lome-centre.
 */
export const EMPRISE_LOME: LngLatBounds = [1.08, 6.07, 1.33, 6.29];

/**
 * En dessous du zoom 11 la ville tient dans quelques tuiles ; au-dela de 16 le
 * poids explose pour un gain nul, puisqu'on se repere au point de repere et non
 * au numero de rue.
 */
const ZOOM_MIN = 11;
const ZOOM_MAX = 16;

export interface EtatTelechargement {
  pourcentage: number;
  octets: number;
  termine: boolean;
}

async function trouverPaquet() {
  const paquets = await OfflineManager.getPacks();
  return paquets.find((p) => p.metadata?.marque === MARQUE) ?? null;
}

export async function paquetInstalle(): Promise<boolean> {
  return (await trouverPaquet()) !== null;
}

export async function poidsPaquet(): Promise<number> {
  const paquet = await trouverPaquet();
  if (!paquet) return 0;
  const statut = await paquet.status();
  return statut.completedResourceSize;
}

export async function supprimerPaquet(): Promise<void> {
  const paquet = await trouverPaquet();
  if (paquet) await OfflineManager.deletePack(paquet.id);
}

/**
 * Telecharge le fond de carte.
 *
 * `onProgres` est appele regulierement : sur une 3G degradee, un
 * telechargement muet est indiscernable d'un blocage, et l'utilisateur
 * abandonne.
 */
export async function telechargerPaquet(
  onProgres: (etat: EtatTelechargement) => void,
  onErreur: (message: string) => void,
): Promise<void> {
  await supprimerPaquet();

  await OfflineManager.createPack(
    {
      mapStyle: STYLE_TELECHARGEMENT,
      bounds: EMPRISE_LOME,
      minZoom: ZOOM_MIN,
      maxZoom: ZOOM_MAX,
      metadata: { marque: MARQUE, nom: "Grand Lomé" },
    },
    (_paquet, statut) => {
      onProgres({
        pourcentage: Math.round(statut.percentage),
        octets: statut.completedResourceSize,
        termine: statut.state === "complete" || statut.percentage >= 100,
      });
    },
    (_paquet, erreur) => onErreur(erreur.message),
  );
}

export function formaterOctets(octets: number): string {
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}
