-- ---------------------------------------------------------------------------
-- Jeu de donnees de developpement local.
--
-- Reproduit un echantillon de quartier pilote (Hedzranawoe), pour pouvoir
-- exercer la recherche de proximite sans attendre le terrain.
--
-- Ces donnees sont FICTIVES. Les coordonnees sont approximatives et les
-- numeros appartiennent a la plage de test locale definie dans config.toml.
-- Ce fichier n'est jamais joue en production.
-- ---------------------------------------------------------------------------

set search_path = public, extensions;

insert into public.marchand (
  id, nom_enseigne, categorie_slug, description, telephone_whatsapp,
  repere, repere_arrivee_public, localisation, localisation_ajustee, statut,
  verifiee_terrain, derniere_confirmation
) values
  (
    '11111111-1111-1111-1111-111111111101',
    'Atelier Afiavi Couture',
    'couture',
    'Couture femme sur mesure, retouches, pagne et tissu wax. Livraison en 3 jours.',
    '+22890000101',
    'En face de la pharmacie du carrefour, premiere porte a gauche', 'Devant la pharmacie du carrefour',
    st_setsrid(st_makepoint(1.2358, 6.1782), 4326)::geography,
    true, 'active', true, now() - interval '5 days'
  ),
  (
    '11111111-1111-1111-1111-111111111102',
    'Garage Koffi deux-roues',
    'mecanique',
    'Reparation moto et zemidjan, vulcanisation, depannage sur place.',
    '+22890000102',
    'Apres le carrefour, a cote du depot de ciment', 'Devant le depot de ciment',
    st_setsrid(st_makepoint(1.2371, 6.1769), 4326)::geography,
    true, 'active', true, now() - interval '12 days'
  ),
  (
    '11111111-1111-1111-1111-111111111103',
    'Chez Mama Adjo',
    'alimentation',
    'Riz sauce arachide, ablo, poisson braise. Ouvert le soir.',
    '+22890000103',
    'Sous le grand manguier, en face de l''ecole primaire', 'Devant l''ecole primaire',
    st_setsrid(st_makepoint(1.2342, 6.1791), 4326)::geography,
    false, 'active', true, now() - interval '2 days'
  ),
  (
    '11111111-1111-1111-1111-111111111104',
    'Salon Grace Beaute',
    'beaute',
    'Tresses, tissage, soins du visage. Sur rendez-vous.',
    '+22890000104',
    'Etage au-dessus de la boutique de telephones, entree par la cour', 'Devant la boutique de telephones',
    st_setsrid(st_makepoint(1.2366, 6.1795), 4326)::geography,
    true, 'active', true, now() - interval '40 days'
  ),
  (
    '11111111-1111-1111-1111-111111111105',
    'Electro Services Yao',
    'reparation',
    'Reparation frigo, ventilateur, petit electromenager. Devis gratuit.',
    '+22890000105',
    'Deuxieme boutique apres le poste de police', 'Devant le poste de police',
    st_setsrid(st_makepoint(1.2330, 6.1760), 4326)::geography,
    false, 'active', true, now() - interval '95 days'
  ),
  (
    '11111111-1111-1111-1111-111111111106',
    'Boutique Sena',
    'commerce',
    'Produits d''entretien, boissons, recharges telephoniques.',
    '+22890000106',
    'Angle de la rue, kiosque bleu', 'A l''angle de la rue',
    st_setsrid(st_makepoint(1.2395, 6.1810), 4326)::geography,
    true, 'active', true, now() - interval '20 days'
  ),
  -- Fiche eloignee : sert a verifier que le rayon de recherche filtre bien.
  (
    '11111111-1111-1111-1111-111111111107',
    'Couture Assigame',
    'couture',
    'Confection homme, chemises et costumes.',
    '+22890000107',
    'Interieur du Grand Marche, allee des tissus', 'Entree principale du Grand Marche',
    st_setsrid(st_makepoint(1.2231, 6.1301), 4326)::geography,
    true, 'active', true, now() - interval '8 days'
  );

-- Fiche depassant le seuil de fraicheur : la tache quotidienne doit la faire
-- basculer en `a_confirmer`.
update public.marchand
set derniere_confirmation = now() - interval '120 days'
where id = '11111111-1111-1111-1111-111111111105';
