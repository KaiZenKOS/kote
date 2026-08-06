/**
 * Espace marchand et ambassadeur.
 *
 * Tout passe par PostgREST et les politiques RLS du backend : un compte ne voit
 * que ses propres fiches, ou celles qu'il a saisies comme ambassadeur. Aucune
 * verification de droits n'est faite ici -- le client ne doit jamais etre
 * l'arbitre de ce qu'il a le droit de lire.
 */

import { supabase, erreurDepuisPostgrest, appelerFonction } from "./client";
import { ErreurApi } from "./erreurs";
import type { Position, StatutMarchand } from "./types";

export interface FichePrivee {
  id: string;
  proprietaire_id: string | null;
  cree_par_ambassadeur: string | null;
  nom_enseigne: string;
  categorie_slug: string;
  description: string | null;
  telephone_whatsapp: string;
  repere: string;
  localisation_ajustee: boolean;
  statut: StatutMarchand | "brouillon" | "en_veille" | "suspendue" | "retiree";
  derniere_confirmation: string;
  cle_idempotence: string | null;
  cree_le: string;
}

export interface Ambassadeur {
  id: string;
  zone_id: string | null;
  code: string;
  actif: boolean;
}

export interface Commission {
  id: string;
  marchand_id: string;
  part: "validation" | "j30";
  montant_fcfa: number;
  statut: "en_attente" | "validee" | "payee" | "annulee";
  echeance: string | null;
  motif_annulation: string | null;
}

export interface Statistiques {
  vues_fiche: number;
  clics_whatsapp: number;
  clics_itineraire: number;
  jours: number;
}

export interface SaisieFiche {
  nomEnseigne: string;
  categorieSlug: string;
  description?: string | null;
  telephoneWhatsapp: string;
  repere: string;
  position: Position;
  positionAjustee: boolean;
  /** Genere par le client. Rejouer la meme saisie ne cree pas de doublon. */
  cleIdempotence: string;
  /** Renseigne quand la saisie est faite par un ambassadeur pour un tiers. */
  ambassadeurId?: string | null;
  proprietaireId?: string | null;
}

export async function mesFiches(): Promise<FichePrivee[]> {
  const { data, error } = await supabase
    .from("marchand")
    .select(
      "id,proprietaire_id,cree_par_ambassadeur,nom_enseigne,categorie_slug,description,telephone_whatsapp,repere,localisation_ajustee,statut,derniere_confirmation,cle_idempotence,cree_le",
    )
    .order("cree_le", { ascending: false });

  if (error) throw erreurDepuisPostgrest(error);
  return (data ?? []) as FichePrivee[];
}

export async function monAmbassadeur(): Promise<Ambassadeur | null> {
  const { data, error } = await supabase
    .from("ambassadeur")
    .select("id,zone_id,code,actif")
    .maybeSingle();

  if (error) throw erreurDepuisPostgrest(error);
  return (data as Ambassadeur | null) ?? null;
}

export async function mesCommissions(): Promise<Commission[]> {
  const { data, error } = await supabase
    .from("commission")
    .select("id,marchand_id,part,montant_fcfa,statut,echeance,motif_annulation")
    .order("cree_le", { ascending: false });

  if (error) throw erreurDepuisPostgrest(error);
  return (data ?? []) as Commission[];
}

export async function statistiques(
  marchandId: string,
  jours: number,
): Promise<Statistiques> {
  const { data, error } = await supabase.rpc("statistiques_marchand", {
    p_marchand_id: marchandId,
    p_jours: jours,
  });

  if (error) throw erreurDepuisPostgrest(error);
  const ligne = Array.isArray(data) ? data[0] : data;
  return (
    (ligne as Statistiques) ?? {
      vues_fiche: 0,
      clics_whatsapp: 0,
      clics_itineraire: 0,
      jours,
    }
  );
}

/**
 * Creation d'une fiche.
 *
 * La cle d'idempotence est portee par le client et non par le serveur : c'est
 * ce qui rend la saisie hors ligne rejouable sans risque. Un ambassadeur qui
 * enregistre dix marchands dans un marche sans couverture, puis retrouve du
 * reseau, peut voir sa file d'attente partir deux fois sans creer de doublon.
 */
