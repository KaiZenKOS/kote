import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { FournisseurDonnees } from "../src/query/Fournisseur";
import { couleurs } from "../src/theme/tokens";

export default function DispositionRacine() {
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
        />
      </FournisseurDonnees>
    </SafeAreaProvider>
  );
}
