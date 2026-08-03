import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from "react-native";
import type { LucideIcon } from "lucide-react-native";

import { couleurs, espaces, police, rayons, typo } from "../theme/tokens";

/**
 * Composants de l'espace marchand et ambassadeur.
 *
 * Ils reprennent les jetons du design client mais avec des cibles nettement
 * plus grandes et moins de texte. La raison est dans le cahier des charges
 * (section 2.4) : la cible est une commercante de 30 a 55 ans, peu a l'aise
 * avec l'ecrit administratif, sur un telephone d'entree de gamme. Le critere de
 * reussite est qu'elle y arrive SEULE, du premier coup.
 *
 * Regles appliquees ici :
 *  - cible tactile de 64 px au minimum, contre 48 cote client ;
 *  - corps de texte a 18 px, jamais en dessous de 15 ;
 *  - un seul choix par ecran quand c'est possible ;
 *  - aucune saisie libre obligatoire au-dela du point de repere.
 */

export const CIBLE_ESPACE = 64;

/**
 * Statut d'une fiche, dit en francais courant.
 *
 * Aucun terme technique ni administratif : « brouillon » devient « pas encore
 * publiee », « en_veille » devient « retiree des resultats ». Le marchand doit
 * comprendre l'etat de sa boutique sans traduction.
 */
export function libelleStatut(statut: string): string {
  switch (statut) {
    case "brouillon":
      return "Pas encore publiée";
    case "active":
      return "Visible par les clients";
    case "a_confirmer":
      return "À confirmer";
    case "en_veille":
      return "Retirée des résultats";
    case "suspendue":
      return "Suspendue";
    case "retiree":
      return "Retirée par vous";
    default:
      return statut;
  }
}

export function GrandBouton({
  libelle,
  Icone,
  onPress,
  variante = "principal",
  desactive,
}: {
  libelle: string;
  Icone?: LucideIcon;
  onPress: () => void;
  variante?: "principal" | "secondaire" | "danger";
  desactive?: boolean;
}) {
  const couleurTexte =
    variante === "principal" ? couleurs.surAccent : couleurs.textePrincipal;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={desactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.grandBouton,
        variante === "principal" && styles.principal,
        variante === "secondaire" && styles.secondaire,
        variante === "danger" && styles.danger,
        pressed && styles.presse,
        desactive && styles.desactive,
      ]}
    >
      {Icone ? <Icone size={24} color={couleurTexte} /> : null}
      <Text style={[styles.grandBoutonTexte, { color: couleurTexte }]}>
        {libelle}
      </Text>
    </Pressable>
  );
}

export function GrandChamp({
  libelle,
  aide,
  valeur,
  onChange,
  placeholder,
  clavier,
  multiligne,
  maxLength,
}: {
  libelle: string;
  aide?: string;
  valeur: string;
  onChange: (v: string) => void;
  placeholder?: string;
  clavier?: KeyboardTypeOptions;
  multiligne?: boolean;
  maxLength?: number;
}) {
  return (
    <View style={styles.champBloc}>
      <Text style={styles.champLibelle}>{libelle}</Text>
      {aide ? <Text style={styles.champAide}>{aide}</Text> : null}
      <TextInput
        style={[styles.champ, multiligne && styles.champMultiligne]}
        value={valeur}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={couleurs.texteSecondaire}
        keyboardType={clavier}
        multiline={multiligne}
        maxLength={maxLength}
        textAlignVertical={multiligne ? "top" : "center"}
      />
    </View>
  );
}

