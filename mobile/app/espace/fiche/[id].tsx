import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, CircleCheck, Eye, Send, Trash2 } from "lucide-react-native";

import { Ecran } from "../../../src/composants/Ecran";
import { BoutonRond } from "../../../src/composants/communs";
import {
  Compteur,
  GrandBouton,
  GrandChamp,
  libelleStatut,
} from "../../../src/composants/espace";
import {
  useConfirmerActivite,
  useMajFiche,
  useMesFiches,
  useMonAmbassadeur,
  usePublierFiche,
  useRetirerFiche,
  useStatistiques,
} from "../../../src/hooks/useEspace";
import { couleurs, espaces, police, rayons, typo } from "../../../src/theme/tokens";

export default function TableauFiche() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const fiches = useMesFiches();
  const ambassadeur = useMonAmbassadeur();
  const stats = useStatistiques(id ?? null, 30);
  const confirmer = useConfirmerActivite();
  const publier = usePublierFiche();
  const retirer = useRetirerFiche();
  const maj = useMajFiche();

  const [repere, setRepere] = useState<string | null>(null);
  const [confirmationRetrait, setConfirmationRetrait] = useState(false);

  const fiche = useMemo(
    () => (fiches.data ?? []).find((f) => f.id === id) ?? null,
    [fiches.data, id],
  );

  const estAmbassadeur = Boolean(ambassadeur.data?.actif);

  if (fiches.isPending) {
    return (
      <Ecran>
        <View style={styles.centre}>
          <ActivityIndicator color={couleurs.accent} />
        </View>
      </Ecran>
    );
  }

  if (!fiche) {
    return (
      <Ecran>
        <View style={styles.centre}>
          <Text style={styles.vide}>Cette fiche n'est plus accessible.</Text>
        </View>
      </Ecran>
    );
  }

  const visible = fiche.statut === "active" || fiche.statut === "a_confirmer";

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
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.entete}>
          <BoutonRond
            Icone={ArrowLeft}
            etiquette="Retour"
            onPress={() => router.back()}
          />
          <View style={styles.enteteTextes}>
            <Text style={styles.titre} numberOfLines={2}>
              {fiche.nom_enseigne}
            </Text>
            <Text style={[styles.statut, visible && styles.statutVisible]}>
              {libelleStatut(fiche.statut)}
            </Text>
          </View>
        </View>

        {/**
         * Le tableau de bord existe pour une seule raison : montrer au marchand
         * que la plateforme lui sert. Le nombre de contacts WhatsApp est la
         * seule preuve concrete qu'on puisse lui donner, donc il est mis en
         * avant plutot que le nombre de vues, plus flatteur mais creux.
         */}
        <View style={styles.compteurs}>
          <Compteur
            libelle="clients qui vous ont écrit"
            valeur={stats.data?.clics_whatsapp ?? 0}
            accent
          />
          <Compteur
            libelle="fois vue sur 30 jours"
            valeur={stats.data?.vues_fiche ?? 0}
          />
        </View>

        {stats.data && stats.data.clics_whatsapp === 0 ? (
          <Text style={styles.conseil}>
            Personne ne vous a encore écrit. Une photo nette de votre travail et
            un point de repère précis sont ce qui change le plus les choses.
          </Text>
        ) : null}

        <GrandBouton
          libelle="Je suis toujours là"
          Icone={CircleCheck}
          onPress={() =>
            confirmer.mutate({
              marchandId: fiche.id,
              source: estAmbassadeur ? "ambassadeur" : "marchand",
            })
          }
        />
        <Text style={styles.note}>
          Confirmez de temps en temps : sans nouvelle de votre part, votre
          boutique finit par sortir des résultats.
        </Text>

        {fiche.statut === "brouillon" ||
        fiche.statut === "en_veille" ||
        fiche.statut === "retiree" ? (
          <GrandBouton
            libelle="Rendre ma boutique visible"
            Icone={Send}
            variante="secondaire"
            onPress={() => publier.mutate(fiche.id)}
          />
        ) : null}

        <View style={styles.section}>
          <GrandChamp
            libelle="Point de repère"
            aide="C'est ce qui permet à un client de vous trouver. Corrigez-le si quelque chose a changé."
            valeur={repere ?? fiche.repere}
            onChange={setRepere}
            multiligne
            maxLength={200}
          />
          {repere !== null && repere.trim() !== fiche.repere ? (
            <GrandBouton
              libelle={maj.isPending ? "Enregistrement…" : "Enregistrer"}
              variante="secondaire"
              desactive={maj.isPending || repere.trim().length < 3}
              onPress={() =>
                maj.mutate(
                  { id: fiche.id, champs: { repere: repere.trim() } },
                  { onSuccess: () => setRepere(null) },
                )
              }
            />
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.apercu}>
            <Eye size={20} color={couleurs.texteSecondaire} />
            <Text style={styles.apercuTexte}>
              Voir ma fiche comme un client la voit
            </Text>
          </View>
          <GrandBouton
            libelle="Aperçu"
            variante="secondaire"
            onPress={() => router.push(`/fiche/${fiche.id}`)}
          />
        </View>

        {/**
         * Droit de retrait, exige par le cahier des charges (section 9.2) :
         * immediat, sans intervention humaine, sans avoir a se justifier. C'est
         * une contrepartie de la confiance demandee au marchand, pas une
         * fonction cachee : elle est ici, en clair.
         */}
        {!estAmbassadeur ? (
          <View style={styles.section}>
            {confirmationRetrait ? (
              <>
                <Text style={styles.note}>
                  Votre fiche disparaîtra immédiatement des résultats. Vous
                  pourrez la remettre en ligne quand vous voudrez.
                </Text>
                <GrandBouton
                  libelle="Confirmer le retrait"
                  Icone={Trash2}
                  variante="danger"
                  onPress={() =>
                    retirer.mutate(fiche.id, {
                      onSuccess: () => setConfirmationRetrait(false),
                    })
                  }
                />
              </>
            ) : (
              <GrandBouton
                libelle="Retirer ma fiche"
                Icone={Trash2}
                variante="danger"
                onPress={() => setConfirmationRetrait(true)}
              />
            )}
          </View>
        ) : null}
      </ScrollView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: "center", justifyContent: "center" },
  contenu: { paddingHorizontal: espaces.md, gap: espaces.md },

  entete: { flexDirection: "row", alignItems: "center", gap: espaces.sm },
  enteteTextes: { flex: 1, gap: 2 },
  titre: {
    color: couleurs.textePrincipal,
    fontSize: typo.titre,
    fontFamily: police.demi,
  },
  statut: {
    color: couleurs.texteSecondaire,
    fontSize: typo.repere,
    fontFamily: police.moyen,
  },
  statutVisible: { color: couleurs.fraicheurBonne },

  compteurs: { flexDirection: "row", gap: espaces.sm },
  conseil: {
    color: couleurs.texteSecondaire,
    fontSize: typo.repere,
    fontFamily: police.normal,
    lineHeight: typo.repere * 1.5,
    padding: espaces.md,
    borderRadius: rayons.tuile,
    backgroundColor: couleurs.surface1,
  },
  note: {
    color: couleurs.texteSecondaire,
    fontSize: typo.repere,
    fontFamily: police.normal,
    lineHeight: typo.repere * 1.45,
  },

  section: { gap: espaces.sm, marginTop: espaces.xs },
  apercu: { flexDirection: "row", alignItems: "center", gap: espaces.xs },
  apercuTexte: {
    color: couleurs.texteSecondaire,
    fontSize: typo.repere,
    fontFamily: police.moyen,
  },

  vide: {
    color: couleurs.texteSecondaire,
    fontSize: typo.corps,
    fontFamily: police.normal,
  },
});
