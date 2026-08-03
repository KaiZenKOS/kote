import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Camera,
  Map as CarteLibre,
  Marker,
  UserLocation,
  type CameraRef,
} from "@maplibre/maplibre-react-native";
import { ArrowLeft, LocateFixed } from "lucide-react-native";

import { STYLE_SOMBRE } from "../src/carte/horsLigne";
import { BoutonRond } from "../src/composants/communs";
import { CarteCommerce, formaterDistance } from "../src/composants/cartes";
import { iconeCategorie } from "../src/composants/icones";
import { useLibellesCategories } from "../src/hooks/useLibelles";
import { usePrechargementFiche } from "../src/hooks/useFiche";
import { useRecherche } from "../src/hooks/useRecherche";
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
  const camera = useRef<CameraRef>(null);

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

  const recentrer = () => {
    etatPosition.rafraichir();
    camera.current?.flyTo({
      center: [position.longitude, position.latitude],
      zoom: ZOOM_QUARTIER,
      duration: 600,
    });
  };

  return (
    <View style={styles.ecran}>
      <CarteLibre
        style={StyleSheet.absoluteFill}
        mapStyle={STYLE_SOMBRE}
        /**
         * Le style est embarque dans l'application : quelques kilo-octets qui ne
         * repartent jamais sur le reseau. Seules les tuiles voyagent, et elles
         * sont servies par le paquet hors ligne quand il est installe.
         */
        attribution
        onPress={() => setSelection(null)}
        onDidFailLoadingMap={() => setFondIndisponible(true)}
        onDidFinishLoadingStyle={() => setFondIndisponible(false)}
      >
        <Camera
          ref={camera}
          initialViewState={{
            center: [position.longitude, position.latitude],
            zoom: ZOOM_QUARTIER,
          }}
        />

        <UserLocation />

        {marchands.map((m) => {
          const Icone = iconeCategorie(m.categorie_slug);
          const actif = m.id === selection;
          return (
            <Marker key={m.id} lngLat={[m.longitude, m.latitude]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={m.nom_enseigne}
                onPress={() => setSelection(m.id)}
                style={[styles.epingle, actif && styles.epingleActive]}
              >
                <Icone
                  size={20}
                  color={actif ? couleurs.surAccent : couleurs.accentDoux}
                />
              </Pressable>
            </Marker>
          );
        })}
      </CarteLibre>

      <BoutonRond
        Icone={ArrowLeft}
        etiquette="Retour"
        onPress={() => router.back()}
        style={{ position: "absolute", left: espaces.md, top: insets.top + 8 }}
      />
      <BoutonRond
        Icone={LocateFixed}
        etiquette="Recentrer sur ma position"
        onPress={recentrer}
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
            <CarteCommerce
              marchand={selectionne}
              libelleCategorie={libelles.get(selectionne.categorie_slug)}
              onApparait={() => precharger(selectionne.id)}
              onPress={() => router.push(`/fiche/${selectionne.id}`)}
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
                style={styles.vignette}
                onPress={() => {
                  setSelection(m.id);
                  precharger(m.id);
                  camera.current?.flyTo({
                    center: [m.longitude, m.latitude],
                    zoom: 16,
                    duration: 500,
                  });
                }}
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

  epingle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: couleurs.surface2,
    borderWidth: 1.5,
    borderColor: couleurs.bordure,
    alignItems: "center",
    justifyContent: "center",
  },
  epingleActive: {
    backgroundColor: couleurs.accent,
    borderColor: couleurs.accent,
    width: 58,
    height: 58,
    borderRadius: 29,
  },

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
  apercu: { paddingHorizontal: espaces.md },
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