/** Choix unique, une ligne par option, cible pleine largeur. */
export function GrandChoix({
  options,
  valeur,
  onChange,
}: {
  options: { valeur: string; libelle: string; Icone?: LucideIcon }[];
  valeur: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.choix}>
      {options.map((o) => {
        const actif = o.valeur === valeur;
        return (
          <Pressable
            key={o.valeur}
            accessibilityRole="radio"
            accessibilityState={{ selected: actif }}
            onPress={() => onChange(o.valeur)}
            style={({ pressed }) => [
              styles.option,
              actif && styles.optionActive,
              pressed && styles.presse,
            ]}
          >
            {o.Icone ? (
              <View style={[styles.optionIcone, actif && styles.optionIconeActive]}>
                <o.Icone
                  size={24}
                  color={actif ? couleurs.surAccent : couleurs.accentDoux}
                />
              </View>
            ) : null}
            <Text style={[styles.optionTexte, actif && styles.optionTexteActif]}>
              {o.libelle}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Etape({
  numero,
  total,
  titre,
  children,
}: {
  numero: number;
  total: number;
  titre: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.etape}>
      <View style={styles.jauge}>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={[styles.segment, i < numero && styles.segmentAtteint]}
          />
        ))}
      </View>
      <Text style={styles.etapeCompteur}>
        Étape {numero} sur {total}
      </Text>
      <Text style={styles.etapeTitre}>{titre}</Text>
      {children}
    </View>
  );
}

export function Compteur({
  libelle,
  valeur,
  accent,
}: {
  libelle: string;
  valeur: number | string;
  accent?: boolean;
}) {
  return (
    <View style={[styles.compteur, accent && styles.compteurAccent]}>
      <Text style={styles.compteurValeur}>{valeur}</Text>
      <Text style={styles.compteurLibelle}>{libelle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grandBouton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: espaces.sm,
    minHeight: CIBLE_ESPACE,
    borderRadius: rayons.pastille,
    paddingHorizontal: espaces.lg,
  },
  principal: { backgroundColor: couleurs.accent },
  secondaire: { borderWidth: 1.5, borderColor: couleurs.texteSecondaire },
  danger: { borderWidth: 1.5, borderColor: couleurs.fraicheurAVerifier },
  grandBoutonTexte: { fontSize: 18, fontFamily: police.demi },
  presse: { opacity: 0.75 },
  desactive: { opacity: 0.4 },

  champBloc: { gap: 6 },
  champLibelle: {
    color: couleurs.textePrincipal,
    fontSize: 18,
    fontFamily: police.demi,
  },
  champAide: {
    color: couleurs.texteSecondaire,
    fontSize: 15,
    fontFamily: police.normal,
    lineHeight: 15 * 1.4,
  },
  champ: {
    minHeight: CIBLE_ESPACE,
    backgroundColor: couleurs.surface1,
    borderRadius: rayons.tuile,
    paddingHorizontal: espaces.md,
    color: couleurs.textePrincipal,
    fontSize: 18,
    fontFamily: police.normal,
  },
  champMultiligne: { minHeight: 120, paddingVertical: espaces.md },

  choix: { gap: espaces.sm },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaces.sm,
    minHeight: 76,
    paddingHorizontal: espaces.md,
    borderRadius: rayons.tuile,
    backgroundColor: couleurs.surface1,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  optionActive: { borderColor: couleurs.accent, backgroundColor: couleurs.surface2 },
  optionIcone: {
    width: 48,
    height: 48,
    borderRadius: rayons.pastille,
    backgroundColor: couleurs.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  optionIconeActive: { backgroundColor: couleurs.accent },
  optionTexte: {
    flex: 1,
    color: couleurs.textePrincipal,
    fontSize: 18,
    fontFamily: police.moyen,
  },
  optionTexteActif: { fontFamily: police.demi },

  etape: { gap: espaces.md },
  jauge: { flexDirection: "row", gap: 6 },
  segment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: couleurs.surface2,
  },
  segmentAtteint: { backgroundColor: couleurs.accent },
  etapeCompteur: {
    color: couleurs.texteSecondaire,
    fontSize: typo.libelle,
    fontFamily: police.moyen,
    letterSpacing: 0.8,
  },
  etapeTitre: {
    color: couleurs.textePrincipal,
    fontSize: 26,
    fontFamily: police.gras,
    lineHeight: 26 * 1.15,
  },

  compteur: {
    flex: 1,
    gap: 4,
    minHeight: 104,
    justifyContent: "center",
    padding: espaces.md,
    borderRadius: rayons.tuile,
    backgroundColor: couleurs.surface1,
  },
  compteurAccent: { backgroundColor: couleurs.surface2 },
  compteurValeur: {
    color: couleurs.textePrincipal,
    fontSize: 34,
    fontFamily: police.gras,
  },
  compteurLibelle: {
    color: couleurs.texteSecondaire,
    fontSize: typo.repere,
    fontFamily: police.moyen,
  },
});
