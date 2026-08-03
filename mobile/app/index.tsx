import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useCategories, useComptages } from "../src/hooks/useCategories";
import { useRecherche } from "../src/hooks/useRecherche";
import { usePrechargementFiche } from "../src/hooks/useFiche";
import { CENTRE_LOME, usePosition } from "../src/hooks/usePosition";
import { urlPhoto } from "../src/api/marchands";
import { couleurs, espaces, rayons, typo } from "../src/theme/tokens";
import type { ResultatRecherche } from "../src/api/types";

const RAYON_DEFAUT_M = 1000;

export default function Accueil() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const etatPosition = usePosition();
  const [requete, setRequete] = useState("");

  const position = useMemo(
    () => (etatPosition.statut === "prete" ? etatPosition.position : CENTRE_LOME),
    [etatPosition],
  );

  const categories = useCategories();
  const comptages = useComptages(position, RAYON_DEFAUT_M);
  const proches = useRecherche({ position, rayonM: RAYON_DEFAUT_M, limite: 3 });
  const precharger = usePrechargementFiche();

  const pastilles = useMemo(() => {
    const parSlug = new Map(
      (comptages.data ?? []).map((c) => [c.categorie_slug, c.nombre]),
    );
    return (categories.data ?? []).map((c) => ({
      slug: c.slug,
      libelle: c.libelle_fr,
      nombre: parSlug.get(c.slug) ?? 0,
    }));
  }, [categories.data, comptages.data]);

  return (
    <ScrollView
      style={styles.ecran}
      contentContainerStyle={[
        styles.contenu,
        { paddingTop: insets.top + espaces.xs, paddingBottom: insets.bottom + espaces.xl },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.entete}>
        <Text style={styles.marque}>Koté</Text>
        <Text style={styles.salutation}>Bonjour</Text>
      </View>

      <TextInput
        style={styles.recherche}
        placeholder="Que cherchez-vous ? Couturière, mécanicien..."
        placeholderTextColor={couleurs.texteSecondaire}
        value={requete}
        onChangeText={setRequete}
        returnKeyType="search"
        onSubmitEditing={() =>
          router.push({ pathname: "/resultats", params: { q: requete } })
        }
      />

      <Text style={styles.section}>Catégories</Text>
      {categories.isPending ? (
        <ActivityIndicator color={couleurs.accent} />
      ) : (
        <View style={styles.grille}>
          {pastilles.map((p) => (
            <Pressable
              key={p.slug}
              style={styles.puce}
              onPress={() =>
                router.push({
                  pathname: "/resultats",
                  params: { categorie: p.slug },
                })
              }
            >
              <Text style={styles.puceLibelle}>{p.libelle}</Text>
              <Text style={styles.puceCompte}>
                {p.nombre} {p.nombre > 1 ? "ouverts" : "ouvert"}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={styles.section}>Près de vous</Text>
      {proches.isPending ? (
        <ActivityIndicator color={couleurs.accent} />
      ) : (
        (proches.data ?? []).map((m) => (
          <CarteCommerce
            key={m.id}
            marchand={m}
            onVisible={() => precharger(m.id)}
            onPress={() => router.push(`/fiche/${m.id}`)}
          />
        ))
      )}
    </ScrollView>
  );
}

function CarteCommerce({
  marchand,
  onPress,
  onVisible,
}: {
  marchand: ResultatRecherche;
  onPress: () => void;
  onVisible: () => void;
}) {
  const fraiche = marchand.jours_depuis_confirmation <= 90;

  return (
    <Pressable style={styles.carte} onPress={onPress} onLayout={onVisible}>
      <View style={styles.photo}>
        {urlPhoto(marchand.photo_principale) ? null : (
          <Text style={styles.photoVide}>—</Text>
        )}
      </View>
      <View style={styles.carteCorps}>
        <Text style={styles.carteNom} numberOfLines={1}>
          {marchand.nom_enseigne}
        </Text>
        <Text style={styles.carteMeta}>
          {marchand.categorie_slug} · {formaterDistance(marchand.distance_m)}
        </Text>
        <Text style={styles.carteRepere} numberOfLines={2}>
          {marchand.repere}
        </Text>
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
            {fraiche
              ? `confirmé il y a ${marchand.jours_depuis_confirmation} jours`
              : "à confirmer"}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function formaterDistance(metres: number): string {
  return metres < 1000 ? `${metres} m` : `${(metres / 1000).toFixed(1)} km`;
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.bg },
  contenu: { paddingHorizontal: espaces.md, gap: espaces.lg },

  entete: { flexDirection: "row", alignItems: "baseline", gap: espaces.sm },
  marque: {
    color: couleurs.accent,
    fontSize: typo.libelle,
    fontWeight: "600",
    letterSpacing: 1,
  },
  salutation: { color: couleurs.texteSecondaire, fontSize: typo.corps },

  recherche: {
    minHeight: 56,
    backgroundColor: couleurs.surface1,
    borderRadius: rayons.pastille,
    paddingHorizontal: espaces.lg,
    color: couleurs.textePrincipal,
    fontSize: typo.corps,
  },

  section: {
    color: couleurs.textePrincipal,
    fontSize: typo.titre,
    fontWeight: "700",
  },

  grille: { flexDirection: "row", flexWrap: "wrap", gap: espaces.sm },
  puce: {
    minWidth: 112,
    minHeight: 88,
    flexGrow: 1,
    flexBasis: "30%",
    backgroundColor: couleurs.surface1,
    borderRadius: rayons.tuile,
    padding: espaces.md,
    gap: espaces.xs,
    justifyContent: "center",
  },
  puceLibelle: {
    color: couleurs.textePrincipal,
    fontSize: typo.libelle,
    fontWeight: "600",
  },
  puceCompte: { color: couleurs.texteSecondaire, fontSize: typo.libelle },

  carte: {
    flexDirection: "row",
    gap: espaces.sm,
    backgroundColor: couleurs.surface1,
    borderRadius: rayons.carte,
    padding: espaces.sm,
  },
  photo: {
    width: 96,
    height: 96,
    borderRadius: rayons.tuile,
    backgroundColor: couleurs.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  photoVide: { color: couleurs.texteSecondaire, fontSize: typo.titre },
  carteCorps: { flex: 1, gap: 6, justifyContent: "center" },
  carteNom: {
    color: couleurs.textePrincipal,
    fontSize: typo.corps,
    fontWeight: "700",
  },
  carteMeta: { color: couleurs.texteSecondaire, fontSize: typo.libelle },
  carteRepere: {
    color: couleurs.texteSecondaire,
    fontSize: typo.repere,
    lineHeight: 19,
  },

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
  pastilleTexte: { color: couleurs.texteSecondaire, fontSize: typo.libelle },
});
