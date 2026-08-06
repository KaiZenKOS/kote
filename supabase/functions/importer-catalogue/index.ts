// Import contrôlé du premier catalogue. Il est réservé aux administrateurs,
// borne chaque lot et crée systématiquement des brouillons : aucune fiche CSV
// ne devient visible sans contrôle humain.
import { clientService, clientUtilisateur } from "../_partage/client.ts";
import { corpsJson, erreur, json, prevol, texteBorne } from "../_partage/http.ts";

type Ligne = { nom?: string; categorie?: string; telephone?: string; repere?: string; latitude?: number; longitude?: number; description?: string };
const MAX_LIGNES = 100;

Deno.serve(async (requete) => {
  const preflight = prevol(requete); if (preflight) return preflight;
  if (requete.method !== "POST") return erreur("Methode non autorisee", 405);
  const authorization = requete.headers.get("Authorization"); if (!authorization) return erreur("Connexion requise", 401);
  const corps = await corpsJson<{ lignes?: Ligne[] }>(requete);
  if (!corps?.lignes?.length || corps.lignes.length > MAX_LIGNES) return erreur(`Lot requis (1 a ${MAX_LIGNES} lignes)`, 400);
  const utilisateur = clientUtilisateur(authorization);
  const { data: profil } = await utilisateur.from("profil").select("est_admin").maybeSingle();
  if (!profil?.est_admin) return erreur("Action reservee a la moderation", 403);
  const service = clientService();
  const { data: categories } = await service.from("categorie").select("slug").eq("actif", true);
  const admises = new Set((categories ?? []).map((c) => c.slug));
  const erreurs: Array<{ ligne: number; erreur: string }> = []; const inserer: Record<string, unknown>[] = [];
  corps.lignes.forEach((ligne, index) => {
    const nom = texteBorne(ligne.nom, 80), repere = texteBorne(ligne.repere, 200), telephone = texteBorne(ligne.telephone, 16), categorie = texteBorne(ligne.categorie, 40);
    if (!nom || !repere || !telephone || !/^\+[1-9][0-9]{7,14}$/.test(telephone) || !categorie || !admises.has(categorie) || !Number.isFinite(ligne.latitude) || !Number.isFinite(ligne.longitude) || ligne.latitude! < 5.8 || ligne.latitude! > 11.3 || ligne.longitude! < -0.2 || ligne.longitude! > 2) { erreurs.push({ ligne: index + 2, erreur: "Données invalides ou catégorie inconnue" }); return; }
    inserer.push({ nom_enseigne: nom, categorie_slug: categorie, telephone_whatsapp: telephone, repere, description: texteBorne(ligne.description, 600), localisation: `SRID=4326;POINT(${ligne.longitude} ${ligne.latitude})`, statut: "brouillon" });
  });
  if (inserer.length) { const { error } = await service.from("marchand").insert(inserer); if (error) { console.error("import catalogue", error.message); return erreur("Import impossible", 503); } }
  return json({ importees: inserer.length, erreurs });
});
