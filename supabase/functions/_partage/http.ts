// ---------------------------------------------------------------------------
// Utilitaires HTTP communs aux fonctions edge.
//
// Les reponses sont volontairement compactes : chaque octet renvoye est paye
// par l'utilisateur sur un forfait prepaye (CDC 2.4). Pas de champ decoratif,
// pas d'enveloppe redondante.
// ---------------------------------------------------------------------------

export const ENTETES_CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cle-entretien",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function prevol(requete: Request): Response | null {
  if (requete.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: ENTETES_CORS });
  }
  return null;
}

export function json(corps: unknown, statut = 200): Response {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { ...ENTETES_CORS, "Content-Type": "application/json; charset=utf-8" },
  });
}

export function erreur(message: string, statut = 400, code?: string): Response {
  return json({ erreur: message, code }, statut);
}

export async function corpsJson<T>(requete: Request): Promise<T | null> {
  try {
    return (await requete.json()) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Validation minimale, sans dependance externe.
// ---------------------------------------------------------------------------

const MOTIF_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function estUuid(valeur: unknown): valeur is string {
  return typeof valeur === "string" && MOTIF_UUID.test(valeur);
}

// L'empreinte d'appareil est generee et conservee par le client. Elle permet de
// compter des visiteurs distincts et de limiter les abus sans jamais identifier
// une personne (CDC 9.1).
export function estEmpreinte(valeur: unknown): valeur is string {
  return typeof valeur === "string" && /^[a-zA-Z0-9_-]{16,128}$/.test(valeur);
}

export function texteBorne(valeur: unknown, max: number): string | null {
  if (typeof valeur !== "string") return null;
  const propre = valeur.trim();
  if (propre.length === 0) return null;
  return propre.slice(0, max);
}

// Arrondi a trois decimales, soit environ 100 m sous ces latitudes. On ne
// conserve jamais la position d'un client au metre pres (CDC 9.1).
export function positionApprochee(
  latitude: unknown,
  longitude: unknown,
): { lat: number; lng: number } | null {
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return {
    lat: Math.round(latitude * 1000) / 1000,
    lng: Math.round(longitude * 1000) / 1000,
  };
}
