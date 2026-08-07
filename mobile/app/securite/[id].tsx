import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AlertTriangle, ChevronRight, MapPinOff, ShieldAlert, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { MotifRisqueAcces } from "../../src/api/actions";
import { useAlerteAcces } from "../../src/hooks/useActions";
import { couleurs, espaces, police, rayons, typo } from "../../src/theme/tokens";

const OPTIONS: { motif: MotifRisqueAcces; libelle: string; Icone: typeof ShieldAlert }[] = [
  { motif: "repere_inexact", libelle: "Le point d'arrivée est inexact", Icone: MapPinOff },
  { motif: "acces_isole", libelle: "L'accès semble isolé ou peu visible", Icone: AlertTriangle },
  { motif: "comportement_inquietant", libelle: "Un comportement m'a inquiété", Icone: ShieldAlert },
  { motif: "lieu_inaccessible", libelle: "Le lieu est difficile ou impossible d'accès", Icone: MapPinOff },
];

export default function AlerteSecurite() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const alerte = useAlerteAcces();
  const [commentaire, setCommentaire] = useState("");
  const [envoye, setEnvoye] = useState(false);
  const fermer = () => router.canGoBack() ? router.back() : router.replace("/");
  const envoyer = (motif: MotifRisqueAcces) => {
    if (!id) return;
    alerte.mutate({ marchandId: id, motif, commentaire }, {
      onSuccess: () => { setEnvoye(true); setTimeout(fermer, 1400); },
    });
  };

  return <View style={styles.voile}>
    <Pressable style={styles.fermeture} onPress={fermer} />
    <View style={[styles.feuille, { paddingBottom: insets.bottom + espaces.lg }]}>
      <View style={styles.poignee} />
      <View style={styles.entete}><View style={{ flex: 1 }}><Text style={styles.titre}>Signaler un risque d'accès</Text><Text style={styles.sous}>Ce signalement est revu par Koté. En cas de danger immédiat, mettez-vous d'abord en sécurité et contactez les secours locaux.</Text></View><Pressable style={styles.fermerBouton} onPress={fermer}><X color={couleurs.texteSecondaire} size={20}/></Pressable></View>
      {envoye ? <Text style={styles.confirmation}>Merci. Nous allons vérifier ce point d'arrivée avant de laisser la fiche continuer à guider les autres.</Text> : <>
        <View style={styles.options}>{OPTIONS.map(({ motif, libelle, Icone }) => <Pressable key={motif} style={styles.option} onPress={() => envoyer(motif)} disabled={alerte.isPending}><View style={styles.icone}><Icone color={couleurs.accentDoux} size={19}/></View><Text style={styles.optionTexte}>{libelle}</Text><ChevronRight color={couleurs.texteSecondaire} size={19}/></Pressable>)}</View>
        <TextInput value={commentaire} onChangeText={setCommentaire} placeholder="Décrivez factuellement ce que vous avez constaté (facultatif)" placeholderTextColor={couleurs.texteSecondaire} maxLength={300} multiline style={styles.champ}/>
        {alerte.isError ? <Text style={styles.erreur}>Impossible d'envoyer l'alerte. Vérifiez votre connexion et réessayez.</Text> : null}
      </>}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  voile: { flex: 1, justifyContent: "flex-end", backgroundColor: "#0A0705D9" }, fermeture: { flex: 1 },
  feuille: { backgroundColor: couleurs.surface1, paddingHorizontal: espaces.md, paddingTop: espaces.sm, gap: espaces.md, borderTopLeftRadius: rayons.carte, borderTopRightRadius: rayons.carte },
  poignee: { alignSelf: "center", width: 40, height: 4, borderRadius: 4, backgroundColor: couleurs.bordure },
  entete: { flexDirection: "row", gap: espaces.sm }, titre: { color: couleurs.textePrincipal, fontSize: typo.titre, fontFamily: police.demi }, sous: { marginTop: 8, color: couleurs.texteSecondaire, fontSize: typo.repere, lineHeight: 19, fontFamily: police.normal },
  fermerBouton: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: couleurs.surface2 },
  options: { gap: espaces.sm }, option: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: espaces.sm, padding: 11, borderRadius: rayons.tuile, backgroundColor: couleurs.surface2 }, icone: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: couleurs.surface1 }, optionTexte: { flex: 1, color: couleurs.textePrincipal, fontSize: typo.repere, fontFamily: police.moyen, lineHeight: 18 },
  champ: { minHeight: 78, padding: espaces.sm, borderRadius: rayons.tuile, borderWidth: 1, borderColor: couleurs.bordure, color: couleurs.textePrincipal, fontSize: typo.repere, fontFamily: police.normal, textAlignVertical: "top" }, confirmation: { color: couleurs.texteSecondaire, fontSize: typo.corps, lineHeight: 23, fontFamily: police.normal }, erreur: { color: couleurs.fraicheurAVerifier, fontSize: typo.libelle, fontFamily: police.moyen },
});
