-- ---------------------------------------------------------------------------
-- Referentiels : categories de service et zones d'intervention.
-- ---------------------------------------------------------------------------

set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- Categorie
--
-- Arborescence volontairement plate et courte : l'interface marchande cible une
-- utilisatrice peu a l'aise avec l'ecrit (CDC 2.4), le choix doit tenir sur un
-- ecran en icones. Les libelles en langues locales sont prevus des maintenant
-- pour ne pas avoir a migrer la structure lors de l'ajout du guidage en mina.
-- ---------------------------------------------------------------------------
create table public.categorie (
  slug          text primary key,
  libelle_fr    text not null,
  libelle_gen   text,               -- mina / gen, langue vehiculaire de Lome
  libelle_ee    text,               -- ewe
  icone         text not null,      -- identifiant d'icone cote client, pas un emoji
  ordre         smallint not null default 100,
  actif         boolean not null default true
);

comment on table public.categorie is
  'Categories de service affichees en filtres rapides sur l''ecran d''accueil.';
comment on column public.categorie.icone is
  'Identifiant symbolique d''icone resolu par le client. Jamais un emoji.';

insert into public.categorie (slug, libelle_fr, libelle_gen, icone, ordre) values
  ('couture',      'Couture et mode',           null, 'couture',      10),
  ('alimentation', 'Nourriture et boissons',    null, 'alimentation', 20),
  ('beaute',       'Beaute et coiffure',        null, 'beaute',       30),
  ('mecanique',    'Mecanique et deux-roues',   null, 'mecanique',    40),
  ('reparation',   'Reparation et bricolage',   null, 'reparation',   50),
  ('commerce',     'Commerce et revente',       null, 'commerce',     60);

-- ---------------------------------------------------------------------------
-- Zone
--
-- Decoupage operationnel : affectation des ambassadeurs et pilotage de la
-- densite. Le CDC impose la concentration sur des quartiers contigus plutot
-- que la dispersion geographique (CDC 13, risque de densite insuffisante).
--
-- Un cercle centre + rayon suffit au MVP ; un polygone reel viendra quand le
-- decoupage terrain sera etabli.
--
-- ATTENTION : les coordonnees ci-dessous sont approximatives et doivent etre
-- corrigees sur le terrain avant tout usage operationnel.
-- ---------------------------------------------------------------------------
create table public.zone (
  id        uuid primary key default gen_random_uuid(),
  nom       text not null unique,
  centre    geography(Point, 4326) not null,
  rayon_m   integer not null default 2000 check (rayon_m between 200 and 20000),
  pilote    boolean not null default false,  -- quartier retenu pour la phase 0
  actif     boolean not null default true
);

create index zone_centre_idx on public.zone using gist (centre);

insert into public.zone (nom, centre, rayon_m, pilote) values
  ('Hedzranawoe',   st_setsrid(st_makepoint(1.2360, 6.1780), 4326)::geography, 1500, true),
  ('Agoe-Nyive',    st_setsrid(st_makepoint(1.2100, 6.2200), 4326)::geography, 3000, false),
  ('Adidogome',     st_setsrid(st_makepoint(1.1700, 6.1750), 4326)::geography, 2500, false),
  ('Be',            st_setsrid(st_makepoint(1.2450, 6.1350), 4326)::geography, 2000, false),
  ('Tokoin',        st_setsrid(st_makepoint(1.2200, 6.1550), 4326)::geography, 2000, false),
  ('Grand Marche',  st_setsrid(st_makepoint(1.2230, 6.1300), 4326)::geography,  800, false);
