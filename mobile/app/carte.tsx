import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, LocateFixed, Navigation, X } from "lucide-react-native";

import { CarteInteractive } from "../src/carte/CarteInteractive";
import { BoutonRond, BoutonSecondaire } from "../src/composants/communs";
import { CarteCommerce, formaterDistance } from "../src/composants/cartes";
import { useLibellesCategories } from "../src/hooks/useLibelles";
import { usePrechargementFiche } from "../src/hooks/useFiche";
import { useRecherche } from "../src/hooks/useRecherche";
import { useItineraire } from "../src/hooks/useActions";
import { CENTRE_LOME, usePosition } from "../src/hooks/usePosition";
import { couleurs, espaces, police, rayons, typo } from "../src/theme/tokens";

const RAYON_CARTE_M = 3000;
const ZOOM_QUARTIER = 14;

export default function Carte() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const etatPosition = usePosition();
  const libelles = useLibellesCategories();
  const precharger = usePrechargementFiche();
  const ouvrirItineraire = useItineraire();
  const [recentrage, setRecentrage] = useState<{
    position: { latitude: number; longitude: number };
    zoom?: number;
    cle: number;
  } | null>(null);

  const [selection, setSelection] = useState<string | null>(null);
  /**
   * Le fond de carte peut ne pas se charger : pas de reseau, ou paquet hors
   * ligne absent. Ce n'est pas une panne mais un cas nominal ici -- et il ne
   * doit jamais bloquer l'ecran. Les commerces, eux, viennent du cache et
   * restent affichables : c'est la liste qui compte, pas le decor.
   */
  const [fondIndisponible, setFondIndisponible] = useState(false);

  const position =
    etatPosition.statut === "prete" ? etatPosition.position : CENTRE_LOME;

  const recherche = useRecherche({
    position,
    rayonM: RAYON_CARTE_M,
    limite: 50,
  });

  const marchands = useMemo(() => recherche.data ?? [], [recherche.data]);
  const selectionne = useMemo(
    () => marchands.find((m) => m.id === selection) ?? null,
    [marchands, selection],
  );

  const recentrer = async () => {
    const positionActuelle = await etatPosition.rafraichir();
    setSelection(null);
    setRecentrage({
      position: positionActuelle ?? position,
      zoom: ZOOM_QUARTIER,
      cle: Date.now(),
    });
  };

  const selectionner = (id: string | null) => {
    const marchand = marchands.find((item) => item.id === id);
    setSelection(id);
    if (!marchand) return;
    precharger(marchand.id);
    setRecentrage({
      position: { latitude: marchand.latitude, longitude: marchand.longitude },
      zoom: 16,
      cle: Date.now(),
    });
  };

  return (
    <View style={styles.ecran}>
      <CarteInteractive
        centre={position}
        zoom={ZOOM_QUARTIER}
        marqueurs={marchands.map((m) => ({
          id: m.id,
          latitude: m.latitude,
          longitude: m.longitude,
          icone: m.categorie_slug,
          libelle: m.nom_enseigne,
        }))}
        selection={selection}
        onSelectionner={(id) => selectionner(id || null)}
        onEchecFond={() => setFondIndisponible(true)}
        onFondCharge={() => setFondIndisponible(false)}
        recentrerSur={recentrage}
      />

      <BoutonRond
        Icone={ArrowLeft}
        etiquette="Retour"
        onPress={() => router.back()}
        style={{ position: "absolute", left: espaces.md, top: insets.top + 8 }}
      />
      <BoutonRond
        Icone={LocateFixed}
        etiquette="Recentrer sur ma position"
        onPress={() => void recentrer()}
        style={{ position: "absolute", right: espaces.md, top: insets.top + 8 }}
      />

      {fondIndisponible ? (
        <View style={[styles.avis, { top: insets.top + 8 + 48 + espaces.sm }]}>
          <Text style={styles.avisTexte}>
            Fond de carte indisponible sans connexion. Les commerces et leurs
            points de repère restent accessibles ci-dessous.
          </Text>
        </View>
      ) : null}

      <View style={[styles.bas, { paddingBottom: insets.bottom + espaces.sm }]}>
        {selectionne ? (
          <View style={styles.apercu}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fermer l'aperçu du commerce"
              onPress={() => setSelection(null)}
              hitSlop={10}
              style={styles.fermerApercu}
            >
              <X size={18} color={couleurs.textePrincipal} />
            </Pressable>
            <CarteCommerce
              marchand={selectionne}
              libelleCategorie={libelles.get(selectionne.categorie_slug)}
              onApparait={() => precharger(selectionne.id)}
              onPress={() => router.push(`/fiche/${selectionne.id}`)}
            />
            <BoutonSecondaire
              libelle="Lancer l'itinéraire"
              Icone={Navigation}
              onPress={() =>
                void ouvrirItineraire(
                  selectionne.id,
                  selectionne.latitude,
                  selectionne.longitude,
                  etatPosition.statut === "prete" ? etatPosition.position : null,
                )
              }
            />
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.bandeau}
          >
            {marchands.slice(0, 12).map((m) => (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                onPress={() => {
                  selectionner(m.id);
                }}
                accessibilityState={{ selected: selection === m.id }}
                style={({ pressed }) => [
                  styles.vignette,
                  selection === m.id && styles.vignetteActive,
                  pressed && styles.vignettePresse,
                ]}
              >
                <Text style={styles.vignetteNom} numberOfLines={1}>
                  {m.nom_enseigne}
                </Text>
                <Text style={styles.vignetteMeta}>
                  {formaterDistance(m.distance_m)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: couleurs.bg },


  avis: {
    position: "absolute",
    left: espaces.md,
    right: espaces.md,
    padding: espaces.sm,
    borderRadius: rayons.tuile,
    backgroundColor: couleurs.surface2,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  avisTexte: {
    color: couleurs.texteSecondaire,
    fontSize: typo.libelle,
    fontFamily: police.moyen,
    lineHeight: typo.libelle * 1.4,
  },

  bas: { position: "absolute", left: 0, right: 0, bottom: 0 },
  apercu: { paddingHorizontal: espaces.md, position: "relative", gap: espaces.xs },
  fermerApercu: {
    position: "absolute",
    zIndex: 2,
    right: espaces.lg,
    top: espaces.xs,
    width: 36,
    height: 36,
    borderRadius: rayons.pastille,
    backgroundColor: couleurs.surface1,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    alignItems: "center",
    justifyContent: "center",
  },
  bandeau: { paddingHorizontal: espaces.md, gap: espaces.xs },
  vignette: {
    minHeight: 56,
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: espaces.md,
    paddingVertical: espaces.xs,
    borderRadius: rayons.pastille,
    backgroundColor: couleurs.surface2,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    maxWidth: 220,
  },
  vignetteActive: { borderColor: couleurs.accent, backgroundColor: couleurs.surface1 },
  vignettePresse: { opacity: 0.72 },
  vignetteNom: {
    color: couleurs.textePrincipal,
    fontSize: typo.repere,
    fontFamily: police.demi,
  },
  vignetteMeta: {
    color: couleurs.texteSecondaire,
    fontSize: typo.libelle,
    fontFamily: police.moyen,
  },
});
