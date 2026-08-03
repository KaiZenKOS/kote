import { supabase, erreurDepuisPostgrest } from "./client";
import { ErreurApi } from "./erreurs";
import type {
  Categorie,
  ComptageCategorie,
  FicheMarchand,
  ParametresRecherche,
  PhotoMarchand,
  ResultatRecherche,
} from "./types";

const BUCKET_PHOTOS = "photos-marchands";

export async function listerCategories(): Promise<Categorie[]> {
  const { data, error } = await supabase
    .from("categorie")
    .select("slug,libelle_fr,libelle_gen,libelle_ee,icone,ordre")
    .order("ordre");

  if (error) throw erreurDepuisPostgrest(error);
  return (data ?? []) as Categorie[];
}

/**
 * Compteurs des six categories dans le rayon, en un seul appel.
 * Six requetes separees couteraient six fois plus a l'utilisateur pour la meme
 * information.
 */
export async function compterParCategorie(
  latitude: number,
  longitude: number,
  rayonM: number,
): Promise<ComptageCategorie[]> {
  const { data, error } = await supabase.rpc("compter_par_categorie", {
    p_lat: latitude,
    p_lng: longitude,
    p_rayon_m: rayonM,
  });

  if (error) throw erreurDepuisPostgrest(error);
  return (data ?? []) as ComptageCategorie[];
}

export async function rechercherMarchands(
  p: ParametresRecherche,
): Promise<ResultatRecherche[]> {
  const { data, error } = await supabase.rpc("rechercher_marchands", {
    p_lat: p.latitude,
    p_lng: p.longitude,
    p_rayon_m: p.rayonM,
    p_categorie: p.categorie ?? null,
    p_q: p.q ?? null,
    p_limite: p.limite ?? 20,
  });

  if (error) throw erreurDepuisPostgrest(error);
  return (data ?? []) as ResultatRecherche[];
}

export async function lireFiche(id: string): Promise<FicheMarchand> {
  const { data, error } = await supabase
    .from("marchand_public")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw erreurDepuisPostgrest(error);

  /**
   * Absence de ligne = fiche retiree, mise en veille ou inexistante. C'est un
   * cas nominal dans l'informel, pas une anomalie : l'ecran « Introuvable »
   * propose de signaler et de revenir aux resultats.
   */
  if (!data) throw new ErreurApi("Fiche introuvable", 404, "introuvable");

  return data as FicheMarchand;
}

export async function listerPhotos(
  marchandId: string,
): Promise<PhotoMarchand[]> {
  const { data, error } = await supabase
    .from("photo_marchand_public")
    .select("*")
    .eq("marchand_id", marchandId)
    .order("ordre");

  if (error) throw erreurDepuisPostgrest(error);
  return (data ?? []) as PhotoMarchand[];
}

/**
 * URL publique d'une photo. Le bucket est public en lecture : une URL signee
 * ajouterait un aller-retour reseau par vignette, paye par l'utilisateur.
 */
export function urlPhoto(chemin: string | null): string | null {
  if (!chemin) return null;
  return supabase.storage.from(BUCKET_PHOTOS).getPublicUrl(chemin).data
    .publicUrl;
}