export async function creerFiche(saisie: SaisieFiche): Promise<FichePrivee> {
  const { data, error } = await supabase
    .from("marchand")
    .insert({
      nom_enseigne: saisie.nomEnseigne,
      categorie_slug: saisie.categorieSlug,
      description: saisie.description ?? null,
      telephone_whatsapp: saisie.telephoneWhatsapp,
      repere: saisie.repere,
      localisation: `SRID=4326;POINT(${saisie.position.longitude} ${saisie.position.latitude})`,
      localisation_ajustee: saisie.positionAjustee,
      cle_idempotence: saisie.cleIdempotence,
      cree_par_ambassadeur: saisie.ambassadeurId ?? null,
      proprietaire_id: saisie.proprietaireId ?? null,
    })
    .select()
    .maybeSingle();

  if (error) {
    // 23505 : la cle d'idempotence existe deja. La fiche a donc bien ete creee
    // lors d'une tentative precedente : on la relit au lieu d'echouer.
    if (error.code === "23505") {
      const existante = await ficheParCle(saisie.cleIdempotence);
      if (existante) return existante;
    }
    throw erreurDepuisPostgrest(error);
  }

  if (!data) throw new ErreurApi("Création impossible", 403);
  return data as FichePrivee;
}

async function ficheParCle(cle: string): Promise<FichePrivee | null> {
  const { data } = await supabase
    .from("marchand")
    .select("*")
    .eq("cle_idempotence", cle)
    .maybeSingle();
  return (data as FichePrivee | null) ?? null;
}

export async function majFiche(
  id: string,
  champs: Partial<{
    nomEnseigne: string;
    categorieSlug: string;
    description: string | null;
    telephoneWhatsapp: string;
    repere: string;
    position: Position;
    positionAjustee: boolean;
  }>,
): Promise<void> {
  const charge: Record<string, unknown> = {};
  if (champs.nomEnseigne !== undefined) charge.nom_enseigne = champs.nomEnseigne;
  if (champs.categorieSlug !== undefined)
    charge.categorie_slug = champs.categorieSlug;
  if (champs.description !== undefined) charge.description = champs.description;
  if (champs.telephoneWhatsapp !== undefined)
    charge.telephone_whatsapp = champs.telephoneWhatsapp;
  if (champs.repere !== undefined) charge.repere = champs.repere;
  if (champs.position !== undefined) {
    charge.localisation = `SRID=4326;POINT(${champs.position.longitude} ${champs.position.latitude})`;
  }
  if (champs.positionAjustee !== undefined)
    charge.localisation_ajustee = champs.positionAjustee;

  const { error } = await supabase.from("marchand").update(charge).eq("id", id);
  if (error) throw erreurDepuisPostgrest(error);
}

export async function publierFiche(id: string): Promise<void> {
  const { error } = await supabase.rpc("publier_ma_fiche", {
    p_marchand_id: id,
  });
  if (error) throw erreurDepuisPostgrest(error);
}

/** Droit de retrait : immediat, sans intervention humaine, sans delai. */
export async function retirerFiche(id: string): Promise<void> {
  const { error } = await supabase.rpc("retirer_ma_fiche", {
    p_marchand_id: id,
  });
  if (error) throw erreurDepuisPostgrest(error);
}

export async function revendiquerFiche(id: string): Promise<void> {
  const { error } = await supabase.rpc("revendiquer_ma_fiche", {
    p_marchand_id: id,
  });
  if (error) throw erreurDepuisPostgrest(error);
}

export async function revendiquerMesFiches(): Promise<number> {
  const { data, error } = await supabase.rpc("revendiquer_mes_fiches");
  if (error) throw erreurDepuisPostgrest(error);
  return typeof data === "number" ? data : 0;
}

export async function suggererDescription(marchandId: string, mots: string[]): Promise<string[]> {
  const resultat = await appelerFonction<{ propositions: string[] }>("ia-description", { marchand_id: marchandId, mots_cles: mots });
  return resultat.propositions;
}

export async function certifierFiche(id: string): Promise<void> {
  const { error } = await supabase.rpc("certifier_fiche", { p_marchand_id: id });
  if (error) throw erreurDepuisPostgrest(error);
}

/** Preuve de vie : remet la fiche en tete des resultats. */
export async function confirmerActivite(
  marchandId: string,
  auteurId: string,
  source: "marchand" | "ambassadeur",
): Promise<void> {
  const { error } = await supabase
    .from("confirmation")
    .insert({ marchand_id: marchandId, source, auteur_id: auteurId });
  if (error) throw erreurDepuisPostgrest(error);
}
