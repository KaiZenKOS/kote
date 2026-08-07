-- ---------------------------------------------------------------------------
-- Confiance terrain et protection des clients.
--
-- Une fiche ne peut pas se declarer fiable elle-meme. La verification signifie
-- uniquement qu'un ambassadeur autorise a constate l'activite et un point
-- d'arrivee public ; elle ne constitue jamais une garantie de securite.
-- ---------------------------------------------------------------------------

set search_path = public, extensions;

alter table public.marchand
  add column if not exists repere_arrivee_public text
    check (repere_arrivee_public is null or length(btrim(repere_arrivee_public)) between 3 and 200),
  add column if not exists conseil_acces text
    check (conseil_acces is null or length(conseil_acces) <= 400),
  add column if not exists securite_a_revoir boolean not null default false,
  add column if not exists securite_signalee_le timestamptz;

grant update (repere_arrivee_public, conseil_acces) on public.marchand to authenticated;

-- Les fiches deja certifiees lors d'une migration precedente restent dans le
-- meme etat. Les nouvelles devront etre verifiees avant toute publication.

-- Une photo de la devanture ou de l'acces est requise pour la certification
-- terrain. L'ambassadeur qui atteste sur place valide cette photo ; les photos
-- de personnes, de clients ou de domiciles prives ne sont pas acceptables.
create or replace function public.certifier_fiche(p_marchand_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.est_ambassadeur_actif() then
    raise exception 'Certification reservee aux ambassadeurs actifs' using errcode = 'insufficient_privilege';
  end if;

  if not exists (
    select 1 from public.photo_marchand p
    where p.marchand_id = p_marchand_id
  ) then
    raise exception 'Ajoutez une photo de la devanture ou de l''acces avant la verification'
      using errcode = 'check_violation';
  end if;

  update public.marchand
  set verifiee_terrain = true,
      verifiee_le = now(),
      verifiee_par = auth.uid(),
      securite_a_revoir = false,
      securite_signalee_le = null
  where id = p_marchand_id
    and cree_par_ambassadeur = auth.uid()
    and nullif(btrim(repere_arrivee_public), '') is not null;

  if not found then
    raise exception 'Indiquez un point d''arrivee public et verifiez uniquement une fiche qui vous est attribuee'
      using errcode = 'insufficient_privilege';
  end if;

  -- La certification est aussi la moderation humaine d'au moins une preuve
  -- visuelle. Seule la premiere photo est rendue publique : le reste demeure
  -- prive jusqu'a examen complementaire.
  update public.photo_marchand
  set moderee = true
  where id = (
    select id from public.photo_marchand
    where marchand_id = p_marchand_id
    order by ordre, cree_le
    limit 1
  );
end;
$$;

-- Un proprietaire peut creer une fiche, mais ne peut pas la rendre publique
-- avant controle terrain. Cela empeche une inscription fictive d'apparaitre
-- dans les resultats ou de recevoir des demandes de contact.
create or replace function public.publier_ma_fiche(p_marchand_id uuid)
returns public.statut_marchand
language plpgsql
security definer
set search_path = public
as $$
declare
  v_statut public.statut_marchand;
begin
  update public.marchand m
  set statut = 'active', derniere_confirmation = now()
  where m.id = p_marchand_id
    and m.statut in ('brouillon', 'a_confirmer', 'en_veille', 'retiree')
    and m.verifiee_terrain
    and not m.securite_a_revoir
    and (m.proprietaire_id = auth.uid()
         or (m.cree_par_ambassadeur = auth.uid() and m.proprietaire_id is null))
  returning m.statut into v_statut;

  if v_statut is null then
    raise exception 'La fiche doit etre verifiee sur le terrain et sans alerte de securite avant publication'
      using errcode = 'insufficient_privilege';
  end if;
  return v_statut;
end;
$$;

-- Avis : une personne connectee ne peut donner qu'un avis par commerce. Les
-- avis restent invisibles jusqu'a validation humaine ; le nom et le numero du
-- client ne sont jamais exposes dans la vue publique.
create table public.avis_marchand (
  id uuid primary key default gen_random_uuid(),
  marchand_id uuid not null references public.marchand(id) on delete cascade,
  auteur_id uuid not null references public.profil(id) on delete cascade,
  note smallint not null check (note between 1 and 5),
  commentaire text check (commentaire is null or length(btrim(commentaire)) between 3 and 300),
  statut text not null default 'en_attente' check (statut in ('en_attente', 'publie', 'refuse')),
  traite_le timestamptz,
  traite_par uuid references public.profil(id) on delete set null,
  cree_le timestamptz not null default now(),
  unique (marchand_id, auteur_id)
);

create index avis_marchand_public_idx on public.avis_marchand (marchand_id, cree_le desc)
  where statut = 'publie';

alter table public.avis_marchand enable row level security;
revoke all on public.avis_marchand from public, anon, authenticated;
grant select, insert on public.avis_marchand to authenticated;

create policy avis_lecture_auteur_ou_admin on public.avis_marchand
  for select to authenticated using (auteur_id = auth.uid() or public.est_admin());
create policy avis_creation_auteur on public.avis_marchand
  for insert to authenticated with check (auteur_id = auth.uid() and statut = 'en_attente');
create policy avis_modification_auteur on public.avis_marchand
  for update to authenticated using (auteur_id = auth.uid() and statut = 'en_attente')
  with check (auteur_id = auth.uid() and statut = 'en_attente');
grant update (note, commentaire) on public.avis_marchand to authenticated;

create view public.avis_marchand_public as
select marchand_id, note, commentaire, cree_le
from public.avis_marchand
where statut = 'publie';
revoke all on public.avis_marchand_public from public, anon, authenticated;
grant select on public.avis_marchand_public to anon, authenticated;

create or replace function public.traiter_avis(
  p_avis_id uuid,
  p_publier boolean
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.est_admin() then
    raise exception 'Action reservee a la moderation' using errcode = 'insufficient_privilege';
  end if;
  update public.avis_marchand
  set statut = case when p_publier then 'publie' else 'refuse' end,
      traite_le = now(), traite_par = auth.uid()
  where id = p_avis_id and statut = 'en_attente';
  if not found then raise exception 'Avis introuvable ou deja traite' using errcode = 'no_data_found'; end if;
end;
$$;

revoke all on function public.traiter_avis(uuid, boolean) from public, anon;
grant execute on function public.traiter_avis(uuid, boolean) to authenticated;

-- Signalement specifique au chemin d'arrivee. Une seule alerte ne peut pas
-- faire disparaitre une fiche (protection contre l'abus). Deux comptes
-- differents la suspendent provisoirement, puis un moderateur tranche.
create table public.alerte_acces (
  id uuid primary key default gen_random_uuid(),
  marchand_id uuid not null references public.marchand(id) on delete cascade,
  auteur_id uuid not null references public.profil(id) on delete cascade,
  motif text not null check (motif in ('repere_inexact', 'acces_isole', 'comportement_inquietant', 'lieu_inaccessible', 'autre')),
  commentaire text check (commentaire is null or length(btrim(commentaire)) between 3 and 300),
  traite_le timestamptz,
  traite_par uuid references public.profil(id) on delete set null,
  cree_le timestamptz not null default now(),
  unique (marchand_id, auteur_id, motif)
);

alter table public.alerte_acces enable row level security;
revoke all on public.alerte_acces from public, anon, authenticated;

create or replace function public.signaler_risque_acces(
  p_marchand_id uuid,
  p_motif text,
  p_commentaire text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v_nombre integer;
begin
  if auth.uid() is null then raise exception 'Connexion requise' using errcode = 'insufficient_privilege'; end if;
  if p_motif not in ('repere_inexact', 'acces_isole', 'comportement_inquietant', 'lieu_inaccessible', 'autre') then
    raise exception 'Motif invalide' using errcode = 'check_violation';
  end if;
  insert into public.alerte_acces (marchand_id, auteur_id, motif, commentaire)
  values (p_marchand_id, auth.uid(), p_motif, left(nullif(btrim(p_commentaire), ''), 300));

  select count(distinct auteur_id)::integer into v_nombre
  from public.alerte_acces where marchand_id = p_marchand_id and traite_le is null;

  update public.marchand
  set securite_a_revoir = true,
      securite_signalee_le = now(),
      statut = case when v_nombre >= 2 then 'suspendue'::public.statut_marchand else statut end
  where id = p_marchand_id;
end;
$$;

revoke all on function public.signaler_risque_acces(uuid, text, text) from public, anon;
grant execute on function public.signaler_risque_acces(uuid, text, text) to authenticated;

-- L'unique projection publique ne laisse passer que les commerces controles et
-- sans alerte en attente. Un lieu suspendu n'apparait ni dans la carte ni dans
-- la recherche.
-- PostgreSQL ne permet pas d'inserer des colonnes au milieu d'une vue via
-- CREATE OR REPLACE. La vue n'a pas de dependance structurelle : on la recree
-- donc explicitement puis on retablit son droit de lecture minimal.
drop view public.marchand_public;
create view public.marchand_public as
select m.id, m.nom_enseigne, m.categorie_slug, m.description, m.repere,
  m.repere_arrivee_public, m.conseil_acces,
  st_y(m.localisation::geometry) as latitude, st_x(m.localisation::geometry) as longitude,
  m.localisation_ajustee, m.horaires, m.statut, m.zone_id, m.derniere_confirmation,
  extract(day from now() - m.derniere_confirmation)::integer as jours_depuis_confirmation,
  p.chemin as photo_principale, m.cree_le, m.verifiee_terrain, m.verifiee_le
from public.marchand m
left join lateral (select ph.chemin from public.photo_marchand ph where ph.marchand_id = m.id and ph.moderee order by ph.ordre, ph.cree_le limit 1) p on true
where m.statut in ('active', 'a_confirmer') and m.verifiee_terrain and not m.securite_a_revoir;
grant select on public.marchand_public to anon, authenticated;

create or replace function public.rechercher_marchands(
  p_lat double precision, p_lng double precision, p_rayon_m integer default 3000,
  p_categorie text default null, p_q text default null, p_limite integer default 20, p_decalage integer default 0
) returns table (
  id uuid, nom_enseigne text, categorie_slug text, description text, repere text,
  latitude double precision, longitude double precision, distance_m integer,
  statut public.statut_marchand, jours_depuis_confirmation integer, photo_principale text
)
language sql stable security definer set search_path = public, extensions as $$
  with reference as (
    select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as point,
      least(greatest(coalesce(p_rayon_m, 3000), 100), 20000) as rayon,
      nullif(btrim(coalesce(p_q, '')), '') as terme
  )
  select m.id, m.nom_enseigne, m.categorie_slug, m.description, m.repere,
    st_y(m.localisation::geometry), st_x(m.localisation::geometry),
    st_distance(m.localisation, r.point)::integer, m.statut,
    extract(day from now() - m.derniere_confirmation)::integer, ph.chemin
  from public.marchand m cross join reference r
  left join lateral (select p.chemin from public.photo_marchand p where p.marchand_id=m.id and p.moderee order by p.ordre,p.cree_le limit 1) ph on true
  where m.statut in ('active','a_confirmer') and m.verifiee_terrain and not m.securite_a_revoir
    and st_dwithin(m.localisation, r.point, r.rayon)
    and (p_categorie is null or m.categorie_slug = p_categorie)
    and (r.terme is null or m.recherche like '%' || lower(public.sans_accent(r.terme)) || '%' or m.recherche % lower(public.sans_accent(r.terme)))
  order by (m.statut = 'active') desc,
    case when r.terme is null then 0 else -extensions.similarity(m.recherche, lower(public.sans_accent(r.terme))) end,
    st_distance(m.localisation, r.point)
  limit least(greatest(coalesce(p_limite,20),1),50) offset greatest(coalesce(p_decalage,0),0)
$$;
