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
// `Map` est renomme : l'import masquerait le constructeur Map de JavaScript,
// utilise plus bas pour indexer les comptages.
import {
  Map as IconeCarte,
  MapPin,
  RefreshCw,
  Search,
  UserRound,
  WifiOff,
} from "lucide-react-native";

import { Ecran } from "../src/composants/Ecran";
import { EtatPleinEcran, TitreSection } from "../src/composants/communs";
import { CarteCommerce, PuceCategorie } from "../src/composants/cartes";
import { useCategories, useComptages } from "../src/hooks/useCategories";
import { usePrechargementFiche } from "../src/hooks/useFiche";
import { useSession } from "../src/hooks/useSession";
import { useLibellesCategories } from "../src/hooks/useLibelles";
import { useRecherche } from "../src/hooks/useRecherche";
import { CENTRE_LOME, usePosition } from "../src/hooks/usePosition";
import { couleurs, espaces, police, rayons, typo } from "../src/theme/tokens";

const RAYON_ACCUEIL_M = 1000;

function salutation(): string {
  const heure = new Date().getHours();
  if (heure < 12) return "Bonjour";
  if (heure < 18) return "Bon après-midi";
  return "Bonsoir";
}

export default function Accueil() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const etatPosition = usePosition();
  const [saisie, setSaisie] = useState("");

  const positionConnue =
    etatPosition.statut === "prete" ? etatPosition.position : null;
  const position = positionConnue ?? CENTRE_LOME;

  const categories = useCategories();
  const comptages = useComptages(position, RAYON_ACCUEIL_M);
  const proches = useRecherche({
    position,
    rayonM: RAYON_ACCUEIL_M,
    limite: 3,
  });
  const libelles = useLibellesCategories();
  const precharger = usePrechargementFiche();
  const session = useSession();

  const puces = useMemo(() => {
    const parSlug = new Map(
      (comptages.data ?? []).map((c) => [c.categorie_slug, c.nombre]),
    );
    return (categories.data ?? []).map((c) => ({
      slug: c.slug,
      libelle: c.libelle_fr,
      icone: c.icone,
      nombre: parSlug.get(c.slug) ?? 0,
    }));
  }, [categories.data, comptages.data]);

  const rangees = useMemo(() => {
    const paquets: (typeof puces)[] = [];
    for (let i = 0; i < puces.length; i += 3) paquets.push(puces.slice(i, i + 3));
    return paquets;
  }, [puces]);

  const lancerRecherche = () => {
    const q = saisie.trim();
    if (!q) return;
    router.push({ pathname: "/resultats", params: { q } });
  };

  /**
   * Aucune donnee et aucune connexion : c'est le seul cas ou l'on bloque
   * l'ecran. Des qu'il existe un cache, meme ancien, on prefere l'afficher --
   * une liste d'hier vaut mieux qu'un ecran vide.
   */
  if (categories.isError && !categories.data) {
    return (
      <Ecran>
        <View style={{ paddingTop: insets.top, flex: 1 }}>
          <EtatPleinEcran
            Icone={WifiOff}
            titre="Pas de connexion"
            message="Vérifiez votre connexion. Koté se charge avec très peu de données — il suffit d'un petit signal pour retrouver les commerces autour de vous."
            action={{
              libelle: "Réessayer",
              Icone: RefreshCw,
              onPress: () => void categories.refetch(),
            }}
          />
        </View>
      </Ecran>
    );
  }

  return (
    <Ecran>
      <ScrollView
        contentContainerStyle={[
          styles.contenu,
          {
            paddingTop: insets.top + espaces.xs,
            paddingBottom: insets.bottom + espaces.lg,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.entete}>
          <View style={styles.marqueBloc}>
            <Text style={styles.marque}>Koté</Text>
            <Text style={styles.salutation}>{salutation()}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mon profil"
            style={styles.avatar}
            onPress={() => router.push("/profil")}
          >
            <UserRound size={21} color={couleurs.textePrincipal} />
          </Pressable>
        </View>

        <View style={styles.localisation}>
          <View style={styles.localisationGauche}>
            <MapPin size={16} color={couleurs.accentDoux} />
            <Text style={styles.localisationTexte} numberOfLines={1}>
              {positionConnue
                ? "Autour de vous"
                : "Position approximative"}
            </Text>
          </View>
          <Pressable onPress={etatPosition.rafraichir} hitSlop={12}>
            <Text style={styles.lien}>Changer</Text>
          </Pressable>
        </View>

        <View style={styles.recherche}>
          <Search size={22} color={couleurs.texteSecondaire} />
          <TextInput
            style={styles.rechercheChamp}
            placeholder="Que cherchez-vous ? Couturière, mécanicien…"
            placeholderTextColor={couleurs.texteSecondaire}
            value={saisie}
            onChangeText={setSaisie}
            returnKeyType="search"
            onSubmitEditing={lancerRecherche}
          />
        </View>

        <View style={styles.bloc}>
          <Text style={styles.etiquette}>CATÉGORIES</Text>
          {categories.isPending ? (
            <ActivityIndicator color={couleurs.accent} />
          ) : (
            rangees.map((rangee, index) => (
              <View key={index} style={styles.rangee}>
                {rangee.map((p) => (
                  <PuceCategorie
                    key={p.slug}
                    libelle={p.libelle}
                    identifiantIcone={p.icone}
                    nombre={p.nombre}
                    onPress={() =>
                      router.push({
                        pathname: "/resultats",
                        params: { categorie: p.slug },
                      })
                    }
                  />
                ))}
              </View>
            ))
          )}
        </View>

        <View style={styles.bloc}>
          <TitreSection
            action={{
              libelle: "Tout voir",
              onPress: () => router.push("/resultats"),
            }}
          >
            Près de vous
          </TitreSection>

          {proches.isPending ? (
            <ActivityIndicator color={couleurs.accent} />
          ) : (
            (proches.data ?? []).map((m) => (
              <CarteCommerce
                key={m.id}
                marchand={m}
                libelleCategorie={libelles.get(m.categorie_slug)}
                onApparait={() => precharger(m.id)}
                onPress={() => router.push(`/fiche/${m.id}`)}
              />
            ))
          )}
        </View>

        <View style={styles.pied}>
          <Pressable
            accessibilityRole="button"
            style={styles.fab}
            onPress={() => router.push("/carte")}
          >
            <IconeCarte size={20} color={couleurs.textePrincipal} />
            <Text style={styles.fabTexte}>Voir sur la carte</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={styles.commercant}
            onPress={() => router.push("/espace")}
          >
            <Text style={styles.commercantTitre}>Vous avez un commerce ?</Text>
            <Text style={styles.commercantTexte}>
              Faites-vous trouver par les clients de votre quartier.
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  contenu: { paddingHorizontal: espaces.md, gap: espaces.lg },

  entete: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  marqueBloc: { gap: 2 },
  marque: {
    color: couleurs.accentDoux,
    fontSize: typo.libelle,
    fontFamily: police.gras,
    letterSpacing: 0.5,
  },
  salutation: {
    color: couleurs.textePrincipal,
    fontSize: typo.titre,
    fontFamily: police.demi,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: rayons.pastille,
    backgroundColor: couleurs.surface2,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTexte: {
    color: couleurs.textePrincipal,
    fontSize: 18,
    fontFamily: police.demi,
  },

  localisation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: espaces.xs,
  },
  localisationGauche: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  localisationTexte: {
    color: couleurs.texteSecondaire,
    fontSize: typo.repere,
    fontFamily: police.moyen,
  },
  lien: {
    color: couleurs.accentDoux,
    fontSize: typo.repere,
    fontFamily: police.demi,
  },

  recherche: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaces.sm,
    minHeight: 56,
    backgroundColor: couleurs.surface1,
    borderRadius: rayons.pastille,
    paddingHorizontal: 20,
  },
  rechercheChamp: {
    flex: 1,
    color: couleurs.textePrincipal,
    fontSize: typo.corps,
    fontFamily: police.normal,
  },

  bloc: { gap: espaces.sm },
  etiquette: {
    color: couleurs.texteSecondaire,
    fontSize: typo.libelle,
    fontFamily: police.moyen,
    letterSpacing: 0.8,
  },
  rangee: { flexDirection: "row", gap: espaces.sm },

  pied: { alignItems: "center", gap: espaces.md, paddingTop: espaces.xs },
  fab: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaces.xs,
    minHeight: 52,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: rayons.pastille,
    backgroundColor: couleurs.surface2,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  fabTexte: {
    color: couleurs.textePrincipal,
    fontSize: typo.corps,
    fontFamily: police.demi,
  },
  commercant: {
    alignSelf: "stretch",
    gap: 4,
    padding: espaces.md,
    borderRadius: rayons.tuile,
    backgroundColor: couleurs.surface1,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  commercantTitre: {
    color: couleurs.accentDoux,
    fontSize: typo.corps,
    fontFamily: police.demi,
  },
  commercantTexte: {
    color: couleurs.texteSecondaire,
    fontSize: typo.repere,
    fontFamily: police.normal,
    lineHeight: typo.repere * 1.4,
  },
});
