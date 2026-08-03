/**
 * Empreinte d'appareil.
 *
 * Identifiant aleatoire local, genere au premier lancement. Il permet de
 * compter des visiteurs distincts et de limiter les abus sans jamais identifier
 * une personne : aucun identifiant materiel, aucun numero, rien qui remonte a
 * l'utilisateur.
 *
 * Le backend attend le motif /^[a-zA-Z0-9_-]{16,128}$/. Trente-deux caracteres
 * hexadecimaux le satisfont.
 */

import "react-native-get-random-values";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CLE = "kote:appareil";

let enMemoire: string | null = null;

function genererEmpreinte(): string {
  const octets = new Uint8Array(16);
  crypto.getRandomValues(octets);
  return Array.from(octets)
    .map((o) => o.toString(16).padStart(2, "0"))
    .join("");
}

export async function empreinteAppareil(): Promise<string> {
  if (enMemoire) return enMemoire;

  const existante = await AsyncStorage.getItem(CLE);
  if (existante && /^[a-zA-Z0-9_-]{16,128}$/.test(existante)) {
    enMemoire = existante;
    return existante;
  }

  const nouvelle = genererEmpreinte();
  await AsyncStorage.setItem(CLE, nouvelle);
  enMemoire = nouvelle;
  return nouvelle;
}

/** Regenere l'empreinte. Expose par l'ecran d'aide, au titre du controle des donnees. */
export async function reinitialiserEmpreinte(): Promise<string> {
  const nouvelle = genererEmpreinte();
  await AsyncStorage.setItem(CLE, nouvelle);
  enMemoire = nouvelle;
  return nouvelle;
}
