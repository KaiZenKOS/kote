import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, ArrowRight, Check, CircleCheck } from "lucide-react-native";

import { normaliserTelephone } from "../../src/api/compte";
import { CarteInteractive } from "../../src/carte/CarteInteractive";
import { Ecran } from "../../src/composants/Ecran";
import { BoutonRond } from "../../src/composants/communs";
import { Etape, GrandBouton, GrandChamp, GrandChoix } from "../../src/composants/espace";
import { iconeCategorie } from "../../src/composants/icones";
import { useCategories } from "../../src/hooks/useCategories";
import { useCreerFiche, useMonAmbassadeur } from "../../src/hooks/useEspace";
import { useSession } from "../../src/hooks/useSession";
import { CENTRE_LOME, usePosition } from "../../src/hooks/usePosition";
import { identifiantUnique } from "../../src/identifiants";
import { estEnLigne } from "../../src/query/reseau";
import { couleurs, espaces, police, rayons, typo } from "../../src/theme/tokens";
import type { Position } from "../../src/api/types";

const TOTAL = 3;

export default function NouvelleFiche() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const categories = useCategories();
  const creer = useCreerFiche();
  const ambassadeur = useMonAmbassadeur();
  const { utilisateurId } = useSession();
  const etatPosition = usePosition();

  const [etape, setEtape] = useState(1);
  const [categorie, setCategorie] = useState<string | null>(null);
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [repere, setRepere] = useState("");
  const [point, setPoint] = useState<Position | null>(null);
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [cleIdempotence] = useState(identifiantUnique);

  const estAmbassadeur = Boolean(ambassadeur.data?.actif);

  const positionParDefaut =
    etatPosition.statut === "prete" ? etatPosition.position : CENTRE_LOME;

  const options = useMemo(
    () =>
      (categories.data ?? []).map((c) => ({
        valeur: c.slug,
        libelle: c.libelle_fr,
        Icone: iconeCategorie(c.icone),
      })),
    [categories.data],
  );

  const telephoneValide = normaliserTelephone(telephone) !== null;
  const etape2Complete =
    nom.trim().length >= 2 && telephoneValide && repere.trim().length >= 3;

  const enregistrer = () => {
    const numero = normaliserTelephone(telephone);
    if (!categorie || !numero) return;

    setErreur(null);
    creer.mutate({
      nomEnseigne: nom.trim(),
      categorieSlug: categorie,
      telephoneWhatsapp: numero,
      repere: repere.trim(),
      position: point ?? positionParDefaut,
      // Le point n'est « ajuste » que si le marchand l'a reellement deplace.
      // Cette distinction sert au controle qualite : dans un marche dense, une
      // fiche non ajustee est probablement a quelques etals de sa vraie place.
      positionAjustee: point !== null,
      cleIdempotence,
      ambassadeurId: estAmbassadeur ? (utilisateurId ?? null) : null,
      proprietaireId: estAmbassadeur ? null : (utilisateurId ?? null),
    }, {
      onSuccess: () => setEnvoye(true),
      onError: () => setErreur("La fiche n'a pas pu etre enregistree. Verifiez votre connexion et reessayez."),
    });
  };

  if (envoye) {
    return (
      <Ecran>
        <View style={[styles.fin, { paddingTop: insets.top + espaces.xl }]}>
          <View style={styles.medaillon}>
            <CircleCheck size={40} color={couleurs.fraicheurBonne} />
          </View>
          <Text style={styles.finTitre}>
            {estEnLigne() ? "C'est enregistré" : "Enregistré sur le téléphone"}
          </Text>
          <Text style={styles.finTexte}>
            {estEnLigne()
              ? "La fiche est créée. Elle apparaîtra dans les résultats dès qu'elle sera publiée."
              : "Aucune connexion pour le moment. La fiche partira toute seule dès que le réseau reviendra — vous pouvez continuer à travailler."}
          </Text>
          <GrandBouton
            libelle="Terminer"
            Icone={Check}
            onPress={() => router.replace("/espace")}
          />
        </View>
      </Ecran>
    );
  }

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
        <BoutonRond
          Icone={ArrowLeft}
          etiquette="Retour"
          onPress={() => (etape === 1 ? router.back() : setEtape(etape - 1))}
        />

        {etape === 1 ? (
          <Etape numero={1} total={TOTAL} titre="Quelle est votre activité ?">
            <GrandChoix
              options={options}
              valeur={categorie}
              onChange={(v) => {
                setCategorie(v);
                setEtape(2);
              }}
            />
          </Etape>
        ) : null}

        {etape === 2 ? (
          <Etape numero={2} total={TOTAL} titre="Comment vous trouver ?">
            <GrandChamp
              libelle="Nom de votre boutique"
              valeur={nom}
              onChange={setNom}
              placeholder="Atelier Afiavi Couture"
              maxLength={80}
            />
            <GrandChamp
              libelle="Numéro WhatsApp"
              aide="C'est par là que vos clients vous écriront."
              valeur={telephone}
              onChange={setTelephone}
              placeholder="90 00 01 02"
              clavier="phone-pad"
            />
            <GrandChamp
              libelle="Point de repère"
              aide="Comment expliquez-vous à quelqu'un où vous trouver ? C'est l'information la plus importante de votre fiche."
              valeur={repere}
              onChange={setRepere}
              placeholder="En face de la pharmacie du carrefour"
              multiligne
              maxLength={200}
            />
            <GrandBouton
              libelle="Continuer"
              Icone={ArrowRight}
              desactive={!etape2Complete}
              onPress={() => setEtape(3)}
            />
          </Etape>
        ) : null}

        {etape === 3 ? (
          <Etape numero={3} total={TOTAL} titre="Placez votre boutique">
            <Text style={styles.aide}>
              {
                "Appuyez sur la carte à l'endroit exact de votre boutique. Le GPS se trompe " +
                "souvent de quelques mètres dans les marchés, et quelques mètres suffisent à " +
                "envoyer un client au mauvais étal."
              }
            </Text>

            <View style={styles.carte}>
              <CarteInteractive
                centre={positionParDefaut}
                zoom={17}
                afficherMaPosition={false}
                marqueurPlacement={point}
                onAppui={(p) => setPoint(p)}
              />
            </View>

            <Text style={styles.etat}>
              {point
                ? "Emplacement choisi."
                : "Aucun emplacement choisi : votre position actuelle sera utilisée."}
            </Text>

            <GrandBouton
              libelle={
                creer.isPending
                  ? "Enregistrement..."
                  : estAmbassadeur
                    ? "Enregistrer l'inscription"
                    : "Créer ma fiche"
              }
              Icone={Check}
              desactive={creer.isPending}
              onPress={enregistrer}
            />
            {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
          </Etape>
        ) : null}
      </ScrollView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  contenu: { paddingHorizontal: espaces.md, gap: espaces.lg },

  aide: {
    color: couleurs.texteSecondaire,
    fontSize: typo.corps,
    fontFamily: police.normal,
    lineHeight: typo.corps * 1.45,
  },
  carte: {
    height: 320,
    borderRadius: rayons.tuile,
    overflow: "hidden",
    backgroundColor: couleurs.surface1,
  },
  etat: {
    color: couleurs.texteSecondaire,
    fontSize: typo.repere,
    fontFamily: police.moyen,
  },
  erreur: {
    color: couleurs.fraicheurAVerifier,
    fontSize: typo.repere,
    fontFamily: police.moyen,
    lineHeight: typo.repere * 1.4,
  },

  fin: {
    flex: 1,
    alignItems: "center",
    gap: espaces.md,
    paddingHorizontal: espaces.xl,
  },
  medaillon: {
    width: 96,
    height: 96,
    borderRadius: rayons.pastille,
    backgroundColor: couleurs.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  finTitre: {
    color: couleurs.textePrincipal,
    fontSize: 26,
    fontFamily: police.gras,
    textAlign: "center",
  },
  finTexte: {
    color: couleurs.texteSecondaire,
    fontSize: typo.corps,
    fontFamily: police.normal,
    lineHeight: typo.corps * 1.45,
    textAlign: "center",
    marginBottom: espaces.md,
  },
});
