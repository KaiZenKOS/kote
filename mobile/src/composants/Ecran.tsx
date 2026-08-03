import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import { couleurs } from "../theme/tokens";

/**
 * Halo orange diffus en haut d'ecran, comme une lumiere de fin de journee.
 *
 * Rendu en SVG plutot qu'avec un degrade lineaire : le design est un degrade
 * RADIAL, et l'approximer par un lineaire changerait visiblement l'ambiance.
 * C'est une figure statique, sans cout de rendu apres la premiere passe.
 */
function Halo() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="halo" cx="50%" cy="0%" rx="115%" ry="50%">
          <Stop offset="0" stopColor={couleurs.accent} stopOpacity={0.18} />
          <Stop offset="1" stopColor={couleurs.accent} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#halo)" />
    </Svg>
  );
}

/**
 * Fond commun a tous les ecrans.
 *
 * Aucun flou d'arriere-plan nulle part dans l'application : la profondeur se
 * fait par des surfaces opaques successives. Le verre depoli coute cher en GPU
 * sur les appareils d'entree de gamme qui constituent la cible.
 */
export function Ecran({
  children,
  avecHalo = true,
}: {
  children: ReactNode;
  avecHalo?: boolean;
}) {
  return (
    <View style={styles.fond}>
      {avecHalo ? <Halo /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fond: { flex: 1, backgroundColor: couleurs.bg },
});
