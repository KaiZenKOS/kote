import { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft,
  Heart,
  House,
  Info,
  MapPin,
  MapPinOff,
  MessageCircle,
  Navigation,
  RefreshCw,
  TriangleAlert,
  ShieldCheck,
  WifiOff,
} from "lucide-react-native";

import { urlPhoto } from "../../src/api/marchands";
import { ErreurApi } from "../../src/api/erreurs";
import { Ecran } from "../../src/composants/Ecran";
import {
  BoutonPrincipal,
  BoutonRond,
  BoutonSecondaire,
  EtatPleinEcran,
  LienDiscret,
  TuileInfo,
} from "../../src/composants/communs";
import { formaterDistance } from "../../src/composants/cartes";
import { useFavoris } from "../../src/favoris";
import { distanceM } from "../../src/geo";
import { useContactWhatsApp, useItineraire } from "../../src/hooks/useActions";
import { useFiche, useVueFiche } from "../../src/hooks/useFiche";
import { useLibellesCategories } from "../../src/hooks/useLibelles";
import { usePosition } from "../../src/hooks/usePosition";
import { useSession } from "../../src/hooks/useSession";
import { estEnLigne } from "../../src/query/reseau";
import { couleurs, espaces, police, rayons, typo } from "../../src/theme/tokens";

