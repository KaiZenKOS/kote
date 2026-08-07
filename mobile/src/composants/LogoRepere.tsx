import { Image } from "react-native";

const logoKote = require("../../assets/kote-segmented-mark.png");

/** Le signe Koté utilisé au lancement et partout où la marque apparaît. */
export function LogoRepere({ taille = 96 }: { taille?: number }) {
  return (
    <Image
      source={logoKote}
      accessibilityLabel="Logo Koté"
      style={{ width: taille, height: taille }}
      resizeMode="contain"
    />
  );
}
