import AsyncStorage from "@react-native-async-storage/async-storage";

const CLE_PROFIL = "kote:onboarding:v1";

export type RoleKote = "consommateur" | "commercant";

export async function lireRoleKote(): Promise<RoleKote | null> {
  const valeur = await AsyncStorage.getItem(CLE_PROFIL);
  return valeur === "consommateur" || valeur === "commercant" ? valeur : null;
}

export async function enregistrerRoleKote(role: RoleKote): Promise<void> {
  await AsyncStorage.setItem(CLE_PROFIL, role);
}
