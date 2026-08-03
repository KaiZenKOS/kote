/**
 * File d'attente du journal d'usage.
 *
 * Pourquoi une file maison plutot que des mutations TanStack persistees ?
 *
 *  1. Elle doit etre BORNEE et JETABLE. Un utilisateur hors ligne trois jours
 *     ne doit pas accumuler des milliers d'evenements sur un telephone ou le
 *     stockage est rare. Au-dela du plafond, on jette les plus anciens : perdre
 *     une statistique est sans consequence, saturer le telephone en a une.
 *  2. Une mutation persistee rejouee apres une reponse perdue compterait deux
 *     fois le meme evenement.
 *
 * Point important de conception : `clic_whatsapp` n'entre JAMAIS dans cette
 * file. Ce compteur est ecrit par la fonction edge `contact`, cote serveur, et
 * par elle seule. C'est ce qui rend l'indicateur central du produit -- et donc
 * la commission des ambassadeurs -- insensible a ce que raconte le client.
 *
 * L'envoi par lots est aussi une economie directe : un appel reseau par vue de
 * fiche ferait payer a l'utilisateur une statistique qui ne lui sert pas.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, type AppStateStatus } from "react-native";
import { onlineManager } from "@tanstack/react-query";

import { appelerFonction } from "../api/client";
import { empreinteAppareil } from "../appareil";
import type { EvenementUsage } from "../api/types";

const CLE = "kote:journal";

/** Taille declenchant un envoi automatique. */
const TAILLE_LOT = 25;

/** Le backend refuse au-dela de 50 par appel. */
const LOT_MAX_SERVEUR = 50;

/** Plafond de la file. Au-dela, les plus anciens sont abandonnes. */
const PLAFOND = 200;

const INTERVALLE_ENVOI = 5 * 60 * 1000;

let envoiEnCours = false;

async function lire(): Promise<EvenementUsage[]> {
  const brut = await AsyncStorage.getItem(CLE);
  if (!brut) return [];
  try {
    const analyse = JSON.parse(brut);
    return Array.isArray(analyse) ? (analyse as EvenementUsage[]) : [];
  } catch {
    return [];
  }
}

async function ecrire(evenements: EvenementUsage[]): Promise<void> {
  await AsyncStorage.setItem(CLE, JSON.stringify(evenements));
}

/** Ajoute un evenement a la file. N'echoue jamais : ce n'est pas critique. */
export async function journaliser(evenement: EvenementUsage): Promise<void> {
  try {
    const file = await lire();
    file.push(evenement);

    const bornee = file.length > PLAFOND ? file.slice(-PLAFOND) : file;
    await ecrire(bornee);

    if (bornee.length >= TAILLE_LOT && onlineManager.isOnline()) {
      void viderJournal();
    }
  } catch {
    // Le journal ne doit jamais casser un parcours utilisateur.
  }
}

/**
 * Envoie la file au serveur et la vide en cas de succes.
 *
 * En cas d'echec, les evenements restent en attente : ils repartiront au
 * prochain declenchement.
 */
export async function viderJournal(): Promise<void> {
  if (envoiEnCours || !onlineManager.isOnline()) return;
  envoiEnCours = true;

  try {
    const file = await lire();
    if (file.length === 0) return;

    const lot = file.slice(0, LOT_MAX_SERVEUR);
    const reste = file.slice(LOT_MAX_SERVEUR);

    await appelerFonction("evenement", {
      appareil_hash: await empreinteAppareil(),
      evenements: lot,
    });

    await ecrire(reste);

    // Il restait plus d'un lot : on enchaine.
    if (reste.length > 0) {
      envoiEnCours = false;
      void viderJournal();
      return;
    }
  } catch {
    // Rien a faire : la file est conservee telle quelle.
  } finally {
    envoiEnCours = false;
  }
}

/**
 * Branche les declencheurs d'envoi. Renvoie la fonction d'arret.
 *
 * Trois moments : le retour du reseau, le passage de l'application en arriere
 * plan, et un battement lent en secours.
 */
export function demarrerJournal(): () => void {
  const minuterie = setInterval(() => {
    void viderJournal();
  }, INTERVALLE_ENVOI);

  const desabonnerReseau = onlineManager.subscribe((enLigne) => {
    if (enLigne) void viderJournal();
  });

  const abonnementEtat = AppState.addEventListener(
    "change",
    (statut: AppStateStatus) => {
      // L'utilisateur bascule vers WhatsApp : moment ideal pour ecouler la file.
      if (statut === "background" || statut === "inactive") {
        void viderJournal();
      }
    },
  );

  return () => {
    clearInterval(minuterie);
    desabonnerReseau();
    abonnementEtat.remove();
  };
}

/** Nombre d'evenements en attente. Affiche dans l'ecran d'aide. */
export async function tailleJournal(): Promise<number> {
  return (await lire()).length;
}
