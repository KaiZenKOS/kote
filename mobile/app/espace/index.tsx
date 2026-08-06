import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  ArrowRight,
  CircleCheck,
  Plus,
  Store,
  Users,
} from "lucide-react-native";

import {
  demanderCode,
  formaterTelephone,
  normaliserTelephone,
  seDeconnecter,
  verifierCode,
} from "../../src/api/compte";
import { Ecran } from "../../src/composants/Ecran";
import { BoutonRond } from "../../src/composants/communs";
import {
  GrandBouton,
  GrandChamp,
  libelleStatut,
} from "../../src/composants/espace";
import {
  useConfirmerActivite,
  useMesFiches,
  useMonAmbassadeur,
  useMesCommissions,
  useRevendiquerMesFiches,
} from "../../src/hooks/useEspace";
import { useSession } from "../../src/hooks/useSession";
import { couleurs, espaces, police, rayons, typo } from "../../src/theme/tokens";

export default function Espace() {
  const insets = useSafeAreaInsets();
  const { connecte, chargement, telephone } = useSession();

  if (chargement) {
    return (
      <Ecran>
        <View style={styles.centre}>
          <ActivityIndicator color={couleurs.accent} />
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
        {connecte ? <Tableau telephone={telephone} /> : <Connexion />}
      </ScrollView>
    </Ecran>
  );
}

/* ------------------------------------------------------------------------- */

function Connexion() {
  const router = useRouter();
  const [etape, setEtape] = useState<"numero" | "code">("numero");
  const [saisie, setSaisie] = useState("");
  const [numero, setNumero] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const envoyerCode = async () => {
    const normalise = normaliserTelephone(saisie);
    if (!normalise) {
      setErreur("Ce numéro ne semble pas correct.");
      return;
    }
    setErreur(null);
    setEnvoi(true);
    try {
      await demanderCode(normalise);
      setNumero(normalise);
      setEtape("code");
    } catch {
      setErreur("Impossible d'envoyer le code. Réessayez dans un instant.");
    } finally {
      setEnvoi(false);
    }
  };

  const valider = async () => {
    if (!numero) return;
    setErreur(null);
    setEnvoi(true);
    try {
      await verifierCode(numero, code.trim());
    } catch {
      setErreur("Ce code ne correspond pas. Vérifiez et réessayez.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <View style={styles.bloc}>
      <View style={styles.entete}>
        <BoutonRond
          Icone={ArrowLeft}
          etiquette="Retour"
          onPress={() => router.back()}
        />
      </View>

      <Text style={styles.grandTitre}>
        {etape === "numero" ? "Votre boutique sur Koté" : "Entrez le code reçu"}
      </Text>

      {/**
       * Le discours ne parle jamais de formalisation, d'enregistrement ni
       * d'administration. Le marchand achete de la visibilite et des clients :
       * c'est la condition de son inscription (cahier des charges, section 3.1).
       */}
      <Text style={styles.intro}>
        {etape === "numero"
          ? "Vos clients vous cherchent dans le quartier. Inscrivez votre activité pour qu'ils vous trouvent, et qu'ils vous écrivent sur WhatsApp."
          : `Un code à 6 chiffres a été envoyé au ${formaterTelephone(numero ?? "")}.`}
      </Text>

      {etape === "numero" ? (
        <>
          <GrandChamp
            libelle="Votre numéro WhatsApp"
            aide="C'est ce numéro que vos clients utiliseront pour vous écrire."
            valeur={saisie}
            onChange={setSaisie}
            placeholder="90 00 01 02"
            clavier="phone-pad"
          />
          <GrandBouton
            libelle={envoi ? "Envoi…" : "Recevoir mon code"}
            Icone={ArrowRight}
            desactive={envoi}
            onPress={() => void envoyerCode()}
          />
        </>
      ) : (
        <>
          <GrandChamp
            libelle="Code à 6 chiffres"
            valeur={code}
            onChange={setCode}
            placeholder="000000"
            clavier="number-pad"
            maxLength={6}
          />
          <GrandBouton
            libelle={envoi ? "Vérification…" : "Valider"}
            Icone={CircleCheck}
            desactive={envoi || code.trim().length < 4}
            onPress={() => void valider()}
          />
          <Pressable onPress={() => setEtape("numero")} style={styles.lienZone}>
            <Text style={styles.lien}>Changer de numéro</Text>
          </Pressable>
        </>
      )}

      {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}

      <View style={styles.encadre}>
        <Text style={styles.encadreTitre}>Ce que nous faisons de vos informations</Text>
        <Text style={styles.encadreTexte}>
          {
            "Elles servent uniquement à vous rendre visible auprès de clients proches de vous. " +
            "Elles ne sont transmises à aucune administration. Nous ne demandons ni votre chiffre " +
            "d'affaires, ni vos revenus, ni aucune pièce d'identité. Vous pouvez retirer votre " +
            "fiche à tout moment, immédiatement."
          }
        </Text>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------------- */

function Tableau({ telephone }: { telephone: string | null }) {
  const router = useRouter();
  const fiches = useMesFiches();
  const ambassadeur = useMonAmbassadeur();
  const confirmer = useConfirmerActivite();
  const commissions = useMesCommissions();
  const revendiquer = useRevendiquerMesFiches();

  const estAmbassadeur = Boolean(ambassadeur.data?.actif);
  const mesFiches = fiches.data ?? [];
  const aConfirmer = mesFiches.filter(
    (f) => f.statut === "a_confirmer" || f.statut === "en_veille",
  );

  return (
    <View style={styles.bloc}>
      <View style={styles.entete}>
        <BoutonRond
          Icone={ArrowLeft}
          etiquette="Retour"
          onPress={() => router.back()}
        />
        <View style={styles.enteteTextes}>
          <Text style={styles.enteteTitre}>
            {estAmbassadeur ? "Espace ambassadeur" : "Ma boutique"}
          </Text>
          {telephone ? (
            <Text style={styles.enteteSous}>
              {formaterTelephone(`+${telephone}`)}
            </Text>
          ) : null}
        </View>
      </View>

      {aConfirmer.length > 0 ? (
        <View style={styles.alerte}>
          <Text style={styles.alerteTitre}>
            {aConfirmer.length > 1
              ? `${aConfirmer.length} fiches à confirmer`
              : "Une fiche à confirmer"}
          </Text>
          <Text style={styles.alerteTexte}>
            Sans confirmation, votre boutique finit par disparaître des
            résultats. Un appui suffit.
          </Text>
          {aConfirmer.map((f) => (
            <GrandBouton
              key={f.id}
              libelle={`Je suis toujours là — ${f.nom_enseigne}`}
              Icone={CircleCheck}
              onPress={() =>
                confirmer.mutate({
                  marchandId: f.id,
                  source: estAmbassadeur ? "ambassadeur" : "marchand",
                })
              }
            />
          ))}
        </View>
      ) : null}

      {!estAmbassadeur ? (
        <View style={styles.reprendre}>
          <Text style={styles.reprendreTitre}>Vous avez déjà une fiche ?</Text>
          <Text style={styles.reprendreTexte}>Si un ambassadeur l’a créée avec ce numéro, récupérez-la en un appui.</Text>
          <GrandBouton
            libelle={revendiquer.isPending ? "Recherche…" : "Récupérer ma fiche"}
            variante="secondaire"
            desactive={revendiquer.isPending}
            onPress={() => revendiquer.mutate()}
          />
        </View>
      ) : null}

      {estAmbassadeur ? (
        <View style={styles.reprendre}>
          <Text style={styles.reprendreTitre}>Votre tournée</Text>
          <Text style={styles.reprendreTexte}>
            {mesFiches.length} inscription{mesFiches.length > 1 ? "s" : ""} · {(commissions.data ?? []).filter((c) => c.statut === "validee" || c.statut === "payee").reduce((total, c) => total + c.montant_fcfa, 0)} FCFA validés
          </Text>
        </View>
      ) : null}

      <GrandBouton
        libelle={estAmbassadeur ? "Inscrire un marchand" : "Créer ma fiche"}
        Icone={Plus}
        onPress={() => router.push("/espace/nouvelle")}
      />

      {fiches.isPending ? (
        <ActivityIndicator color={couleurs.accent} />
      ) : mesFiches.length === 0 ? (
        <Text style={styles.vide}>
          {estAmbassadeur
            ? "Aucune inscription pour le moment."
            : "Vous n'avez pas encore de fiche."}
        </Text>
      ) : (
        <View style={styles.liste}>
          <Text style={styles.etiquette}>
            {estAmbassadeur ? "MES INSCRIPTIONS" : "MES FICHES"}
          </Text>
          {mesFiches.map((f) => (
            <Pressable
              key={f.id}
              accessibilityRole="button"
              style={styles.ligne}
              onPress={() => router.push(`/espace/fiche/${f.id}`)}
            >
              <View style={styles.ligneIcone}>
                {estAmbassadeur ? (
                  <Users size={24} color={couleurs.accentDoux} />
                ) : (
                  <Store size={24} color={couleurs.accentDoux} />
                )}
              </View>
              <View style={styles.ligneTextes}>
                <Text style={styles.ligneNom} numberOfLines={1}>
                  {f.nom_enseigne}
                </Text>
                <Text style={styles.ligneStatut}>{libelleStatut(f.statut)}</Text>
              </View>
              <ArrowRight size={20} color={couleurs.texteSecondaire} />
            </Pressable>
          ))}
        </View>
      )}

      <Pressable
        onPress={() => void seDeconnecter()}
        style={styles.lienZone}
      >
        <Text style={styles.lien}>Se déconnecter</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: "center", justifyContent: "center" },
  contenu: { paddingHorizontal: espaces.md },
  bloc: { gap: espaces.md },

  entete: { flexDirection: "row", alignItems: "center", gap: espaces.sm },
  enteteTextes: { flex: 1 },
  enteteTitre: {
    color: couleurs.textePrincipal,
    fontSize: typo.titre,
    fontFamily: police.demi,
  },
  enteteSous: {
    color: couleurs.texteSecondaire,
    fontSize: typo.repere,
    fontFamily: police.moyen,
  },

  grandTitre: {
    color: couleurs.textePrincipal,
    fontSize: 30,
    fontFamily: police.gras,
    lineHeight: 30 * 1.15,
  },
  intro: {
    color: couleurs.texteSecondaire,
    fontSize: typo.corps,
    fontFamily: police.normal,
    lineHeight: typo.corps * 1.45,
  },

  erreur: {
    color: couleurs.fraicheurAVerifier,
    fontSize: typo.repere,
    fontFamily: police.moyen,
  },

  encadre: {
    gap: espaces.xs,
    marginTop: espaces.sm,
    padding: espaces.md,
    borderRadius: rayons.tuile,
    backgroundColor: couleurs.surface1,
  },
  encadreTitre: {
    color: couleurs.accentDoux,
    fontSize: typo.libelle,
    fontFamily: police.gras,
    letterSpacing: 0.6,
  },
  encadreTexte: {
    color: couleurs.texteSecondaire,
    fontSize: typo.repere,
    fontFamily: police.normal,
    lineHeight: typo.repere * 1.5,
  },

  alerte: {
    gap: espaces.sm,
    padding: espaces.md,
    borderRadius: rayons.tuile,
    backgroundColor: couleurs.surface1,
    borderWidth: 1.5,
    borderColor: couleurs.fraicheurAVerifier,
  },
  reprendre: {
    gap: espaces.sm,
    padding: espaces.md,
    borderRadius: rayons.tuile,
    backgroundColor: couleurs.surface1,
  },
  reprendreTitre: { color: couleurs.accentDoux, fontSize: typo.corps, fontFamily: police.demi },
  reprendreTexte: { color: couleurs.texteSecondaire, fontSize: typo.repere, fontFamily: police.normal, lineHeight: typo.repere * 1.4 },
  alerteTitre: {
    color: couleurs.textePrincipal,
    fontSize: 18,
    fontFamily: police.demi,
  },
  alerteTexte: {
    color: couleurs.texteSecondaire,
    fontSize: typo.repere,
    fontFamily: police.normal,
    lineHeight: typo.repere * 1.45,
  },

  liste: { gap: espaces.xs },
  etiquette: {
    color: couleurs.texteSecondaire,
    fontSize: typo.libelle,
    fontFamily: police.moyen,
    letterSpacing: 0.8,
  },
  ligne: {
    flexDirection: "row",
    alignItems: "center",
    gap: espaces.sm,
    minHeight: 76,
    paddingHorizontal: espaces.md,
    borderRadius: rayons.tuile,
    backgroundColor: couleurs.surface1,
  },
  ligneIcone: {
    width: 48,
    height: 48,
    borderRadius: rayons.pastille,
    backgroundColor: couleurs.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  ligneTextes: { flex: 1, gap: 2 },
  ligneNom: {
    color: couleurs.textePrincipal,
    fontSize: 18,
    fontFamily: police.demi,
  },
  ligneStatut: {
    color: couleurs.texteSecondaire,
    fontSize: typo.repere,
    fontFamily: police.moyen,
  },

  vide: {
    color: couleurs.texteSecondaire,
    fontSize: typo.corps,
    fontFamily: police.normal,
  },

  lienZone: { minHeight: 56, alignItems: "center", justifyContent: "center" },
  lien: {
    color: couleurs.accentDoux,
    fontSize: typo.corps,
    fontFamily: police.demi,
  },
});
