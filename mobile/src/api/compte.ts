/**
 * Authentification par numero de telephone.
 *
 * Le marchand ne retiendra pas de mot de passe et n'a souvent pas d'adresse
 * e-mail. Le numero est le seul identifiant qu'il possede deja, et c'est aussi
 * celui par lequel ses clients le joindront : le meme objet sert d'identite et
 * de moyen de contact.
 *
 * Le canal du code a usage unique reste a arbitrer cote backend -- SMS ou
 * WhatsApp. L'API ci-dessous est identique dans les deux cas.
 */

import { appelerFonction, supabase } from "./client";
import { ErreurApi } from "./erreurs";

/**
 * Normalise un numero togolais au format E.164.
 *
 * On accepte ce que les gens ecrivent reellement : « 90 00 01 02 »,
 * « 22890000102 », « +228 90 00 01 02 ». Refuser une saisie pour un espace en
 * trop ferait perdre l'inscription.
 */
export function normaliserTelephone(saisie: string): string | null {
  const chiffres = saisie.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (chiffres.length === 8) return `+228${chiffres}`;
  if (chiffres.length === 11 && chiffres.startsWith("228")) return `+${chiffres}`;
  if (chiffres.length >= 8 && chiffres.length <= 15) return `+${chiffres}`;
  return null;
}

export function formaterTelephone(e164: string): string {
  const national = e164.replace(/^\+228/, "");
  if (national.length !== 8) return e164;
  return national.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
}

export async function demanderCode(telephone: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({ phone: telephone });
  if (error) throw new ErreurApi(error.message, error.status ?? 400);
}

export async function verifierCode(
  telephone: string,
  code: string,
): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({
    phone: telephone,
    token: code,
    type: "sms",
  });
  if (error) throw new ErreurApi(error.message, error.status ?? 400);
}

export async function seDeconnecter(): Promise<void> {
  await supabase.auth.signOut();
}

export interface PreferencesProfil { notifications_activees: boolean; consentement_le: string | null; est_admin: boolean; }
export async function lirePreferencesProfil(): Promise<PreferencesProfil | null> {
  const { data, error } = await supabase.from("profil").select("notifications_activees, consentement_le, est_admin").maybeSingle();
  if (error) throw new ErreurApi(error.message, 400); return data;
}
export async function majPreferencesProfil(champs: Pick<PreferencesProfil, "notifications_activees">): Promise<void> {
  const { error } = await supabase.from("profil").update({ ...champs, consentement_le: new Date().toISOString() }).eq("id", (await supabase.auth.getUser()).data.user?.id ?? "");
  if (error) throw new ErreurApi(error.message, 400);
}
export async function supprimerMonCompte(): Promise<void> { await appelerFonction("supprimer-compte", {}); await seDeconnecter(); }
