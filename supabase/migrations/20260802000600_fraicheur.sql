-- ---------------------------------------------------------------------------
-- Boucle de fraicheur (CDC section 6).
--
-- C'est la fonctionnalite qui decide de la survie du produit, avant le studio
-- IA. Dans l'informel un marchand demenage, ferme trois mois, change
-- d'activite. Sans rafraichissement, une base construite en six mois est fausse
-- a 20-30 % l'annee suivante, et une carte fausse ne se rattrape pas : le
-- client qui se deplace pour rien ne revient pas.
-- ---------------------------------------------------------------------------

set search_path = public, extensions;

-- Seuils, isoles ici pour etre ajustables sans migration de code applicatif.
create table public.parametre (
  cle     text primary key,
  valeur  integer not null,
  note    text
);

insert into public.parametre (cle, valeur, note) values
  ('fraicheur_jours_a_confirmer', 90,  'Au-dela : la fiche passe en a_confirmer, toujours visible'),
  ('fraicheur_jours_en_veille',  180,  'Au-dela : la fiche sort des resultats par defaut'),
  ('fraicheur_jours_relance',     75,  'Declenchement de la relance WhatsApp, avant le passage en a_confirmer'),
  ('signalements_seuil_verif',     3,  'Nombre de signalements convergents declenchant une reverification'),
  ('ia_description_quota_jour',    5,  'Generations de description autorisees par fiche et par jour');

-- ---------------------------------------------------------------------------
-- Confirmation : preuve de vie d'une fiche.
-- ---------------------------------------------------------------------------
create table public.confirmation (
  id           uuid primary key default gen_random_uuid(),
  marchand_id  uuid not null references public.marchand (id) on delete cascade,
  source       public.source_confirmation not null,
  auteur_id    uuid references public.profil (id) on delete set null,
  cree_le      timestamptz not null default now()
);

create index confirmation_marchand_idx on public.confirmation (marchand_id, cree_le desc);

-- Toute confirmation remet la fiche a jour et la fait remonter dans les
-- resultats. Une fiche en veille qui reconfirme redevient active.
create or replace function public.appliquer_confirmation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.marchand
  set derniere_confirmation = new.cree_le,
      statut = case
                 when statut in ('a_confirmer', 'en_veille') then 'active'::public.statut_marchand
                 else statut
               end
  where id = new.marchand_id;
  return new;
end;
$$;

create trigger confirmation_applique
  after insert on public.confirmation
  for each row execute function public.appliquer_confirmation();

-- ---------------------------------------------------------------------------
-- Jeton de confirmation en un clic.
--
-- La relance part en message WhatsApp et doit se resoudre en un seul geste :
-- la cible marchande ne saisira pas d'identifiants (CDC 2.4). Le jeton est a
-- usage unique et expire.
-- ---------------------------------------------------------------------------
create table public.jeton_confirmation (
  jeton        text primary key default encode(extensions.gen_random_bytes(24), 'hex'),
  marchand_id  uuid not null references public.marchand (id) on delete cascade,
  expire_le    timestamptz not null default (now() + interval '14 days'),
  utilise_le   timestamptz,
  cree_le      timestamptz not null default now()
);

create index jeton_confirmation_marchand_idx on public.jeton_confirmation (marchand_id)
  where utilise_le is null;

-- ---------------------------------------------------------------------------
-- Signalement client : "ferme", "a demenage", "informations fausses".
-- Deuxieme source de nettoyage de la base, apres la confirmation.
-- ---------------------------------------------------------------------------
create table public.signalement (
  id            uuid primary key default gen_random_uuid(),
  marchand_id   uuid not null references public.marchand (id) on delete cascade,
  motif         public.motif_signalement not null,
  auteur_id     uuid references public.profil (id) on delete set null,
  -- Empreinte d'appareil anonyme : permet de compter des signalements
  -- distincts sans identifier le client (CDC 9.1).
  appareil_hash text,
  commentaire   text check (commentaire is null or length(commentaire) <= 300),
  traite_le     timestamptz,
  cree_le       timestamptz not null default now()
);

