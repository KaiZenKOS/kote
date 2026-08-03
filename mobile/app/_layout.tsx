import { useEffect } from "react";
import { View } from "react-native";
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

import { FournisseurDonnees } from "../src/query/Fournisseur";
import { couleurs } from "../src/theme/tokens";

void SplashScreen.preventAutoHideAsync();

export default function DispositionRacine() {
  const [policesPretes] = useFonts({
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
  });

  useEffect(() => {
    if (policesPretes) void SplashScreen.hideAsync();
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
      </FournisseurDonnees>
    </SafeAreaProvider>
  );
}
