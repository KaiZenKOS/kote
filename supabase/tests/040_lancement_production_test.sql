-- Régression des parcours de lancement : modération, import et suppression.
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

select ok(to_regprocedure('public.file_moderation(integer)') is not null, 'La file de modération existe');
select ok(to_regprocedure('public.traiter_signalement(uuid,text,text)') is not null, 'La décision de modération existe');
select ok(has_function_privilege('authenticated','public.file_moderation(integer)','EXECUTE'), 'Un compte connecté peut charger sa file selon RLS');
select ok(not has_function_privilege('anon','public.file_moderation(integer)','EXECUTE'), 'La file de modération est fermée aux visiteurs');

select ok(exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='notification_appareil' and c.relrowsecurity), 'Les jetons de notification sont sous RLS');
select ok(not has_table_privilege('anon','public.notification_appareil','SELECT'), 'Un visiteur ne peut pas lire les jetons de notification');

select ok(to_regclass('public.marchand') is not null, 'La cible de l’import catalogue existe');
select ok(not has_table_privilege('anon','public.marchand','INSERT'), 'Un visiteur ne peut pas contourner l’import administrateur');

select is(
  (select confdeltype::text from pg_constraint where conrelid = 'public.notification_appareil'::regclass and contype = 'f' limit 1),
  'c',
  'La suppression du profil efface les jetons de notification associes'
);
select is(
  (select confdeltype::text from pg_constraint where conrelid = 'public.marchand'::regclass and conname like '%proprietaire_id%'),
  'n',
  'La suppression du profil conserve la fiche sans proprietaire'
);

select ok(to_regclass('public.avis_marchand') is not null, 'Les avis marchands sont conserves dans une table dediee');
select ok(
  exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='avis_marchand' and c.relrowsecurity),
  'Les avis sont sous RLS'
);
select ok(not has_table_privilege('anon','public.avis_marchand','INSERT'), 'Un visiteur ne peut pas injecter un avis');
select ok(to_regprocedure('public.traiter_avis(uuid,boolean)') is not null, 'La moderation des avis existe');

select ok(to_regclass('public.alerte_acces') is not null, 'Les alertes de trajet sont tracees');
select ok(
  exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='alerte_acces' and c.relrowsecurity),
  'Les alertes de trajet sont sous RLS'
);
select ok(not has_table_privilege('anon','public.alerte_acces','SELECT'), 'Un visiteur ne peut pas lire les alertes sensibles');
select ok(has_function_privilege('authenticated','public.signaler_risque_acces(uuid,text,text)','EXECUTE'), 'Un compte connecte peut signaler un acces risque');

select * from finish();
rollback;
