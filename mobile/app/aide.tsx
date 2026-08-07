import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, Store, Trash2 } from "lucide-react-native";

import { Ecran } from "../src/composants/Ecran";
import { BoutonRond, BoutonSecondaire } from "../src/composants/communs";
import { formaterOctets } from "../src/carte/horsLigne";
import { useCarteHorsLigne } from "../src/hooks/useCarteHorsLigne";
import { tailleJournal, viderJournal } from "../src/journal/file";
import { viderCacheDisque } from "../src/query/persistance";
import { couleurs, espaces, police, rayons, typo } from "../src/theme/tokens";

function Section({ titre, children }: { titre: string; children: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitre}>{titre}</Text>
      <Text style={styles.sectionTexte}>{children}</Text>
    </View>
  );
}

export default function Aide() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const client = useQueryClient();
  const [enAttente, setEnAttente] = useState(0);
  const [videe, setVidee] = useState(false);
  const carte = useCarteHorsLigne();

  useEffect(() => {
    void tailleJournal().then(setEnAttente);
  }, []);

  return (
    <Ecran>
      <ScrollView
        contentContainerStyle={[
          styles.contenu,
          {
            paddingTop: insets.top + espaces.xs,
            paddingBottom: insets.bottom + espaces.xl,
          },
        ]}
      >
        <View style={styles.entete}>
          <BoutonRond
            Icone={ArrowLeft}
            etiquette="Retour"
            onPress={() => router.back()}
          />
          <Text style={styles.titre}>Aide et informations</Text>
        </View>

        {/**
         * Entree de l'espace marchand. Le libelle parle de clients, jamais
         * d'inscription ni d'enregistrement : c'est la regle de positionnement
         * du cahier des charges (section 3.1).
         */}
        <View style={styles.encadre}>
          <Text style={styles.encadreTitre}>Vous vendez ou vous réparez ?</Text>
          <Text style={styles.sectionTexte}>
            Vos clients du quartier vous cherchent. Mettez votre activité sur
            Koté pour qu'ils vous trouvent et vous écrivent sur WhatsApp.
          </Text>
          <View style={styles.actions}>
            <BoutonSecondaire
              libelle="Ouvrir mon espace"
              Icone={Store}
              onPress={() => router.push("/espace")}
            />
          </View>
        </View>

        <Section titre="Comment ça marche">
          {
            "Koté vous montre les commerçants et artisans ouverts autour de vous. " +
            "Vous choisissez, vous appuyez, la conversation s'ouvre dans WhatsApp. " +
            "Il n'y a ni paiement, ni commande, ni livraison : Koté vous met en relation, " +
            "vous vous arrangez directement avec le commerçant."
          }
        </Section>

        <Section titre="Trouver sans adresse">
          {
            "Au Togo, les repères locaux comptent autant que les adresses. Chaque fiche en " +
            "porte un, écrit par le commerçant lui-même. C'est l'information la plus utile " +
            "de l'application : lisez-la avant de partir."
          }
        </Section>

        <Section titre="Fiches à confirmer">
          {
            "Une pastille indique quand la fiche a été confirmée pour la dernière fois. " +
            "Si elle affiche « à confirmer », le commerce est peut-être fermé ou a déménagé. " +
            "Si vous constatez une erreur, signalez-la : cela évite aux autres de se " +
            "déplacer pour rien."
          }
        </Section>

        <View style={styles.encadre}>
          <Text style={styles.encadreTitre}>Vos données</Text>
          <Text style={styles.sectionTexte}>
            {
              "Koté ne collecte ni votre nom, ni votre numéro, ni votre historique de " +
              "position. Votre position ne sert qu'à calculer ce qui est proche, au moment " +
              "où vous cherchez.\n\n" +
              "Pour les commerçants : les informations d'une fiche servent uniquement à " +
              "être trouvé par des clients. Elles ne sont transmises à aucune " +
              "administration. Un commerçant peut retirer sa fiche à tout moment, " +
              "immédiatement et sans avoir à se justifier."
            }
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitre}>Carte hors ligne</Text>
          <Text style={styles.sectionTexte}>
            {carte.installe
              ? `Le fond de carte du Grand Lomé est enregistré sur votre téléphone (${formaterOctets(carte.poids)}). La carte fonctionne sans connexion et ne consomme plus de données. D'autres zones du Togo seront ajoutées progressivement.`
              : "Vous pouvez enregistrer le fond de carte du Grand Lomé une fois pour toutes. La carte fonctionnera ensuite sans connexion et ne consommera plus jamais de données. D'autres zones du Togo seront ajoutées progressivement."}
          </Text>
          {carte.progression !== null ? (
            <Text style={styles.note}>
              Téléchargement en cours : {carte.progression} %
            </Text>
          ) : null}
          <View style={styles.actions}>
            <BoutonSecondaire
              libelle={
                carte.progression !== null
                  ? `Téléchargement… ${carte.progression} %`
                  : carte.installe
                    ? "Supprimer la carte hors ligne"
                    : "Enregistrer la carte du Grand Lomé"
              }
              Icone={carte.installe ? Trash2 : Download}
              onPress={carte.installe ? carte.supprimer : carte.telecharger}
            />
          </View>
          {carte.erreur ? <Text style={styles.note}>{carte.erreur}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitre}>Espace et données</Text>
          <Text style={styles.sectionTexte}>
            {enAttente > 0
              ? `${enAttente} mesure${enAttente > 1 ? "s" : ""} d'usage en attente d'envoi.`
              : "Aucune donnée en attente d'envoi."}
          </Text>
          <View style={styles.actions}>
            <BoutonSecondaire
              libelle={videe ? "Cache vidé" : "Vider le cache hors ligne"}
              onPress={async () => {
                await viderCacheDisque();
                client.clear();
                setVidee(true);
              }}
            />
            {enAttente > 0 ? (
              <Pressable
                onPress={async () => {
                  await viderJournal();
                  setEnAttente(await tailleJournal());
                }}
                style={styles.lienZone}
              >
                <Text style={styles.lien}>Envoyer maintenant</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.note}>
            Vider le cache libère de l'espace, mais l'application devra tout
            recharger au prochain lancement — et cela consomme de la connexion.
          </Text>
        </View>
      </ScrollView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  contenu: { paddingHorizontal: espaces.md, gap: espaces.lg },
  entete: { flexDirection: "row", alignItems: "center", gap: espaces.sm },
  titre: {
    color: couleurs.textePrincipal,
    fontSize: typo.titre,
    fontFamily: police.demi,
  },

  section: { gap: espaces.xs },
  sectionTitre: {
    color: couleurs.textePrincipal,
    fontSize: typo.corps,
    fontFamily: police.demi,
  },
  sectionTexte: {
    color: couleurs.texteSecondaire,
    fontSize: typo.repere,
    fontFamily: police.normal,
    lineHeight: typo.repere * 1.5,
  },

  encadre: {
    gap: espaces.xs,
    backgroundColor: couleurs.surface1,
    borderRadius: rayons.tuile,
    padding: espaces.md,
  },
  encadreTitre: {
    color: couleurs.accentDoux,
    fontSize: typo.libelle,
    fontFamily: police.gras,
    letterSpacing: 0.8,
  },

  actions: { gap: espaces.xs, paddingTop: espaces.xs },
  lienZone: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  lien: {
    color: couleurs.accentDoux,
    fontSize: typo.repere,
    fontFamily: police.demi,
  },
  note: {
    color: couleurs.texteSecondaire,
    fontSize: typo.libelle,
    fontFamily: police.normal,
    lineHeight: typo.libelle * 1.4,
  },
});
