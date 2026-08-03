import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { urlPhoto } from "../api/marchands";
import type { ResultatRecherche } from "../api/types";
import { couleurs, espaces, police, rayons, typo } from "../theme/tokens";
import { PastilleFraicheur } from "./communs";
import { iconeCategorie } from "./icones";

export function formaterDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres / 10) * 10} m`;
  return `${(metres / 1000).toFixed(1).replace(".", ",")} km`;
}

/**
 * Carte de commerce.
 *
 * La photo est carree, a gauche, et ne porte JAMAIS de texte : les photos sont
 * prises au telephone par les commercants eux-memes, souvent mal cadrees et mal
 * exposees. Un titre pose dessus serait illisible une fois sur deux.
 *
 * Le point de repere occupe deux lignes pleines, au meme rang que le nom. Sans
 * adressage de rue a Lome, c'est lui qui permet de trouver la boutique.
 */
export function CarteCommerce({
  marchand,
  libelleCategorie,
  onPress,
  onApparait,
}: {
  marchand: ResultatRecherche;
  libelleCategorie?: string;
  onPress: () => void;
  onApparait?: () => void;
}) {
  const source = urlPhoto(marchand.photo_principale);
  const Icone = iconeCategorie(marchand.categorie_slug);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onLayout={onApparait}
      style={({ pressed }) => [styles.carte, pressed && styles.presse]}
    >
      <View style={styles.photo}>
        {source ? (
          <Image
            source={{ uri: source }}
            style={styles.photoImage}
            resizeMode="cover"
          />
        ) : (
          <Icone size={28} color={couleurs.texteSecondaire} />
        )}
      </View>

      <View style={styles.corps}>
        <Text style={styles.nom} numberOfLines={1}>
          {marchand.nom_enseigne}
        </Text>
        <Text style={styles.meta}>
          {libelleCategorie ?? marchand.categorie_slug} ·{" "}
          {formaterDistance(marchand.distance_m)}
        </Text>
        <Text style={styles.repere} numberOfLines={2}>
          {marchand.repere}
        </Text>
        <PastilleFraicheur jours={marchand.jours_depuis_confirmation} />
      </View>
    </Pressable>
  );
}

/**
 * Puce de categorie.
 *
 * Le compteur n'est pas decoratif : il annonce a l'avance si la categorie
 * donnera un resultat dans le rayon. Une puce a zero evite un aller-retour
 * inutile, donc de la donnee depensee pour rien.
 */
export function PuceCategorie({
  libelle,
  identifiantIcone,
  nombre,
  onPress,
}: {
  libelle: string;
  identifiantIcone: string;
  nombre: number;
  onPress: () => void;
}) {
  const Icone = iconeCategorie(identifiantIcone);
  const vide = nombre === 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${libelle}, ${nombre} ouverts`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.puce,
        pressed && styles.presse,
        vide && styles.puceVide,
      ]}
    >
      <View style={styles.puceIcone}>
        <Icone size={20} color={couleurs.accentDoux} />
      </View>
      <Text style={styles.puceLibelle} numberOfLines={2}>
        {libelle}
      </Text>
      <Text style={styles.puceCompte}>
        {nombre === 0
          ? "aucun"
          : `${nombre} ${nombre > 1 ? "ouverts" : "ouvert"}`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  carte: {
    flexDirection: "row",
    gap: espaces.sm,
    backgroundColor: couleurs.surface1,
    borderRadius: rayons.carte,
    padding: espaces.sm,
  },
  presse: { opacity: 0.75 },
  photo: {
    width: 96,
    height: 96,
    borderRadius: rayons.tuile,
    backgroundColor: couleurs.surface2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoImage: { width: "100%", height: "100%" },
  corps: { flex: 1, gap: 6, justifyContent: "center" },
  nom: {
    color: couleurs.textePrincipal,
    fontSize: typo.corps,
    fontFamily: police.demi,
  },
  meta: {
    color: couleurs.texteSecondaire,
    fontSize: typo.libelle,
    fontFamily: police.moyen,
  },
  repere: {
    color: couleurs.texteSecondaire,
    fontSize: typo.repere,
    fontFamily: police.normal,
    lineHeight: typo.repere * 1.35,
  },

  puce: {
    flex: 1,
    minHeight: 112,
    backgroundColor: couleurs.surface1,
    borderRadius: rayons.tuile,
    padding: espaces.md,
    gap: espaces.xs,
  },
  puceVide: { opacity: 0.55 },
  puceIcone: {
    width: 44,
    height: 44,
    borderRadius: rayons.pastille,
    backgroundColor: couleurs.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  puceLibelle: {
    color: couleurs.textePrincipal,
    fontSize: typo.libelle,
    fontFamily: police.demi,
    lineHeight: typo.libelle * 1.25,
  },
  puceCompte: {
    color: couleurs.texteSecondaire,
    fontSize: typo.libelle,
    fontFamily: police.moyen,
  },
});
