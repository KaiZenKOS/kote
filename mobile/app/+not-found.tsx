import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { House, MapPinOff } from "lucide-react-native";

import { Ecran } from "../src/composants/Ecran";
import { EtatPleinEcran } from "../src/composants/communs";

export default function Introuvable() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Ecran>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <EtatPleinEcran
          Icone={MapPinOff}
          titre="Page introuvable"
          message="Ce commerce n'existe plus, ou le lien que vous avez suivi n'est pas valide."
          action={{
            libelle: "Retour à l'accueil",
            Icone: House,
            onPress: () => router.replace("/"),
          }}
        />
      </View>
    </Ecran>
  );
}
