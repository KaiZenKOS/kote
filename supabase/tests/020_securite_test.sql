-- ---------------------------------------------------------------------------
-- Securite d'exposition.
--
-- Ce que ces tests protegent : la confiance du marchand, qui est la condition
-- d'existence du produit (CDC 9). Une base de numeros de telephone aspirable
-- ou une fuite de coordonnees ferait plus de degats qu'une panne.
--
-- On verifie ici les privileges effectifs plutot que le comportement observe,
-- parce qu'un privilege absent ne peut pas etre rattrape par une politique mal
-- ecrite. Le comportement de bout en bout est verifie par
-- scripts/verifier-api.mjs, qui interroge l'API reelle avec la cle anonyme.
-- ---------------------------------------------------------------------------

begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

-- 1. Aucune table du schema public ne doit echapper a RLS.
select is(
  (select count(*)::integer
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  0,
  'RLS est active sur toutes les tables du schema public'
);

-- 2 a 3. Le role anonyme ne touche jamais la table qui porte les numeros.
select ok(
  not has_table_privilege('anon', 'public.marchand', 'SELECT'),
  'anon ne peut pas lire la table marchand'
);
select ok(
  not has_table_privilege('anon', 'public.marchand', 'INSERT'),
  'anon ne peut pas ecrire dans la table marchand'
);

-- 4 a 5. La lecture publique passe par la vue, qui ne porte pas le numero.
select ok(
  has_table_privilege('anon', 'public.marchand_public', 'SELECT'),
  'anon peut lire la vue publique'
);
select hasnt_column(
  'public', 'marchand_public', 'telephone_whatsapp',
  'La vue publique n''expose pas le numero WhatsApp'
);

-- 6 a 7. Le statut et la date de confirmation ne sont pas modifiables par leur
-- porteur : sinon une fiche s'auto-declarerait fraiche et contournerait la
-- boucle de fraicheur, qui est le mecanisme de survie de la base.
select ok(
  not has_column_privilege('authenticated', 'public.marchand', 'statut', 'UPDATE'),
  'Un compte authentifie ne peut pas modifier directement le statut d''une fiche'
);
select ok(
  not has_column_privilege('authenticated', 'public.marchand', 'derniere_confirmation', 'UPDATE'),
  'Un compte authentifie ne peut pas modifier la date de derniere confirmation'
);

-- 8 a 9. Le journal d'usage n'est ni lisible ni gonflable de l'exterieur.
select ok(
  not has_table_privilege('anon', 'public.evenement_usage', 'SELECT'),
  'anon ne peut pas lire le journal d''usage'
);
select ok(
  not has_table_privilege('anon', 'public.evenement_usage', 'INSERT'),
  'anon ne peut pas ecrire dans le journal d''usage'
);

-- 10 a 12. Tables d'exploitation hors de portee.
select ok(
  not has_table_privilege('anon', 'public.signalement', 'SELECT'),
  'anon ne peut pas lire les signalements'
);
select ok(
  not has_table_privilege('anon', 'public.jeton_confirmation', 'SELECT'),
  'anon ne peut pas lire les jetons de confirmation'
);
select ok(
  not has_table_privilege('anon', 'public.parametre', 'SELECT'),
  'anon ne peut pas lire les parametres d''exploitation'
);

-- 13. La recherche, elle, doit rester ouverte : c'est l'usage nominal.
select ok(
  has_function_privilege(
    'anon',
    'public.rechercher_marchands(double precision,double precision,integer,text,text,integer,integer)',
    'EXECUTE'
  ),
  'anon peut appeler la recherche de proximite'
);

-- 14 a 15. Les fonctions d'exploitation ne sont pas appelables depuis l'API.
select ok(
  not has_function_privilege('anon', 'public.appliquer_transitions_fraicheur()', 'EXECUTE'),
  'anon ne peut pas declencher les transitions de fraicheur'
);
select ok(
  not has_function_privilege('anon', 'public.quota_ia_restant(uuid)', 'EXECUTE'),
  'anon ne peut pas interroger le quota IA'
);

-- 16. Les politiques de la table centrale sont bien en place.
select cmp_ok(
  (select count(*)::integer from pg_policies
   where schemaname = 'public' and tablename = 'marchand'),
  '>=',
  7,
  'La table marchand porte ses politiques de lecture, de creation et de mise a jour'
);

-- 17 et 18. Le revers de la medaille : a force de tout revoquer, le backend
-- lui-meme peut se retrouver sans droit. Ces deux tests attrapent la regression
-- ou une nouvelle migration cree un objet sans privilege pour service_role, ce
-- qui fait echouer les fonctions edge en silence cote client.
select ok(
  has_table_privilege('service_role', 'public.marchand', 'SELECT'),
  'Le role de service peut lire la table marchand'
);
select ok(
  has_function_privilege('service_role', 'public.consommer_quota(text,integer,integer)', 'EXECUTE'),
  'Le role de service peut consommer les quotas'
);

select * from finish();

rollback;
