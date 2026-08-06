import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/** Notifications locales, sans jeton ni donnée personnelle tant que la
 * production n'est pas connectée. Les push distants utiliseront ensuite le
 * même canal, après enregistrement explicite du jeton côté serveur. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export async function activerNotifications(): Promise<boolean> {
  if (!Device.isDevice) return false;
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("kote", { name: "Koté", importance: Notifications.AndroidImportance.DEFAULT });
  const existante = await Notifications.getPermissionsAsync();
  const permission = existante.granted ? existante : await Notifications.requestPermissionsAsync();
  return permission.granted;
}

export async function programmerRappelFiche(nom: string, dansJours = 75): Promise<string | null> {
  const autorise = await activerNotifications();
  if (!autorise) return null;
  return Notifications.scheduleNotificationAsync({ content: { title: "Koté · votre fiche", body: `${nom} mérite une confirmation pour rester visible.`, data: { type: "confirmation_fiche" }, ...(Platform.OS === "android" ? { sound: false } : {}) }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(Date.now() + dansJours * 86_400_000), ...(Platform.OS === "android" ? { channelId: "kote" } : {}) } as Notifications.NotificationTriggerInput });
}
