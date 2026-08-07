-- ---------------------------------------------------------------------------
-- Recherche de proximite.
--
-- La recherche est le point d'entree principal de l'application : si elle est
-- fausse, tout le reste est inutile. Ces tests verifient le rayon, le filtre de
-- categorie, la recherche textuelle sans accent, et l'exclusion des fiches
-- sorties du cycle de fraicheur.
-- ---------------------------------------------------------------------------

begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

-- Point de reference : Hedzranawoe.
-- A : sur place. B : environ 500 m. C : environ 5 km.
insert into public.marchand (
  id, nom_enseigne, categorie_slug, description, telephone_whatsapp,
  repere, localisation, statut, verifiee_terrain, derniere_confirmation
) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'Atelier Test A', 'couture',
   'Couture femme et retouches', '+22890000201',
   'En face du test', st_setsrid(st_makepoint(1.2360, 6.1780), 4326)::geography,
   'active', true, now()),
  ('aaaaaaaa-0000-0000-0000-00000000000b', 'Garage Test B', 'mecanique',
   'Reparation moto', '+22890000202',
   'Apres le carrefour test', st_setsrid(st_makepoint(1.2360, 6.1825), 4326)::geography,
   'active', true, now()),
  ('aaaaaaaa-0000-0000-0000-00000000000c', 'Atelier Test C', 'couture',
   'Confection homme', '+22890000203',
   'Loin du test', st_setsrid(st_makepoint(1.2360, 6.2230), 4326)::geography,
   'active', true, now()),
  ('aaaaaaaa-0000-0000-0000-00000000000d', 'Atelier Test D', 'couture',
   'Fiche en veille', '+22890000204',
   'A cote du test', st_setsrid(st_makepoint(1.2361, 6.1781), 4326)::geography,
   'en_veille', false, now() - interval '200 days');

-- 1. Le rayon filtre effectivement.
select is(
  (select count(*)::integer from public.rechercher_marchands(6.1780, 1.2360, 1000)
   where id::text like 'aaaaaaaa%'),
  2,
  'Un rayon de 1 km retient A et B, pas C'
);

-- 2. Un rayon large ramene la fiche eloignee.
select is(
  (select count(*)::integer from public.rechercher_marchands(6.1780, 1.2360, 10000)
   where id::text like 'aaaaaaaa%'),
  3,
  'Un rayon de 10 km retient A, B et C'
);

-- 3. La fiche en veille n'apparait jamais.
select is(
  (select count(*)::integer from public.rechercher_marchands(6.1780, 1.2360, 20000)
   where id = 'aaaaaaaa-0000-0000-0000-00000000000d'),
  0,
  'Une fiche en veille est exclue des resultats'
);

-- 4. Le premier resultat est le plus proche.
select is(
  (select id from public.rechercher_marchands(6.1780, 1.2360, 10000)
   where id::text like 'aaaaaaaa%' limit 1),
  'aaaaaaaa-0000-0000-0000-00000000000a'::uuid,
  'Le resultat le plus proche arrive en tete'
);

-- 5. La distance calculee est coherente : environ 500 m entre A et B.
select ok(
  (select distance_m from public.rechercher_marchands(6.1780, 1.2360, 10000)
   where id = 'aaaaaaaa-0000-0000-0000-00000000000b') between 450 and 560,
  'La distance vers B avoisine 500 m'
);

-- 6. Le filtre de categorie s'applique.
select is(
  (select count(*)::integer from public.rechercher_marchands(6.1780, 1.2360, 10000, 'couture')
   where id::text like 'aaaaaaaa%'),
  2,
  'Le filtre couture retient A et C, pas le garage B'
);

-- 7. Recherche textuelle sans accent.
select cmp_ok(
  (select count(*)::integer from public.rechercher_marchands(6.1780, 1.2360, 10000, null, 'retouches')
   where id::text like 'aaaaaaaa%'),
  '>=',
  1,
  'La recherche textuelle trouve la fiche par un mot de sa description'
);

-- 8. Recherche tolerante a l'absence d'accent dans les donnees comme dans la requete.
select cmp_ok(
  (select count(*)::integer from public.rechercher_marchands(6.1780, 1.2360, 10000, null, 'réparation')
   where id::text like 'aaaaaaaa%'),
  '>=',
  1,
  'Une requete accentuee trouve une donnee non accentuee'
);

-- 9. Le rayon demande est plafonne, il ne peut pas servir a aspirer la base.
select is(
  (select count(*)::integer from public.rechercher_marchands(6.1780, 1.2360, 999999)
   where id = 'aaaaaaaa-0000-0000-0000-00000000000c'),
  1,
  'Un rayon aberrant est ramene au plafond sans erreur'
);

-- 10. Comptage par categorie.
select cmp_ok(
  (select nombre from public.compter_par_categorie(6.1780, 1.2360, 1000)
   where categorie_slug = 'couture'),
  '>=',
  1,
  'Le comptage par categorie remonte la couture dans le rayon'
);

-- 11. Rattachement automatique a la zone.
select isnt(
  (select zone_id from public.marchand where id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
  null,
  'Une fiche saisie dans une zone connue y est rattachee automatiquement'
);

select * from finish();

rollback;
