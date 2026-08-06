// Suppression définitive du compte : seul le jeton de la personne concernée
// autorise l'action. Les fiches commerciales restent sans propriétaire, afin
// de ne pas effacer une adresse utile au quartier sans validation humaine.
import { clientService, clientUtilisateur } from "../_partage/client.ts";
import { erreur, json, prevol } from "../_partage/http.ts";

Deno.serve(async (requete) => {
  const preflight = prevol(requete); if (preflight) return preflight;
  if (requete.method !== "POST") return erreur("Methode non autorisee", 405);
  const authorization = requete.headers.get("Authorization");
  if (!authorization) return erreur("Connexion requise", 401);
  const utilisateur = clientUtilisateur(authorization);
  const { data, error } = await utilisateur.auth.getUser();
  if (error || !data.user) return erreur("Connexion invalide", 401);
  const service = clientService();
  const { error: suppression } = await service.auth.admin.deleteUser(data.user.id);
  if (suppression) { console.error("suppression compte", suppression.message); return erreur("Suppression impossible", 503); }
  return json({ supprime: true });
});
