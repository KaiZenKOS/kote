import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import type { LucideIcon } from "lucide-react-native";

import {
  CIBLE_TACTILE_MIN,
  couleurs,
  espaces,
  police,
  rayons,
  typo,
} from "../theme/tokens";

/* -------------------------------------------------------------------------
 * Pastille de fraicheur
 *
 * Ce n'est pas un ornement. C'est la traduction visible de la boucle de
 * fraicheur du backend : elle dit au client si la fiche a ete confirmee
 * recemment, donc si le deplacement vaut la peine. Un client qui se deplace
 * pour rien ne revient pas.
 * ------------------------------------------------------------------------- */

export function PastilleFraicheur({ jours }: { jours: number }) {
  const fraiche = jours <= 90;
  return (
    <View style={styles.pastille}>
      <View
        style={[
          styles.point,
          {
            backgroundColor: fraiche
              ? couleurs.fraicheurBonne
              : couleurs.fraicheurAVerifier,
          },
        ]}
      />
      <Text style={styles.pastilleTexte}>
        {fraiche ? `confirmé il y a ${jours} jours` : "à confirmer"}
      </Text>
    </View>
  );
}

/* -------------------------------------------------------------------------
 * Tuile d'information
 * ------------------------------------------------------------------------- */

export function TuileInfo({
  libelle,
  valeur,
  taille = typo.tuile,
}: {
  libelle: string;
  valeur: string;
  taille?: number;
}) {
  return (
    <View style={styles.tuile}>
      <Text style={styles.tuileLibelle}>{libelle}</Text>
      <Text style={[styles.tuileValeur, { fontSize: taille }]}>{valeur}</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------
 * Boutons
 * ------------------------------------------------------------------------- */

export function BoutonPrincipal({
  libelle,
  Icone,
  onPress,
  desactive,
}: {
  libelle: string;
  Icone?: LucideIcon;
  onPress: () => void;
  desactive?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={desactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.bouton,
        styles.boutonPrincipal,
        pressed && styles.presse,
        desactive && styles.desactive,
      ]}
    >
      {Icone ? <Icone size={20} color={couleurs.surAccent} /> : null}
      <Text style={styles.boutonPrincipalTexte}>{libelle}</Text>
    </Pressable>
  );
}

export function BoutonSecondaire({
  libelle,
  Icone,
  onPress,
}: {
  libelle: string;
  Icone?: LucideIcon;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.bouton,
        styles.boutonSecondaire,
        pressed && styles.presse,
      ]}
    >
      {Icone ? <Icone size={20} color={couleurs.textePrincipal} /> : null}
      <Text style={styles.boutonSecondaireTexte}>{libelle}</Text>
    </Pressable>
  );
}

export function LienDiscret({
  libelle,
  onPress,
}: {
  libelle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={styles.lienZone}
    >
      <Text style={styles.lienTexte}>{libelle}</Text>
    </Pressable>
  );
}

/** Bouton rond flottant : retour, recentrage, favori. */
export function BoutonRond({
  Icone,
  onPress,
  style,
  etiquette,
}: {
  Icone: LucideIcon;
  onPress: () => void;
  style?: ViewStyle;
  etiquette: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiquette}
      onPress={onPress}
      style={({ pressed }) => [styles.rond, style, pressed && styles.presse]}
    >
      <Icone size={22} color={couleurs.textePrincipal} />
    </Pressable>
  );
}

/* -------------------------------------------------------------------------
 * Etat plein ecran : hors ligne, erreur, introuvable, aucun resultat.
 *
 * Ces quatre ecrans partagent une regle : ils disent ce qui se passe, dedouanent
 * l'utilisateur, et proposent une sortie. Jamais un message technique.
 * ------------------------------------------------------------------------- */

