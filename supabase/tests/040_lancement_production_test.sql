-- Régression des parcours de lancement : modération, import et suppression.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

select ok(to_regprocedure('public.file_moderation(integer)') is not null, 'La file de modération existe');
select ok(to_regprocedure('public.traiter_signalement(uuid,text,text)') is not null, 'La décision de modération existe');
select ok(has_function_privilege('authenticated','public.file_moderation(integer)','EXECUTE'), 'Un compte connecté peut charger sa file selon RLS');
select ok(not has_function_privilege('anon','public.file_moderation(integer)','EXECUTE'), 'La file de modération est fermée aux visiteurs');

select ok(exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='notification_appareil' and c.relrowsecurity), 'Les jetons de notification sont sous RLS');
select ok(not has_table_privilege('anon','public.notification_appareil','SELECT'), 'Un visiteur ne peut pas lire les jetons de notification');

select ok(to_regclass('public.marchand') is not null, 'La cible de l’import catalogue existe');
select ok(not has_table_privilege('anon','public.marchand','INSERT'), 'Un visiteur ne peut pas contourner l’import administrateur');

select * from finish();
rollback;
