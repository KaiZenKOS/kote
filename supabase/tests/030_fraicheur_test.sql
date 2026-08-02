-- ---------------------------------------------------------------------------
-- Boucle de fraicheur, quotas et garde-fous.
--
-- La section 6 du CDC identifie l'obsolescence de la base comme le risque qui
-- tue le produit avant tout probleme technique. Ces tests verifient que le
-- cycle de vie d'une fiche fonctionne sans intervention humaine.
-- ---------------------------------------------------------------------------

begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

insert into public.marchand (
  id, nom_enseigne, categorie_slug, telephone_whatsapp, repere, localisation,
  statut, derniere_confirmation
) values
  -- Active mais silencieuse depuis 100 jours : doit passer en a_confirmer.
  ('bbbbbbbb-0000-0000-0000-00000000000a', 'Fiche Silencieuse', 'commerce',
   '+22890000301', 'Repere test', st_setsrid(st_makepoint(1.2360, 6.1780), 4326)::geography,
   'active', now() - interval '100 days'),
  -- Deja a_confirmer depuis 200 jours : doit passer en veille.
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'Fiche Ancienne', 'commerce',
   '+22890000302', 'Repere test', st_setsrid(st_makepoint(1.2360, 6.1780), 4326)::geography,
   'a_confirmer', now() - interval '200 days'),
  -- Cible de relance : silencieuse depuis 80 jours.
  ('bbbbbbbb-0000-0000-0000-00000000000c', 'Fiche A Relancer', 'commerce',
   '+22890000303', 'Repere test', st_setsrid(st_makepoint(1.2360, 6.1780), 4326)::geography,
   'active', now() - interval '80 days');

select public.appliquer_transitions_fraicheur();

-- 1 et 2. Progression du cycle de vie.
select is(
  (select statut from public.marchand where id = 'bbbbbbbb-0000-0000-0000-00000000000a'),
  'a_confirmer'::public.statut_marchand,
  'Une fiche silencieuse depuis 100 jours passe en a_confirmer'
);

select is(
  (select statut from public.marchand where id = 'bbbbbbbb-0000-0000-0000-00000000000b'),
  'en_veille'::public.statut_marchand,
  'Une fiche a confirmer depuis 200 jours passe en veille'
);

-- 3 et 4. Une confirmation ressuscite la fiche et la rend a nouveau visible.
insert into public.confirmation (marchand_id, source)
values ('bbbbbbbb-0000-0000-0000-00000000000b', 'relance');

select is(
  (select statut from public.marchand where id = 'bbbbbbbb-0000-0000-0000-00000000000b'),
  'active'::public.statut_marchand,
  'Une confirmation fait repasser une fiche en veille au statut actif'
);

select ok(
  (select derniere_confirmation from public.marchand
   where id = 'bbbbbbbb-0000-0000-0000-00000000000b') > now() - interval '1 minute',
  'Une confirmation met a jour la date de derniere confirmation'
);

-- 5 et 6. Campagne de relance : la fiche cible est retournee avec un jeton.
select cmp_ok(
  (select count(*)::integer from public.fiches_a_relancer(50)
   where marchand_id = 'bbbbbbbb-0000-0000-0000-00000000000c'),
  '>=',
  1,
  'Une fiche silencieuse depuis 80 jours entre dans la campagne de relance'
);

select cmp_ok(
  (select count(*)::integer from public.jeton_confirmation
   where marchand_id = 'bbbbbbbb-0000-0000-0000-00000000000c' and utilise_le is null),
  '>=',
  1,
  'La campagne de relance genere un jeton de confirmation a usage unique'
);

-- 7 et 8. Limitation d'appels.
select is(
  public.consommer_quota('test:limitation', 2, 60),
  true,
  'Le premier appel sous plafond est autorise'
);

select is(
  (select bool_and(r) from (
     select public.consommer_quota('test:limitation', 2, 60) as r
     union all
     select public.consommer_quota('test:limitation', 2, 60)
   ) t),
  false,
  'Le depassement du plafond est refuse'
);

-- 9. Plafond de photos par fiche.
insert into public.photo_marchand (marchand_id, chemin, ordre)
select 'bbbbbbbb-0000-0000-0000-00000000000a', 'test/' || i || '.webp', i
from generate_series(1, 5) i;

select throws_ok(
  $$insert into public.photo_marchand (marchand_id, chemin)
    values ('bbbbbbbb-0000-0000-0000-00000000000a', 'test/6.webp')$$,
  '23514',
  null,
  'Une sixieme photo est refusee'
);

-- 10. Le droit de retrait exige une identite : sans session, rien ne bouge.
select throws_ok(
  $$select public.retirer_ma_fiche('bbbbbbbb-0000-0000-0000-00000000000a')$$,
  '42501',
  null,
  'Le retrait d''une fiche sans session authentifiee est refuse'
);

select * from finish();

rollback;
