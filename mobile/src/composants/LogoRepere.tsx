import Svg, { Circle, Path } from "react-native-svg";

import { couleurs } from "../theme/tokens";

/**
 * Signe Koté « Repère ».
 *
 * Cette version vectorielle reprend le choix de logo retenu : un K visible
 * dans un disque terracotta et une pointe bleue qui suggère la direction.
 * Elle reste lisible en petit, notamment pendant l'ouverture de l'app.
 */
export function LogoRepere({ taille = 96 }: { taille?: number }) {
  const hauteur = taille * 1.18;
  return (
    <Svg width={taille} height={hauteur} viewBox="0 0 96 114" accessible accessibilityLabel="Logo Koté">
      <Circle cx="48" cy="43" r="39" fill={couleurs.accent} />
      <Path
        d="M29 20V67M31 46L57 20M38 43L61 67"
        stroke={couleurs.textePrincipal}
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M55 78L81 96L55 112V78Z" fill="#2964DB" />
    </Svg>
  );
}
