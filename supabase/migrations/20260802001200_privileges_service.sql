-- ---------------------------------------------------------------------------
-- Privileges du role de service.
--
-- Sur les versions recentes de la plateforme, un objet cree dans le schema
-- `public` ne recoit plus aucun privilege automatique : anon, authenticated et
-- service_role partent de zero. C'est une bonne chose -- rien n'est expose par
-- accident -- mais cela impose de declarer aussi ce dont le backend a besoin,
-- sans quoi les fonctions edge echouent avec "permission denied".
--
-- Pourquoi une attribution large plutot que table par table :
-- `service_role` est l'identite de confiance du backend et contourne deja RLS.
-- Restreindre ses privileges objet par objet serait un theatre de securite,
-- puisqu'une fonction edge compromise dispose de la cle elle-meme. La frontiere
-- reelle est ailleurs, et elle est tenue : cette cle ne quitte jamais le
-- serveur, et l'application mobile ne recoit que la cle anonyme, qui n'a aucun
-- privilege sur la table `marchand` (migration 000900).
--
-- Cette migration doit rester la derniere du lot : elle attribue les privileges
-- sur les objets existants. Les `alter default privileges` en fin de fichier
-- couvrent ceux que les migrations suivantes creeront.
-- ---------------------------------------------------------------------------

grant usage on schema public to service_role;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Objets a venir : evite d'avoir a repeter les attributions ci-dessus a chaque
-- nouvelle migration, et donc d'oublier.
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
