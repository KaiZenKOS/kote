import "react-native-get-random-values";

/**
 * Identifiant unique genere sur le telephone.
 *
 * Sert de cle d'idempotence aux saisies faites hors ligne : c'est le client qui
 * decide de l'identite d'une creation, ce qui rend le rejeu inoffensif. Sans
 * cela, une file d'attente qui repart deux fois creerait des fiches en double
 * dans la base -- et une base doublonnee est une base fausse.
 */
export function identifiantUnique(): string {
  const octets = new Uint8Array(16);
  crypto.getRandomValues(octets);

  // Version 4, variante RFC 4122.
  octets[6] = (octets[6] & 0x0f) | 0x40;
  octets[8] = (octets[8] & 0x3f) | 0x80;

  const hex = Array.from(octets, (o) => o.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}
