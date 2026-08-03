import { useMemo, useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, LocateFixed } from "lucide-react-native";

import { Ecran } from "../src/composants/Ecran";
import { BoutonRond } from "../src/composants/communs";
import { CarteCommerce } from "../src/composants/cartes";
import { useLibellesCategories } from "../src/hooks/useLibelles";
import { useRecherche } from "../src/hooks/useRecherche";
import { CENTRE_LOME, usePosition } from "../src/hooks/usePosition";
import { couleurs, espaces, police, rayons, typo } from "../src/theme/tokens";
import type { Position, ResultatRecherche } from "../src/api/types";

const RAYON_CARTE_M = 3000;
const LARGEUR = Dimensions.get("window").width;

/**
 * Vue de proximite.
 *
 * Le fond cartographique (rues, batiments) n'est pas encore rendu : le
 * fournisseur de tuiles reste a arbitrer, et c'est une decision a consequence
 * financiere durable -- une facturation au chargement de carte, sur un produit
 * dont le revenu par marchand se compte en centaines de francs, doit etre
 * choisie et pas subie.
 *
 * En attendant, les points sont a leur position REELLE les uns par rapport aux
 * autres, projetes autour de l'utilisateur. Rien n'est invente : c'est une vue
 * relative exacte, sans le decor. Le seul point de remplacement est le composant
 * `SurfaceCarte` ci-dessous.
 */
function projeter(
  centre: Position,
  point: Position,
  rayonM: number,
  taille: number,
): { x: number; y: number } {
  const metresParDegreLat = 111_320;
  const metresParDegreLng =
    111_320 * Math.cos((centre.latitude * Math.PI) / 180);

  const dx = (point.longitude - centre.longitude) * metresParDegreLng;
  const dy = (point.latitude - centre.latitude) * metresParDegreLat;

  const echelle = taille / 2 / rayonM;
  return { x: taille / 2 + dx * echelle, y: taille / 2 - dy * echelle };
}

function SurfaceCarte({
  centre,
  marchands,
  rayonM,
  selection,
  onSelectionner,
}: {
  centre: Position;
  marchands: ResultatRecherche[];
  rayonM: number;
  selection: string | null;
  onSelectionner: (id: string) => void;
}) {
  const taille = LARGEUR;

  return (
    <View style={[styles.surface, { height: taille }]}>
      {[0.33, 0.66, 1].map((part) => (
        <View
          key={part}
          style={[
            styles.cercle,
            {
              width: taille * part,
              height: taille * part,
              borderRadius: (taille * part) / 2,
              left: (taille - taille * part) / 2,
              top: (taille - taille * part) / 2,
            },
          ]}
        />
      ))}

      <View style={[styles.moi, { left: taille / 2 - 9, top: taille / 2 - 9 }]} />

      {marchands.map((m) => {
        const { x, y } = projeter(
          centre,
          { latitude: m.latitude, longitude: m.longitude },
          rayonM,
          taille,
        );
        const actif = selection === m.id;
        return (
          <Pressable
            key={m.id}
            accessibilityRole="button"
            accessibilityLabel={m.nom_enseigne}
            onPress={() => onSelectionner(m.id)}
            style={[
              styles.point,
              actif && styles.pointActif,
              { left: x - 23, top: y - 23 },
            ]}
          >
            <Text style={[styles.pointTexte, actif && styles.pointTexteActif]}>
              {m.nom_enseigne.slice(0, 1).toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function Carte() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const etatPosition = usePosition();
  const libelles = useLibellesCategories();
  const [selection, setSelection] = useState<string | null>(null);

  const position =
    etatPosition.statut === "prete" ? etatPosition.position : CENTRE_LOME;

  const recherche = useRecherche({
    position,
    rayonM: RAYON_CARTE_M,
    limite: 50,
  });

  const marchands = useMemo(() => recherche.data ?? [], [recherche.data]);

  return (
    <Ecran avecHalo={false}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + espaces.lg }}>
        <View style={{ height: insets.top + 64 }} />

        <SurfaceCarte
          centre={position}
          marchands={marchands}
          rayonM={RAYON_CARTE_M}
          selection={selection}
          onSelectionner={setSelection}
        />

        <View style={styles.liste}>
          <Text style={styles.intitule}>
            {marchands.length} commerce{marchands.length > 1 ? "s" : ""} dans un
            rayon de 3 km
          </Text>
          {marchands.slice(0, 10).map((m) => (
            <CarteCommerce
              key={m.id}
              marchand={m}
              libelleCategorie={libelles.get(m.categorie_slug)}
              onPress={() => router.push(`/fiche/${m.id}`)}
            />
          ))}
        </View>
      </ScrollView>

      <BoutonRond
        Icone={ArrowLeft}
        etiquette="Retour"
        onPress={() => router.back()}
        style={{ position: "absolute", left: espaces.md, top: insets.top + 8 }}
      />
      <BoutonRond
        Icone={LocateFixed}
        etiquette="Recentrer sur ma position"
        onPress={etatPosition.rafraichir}
        style={{ position: "absolute", right: espaces.md, top: insets.top + 8 }}
      />
    </Ecran>
  );
}

const styles = StyleSheet.create({
  surface: {
    width: "100%",
    backgroundColor: couleurs.surface1,
    overflow: "hidden",
  },
  cercle: {
    position: "absolute",
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  moi: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: couleurs.accent,
    borderWidth: 3,
    borderColor: couleurs.bg,
  },
  point: {
    position: "absolute",
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: couleurs.surface2,
    borderWidth: 1.5,
    borderColor: couleurs.bordure,
    alignItems: "center",
    justifyContent: "center",
  },
  pointActif: { backgroundColor: couleurs.accent, borderColor: couleurs.accent },
  pointTexte: {
    color: couleurs.textePrincipal,
    fontSize: typo.corps,
    fontFamily: police.demi,
  },
  pointTexteActif: { color: couleurs.surAccent },

  liste: { padding: espaces.md, gap: espaces.sm },
  intitule: {
    color: couleurs.textePrincipal,
    fontSize: 15,
    fontFamily: police.demi,
  },
});
