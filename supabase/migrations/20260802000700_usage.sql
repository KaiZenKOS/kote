-- ---------------------------------------------------------------------------
-- Journal d'usage, commissions et limitation d'appels.
-- ---------------------------------------------------------------------------

set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- Evenement d'usage.
--
-- Trois usages : le tableau de bord marchand (CDC 5.1), l'indicateur central du
-- projet -- contacts WhatsApp par marchand actif et par semaine (CDC 12) -- et
-- la detection de fraude a l'inscription (CDC 9.3).
--
-- Confidentialite : aucun identifiant de client. `appareil_hash` est une
-- empreinte anonyme, et la position est arrondie en amont par la fonction edge
-- a environ 100 m, jamais stockee au metre pres (CDC 9.1).
--
-- L'insertion est reservee au role de service : autoriser l'insertion anonyme
-- ouvrirait la porte au gonflage des statistiques d'une fiche, donc a la fraude
-- sur la commission a J+30.
-- ---------------------------------------------------------------------------
create table public.evenement_usage (
  id                  bigint generated always as identity primary key,
  type                public.type_evenement not null,
  marchand_id         uuid references public.marchand (id) on delete cascade,
  categorie_slug      text references public.categorie (slug),
  requete             text check (requete is null or length(requete) <= 120),
  appareil_hash       text,
  localisation_approx geography(Point, 4326),
  cree_le             timestamptz not null default now()
);

create index evenement_marchand_idx on public.evenement_usage (marchand_id, type, cree_le desc);
create index evenement_date_idx on public.evenement_usage (cree_le desc);

-- Recherches infructueuses : mesure directe de la densite insuffisante, qui est
-- le risque de defaillance le plus probable apres l'obsolescence de la base.
create index evenement_recherche_idx on public.evenement_usage (cree_le desc)
  where type = 'recherche';

comment on table public.evenement_usage is
  'Journal anonyme. Insertion reservee au role de service via les fonctions edge.';

-- ---------------------------------------------------------------------------
-- Tableau de bord marchand.
-- ---------------------------------------------------------------------------
create or replace function public.statistiques_marchand(
  p_marchand_id uuid,
  p_jours       integer default 30
)
returns table (
  vues_fiche      integer,
  clics_whatsapp  integer,
  clics_itineraire integer,
  jours            integer
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(*) filter (where e.type = 'vue_fiche')::integer,
    count(*) filter (where e.type = 'clic_whatsapp')::integer,
    count(*) filter (where e.type = 'clic_itineraire')::integer,
    least(greatest(p_jours, 1), 90)
  from public.evenement_usage e
  where e.marchand_id = p_marchand_id
    and e.cree_le >= now() - make_interval(days => least(greatest(p_jours, 1), 90))
    -- La lecture n'est possible que si l'appelant peut deja lire la fiche :
    -- security invoker, donc les politiques RLS de `marchand` s'appliquent.
    and exists (select 1 from public.marchand m where m.id = p_marchand_id);
$$;

-- ---------------------------------------------------------------------------
-- Commission ambassadeur.
--
-- Jamais de paiement a l'inscription brute : c'est l'incitation directe a la
-- fiche fictive. Le versement se fait en deux parts, dont la seconde est
-- conditionnee a un contact client reel a J+30 (CDC 7.3).
-- ---------------------------------------------------------------------------
create table public.commission (
  id              uuid primary key default gen_random_uuid(),
  ambassadeur_id  uuid not null references public.ambassadeur (id) on delete cascade,
  marchand_id     uuid not null references public.marchand (id) on delete cascade,
  part            public.part_commission not null,
  montant_fcfa    integer not null check (montant_fcfa >= 0),
  statut          public.statut_commission not null default 'en_attente',
  echeance        date,
  motif_annulation text,
  cree_le         timestamptz not null default now(),
  maj_le          timestamptz not null default now(),
  unique (marchand_id, part)
);

create index commission_ambassadeur_idx on public.commission (ambassadeur_id, statut);

create trigger commission_maj_le
  before update on public.commission
  for each row execute function public.touche_maj_le();

-- Evaluation de la part J+30 : la fiche doit etre encore active et avoir
-- genere au moins un contact client reel.
create or replace function public.evaluer_commissions_j30()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_traitees integer;
begin
  with evaluees as (
    update public.commission c
    set statut = case
                   when m.statut in ('active', 'a_confirmer')
                        and exists (
                          select 1 from public.evenement_usage e
                          where e.marchand_id = c.marchand_id
                            and e.type = 'clic_whatsapp'
                            and e.cree_le >= c.cree_le
                        )
                   then 'validee'::public.statut_commission
                   else 'annulee'::public.statut_commission
                 end,
        motif_annulation = case
                             when m.statut not in ('active', 'a_confirmer')
                               then 'Fiche inactive a J+30'
                             when not exists (
                               select 1 from public.evenement_usage e
                               where e.marchand_id = c.marchand_id
                                 and e.type = 'clic_whatsapp'
                                 and e.cree_le >= c.cree_le
                             ) then 'Aucun contact client reel a J+30'
                             else null
                           end
    from public.marchand m
    where m.id = c.marchand_id
      and c.part = 'j30'
      and c.statut = 'en_attente'
      and c.echeance <= current_date
    returning 1
  )
  select count(*)::integer into v_traitees from evaluees;

  return v_traitees;
end;
$$;

-- ---------------------------------------------------------------------------
-- Limitation d'appels, par fenetre glissante d'une heure.
-- Protege les endpoints ouverts (contact, evenement, signalement) contre le
-- gonflage de statistiques et la fouille de la base.
-- ---------------------------------------------------------------------------
create table public.limitation_appel (
  cle       text not null,
  fenetre   timestamptz not null,
  compteur  integer not null default 0,
  primary key (cle, fenetre)
);

create index limitation_appel_purge_idx on public.limitation_appel (fenetre);

create or replace function public.consommer_quota(
  p_cle      text,
  p_plafond  integer,
  p_fenetre_minutes integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fenetre  timestamptz;
  v_compteur integer;
begin
  v_fenetre := date_bin(
    make_interval(mins => p_fenetre_minutes),
    now(),
    timestamptz '2026-01-01'
  );

  insert into public.limitation_appel (cle, fenetre, compteur)
  values (p_cle, v_fenetre, 1)
  on conflict (cle, fenetre)
  do update set compteur = public.limitation_appel.compteur + 1
  returning compteur into v_compteur;

  return v_compteur <= p_plafond;
end;
$$;

comment on function public.consommer_quota(text, integer, integer) is
  'Incremente le compteur de la fenetre courante et indique si le plafond est respecte.';

create or replace function public.purger_limitations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_supprimees integer;
begin
  delete from public.limitation_appel where fenetre < now() - interval '2 days';
  get diagnostics v_supprimees = row_count;
  return v_supprimees;
end;
$$;
