import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import {
  Camera,
  Map as CarteLibre,
  Marker,
  UserLocation,
  type CameraRef,
} from "@maplibre/maplibre-react-native";

import { iconeCategorie } from "../composants/icones";
import { couleurs, rayons } from "../theme/tokens";
import { STYLE_SOMBRE } from "./horsLigne";
import type { Position } from "../api/types";
import { regrouperMarqueurs } from "./clusters";

/**
 * Carte interactive.
 *
 * Ce composant existe pour une raison precise : MapLibre React Native est du
 * code natif, sans equivalent navigateur. Plutot que de dupliquer les ecrans
 * qui affichent une carte, on encapsule la carte elle-meme. Le jumeau web
 * (CarteInteractive.web.tsx) expose exactement la meme interface au-dessus de
 * MapLibre GL JS -- meme moteur de rendu, meme fichier de style, donc le meme
 * visuel des deux cotes.
 */

export interface Marqueur {
  id: string;
  latitude: number;
  longitude: number;
  /** Identifiant d'icone de categorie. */
  icone: string;
  /** Nom lu par le lecteur d'ecran et affiche dans le contexte de l'epingle. */
  libelle?: string;
}

export interface ProprietesCarte {
  centre: Position;
  zoom?: number;
  marqueurs?: Marqueur[];
  selection?: string | null;
  onSelectionner?: (id: string) => void;
  /** Appui sur le fond de carte. Sert au placement manuel d'une boutique. */
  onAppui?: (position: Position) => void;
  onEchecFond?: () => void;
  onFondCharge?: () => void;
  /** Change de valeur pour demander un recentrage anime. */
  recentrerSur?: { position: Position; zoom?: number; cle: number } | null;
  /** Point choisi manuellement, lors de la creation d'une fiche. */
  marqueurPlacement?: Position | null;
  afficherMaPosition?: boolean;
  style?: ViewStyle;
}

export function CarteInteractive({
  centre,
  zoom = 14,
  marqueurs = [],
  selection = null,
  onSelectionner,
  onAppui,
  onEchecFond,
  onFondCharge,
  recentrerSur = null,
  marqueurPlacement = null,
  afficherMaPosition = true,
  style,
}: ProprietesCarte) {
  const camera = useRef<CameraRef>(null);
  const groupes = regrouperMarqueurs(marqueurs, zoom);

  // La carte est creee une fois avec le centre de secours de Lome. Des que le
  // GPS repond, on rejoint naturellement la vraie position au lieu de laisser
  // l'utilisateur au centre de la ville sans explication.
  useEffect(() => {
    camera.current?.flyTo({
      center: [centre.longitude, centre.latitude],
      zoom,
      duration: 500,
    });
  }, [centre.latitude, centre.longitude, zoom]);

  useEffect(() => {
    if (!recentrerSur) return;
    camera.current?.flyTo({
      center: [recentrerSur.position.longitude, recentrerSur.position.latitude],
      zoom: recentrerSur.zoom ?? zoom,
      duration: 600,
    });
  }, [recentrerSur, zoom]);

  return (
    <CarteLibre
      style={[StyleSheet.absoluteFill, style]}
      mapStyle={STYLE_SOMBRE}
      attribution
      onPress={(evenement) => {
        const lngLat = (
          evenement.nativeEvent as unknown as { lngLat?: [number, number] }
        ).lngLat;
        if (lngLat && onAppui) {
          onAppui({ longitude: lngLat[0], latitude: lngLat[1] });
        }
        // Hors creation de fiche, toucher le fond est le geste attendu pour
        // refermer l'apercu et retrouver toute la carte.
        if (!onAppui) onSelectionner?.("");
      }}
      onDidFailLoadingMap={onEchecFond}
      onDidFinishLoadingStyle={onFondCharge}
    >
      <Camera
        ref={camera}
        initialViewState={{
          center: [centre.longitude, centre.latitude],
          zoom,
        }}
      />

      {afficherMaPosition ? <UserLocation /> : null}

      {marqueurPlacement ? (
        <Marker
          lngLat={[marqueurPlacement.longitude, marqueurPlacement.latitude]}
        >
          <EpinglePlacement />
        </Marker>
      ) : null}

      {groupes.map((groupe) => {
        if (groupe.type === "cluster") return <Marker key={groupe.id} lngLat={[groupe.longitude, groupe.latitude]}><Pressable accessibilityRole="button" accessibilityLabel={`${groupe.total} commerces proches`} onPress={() => onSelectionner?.(groupe.membres[0].id)} style={styles.cluster}><View><MarkerTotal total={groupe.total}/></View></Pressable></Marker>;
        const m = groupe.marqueur;
        const Icone = iconeCategorie(m.icone);
        const actif = m.id === selection;
        return (
          <Marker key={m.id} lngLat={[m.longitude, m.latitude]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={m.libelle ?? "Voir ce commerce"}
              accessibilityState={{ selected: actif }}
              onPress={() => onSelectionner?.(m.id)}
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
  );
}

function MarkerTotal({ total }: { total: number }) { return <Text style={styles.clusterTexte}>{total}</Text>; }

/** Epingle simple, sans icone : placement manuel d'une boutique. */
export function EpinglePlacement() {
  return <View style={styles.placement} />;
}

const styles = StyleSheet.create({
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
  cluster: { width: 52, height: 52, borderRadius: 26, backgroundColor: couleurs.accent, borderWidth: 4, borderColor: couleurs.surface1, alignItems: "center", justifyContent: "center" },
  clusterTexte: { color: couleurs.surAccent, fontSize: 15, fontWeight: "800" },
  placement: {
    width: 26,
    height: 26,
    borderRadius: rayons.pastille,
    backgroundColor: couleurs.accent,
    borderWidth: 4,
    borderColor: couleurs.bg,
  },
});
