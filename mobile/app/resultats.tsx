import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Maximize2,
  RefreshCw,
  Search,
  SearchX,
  TriangleAlert,
  WifiOff,
  X,
} from "lucide-react-native";

import { Ecran } from "../src/composants/Ecran";
import { BoutonRond, EtatPleinEcran } from "../src/composants/communs";
import { CarteCommerce } from "../src/composants/cartes";
import { usePrechargementFiche } from "../src/hooks/useFiche";
import { useLibellesCategories } from "../src/hooks/useLibelles";
import { useRecherche } from "../src/hooks/useRecherche";
import { CENTRE_LOME, usePosition } from "../src/hooks/usePosition";
import { estEnLigne } from "../src/query/reseau";
import { couleurs, espaces, police, rayons, typo } from "../src/theme/tokens";

const RAYONS = [
  { m: 500, libelle: "500 m" },
  { m: 1000, libelle: "1 km" },
  { m: 3000, libelle: "3 km" },
];

export default function Resultats() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const parametres = useLocalSearchParams<{ q?: string; categorie?: string }>();
  const etatPosition = usePosition();

  const [saisie, setSaisie] = useState(parametres.q ?? "");
  const [categorie, setCategorie] = useState<string | null>(
    parametres.categorie ?? null,
  );
  const [rayonM, setRayonM] = useState(1000);

  const position =
    etatPosition.statut === "prete" ? etatPosition.position : CENTRE_LOME;

  const libelles = useLibellesCategories();
  const precharger = usePrechargementFiche();

  const recherche = useRecherche({
    position,
    rayonM,
    categorie,
    q: saisie.trim() || null,
  });

  const resultats = recherche.data ?? [];

  const intitule = useMemo(() => {
    const nombre = resultats.length;
    const quoi = categorie ? libelles.get(categorie)?.toLowerCase() : null;
    if (nombre === 0) return "Aucun commerce dans ce rayon";
    const objet = quoi ?? "commerces";
    return `${nombre} ${nombre > 1 ? objet : objet.replace(/s$/, "")} ${
      nombre > 1 ? "ouverts" : "ouvert"
    } près de vous`;
  }, [resultats.length, categorie, libelles]);

  const filtresActifs = Boolean(categorie) || saisie.trim().length > 0;

  const enTete = (
    <View style={styles.enTete}>
      <View style={styles.ligneRecherche}>
        <BoutonRond
          Icone={ArrowLeft}
          etiquette="Retour"
          onPress={() => router.back()}
        />
        <View style={styles.champ}>
          <Search size={20} color={couleurs.texteSecondaire} />
          <TextInput
            style={styles.champTexte}
            value={saisie}
            onChangeText={setSaisie}
            placeholder="Rechercher"
            placeholderTextColor={couleurs.texteSecondaire}
            returnKeyType="search"
          />
          {saisie.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Effacer la recherche"
              onPress={() => setSaisie("")}
              style={styles.effacer}
            >
              <X size={20} color={couleurs.texteSecondaire} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.puces}>
        {RAYONS.map((r) => {
          const actif = r.m === rayonM;
          return (
            <Pressable
              key={r.m}
              accessibilityRole="button"
              onPress={() => setRayonM(r.m)}
              style={[styles.puce, actif && styles.puceActive]}
            >
              <Text style={[styles.puceTexte, actif && styles.puceTexteActif]}>
                {r.libelle}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.intitule}>{intitule}</Text>
    </View>
  );

  const contenuVide = () => {
    if (recherche.isPending) {
      return <ActivityIndicator color={couleurs.accent} style={styles.chargement} />;
    }

    if (recherche.isError) {
      const horsLigne = !estEnLigne();
      return (
        <EtatPleinEcran
          Icone={horsLigne ? WifiOff : TriangleAlert}
          titre={horsLigne ? "Pas de connexion" : "Une erreur est survenue"}
          message={
            horsLigne
              ? "Vérifiez votre connexion. Koté se charge avec très peu de données — il suffit d'un petit signal pour retrouver les commerces autour de vous."
              : "Quelque chose n'a pas fonctionné de notre côté. Ce n'est pas vous. Réessayez dans un instant."
          }
          action={{
            libelle: "Réessayer",
            Icone: RefreshCw,
            onPress: () => void recherche.refetch(),
          }}
        />
      );
    }

    return (
      <EtatPleinEcran
        Icone={SearchX}
        titre="Aucun commerce trouvé"
        message={`Aucun résultat${
          saisie.trim() ? ` pour « ${saisie.trim()} »` : ""
        } dans un rayon de ${
          RAYONS.find((r) => r.m === rayonM)?.libelle ?? "1 km"
        }. Élargissez la zone ou essayez une autre catégorie.`}
        action={
          rayonM < 3000
            ? {
                libelle: "Élargir à 3 km",
                Icone: Maximize2,
                onPress: () => setRayonM(3000),
              }
            : undefined
        }
        lien={
          filtresActifs
            ? {
                libelle: "Effacer les filtres",
                onPress: () => {
                  setSaisie("");
                  setCategorie(null);
                },
              }
            : undefined
        }
      />
    );
  };

  return (
    <Ecran>
      <FlatList
        data={resultats}
        keyExtractor={(m) => m.id}
        ListHeaderComponent={enTete}
        ListEmptyComponent={contenuVide}
        contentContainerStyle={[
          styles.liste,
          {
            paddingTop: insets.top + espaces.xs,
            paddingBottom: insets.bottom + espaces.lg,
          },
          resultats.length === 0 && styles.listeVide,
        ]}
        keyboardShouldPersistTaps="handled"
        /**
         * Reglages de liste calibres pour un Android d'entree de gamme :
         * on monte peu d'elements a la fois et on libere ceux qui sortent de
         * l'ecran, sinon le defilement saccade des la vingtaine de cartes.
         */
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
        removeClippedSubviews
        renderItem={({ item }) => (
          <CarteCommerce
            marchand={item}
            libelleCategorie={libelles.get(item.categorie_slug)}
            onApparait={() => precharger(item.id)}
            onPress={() => router.push(`/fiche/${item.id}`)}
          />
        )}
      />
    </Ecran>
  );
}

const styles = StyleSheet.create({
  liste: { paddingHorizontal: espaces.md, gap: espaces.sm },
  listeVide: { flexGrow: 1 },
  chargement: { marginTop: espaces.xl },

  enTete: { gap: espaces.md, paddingBottom: espaces.xs },
  ligneRecherche: { flexDirection: "row", alignItems: "center", gap: espaces.xs },
  champ: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: espaces.sm,
    minHeight: 52,
    backgroundColor: couleurs.surface1,
    borderRadius: rayons.pastille,
    paddingHorizontal: espaces.md,
  },
  champTexte: {
    flex: 1,
    color: couleurs.textePrincipal,
    fontSize: typo.corps,
    fontFamily: police.normal,
  },
  effacer: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  puces: { flexDirection: "row", gap: espaces.xs },
  puce: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: espaces.md,
    borderRadius: rayons.pastille,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  puceActive: { backgroundColor: couleurs.surface2 },
  puceTexte: {
    color: couleurs.texteSecondaire,
    fontSize: typo.repere,
    fontFamily: police.moyen,
  },
  puceTexteActif: { color: couleurs.textePrincipal },

  intitule: {
    color: couleurs.textePrincipal,
    fontSize: 15,
    fontFamily: police.demi,
  },
});
