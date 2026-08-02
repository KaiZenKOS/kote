-- ---------------------------------------------------------------------------
-- Acteurs : profils utilisateurs et ambassadeurs.
--
-- Rappel de minimisation (CDC 9.1) : on ne stocke ni piece d'identite, ni
-- revenu, ni chiffre d'affaires. Le numero de telephone est porte par
-- auth.users ; on ne le duplique pas ici.
-- ---------------------------------------------------------------------------

set search_path = public, extensions;

create table public.profil (
  id             uuid primary key references auth.users (id) on delete cascade,
  nom_affichage  text,
  est_admin      boolean not null default false,
  cree_le        timestamptz not null default now(),
  maj_le         timestamptz not null default now()
);

create trigger profil_maj_le
  before update on public.profil
  for each row execute function public.touche_maj_le();

comment on table public.profil is
  'Donnees applicatives attachees a un compte. Le telephone reste dans auth.users.';

-- ---------------------------------------------------------------------------
-- Creation automatique du profil a l'inscription.
-- ---------------------------------------------------------------------------
create or replace function public.gerer_nouvel_utilisateur()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profil (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger creation_profil_apres_inscription
  after insert on auth.users
  for each row execute function public.gerer_nouvel_utilisateur();

-- ---------------------------------------------------------------------------
-- Ambassadeur
--
-- Moteur d'acquisition cote offre, et principal vecteur de fraude potentielle
-- (CDC 4.3 et 9.3). D'ou la zone d'affectation : une grappe d'inscriptions hors
-- zone est un signal.
-- ---------------------------------------------------------------------------
create table public.ambassadeur (
  id        uuid primary key references public.profil (id) on delete cascade,
  zone_id   uuid references public.zone (id),
  code      text not null unique,
  actif     boolean not null default true,
  cree_le   timestamptz not null default now(),
  maj_le    timestamptz not null default now()
);

create index ambassadeur_zone_idx on public.ambassadeur (zone_id) where actif;

create trigger ambassadeur_maj_le
  before update on public.ambassadeur
  for each row execute function public.touche_maj_le();

-- ---------------------------------------------------------------------------
-- Fonctions d'aide utilisees par les politiques RLS.
-- security definer : elles doivent pouvoir lire profil et ambassadeur sans
-- declencher recursivement les politiques de ces memes tables.
-- ---------------------------------------------------------------------------
create or replace function public.est_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.est_admin from public.profil p where p.id = auth.uid()),
    false
  );
$$;

create or replace function public.est_ambassadeur_actif()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.ambassadeur a
    where a.id = auth.uid() and a.actif
  );
$$;
