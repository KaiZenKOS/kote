import { supabase, erreurDepuisPostgrest } from "./client";
import type { PhotoMarchand } from "./types";

const BUCKET = "photos-marchands";
const TAILLE_MAX = 5 * 1024 * 1024;

export async function mesPhotos(marchandId: string): Promise<PhotoMarchand[]> {
  const { data, error } = await supabase
    .from("photo_marchand")
    .select("id,marchand_id,chemin,ordre,largeur,hauteur")
    .eq("marchand_id", marchandId)
    .order("ordre");
  if (error) throw erreurDepuisPostgrest(error);
  return (data ?? []) as PhotoMarchand[];
}

export function urlPhotoPrivee(chemin: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(chemin).data.publicUrl;
}

export async function ajouterPhoto(
  marchandId: string,
  photo: { uri: string; mimeType?: string | null; fileSize?: number | null; width?: number; height?: number },
): Promise<PhotoMarchand> {
  if (photo.fileSize && photo.fileSize > TAILLE_MAX) {
    throw new Error("La photo est trop lourde. Choisissez une image de moins de 5 Mo.");
  }
  const reponse = await fetch(photo.uri);
  const fichier = await reponse.blob();
  if (fichier.size > TAILLE_MAX) throw new Error("La photo est trop lourde. Choisissez une image de moins de 5 Mo.");

  const extension = photo.mimeType === "image/png" ? "png" : "jpg";
  const chemin = `${marchandId}/original/${Date.now()}.${extension}`;
  const { error: erreurEnvoi } = await supabase.storage.from(BUCKET).upload(chemin, fichier, {
    contentType: photo.mimeType === "image/png" ? "image/png" : "image/jpeg",
    upsert: false,
  });
  if (erreurEnvoi) throw erreurDepuisPostgrest(erreurEnvoi);

  const { data, error } = await supabase
    .from("photo_marchand")
    .insert({ marchand_id: marchandId, chemin, ordre: 99, largeur: photo.width ?? null, hauteur: photo.height ?? null })
    .select("id,marchand_id,chemin,ordre,largeur,hauteur")
    .single();
  if (error) {
    void supabase.storage.from(BUCKET).remove([chemin]);
    throw erreurDepuisPostgrest(error);
  }
  return data as PhotoMarchand;
}

export async function supprimerPhoto(photo: PhotoMarchand): Promise<void> {
  const { error } = await supabase.from("photo_marchand").delete().eq("id", photo.id);
  if (error) throw erreurDepuisPostgrest(error);
  void supabase.storage.from(BUCKET).remove([photo.chemin]);
}
