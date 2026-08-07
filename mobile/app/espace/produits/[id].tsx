import { useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, PackagePlus } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ecran } from "../../../src/composants/Ecran";
import { BoutonRond } from "../../../src/composants/communs";
import { GrandBouton, GrandChamp } from "../../../src/composants/espace";
import { useAjouterProduit, useMesProduits } from "../../../src/hooks/useProduits";
import { couleurs, espaces, police, rayons, typo } from "../../../src/theme/tokens";

export default function ProduitsEspace() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter(); const insets = useSafeAreaInsets();
  const produits = useMesProduits(id ?? null); const ajouter = useAjouterProduit();
  const [nom, setNom] = useState(""); const [description, setDescription] = useState(""); const [prix, setPrix] = useState(""); const [nouveau, setNouveau] = useState(true);
  const enregistrer = () => {
    if (!id || nom.trim().length < 2) return;
    const montant = prix.trim() ? Number(prix.replace(/\s/g, "")) : null;
    if (montant !== null && (!Number.isInteger(montant) || montant < 0)) return;
    ajouter.mutate({ marchand_id: id, nom: nom.trim(), description: description.trim() || null, prix_fcfa: montant, est_nouveaute: nouveau }, { onSuccess: () => { setNom(""); setDescription(""); setPrix(""); setNouveau(false); } });
  };
  return <Ecran><ScrollView contentContainerStyle={[styles.contenu,{paddingTop:insets.top+espaces.xs,paddingBottom:insets.bottom+espaces.xl}]} keyboardShouldPersistTaps="handled"><BoutonRond Icone={ArrowLeft} etiquette="Retour" onPress={()=>router.back()}/><Text style={styles.titre}>Votre vitrine</Text><Text style={styles.intro}>Mettez en avant ce qui est disponible ou vient d'arriver. Ne publiez ni coordonnées privées, ni image de personne sans accord.</Text><View style={styles.formulaire}><GrandChamp libelle="Produit ou arrivage" valeur={nom} onChange={setNom} placeholder="Nouveaux pagnes wax" maxLength={90}/><GrandChamp libelle="Description courte" valeur={description} onChange={setDescription} placeholder="Coloris et tailles disponibles" multiligne maxLength={300}/><GrandChamp libelle="Prix (FCFA, facultatif)" valeur={prix} onChange={setPrix} placeholder="5000" clavier="number-pad" maxLength={9}/><View style={styles.ligne}><View style={{flex:1}}><Text style={styles.ligneTitre}>Le marquer comme nouveau</Text><Text style={styles.ligneSous}>Un repère visuel pour les clients.</Text></View><Switch value={nouveau} onValueChange={setNouveau} trackColor={{true:couleurs.accent}}/></View><GrandBouton libelle={ajouter.isPending?"Publication…":"Mettre en avant"} Icone={PackagePlus} desactive={ajouter.isPending||nom.trim().length<2} onPress={enregistrer}/>{ajouter.isError?<Text style={styles.erreur}>Impossible de publier. Vérifiez les informations et réessayez.</Text>:null}</View><Text style={styles.sousTitre}>Vos publications</Text>{(produits.data??[]).map(p=><View key={p.id} style={styles.produit}><View style={{flex:1}}><Text style={styles.nom}>{p.nom}{p.est_nouveaute?" · Nouveau": ""}</Text>{p.description?<Text style={styles.description}>{p.description}</Text>:null}</View>{p.prix_fcfa!==null?<Text style={styles.prix}>{p.prix_fcfa.toLocaleString("fr-FR")} FCFA</Text>:null}</View>)}{(produits.data??[]).length===0?<Text style={styles.vide}>Vos nouveautés apparaîtront ici.</Text>:null}</ScrollView></Ecran>;
}
const styles=StyleSheet.create({contenu:{paddingHorizontal:espaces.md,gap:espaces.md},titre:{color:couleurs.textePrincipal,fontFamily:police.gras,fontSize:30,marginTop:espaces.sm},intro:{color:couleurs.texteSecondaire,fontFamily:police.normal,fontSize:typo.corps,lineHeight:23},formulaire:{gap:espaces.md,padding:espaces.md,borderRadius:rayons.carte,backgroundColor:couleurs.surface1},ligne:{minHeight:58,flexDirection:"row",alignItems:"center",gap:espaces.sm},ligneTitre:{color:couleurs.textePrincipal,fontFamily:police.demi,fontSize:typo.repere},ligneSous:{color:couleurs.texteSecondaire,fontFamily:police.normal,fontSize:typo.libelle,marginTop:2},sousTitre:{color:couleurs.textePrincipal,fontFamily:police.demi,fontSize:typo.titre,marginTop:espaces.sm},produit:{flexDirection:"row",gap:espaces.sm,padding:espaces.md,borderRadius:rayons.tuile,backgroundColor:couleurs.surface1},nom:{color:couleurs.textePrincipal,fontFamily:police.demi,fontSize:typo.repere},description:{color:couleurs.texteSecondaire,fontFamily:police.normal,fontSize:typo.libelle,marginTop:4},prix:{alignSelf:"center",color:couleurs.textePrincipal,fontFamily:police.demi,fontSize:typo.libelle},vide:{color:couleurs.texteSecondaire,fontFamily:police.normal,textAlign:"center",padding:espaces.lg},erreur:{color:couleurs.fraicheurAVerifier,fontFamily:police.moyen,fontSize:typo.libelle}});