export default function Fiche() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const etatPosition = usePosition();

  const fiche = useFiche(id ?? null);
  const libelles = useLibellesCategories();
  const contact = useContactWhatsApp();
  const favoris = useFavoris();
  const ouvrirItineraire = useItineraire();
  const session = useSession();

  useVueFiche(id ?? null);

  const donnees = fiche.data;

  const distance = useMemo(() => {
    if (!donnees || etatPosition.statut !== "prete") return null;
    return distanceM(etatPosition.position, {
      latitude: donnees.latitude,
      longitude: donnees.longitude,
    });
  }, [donnees, etatPosition]);

  const lignesHoraires = useMemo(() => {
    if (!donnees?.horaires) return [];
    return Object.entries(donnees.horaires);
  }, [donnees]);

  if (fiche.isPending) {
    return (
      <Ecran>
        <View style={styles.centre}>
          <ActivityIndicator color={couleurs.accent} />
        </View>
      </Ecran>
    );
  }

  /**
   * Rien en cache et une erreur : on choisit l'ecran selon la cause. Une fiche
   * absente est un cas nominal dans l'informel -- le commerce a ferme ou
   * demenage -- et merite un message different d'une panne.
   */
  if (!donnees) {
    const introuvable = fiche.error instanceof ErreurApi && fiche.error.estIntrouvable;
    const horsLigne = !estEnLigne();

    return (
      <Ecran>
        <View style={{ flex: 1, paddingTop: insets.top }}>
          <EtatPleinEcran
            Icone={introuvable ? MapPinOff : horsLigne ? WifiOff : TriangleAlert}
            titre={
              introuvable
                ? "Page introuvable"
                : horsLigne
                  ? "Pas de connexion"
                  : "Une erreur est survenue"
            }
            message={
              introuvable
                ? "Ce commerce n'existe plus, ou le lien que vous avez suivi n'est pas valide."
                : horsLigne
                  ? "Vérifiez votre connexion. Koté se charge avec très peu de données — il suffit d'un petit signal pour retrouver les commerces autour de vous."
                  : "Quelque chose n'a pas fonctionné de notre côté. Ce n'est pas vous. Réessayez dans un instant."
            }
            action={
              introuvable
                ? {
                    libelle: "Retour à l'accueil",
                    Icone: House,
                    onPress: () => router.replace("/"),
                  }
                : {
                    libelle: "Réessayer",
                    Icone: RefreshCw,
                    onPress: () => void fiche.refetch(),
                  }
            }
            lien={{
              libelle: introuvable ? "Retour aux résultats" : "Retour à l'accueil",
              onPress: () => (introuvable ? router.back() : router.replace("/")),
            }}
          />
        </View>
      </Ecran>
    );
  }

  const photo = urlPhoto(donnees.photo_principale);

  return (
    <Ecran>
      <ScrollView
        contentContainerStyle={{ paddingBottom: espaces.md }}
        stickyHeaderIndices={[]}
      >
        <View style={styles.hero}>
          {photo ? (
            <Image
              source={{ uri: photo }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : null}
          {/**
           * Le degrade opaque garantit que le texte commence APRES la photo.
           * Une photo mal exposee -- le cas courant -- rendrait illisible tout
           * texte pose dessus.
           */}
          <LinearGradient
            colors={["transparent", couleurs.bg]}
            style={styles.fondu}
          />
        </View>

        <View style={styles.corps}>
          <Text style={styles.nom}>{donnees.nom_enseigne}</Text>
          <Text style={styles.meta}>
            {libelles.get(donnees.categorie_slug) ?? donnees.categorie_slug}
            {distance !== null ? ` · ${formaterDistance(distance)}` : ""}
          </Text>
          {donnees.verifiee_terrain ? (
            <View style={styles.verification}>
              <ShieldCheck size={16} color={couleurs.fraicheurBonne} />
              <Text style={styles.verificationTexte}>Vérifiée sur le terrain par Koté</Text>
            </View>
          ) : null}

          <View style={styles.securite}>
            <ShieldCheck size={18} color={couleurs.accentDoux} />
            <View style={{ flex: 1 }}>
              <Text style={styles.securiteTitre}>Arrivée conseillée</Text>
              <Text style={styles.securiteTexte}>{donnees.repere_arrivee_public || donnees.repere}</Text>
              <Text style={styles.securiteNote}>{donnees.conseil_acces || "Restez sur les voies fréquentées et vérifiez l'environnement avant de continuer."}</Text>
            </View>
          </View>

          <View style={styles.repere}>
            <View style={styles.repereBalise}>
              <MapPin size={20} color={couleurs.accentDoux} />
            </View>
            <View style={styles.repereTextes}>
              <Text style={styles.repereLibelle}>POINT DE REPÈRE</Text>
              <Text style={styles.repereValeur}>{donnees.repere}</Text>
            </View>
          </View>

          <View style={styles.tuiles}>
            <TuileInfo
              libelle="CONFIRMÉ"
              valeur={`il y a ${donnees.jours_depuis_confirmation} j`}
              taille={18}
            />
            <TuileInfo
              libelle="DISTANCE"
              valeur={distance !== null ? formaterDistance(distance) : "—"}
            />
          </View>

          {donnees.description ? (
            <Text style={styles.description}>{donnees.description}</Text>
          ) : null}

          {lignesHoraires.length > 0 ? (
            <View style={styles.horaires}>
              <View style={styles.horairesTitre}>
                <Info size={16} color={couleurs.texteSecondaire} />
                <Text style={styles.repereLibelle}>HORAIRES INDICATIFS</Text>
              </View>
              {lignesHoraires.map(([jour, plage]) => (
                <View key={jour} style={styles.horairesLigne}>
                  <Text style={styles.horairesJour}>{jour}</Text>
                  <Text style={styles.horairesPlage}>{plage}</Text>
                </View>
              ))}
              <Text style={styles.horairesNote}>
                Donnés à titre indicatif — pensez à confirmer sur WhatsApp.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.actions, { paddingBottom: insets.bottom + espaces.md }]}>
          <BoutonPrincipal
            libelle={
              contact.isPending ? "Ouverture…" : "Contacter sur WhatsApp"
            }
            Icone={MessageCircle}
            desactive={contact.isPending}
            onPress={() => {
              if (!session.connecte) { router.push("/profil"); return; }
              contact.mutate({
                marchandId: donnees.id,
                position:
                  etatPosition.statut === "prete" ? etatPosition.position : null,
              });
            }}
          />
          {contact.isError ? (
            <Text style={styles.erreurContact}>
              {estEnLigne()
                ? "La mise en relation a échoué. Réessayez dans un instant."
                : "Sans connexion, impossible d'ouvrir la conversation."}
            </Text>
          ) : null}

          <BoutonSecondaire
            libelle="Itinéraire"
            Icone={Navigation}
            onPress={() => Alert.alert(
              "Avant de partir",
              "Koté indique un commerce contrôlé, mais ne peut pas garantir la sécurité d'un trajet. Préférez un point visible, partagez votre destination avec un proche et n'entrez pas dans un lieu qui vous semble risqué.",
              [
                { text: "Annuler", style: "cancel" },
                { text: "Continuer", onPress: () => void ouvrirItineraire(donnees.id, donnees.latitude, donnees.longitude, etatPosition.statut === "prete" ? etatPosition.position : null) },
              ],
            )}
          />

          <LienDiscret
            libelle="Signaler un problème"
            onPress={() => router.push(`/signalement/${donnees.id}`)}
          />
          <LienDiscret
            libelle="Signaler un risque sur l'accès"
            onPress={() => {
              if (!session.connecte) { router.push("/profil"); return; }
              router.push(`/securite/${donnees.id}`);
            }}
          />
        </View>
      </ScrollView>

      <BoutonRond
        Icone={ArrowLeft}
        etiquette="Retour"
        onPress={() => router.back()}
        style={{ position: "absolute", left: espaces.md, top: insets.top + 8 }}
      />

      {/**
       * Favori entierement local : rien ne part au serveur, aucun compte n'est
       * demande. C'est la reponse a « faut-il un compte client ? » -- le seul
       * service qu'il rendrait ici tient sur le telephone, et fonctionne hors
       * ligne par-dessus le marche.
       */}
      <BoutonRond
        Icone={Heart}
        etiquette={
          favoris.estFavori(donnees.id)
            ? "Retirer des favoris"
            : "Ajouter aux favoris"
        }
        actif={favoris.estFavori(donnees.id)}
        onPress={() => void favoris.basculer(donnees.id)}
        style={{ position: "absolute", right: espaces.md, top: insets.top + 8 }}
      />
    </Ecran>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: "center", justifyContent: "center" },

  hero: { height: 300, backgroundColor: couleurs.surface2 },
  fondu: { position: "absolute", left: 0, right: 0, bottom: 0, height: 150 },

  corps: { paddingHorizontal: espaces.md, paddingTop: 20, gap: 20 },
  nom: {
    color: couleurs.textePrincipal,
    fontSize: typo.affichage,
    fontFamily: police.gras,
    letterSpacing: -1,
    lineHeight: typo.affichage * 1.05,
  },
  meta: {
    color: couleurs.texteSecondaire,
    fontSize: typo.corps,
    fontFamily: police.moyen,
    marginTop: -12,
  },
  verification: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: -8 },
  verificationTexte: { color: couleurs.fraicheurBonne, fontSize: typo.libelle, fontFamily: police.demi },
  securite: { flexDirection: "row", gap: espaces.sm, padding: espaces.sm, borderWidth: 1, borderColor: couleurs.bordure, borderRadius: rayons.tuile, backgroundColor: couleurs.surface1 },
  securiteTitre: { color: couleurs.textePrincipal, fontSize: typo.repere, fontFamily: police.demi },
  securiteTexte: { marginTop: 2, color: couleurs.textePrincipal, fontSize: typo.repere, fontFamily: police.normal, lineHeight: 19 },
  securiteNote: { marginTop: 5, color: couleurs.texteSecondaire, fontSize: typo.libelle, fontFamily: police.normal, lineHeight: 16 },

  repere: {
    flexDirection: "row",
    gap: espaces.sm,
    backgroundColor: couleurs.surface1,
    borderRadius: rayons.tuile,
    padding: espaces.md,
  },
  repereBalise: {
    width: 40,
    height: 40,
    borderRadius: rayons.pastille,
    backgroundColor: couleurs.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  repereTextes: { flex: 1, gap: 4 },
  repereLibelle: {
    color: couleurs.texteSecondaire,
    fontSize: typo.libelle,
    fontFamily: police.moyen,
    letterSpacing: 0.8,
  },
  repereValeur: {
    color: couleurs.textePrincipal,
    fontSize: 17,
    fontFamily: police.moyen,
    lineHeight: 17 * 1.3,
  },

  tuiles: { flexDirection: "row", gap: espaces.sm, minHeight: 88 },

  description: {
    color: couleurs.texteSecondaire,
    fontSize: typo.corps,
    fontFamily: police.normal,
    lineHeight: typo.corps * 1.45,
  },

  horaires: { gap: 10 },
  horairesTitre: { flexDirection: "row", alignItems: "center", gap: espaces.xs },
  horairesLigne: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  horairesJour: {
    color: couleurs.texteSecondaire,
    fontSize: typo.repere,
    fontFamily: police.normal,
  },
  horairesPlage: {
    color: couleurs.textePrincipal,
    fontSize: typo.repere,
    fontFamily: police.moyen,
  },
  horairesNote: {
    color: couleurs.texteSecondaire,
    fontSize: typo.libelle,
    fontFamily: police.normal,
    lineHeight: typo.libelle * 1.3,
  },

  actions: {
    marginTop: espaces.lg,
    paddingHorizontal: espaces.md,
    paddingTop: espaces.md,
    gap: espaces.sm,
    backgroundColor: couleurs.bg,
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
  },
  erreurContact: {
    color: couleurs.fraicheurAVerifier,
    fontSize: typo.libelle,
    fontFamily: police.moyen,
    textAlign: "center",
  },
});
