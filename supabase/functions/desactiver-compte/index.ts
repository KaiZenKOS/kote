// Désactivation réversible par l’utilisateur : le compte ne peut plus ouvrir
// de session, mais les données restent disponibles pour une réactivation par
// le support après vérification du numéro.
import { clientService, clientUtilisateur } from "../_partage/client.ts";
import { erreur, json, prevol } from "../_partage/http.ts";

Deno.serve(async (requete) => {
  const p = prevol(requete); if (p) return p;
  if (requete.method !== "POST") return erreur("Methode non autorisee", 405);
  const authorization = requete.headers.get("Authorization"); if (!authorization) return erreur("Connexion requise", 401);
  const utilisateur = clientUtilisateur(authorization); const { data } = await utilisateur.auth.getUser();
  if (!data.user) return erreur("Connexion invalide", 401);
  const service = clientService();
  const { error } = await service.auth.admin.updateUserById(data.user.id, { ban_duration: "876000h" });
  if (error) { console.error("desactivation compte", error.message); return erreur("Desactivation impossible", 503); }
  return json({ desactive: true });
});
