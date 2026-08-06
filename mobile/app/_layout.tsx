import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
  useFonts,
} from "@expo-google-fonts/sora";
import { MapPin, MessageCircle, Store } from "lucide-react-native";

import { FournisseurDonnees } from "../src/query/Fournisseur";
import { LogoRepere } from "../src/composants/LogoRepere";
import { couleurs } from "../src/theme/tokens";
import { enregistrerRoleKote, lireRoleKote, type RoleKote } from "../src/onboarding";

void SplashScreen.preventAutoHideAsync();

export default function DispositionRacine() {
  const [policesPretes] = useFonts({
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
  });
  const [ouvertureTerminee, setOuvertureTerminee] = useState(false);
  const [onboardingCharge, setOnboardingCharge] = useState(false);
  const [onboardingTermine, setOnboardingTermine] = useState(false);
  const opaciteOuverture = useRef(new Animated.Value(1)).current;
  const echelleMarque = useRef(new Animated.Value(0.86)).current;

  useEffect(() => {
    if (!policesPretes) return;

    void SplashScreen.hideAsync();
    const animation = Animated.parallel([
      Animated.timing(echelleMarque, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opaciteOuverture, {
        toValue: 0,
        delay: 560,
        duration: 260,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    animation.start(({ finished }) => {
      if (finished) setOuvertureTerminee(true);
    });
    return () => animation.stop();
  }, [echelleMarque, opaciteOuverture, policesPretes]);

  useEffect(() => {
    if (!policesPretes) return;
    void lireRoleKote().then((role) => {
      setOnboardingTermine(role !== null);
      setOnboardingCharge(true);
    });
  }, [policesPretes]);

  // On attend les polices : afficher d'abord en police systeme puis basculer
  // ferait sauter toute la mise en page sous les yeux de l'utilisateur.
  //
  // Mais on rend le fond de la marque, pas `null` : un composant vide laisse
  // voir le fond de fenetre, noir pur, et l'ouverture commence donc par un
  // clignotement noir avant de virer au brun chaud. Sur un appareil lent --
  // la cible -- ce clignotement dure plusieurs secondes.
  if (!policesPretes) {
    return <View style={{ flex: 1, backgroundColor: couleurs.bg }} />;
  }

  return (
    <SafeAreaProvider>
      <FournisseurDonnees>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: couleurs.bg },
            animation: "fade",
          }}
        >
          <Stack.Screen
            name="signalement/[id]"
            options={{ presentation: "transparentModal", animation: "fade" }}
          />
        </Stack>
        {!ouvertureTerminee && (
          <Animated.View
            pointerEvents="none"
            style={[styles.ouverture, { opacity: opaciteOuverture }]}
          >
            <Animated.View style={{ alignItems: "center", transform: [{ scale: echelleMarque }] }}>
              <View style={styles.halo} />
              <LogoRepere taille={94} />
              <Text style={styles.nom}>Koté</Text>
              <Text style={styles.baseline}>LE QUARTIER VOUS RÉPOND.</Text>
            </Animated.View>
          </Animated.View>
        )}
        {onboardingCharge && !onboardingTermine ? (
          <Onboarding onTerminer={() => setOnboardingTermine(true)} />
        ) : null}
        {!onboardingCharge ? <View style={styles.attente}><ActivityIndicator color={couleurs.accent} /></View> : null}
      </FournisseurDonnees>
    </SafeAreaProvider>
  );
}

function Onboarding({ onTerminer }: { onTerminer: () => void }) {
  const [etape, setEtape] = useState(0);
  const terminer = async (role: RoleKote) => {
    await enregistrerRoleKote(role);
    onTerminer();
  };
  const contenu = [
    { Icone: MapPin, titre: "Les bonnes adresses\nse rapprochent.", texte: "Cherchez un besoin, repérez un commerce du quartier et évitez les détours inutiles." },
    { Icone: MessageCircle, titre: "Un vrai commerce.\nUn échange direct.", texte: "Quand vous êtes prêt, Koté ouvre une conversation WhatsApp sans afficher les numéros publiquement." },
  ];
  if (etape < 2) {
    const page = contenu[etape];
    return <View style={styles.onboarding}><View style={styles.progression}><View style={[styles.pointEtape, styles.pointActif]}/><View style={[styles.pointEtape, etape === 1 && styles.pointActif]}/><View style={styles.pointEtape}/></View><View style={styles.illustration}><View style={styles.illustrationHalo}/><page.Icone size={68} color={couleurs.accentDoux}/></View><Text style={styles.onboardingTitre}>{page.titre}</Text><Text style={styles.onboardingTexte}>{page.texte}</Text><Pressable style={styles.onboardingBouton} onPress={() => setEtape(etape + 1)}><Text style={styles.onboardingBoutonTexte}>Continuer</Text></Pressable><Pressable style={styles.passer} onPress={() => setEtape(2)}><Text style={styles.passerTexte}>Passer</Text></Pressable></View>;
  }
  return <View style={styles.onboarding}><View style={styles.progression}><View style={[styles.pointEtape, styles.pointActif]}/><View style={[styles.pointEtape, styles.pointActif]}/><View style={[styles.pointEtape, styles.pointActif]}/></View><View style={styles.illustration}><View style={styles.illustrationHalo}/><Store size={68} color={couleurs.accentDoux}/></View><Text style={styles.onboardingTitre}>Comment allez-vous\nutiliser Koté ?</Text><Text style={styles.onboardingTexte}>Ce choix personnalise votre accueil. Vous pourrez le modifier plus tard.</Text><Pressable style={styles.choixRole} onPress={() => void terminer("consommateur")}><MapPin size={25} color={couleurs.accentDoux}/><View style={styles.choixTextes}><Text style={styles.choixTitre}>Je cherche autour de moi</Text><Text style={styles.choixSous}>Commerces, artisans et services du quartier.</Text></View></Pressable><Pressable style={styles.choixRole} onPress={() => void terminer("commercant")}><Store size={25} color={couleurs.accentDoux}/><View style={styles.choixTextes}><Text style={styles.choixTitre}>Je tiens un commerce</Text><Text style={styles.choixSous}>Je veux que les clients me trouvent.</Text></View></Pressable></View>;
}

const styles = StyleSheet.create({
  ouverture: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: couleurs.bg,
  },
  halo: {
    position: "absolute",
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: couleurs.halo,
  },
  nom: { color: couleurs.textePrincipal, fontFamily: "Sora_700Bold", fontSize: 29, marginTop: 5 },
  baseline: { color: couleurs.accentDoux, fontFamily: "Sora_600SemiBold", fontSize: 9, letterSpacing: 1.7, marginTop: 7 },
  attente: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", backgroundColor: couleurs.bg },
  onboarding: { ...StyleSheet.absoluteFill, zIndex: 10, paddingHorizontal: 28, paddingTop: 58, paddingBottom: 42, backgroundColor: couleurs.bg, justifyContent: "center" },
  progression: { flexDirection: "row", gap: 6, position: "absolute", top: 24, left: 28 },
  pointEtape: { width: 25, height: 4, borderRadius: 4, backgroundColor: couleurs.surface2 },
  pointActif: { backgroundColor: couleurs.accent },
  illustration: { width: 154, height: 154, borderRadius: 77, alignSelf: "center", alignItems: "center", justifyContent: "center", marginBottom: 36, backgroundColor: couleurs.surface1 },
  illustrationHalo: { position: "absolute", width: 116, height: 116, borderRadius: 58, backgroundColor: couleurs.halo },
  onboardingTitre: { color: couleurs.textePrincipal, fontFamily: "Sora_700Bold", fontSize: 31, letterSpacing: -1.2, lineHeight: 37, textAlign: "center" },
  onboardingTexte: { color: couleurs.texteSecondaire, fontFamily: "Sora_400Regular", fontSize: 16, lineHeight: 24, textAlign: "center", marginTop: 18, marginBottom: 34 },
  onboardingBouton: { minHeight: 54, alignItems: "center", justifyContent: "center", borderRadius: 27, backgroundColor: couleurs.accent },
  onboardingBoutonTexte: { color: couleurs.surAccent, fontFamily: "Sora_600SemiBold", fontSize: 16 },
  passer: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 8 },
  passerTexte: { color: couleurs.texteSecondaire, fontFamily: "Sora_500Medium", fontSize: 14 },
  choixRole: { minHeight: 82, flexDirection: "row", alignItems: "center", gap: 14, padding: 14, marginTop: 10, borderRadius: 20, borderWidth: 1, borderColor: couleurs.bordure, backgroundColor: couleurs.surface1 },
  choixTextes: { flex: 1, gap: 3 }, choixTitre: { color: couleurs.textePrincipal, fontFamily: "Sora_600SemiBold", fontSize: 15 }, choixSous: { color: couleurs.texteSecondaire, fontFamily: "Sora_400Regular", fontSize: 12, lineHeight: 17 },
});
