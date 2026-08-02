-- ---------------------------------------------------------------------------
-- Marchand : la table centrale.
--
-- Deux partis pris structurants issus du contexte pays :
--
--  1. `repere` est obligatoire. Il n'existe pas d'adressage de rue exploitable
--     a Lome : on se guide au point de repere ("en face de la pharmacie X").
--     Une fiche sans repere est inutilisable sur le terrain (CDC 2.4).
--
--  2. `localisation_ajustee` trace la correction manuelle du point par le
--     marchand. Le GPS derive de plusieurs metres dans les marches denses, ou
--     deux etals voisins sont deux commerces differents (CDC 5.1).
--
-- Minimisation (CDC 9.1) : aucune colonne de chiffre d'affaires, de stock, de
-- revenu ni de piece d'identite. Cette absence est deliberee et ne doit pas
-- etre comblee sans arbitrage explicite.
-- ---------------------------------------------------------------------------

set search_path = public, extensions;

create table public.marchand (
  id                    uuid primary key default gen_random_uuid(),

  -- Proprietaire du compte marchand. Reste nul tant que la fiche saisie par un
  -- ambassadeur n'a pas ete revendiquee par le marchand lui-meme.
  proprietaire_id       uuid references public.profil (id) on delete set null,
  cree_par_ambassadeur  uuid references public.ambassadeur (id) on delete set null,

  nom_enseigne          text not null check (length(btrim(nom_enseigne)) between 2 and 80),
  categorie_slug        text not null references public.categorie (slug),
  description           text check (length(description) <= 600),

  -- Numero au format E.164. Jamais expose par l'API publique : la mise en
  -- relation passe par la fonction edge `contact`, qui journalise puis renvoie
  -- le lien WhatsApp.
  telephone_whatsapp    text not null check (telephone_whatsapp ~ '^\+[1-9][0-9]{7,14}$'),

  repere                text not null check (length(btrim(repere)) between 3 and 200),
  localisation          geography(Point, 4326) not null,
  localisation_ajustee  boolean not null default false,
  precision_m           numeric(6, 1) check (precision_m is null or precision_m >= 0),
  zone_id               uuid references public.zone (id),

  -- Indicatif et volontairement libre : les horaires reels de l'informel ne
  -- rentrent pas dans une grille. Forme attendue : {"lun": "08:00-18:00", ...}
  horaires              jsonb,

  statut                public.statut_marchand not null default 'brouillon',
  derniere_confirmation timestamptz not null default now(),

  -- Cle generee par le client pour la synchronisation hors ligne des
  -- inscriptions ambassadeur (CDC 2.2 : le reseau peut etre coupe).
  -- Rejouer la meme requete ne cree pas de doublon.
  cle_idempotence       text unique,

  cree_le               timestamptz not null default now(),
  maj_le                timestamptz not null default now(),

  -- Garde-fou geographique : le MVP est lome-centre, une saisie hors du Togo
  -- est une erreur de saisie ou une fiche fictive.
  constraint marchand_dans_le_togo check (
    st_x(localisation::geometry) between -0.2 and 2.0
    and st_y(localisation::geometry) between 5.8 and 11.3
  )
);

-- Colonne de recherche : nom + description + repere, sans accent et en
-- minuscules. Les utilisateurs saisissent "couturiere" ou "mecanicien" sans
-- accent, et souvent avec des fautes : d'ou l'index trigramme.
alter table public.marchand
  add column recherche text
  generated always as (
    lower(public.sans_accent(
      nom_enseigne || ' ' || coalesce(description, '') || ' ' || coalesce(repere, '')
    ))
  ) stored;

-- Index spatial : c'est lui qui rend `ST_DWithin` utilisable, donc toute la
-- recherche de proximite.
create index marchand_localisation_idx on public.marchand using gist (localisation);

create index marchand_recherche_idx on public.marchand using gin (recherche extensions.gin_trgm_ops);

-- Index partiel sur les seules fiches visibles : la majorite des lectures.
create index marchand_visible_idx on public.marchand (categorie_slug, statut)
  where statut in ('active', 'a_confirmer');

create index marchand_proprietaire_idx on public.marchand (proprietaire_id)
  where proprietaire_id is not null;

create index marchand_ambassadeur_idx on public.marchand (cree_par_ambassadeur)
  where cree_par_ambassadeur is not null;

-- Pilotage de la boucle de fraicheur.
create index marchand_fraicheur_idx on public.marchand (derniere_confirmation)
  where statut in ('active', 'a_confirmer');

create trigger marchand_maj_le
  before update on public.marchand
  for each row execute function public.touche_maj_le();

comment on table public.marchand is
  'Fiche d''un commercant ou artisan. Le telephone n''est jamais expose par l''API publique.';
comment on column public.marchand.repere is
  'Point de repere en texte libre. Obligatoire : il n''y a pas d''adressage de rue a Lome.';
comment on column public.marchand.cle_idempotence is
  'Cle generee par le client pour la synchronisation hors ligne des inscriptions ambassadeur.';

-- ---------------------------------------------------------------------------
-- Rattachement automatique a une zone, pour le pilotage de densite et la
-- detection des inscriptions hors zone d'un ambassadeur.
-- ---------------------------------------------------------------------------
create or replace function public.rattacher_zone()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  if new.zone_id is null then
    select z.id into new.zone_id
    from public.zone z
    where z.actif and st_dwithin(z.centre, new.localisation, z.rayon_m)
    order by st_distance(z.centre, new.localisation)
    limit 1;
  end if;
  return new;
end;
$$;

create trigger marchand_rattacher_zone
  before insert or update of localisation on public.marchand
  for each row execute function public.rattacher_zone();

-- ---------------------------------------------------------------------------
-- Photos de fiche.
--
-- Le fichier vit dans le bucket de stockage ; on ne conserve ici que le chemin
-- et les metadonnees d'affichage. Trois tailles sont generees a l'ingestion
-- pour tenir le budget de donnees (CDC 8).
-- ---------------------------------------------------------------------------
create table public.photo_marchand (
  id           uuid primary key default gen_random_uuid(),
  marchand_id  uuid not null references public.marchand (id) on delete cascade,
  chemin       text not null,
  ordre        smallint not null default 0,
  largeur      integer,
  hauteur      integer,
  moderee      boolean not null default false,
  cree_le      timestamptz not null default now(),
  unique (marchand_id, chemin)
);

create index photo_marchand_idx on public.photo_marchand (marchand_id, ordre);

-- Plafond volontaire : une fiche lisible et legere, pas un album.
create or replace function public.plafonner_photos()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select count(*) from public.photo_marchand where marchand_id = new.marchand_id) >= 5 then
    raise exception 'Une fiche ne peut pas depasser 5 photos'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger photo_marchand_plafond
  before insert on public.photo_marchand
  for each row execute function public.plafonner_photos();
