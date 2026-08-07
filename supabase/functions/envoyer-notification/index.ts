// Envoi des push distantes via Expo. Cette fonction est réservée à la
// modération : le client n’obtient jamais les jetons d’autres utilisateurs.
import { clientService, clientUtilisateur } from "../_partage/client.ts";
import { corpsJson, erreur, json, prevol, texteBorne } from "../_partage/http.ts";

type Demande = { profil_ids?: string[]; titre?: string; message?: string; donnees?: Record<string, string> };
Deno.serve(async (requete) => {
  const p=prevol(requete); if(p)return p;
  if(requete.method!=="POST")return erreur("Methode non autorisee",405);
  const auth=requete.headers.get("Authorization"); if(!auth)return erreur("Connexion requise",401);
  const corps=await corpsJson<Demande>(requete); const titre=texteBorne(corps?.titre,80),message=texteBorne(corps?.message,300);
  if(!titre||!message||!Array.isArray(corps?.profil_ids)||!corps.profil_ids.length||corps.profil_ids.length>100)return erreur("Demande invalide",400);
  const utilisateur=clientUtilisateur(auth); const {data:profil}=await utilisateur.from("profil").select("est_admin").maybeSingle();
  if(!profil?.est_admin)return erreur("Action reservee a la moderation",403);
  const service=clientService(); const {data:appareils,error:lecture}=await service.from("notification_appareil").select("id,jeton").in("profil_id",corps.profil_ids).eq("actif",true);
  if(lecture)return erreur("Lecture impossible",503); if(!appareils?.length)return json({envoyees:0});
  const reponse=await fetch("https://exp.host/--/api/v2/push/send",{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(appareils.map(a=>({to:a.jeton,title,body:message,data:corps.donnees??{},sound:null})))});
  if(!reponse.ok)return erreur("Service de notification indisponible",503);
  return json({envoyees:appareils.length});
});
