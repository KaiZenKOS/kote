import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ChevronDown,
  ChevronRight,
  CircleAlert,
  MapPinOff,
  Store,
  X,
} from "lucide-react-native";

import { useSignalement } from "../../src/hooks/useActions";
import { estEnLigne } from "../../src/query/reseau";
import type { MotifSignalement } from "../../src/api/types";
import { couleurs, espaces, police, rayons, typo } from "../../src/theme/tokens";

const OPTIONS: {
  motif: MotifSignalement;
  libelle: string;
  Icone: typeof Store;
}[] = [
  { motif: "ferme", libelle: "C'est fermé", Icone: Store },
  { motif: "demenage", libelle: "A déménagé", Icone: MapPinOff },
  {
    motif: "infos_fausses",
    libelle: "Les informations sont fausses",
    Icone: CircleAlert,
  },
];

export default function Signalement() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const signalement = useSignalement();

  const [commentaireOuvert, setCommentaireOuvert] = useState(false);
  const [commentaire, setCommentaire] = useState("");
  const [envoye, setEnvoye] = useState(false);
  // La feuille peut être ouverte depuis un état sans historique (notamment
  // pendant l’onboarding). Dans ce cas `back()` affiche une erreur Android.
  const fermer = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  /**
   * Un seul appui suffit pour les trois cas courants : le motif declenche
   * l'envoi et ferme la feuille. Le commentaire reste facultatif et replie --
   * demander une saisie libre ici perdrait la majorite des signalements.
   */
  const envoyer = (motif: MotifSignalement) => {
    if (!id) return;
    signalement.mutate({ marchandId: id, motif, commentaire });
    setEnvoye(true);
    setTimeout(fermer, 1200);
  };

  return (
    <View style={styles.voile}>
      <Pressable style={styles.zoneFermeture} onPress={fermer} />

      <View style={[styles.feuille, { paddingBottom: insets.bottom + 28 }]}>
        <View style={styles.poignee} />

        <View style={styles.ligneTitre}>
          <Text style={styles.titre}>
            {envoye
              ? "Merci, c'est enregistré"
              : "Cette information est-elle fausse ?"}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fermer"
            style={styles.fermer}
            onPress={fermer}
          >
            <X size={20} color={couleurs.texteSecondaire} />
          </Pressable>
        </View>

        {envoye ? (
          <Text style={styles.confirmation}>
            {estEnLigne()
              ? "Votre signalement aide les autres clients à ne pas se déplacer pour rien."
              : "Votre signalement partira dès le retour de la connexion."}
          </Text>
        ) : (
          <>
            <View style={styles.options}>
              {OPTIONS.map(({ motif, libelle, Icone }) => (
                <Pressable
                  key={motif}
                  accessibilityRole="button"
                  onPress={() => envoyer(motif)}
                  style={({ pressed }) => [
                    styles.option,
                    pressed && styles.presse,
                  ]}
                >
                  <View style={styles.optionIcone}>
                    <Icone size={20} color={couleurs.accentDoux} />
                  </View>
                  <Text style={styles.optionLibelle}>{libelle}</Text>
                  <ChevronRight size={20} color={couleurs.texteSecondaire} />
                </Pressable>
              ))}
            </View>

            <Pressable
              accessibilityRole="button"
              style={styles.commentaire}
              onPress={() => setCommentaireOuvert((o) => !o)}
            >
              <Text style={styles.commentaireLibelle}>
                Ajouter un commentaire (facultatif)
              </Text>
              <ChevronDown size={20} color={couleurs.texteSecondaire} />
            </Pressable>

            {commentaireOuvert ? (
              <TextInput
                style={styles.champCommentaire}
                value={commentaire}
                onChangeText={setCommentaire}
                placeholder="Ce que vous avez constaté"
                placeholderTextColor={couleurs.texteSecondaire}
                multiline
                maxLength={300}
              />
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  voile: { flex: 1, backgroundColor: "#0A0705D9", justifyContent: "flex-end" },
  zoneFermeture: { flex: 1 },

  feuille: {
    backgroundColor: couleurs.surface1,
    borderTopLeftRadius: rayons.carte,
    borderTopRightRadius: rayons.carte,
    paddingHorizontal: espaces.md,
    paddingTop: espaces.sm,
    gap: espaces.md,
  },
  poignee: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: rayons.pastille,
    backgroundColor: couleurs.bordure,
  },

  ligneTitre: { flexDirection: "row", alignItems: "flex-start", gap: espaces.sm },
  titre: {
    flex: 1,
    color: couleurs.textePrincipal,
    fontSize: typo.titre,
    fontFamily: police.demi,
    lineHeight: typo.titre * 1.2,
  },
  fermer: {
    width: 40,
    height: 40,
    borderRadius: rayons.pastille,
    backgroundColor: couleurs.surface2,
    alignItems: "center",
    justifyContent: "center",
  },

  confirmation: {
    color: couleurs.texteSecondaire,
    fontSize: typo.corps,
    fontFamily: police.normal,
    lineHeight: typo.corps * 1.4,
    paddingBottom: espaces.md,
  },

  options: { gap: espaces.sm },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaces.sm,
    minHeight: 72,
    backgroundColor: couleurs.surface2,
    borderRadius: rayons.tuile,
    padding: espaces.md,
  },
  presse: { opacity: 0.75 },
  optionIcone: {
    width: 40,
    height: 40,
    borderRadius: rayons.pastille,
    backgroundColor: couleurs.surface1,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLibelle: {
    flex: 1,
    color: couleurs.textePrincipal,
    fontSize: typo.corps,
    fontFamily: police.demi,
  },

  commentaire: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    paddingHorizontal: espaces.md,
  },
  commentaireLibelle: {
    color: couleurs.texteSecondaire,
    fontSize: typo.repere,
    fontFamily: police.normal,
  },
  champCommentaire: {
    minHeight: 88,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    padding: espaces.md,
    color: couleurs.textePrincipal,
    fontSize: typo.corps,
    fontFamily: police.normal,
    textAlignVertical: "top",
  },
});