export function EtatPleinEcran({
  Icone,
  titre,
  message,
  action,
  lien,
}: {
  Icone: LucideIcon;
  titre: string;
  message: string;
  action?: { libelle: string; Icone?: LucideIcon; onPress: () => void };
  lien?: { libelle: string; onPress: () => void };
}) {
  return (
    <View style={styles.etat}>
      <View style={styles.medaillon}>
        <Icone size={40} color={couleurs.accentDoux} />
      </View>
      <View style={styles.etatTextes}>
        <Text style={styles.etatTitre}>{titre}</Text>
        <Text style={styles.etatMessage}>{message}</Text>
      </View>
      {action ? (
        <BoutonSecondaire
          libelle={action.libelle}
          Icone={action.Icone}
          onPress={action.onPress}
        />
      ) : null}
      {lien ? <LienDiscret libelle={lien.libelle} onPress={lien.onPress} /> : null}
    </View>
  );
}

/** En-tete de section reutilise par plusieurs ecrans. */
export function TitreSection({
  children,
  action,
}: {
  children: ReactNode;
  action?: { libelle: string; onPress: () => void };
}) {
  return (
    <View style={styles.ligneTitre}>
      <Text style={styles.titreSection}>{children}</Text>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={12}>
          <Text style={styles.lienTexte}>{action.libelle}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pastille: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaces.xs,
    alignSelf: "flex-start",
    backgroundColor: couleurs.surface2,
    borderRadius: rayons.pastille,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  point: { width: 8, height: 8, borderRadius: 4 },
  pastilleTexte: {
    color: couleurs.texteSecondaire,
    fontSize: typo.libelle,
    fontFamily: police.moyen,
  },

  tuile: {
    flex: 1,
    backgroundColor: couleurs.surface2,
    borderRadius: rayons.tuile,
    padding: espaces.md,
    gap: 4,
    justifyContent: "center",
  },
  tuileLibelle: {
    color: couleurs.texteSecondaire,
    fontSize: typo.libelle,
    fontFamily: police.moyen,
    letterSpacing: 0.8,
  },
  tuileValeur: { color: couleurs.textePrincipal, fontFamily: police.demi },

  bouton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: espaces.xs,
    minHeight: 52,
    borderRadius: rayons.pastille,
    paddingVertical: espaces.md,
    paddingHorizontal: espaces.lg,
  },
  boutonPrincipal: { backgroundColor: couleurs.accent },
  boutonPrincipalTexte: {
    color: couleurs.surAccent,
    fontSize: typo.corps,
    fontFamily: police.demi,
  },
  boutonSecondaire: {
    borderWidth: 1.5,
    borderColor: couleurs.texteSecondaire,
  },
  boutonSecondaireTexte: {
    color: couleurs.textePrincipal,
    fontSize: typo.corps,
    fontFamily: police.demi,
  },
  presse: { opacity: 0.7 },
  desactive: { opacity: 0.45 },

  lienZone: {
    minHeight: CIBLE_TACTILE_MIN,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: espaces.sm,
  },
  lienTexte: {
    color: couleurs.accentDoux,
    fontSize: typo.repere,
    fontFamily: police.demi,
  },

  rond: {
    width: CIBLE_TACTILE_MIN,
    height: CIBLE_TACTILE_MIN,
    borderRadius: rayons.pastille,
    backgroundColor: couleurs.surface1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },

  etat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: espaces.lg,
    paddingHorizontal: espaces.xl,
    paddingVertical: espaces.lg,
  },
  medaillon: {
    width: 96,
    height: 96,
    borderRadius: rayons.pastille,
    backgroundColor: couleurs.surface2,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    alignItems: "center",
    justifyContent: "center",
  },
  etatTextes: { gap: espaces.xs, alignItems: "center" },
  etatTitre: {
    color: couleurs.textePrincipal,
    fontSize: typo.titre,
    fontFamily: police.demi,
    textAlign: "center",
  },
  etatMessage: {
    color: couleurs.texteSecondaire,
    fontSize: typo.corps,
    fontFamily: police.normal,
    lineHeight: typo.corps * 1.4,
    textAlign: "center",
  },

  ligneTitre: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: espaces.sm,
  },
  titreSection: {
    color: couleurs.textePrincipal,
    fontSize: typo.titre,
    fontFamily: police.demi,
  },
});
