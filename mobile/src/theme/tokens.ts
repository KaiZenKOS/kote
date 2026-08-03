/**
 * Jetons de style, repris tels quels de togo.pen.
 *
 * Cette source est le design, pas ce fichier. Si une valeur change dans le
 * .pen, elle change ici, jamais l'inverse.
 */

export const couleurs = {
  bg: "#14100E",
  surface1: "#1F1917",
  surface2: "#2A2320",
  bordure: "#3A312C",

  accent: "#FF6B2C",
  accentDoux: "#FFB088",
  surAccent: "#14100E",

  textePrincipal: "#F5EFEA",
  texteSecondaire: "#C2B4AA",

  // Etat de fraicheur d'une fiche, cote client. Vert : confirmee recemment.
  // Ambre : a confirmer. Voir la boucle de fraicheur du backend.
  fraicheurBonne: "#6FCF97",
  fraicheurAVerifier: "#E2B93B",

  // Halo orange diffus en haut d'ecran, degrade radial vers transparent.
  halo: "#FF6B2C2E",
  haloTransparent: "#FF6B2C00",
} as const;

export const espaces = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const rayons = {
  carte: 28,
  tuile: 20,
  pastille: 999,
} as const;

export const typo = {
  famille: "Sora",
  affichage: 34,
  titre: 22,
  tuile: 26,
  corps: 16,
  repere: 14,
  // Plancher absolu : rien en dessous de 13 px. L'ecran est consulte en plein
  // soleil, par des utilisateurs dont l'aisance avec l'ecrit est variable.
  libelle: 13,
} as const;

/**
 * Familles de police.
 *
 * React Native ne synthetise pas les graisses d'une police personnalisee :
 * `fontWeight` reste sans effet et tout s'affiche en Regular. Chaque graisse
 * doit donc etre nommee explicitement.
 */
export const police = {
  normal: "Sora_400Regular",
  moyen: "Sora_500Medium",
  demi: "Sora_600SemiBold",
  gras: "Sora_700Bold",
} as const;

/** Cible tactile minimale. Aucun element interactif ne descend en dessous. */
export const CIBLE_TACTILE_MIN = 48;

export const theme = { couleurs, espaces, rayons, typo } as const;