create index signalement_marchand_idx on public.signalement (marchand_id, cree_le desc)
  where traite_le is null;

-- Un meme appareil ne signale une fiche qu'une fois par motif.
create unique index signalement_unicite_idx
  on public.signalement (marchand_id, motif, appareil_hash)
  where appareil_hash is not null and traite_le is null;

-- ---------------------------------------------------------------------------
-- Transitions de fraicheur. Appelee par la fonction edge `fraicheur`, elle-meme
-- declenchee par une tache planifiee quotidienne.
-- ---------------------------------------------------------------------------
create or replace function public.appliquer_transitions_fraicheur()
returns table (
  passees_a_confirmer integer,
  passees_en_veille   integer,
  suspendues          integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seuil_confirmer integer;
  v_seuil_veille    integer;
  v_seuil_signal    integer;
  v_a_confirmer     integer;
  v_en_veille       integer;
  v_suspendues      integer;
begin
  select valeur into v_seuil_confirmer from public.parametre where cle = 'fraicheur_jours_a_confirmer';
  select valeur into v_seuil_veille    from public.parametre where cle = 'fraicheur_jours_en_veille';
  select valeur into v_seuil_signal    from public.parametre where cle = 'signalements_seuil_verif';

  with maj as (
    update public.marchand
    set statut = 'en_veille'
    where statut = 'a_confirmer'
      and derniere_confirmation < now() - make_interval(days => v_seuil_veille)
    returning 1
  )
  select count(*)::integer into v_en_veille from maj;

  with maj as (
    update public.marchand
    set statut = 'a_confirmer'
    where statut = 'active'
      and derniere_confirmation < now() - make_interval(days => v_seuil_confirmer)
    returning 1
  )
  select count(*)::integer into v_a_confirmer from maj;

  -- Signalements convergents "ferme" ou "demenage" : la fiche sort des
  -- resultats en attendant une verification terrain.
  with convergents as (
    select s.marchand_id
    from public.signalement s
    where s.traite_le is null
      and s.motif in ('ferme', 'demenage')
    group by s.marchand_id
    having count(*) >= v_seuil_signal
  ),
  maj as (
    update public.marchand m
    set statut = 'a_confirmer'
    from convergents c
    where m.id = c.marchand_id
      and m.statut = 'active'
    returning 1
  )
  select count(*)::integer into v_suspendues from maj;

  return query select v_a_confirmer, v_en_veille, v_suspendues;
end;
$$;

comment on function public.appliquer_transitions_fraicheur() is
  'Fait progresser les fiches dans le cycle de fraicheur. Idempotente, appelable quotidiennement.';

-- ---------------------------------------------------------------------------
-- Fiches a relancer : entree de la campagne WhatsApp J+75.
-- ---------------------------------------------------------------------------
create or replace function public.fiches_a_relancer(p_limite integer default 200)
returns table (
  marchand_id        uuid,
  nom_enseigne       text,
  telephone_whatsapp text,
  jours_sans_confirmation integer,
  jeton              text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seuil integer;
begin
  select valeur into v_seuil from public.parametre where cle = 'fraicheur_jours_relance';

  return query
  with cibles as (
    select m.id, m.nom_enseigne, m.telephone_whatsapp, m.derniere_confirmation
    from public.marchand m
    where m.statut in ('active', 'a_confirmer')
      and m.derniere_confirmation < now() - make_interval(days => v_seuil)
      and not exists (
        select 1 from public.jeton_confirmation j
        where j.marchand_id = m.id
          and j.utilise_le is null
          and j.expire_le > now()
      )
    order by m.derniere_confirmation asc
    limit p_limite
  ),
  jetons as (
    insert into public.jeton_confirmation (marchand_id)
    select c.id from cibles c
    returning jeton_confirmation.marchand_id, jeton_confirmation.jeton
  )
  select c.id,
         c.nom_enseigne,
         c.telephone_whatsapp,
         extract(day from now() - c.derniere_confirmation)::integer,
         j.jeton
  from cibles c
  join jetons j on j.marchand_id = c.id;
end;
$$;
