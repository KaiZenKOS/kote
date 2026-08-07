-- Vitrine marchand et moderation des images visibles.
set search_path = public, extensions;

create table public.produit_marchand (
  id uuid primary key default gen_random_uuid(),
  marchand_id uuid not null references public.marchand(id) on delete cascade,
  nom text not null check (length(btrim(nom)) between 2 and 90),
  description text check (description is null or length(description) <= 300),
  prix_fcfa integer check (prix_fcfa is null or prix_fcfa >= 0),
  est_nouveaute boolean not null default false,
  actif boolean not null default true,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now()
);

create index produit_marchand_public_idx on public.produit_marchand (marchand_id, est_nouveaute desc, cree_le desc)
  where actif;
create trigger produit_marchand_maj_le before update on public.produit_marchand
  for each row execute function public.touche_maj_le();

alter table public.produit_marchand enable row level security;
revoke all on public.produit_marchand from public, anon, authenticated;
grant select, insert, update, delete on public.produit_marchand to authenticated;
create policy produit_gestion_proprietaire on public.produit_marchand
  for all to authenticated
  using (exists (select 1 from public.marchand m where m.id = produit_marchand.marchand_id and m.proprietaire_id = auth.uid()) or public.est_admin())
  with check (exists (select 1 from public.marchand m where m.id = produit_marchand.marchand_id and m.proprietaire_id = auth.uid()) or public.est_admin());

create view public.produit_marchand_public as
select p.id, p.marchand_id, p.nom, p.description, p.prix_fcfa, p.est_nouveaute, p.cree_le
from public.produit_marchand p
join public.marchand m on m.id = p.marchand_id
where p.actif and m.statut in ('active', 'a_confirmer') and m.verifiee_terrain and not m.securite_a_revoir;
grant select on public.produit_marchand_public to anon, authenticated;

-- Une image rendue publique peut etre signalee sans que le client ait besoin
-- d'exposer son identite ou de contacter directement le marchand. Deux comptes
-- distincts masquent l'image, dans l'attente d'un examen humain.
alter table public.photo_marchand add column if not exists masquee boolean not null default false;

create table public.signalement_media (
  id uuid primary key default gen_random_uuid(),
  marchand_id uuid not null references public.marchand(id) on delete cascade,
  chemin_photo text not null,
  auteur_id uuid not null references public.profil(id) on delete cascade,
  motif text not null check (motif in ('nudite', 'violence', 'harcelement', 'arnaque', 'hors_sujet', 'autre')),
  commentaire text check (commentaire is null or length(btrim(commentaire)) between 3 and 300),
  traite_le timestamptz,
  traite_par uuid references public.profil(id) on delete set null,
  cree_le timestamptz not null default now(),
  unique (marchand_id, chemin_photo, auteur_id)
);
alter table public.signalement_media enable row level security;
revoke all on public.signalement_media from public, anon, authenticated;

create or replace function public.signaler_image(
  p_marchand_id uuid, p_chemin_photo text, p_motif text, p_commentaire text default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_nombre integer;
begin
  if auth.uid() is null then raise exception 'Connexion requise' using errcode = 'insufficient_privilege'; end if;
  if p_motif not in ('nudite', 'violence', 'harcelement', 'arnaque', 'hors_sujet', 'autre') then raise exception 'Motif invalide' using errcode = 'check_violation'; end if;
  if not exists (select 1 from public.photo_marchand where marchand_id=p_marchand_id and chemin=p_chemin_photo and moderee and not masquee) then
    raise exception 'Image introuvable' using errcode = 'no_data_found';
  end if;
  insert into public.signalement_media(marchand_id, chemin_photo, auteur_id, motif, commentaire)
  values (p_marchand_id, p_chemin_photo, auth.uid(), p_motif, left(nullif(btrim(p_commentaire), ''), 300));
  select count(distinct auteur_id)::integer into v_nombre from public.signalement_media
    where marchand_id=p_marchand_id and chemin_photo=p_chemin_photo and traite_le is null;
  if v_nombre >= 2 then update public.photo_marchand set masquee=true where marchand_id=p_marchand_id and chemin=p_chemin_photo; end if;
end;
$$;
revoke all on function public.signaler_image(uuid,text,text,text) from public, anon;
grant execute on function public.signaler_image(uuid,text,text,text) to authenticated;

create or replace view public.photo_marchand_public as
select ph.id, ph.marchand_id, ph.chemin, ph.ordre, ph.largeur, ph.hauteur
from public.photo_marchand ph join public.marchand m on m.id = ph.marchand_id
where ph.moderee and not ph.masquee and m.statut in ('active', 'a_confirmer') and m.verifiee_terrain and not m.securite_a_revoir;
grant select on public.photo_marchand_public to anon, authenticated;

-- La photo principale doit suivre la meme regle de masquage.
drop view public.marchand_public;
create view public.marchand_public as
select m.id, m.nom_enseigne, m.categorie_slug, m.description, m.repere,
  m.repere_arrivee_public, m.conseil_acces,
  st_y(m.localisation::geometry) as latitude, st_x(m.localisation::geometry) as longitude,
  m.localisation_ajustee, m.horaires, m.statut, m.zone_id, m.derniere_confirmation,
  extract(day from now() - m.derniere_confirmation)::integer as jours_depuis_confirmation,
  p.chemin as photo_principale, m.cree_le, m.verifiee_terrain, m.verifiee_le
from public.marchand m
left join lateral (select ph.chemin from public.photo_marchand ph where ph.marchand_id=m.id and ph.moderee and not ph.masquee order by ph.ordre,ph.cree_le limit 1) p on true
where m.statut in ('active','a_confirmer') and m.verifiee_terrain and not m.securite_a_revoir;
grant select on public.marchand_public to anon, authenticated;

create or replace function public.traiter_signalement_media(p_signalement_id uuid, p_masquer boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_marchand uuid; v_chemin text;
begin
  if not public.est_admin() then raise exception 'Action reservee a la moderation' using errcode='insufficient_privilege'; end if;
  update public.signalement_media set traite_le=now(), traite_par=auth.uid()
    where id=p_signalement_id and traite_le is null returning marchand_id, chemin_photo into v_marchand, v_chemin;
  if v_marchand is null then raise exception 'Signalement introuvable ou deja traite' using errcode='no_data_found'; end if;
  if p_masquer then update public.photo_marchand set masquee=true where marchand_id=v_marchand and chemin=v_chemin; end if;
end;
$$;
revoke all on function public.traiter_signalement_media(uuid,boolean) from public, anon;
grant execute on function public.traiter_signalement_media(uuid,boolean) to authenticated;
