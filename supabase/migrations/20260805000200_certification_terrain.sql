alter table public.marchand
  add column verifiee_terrain boolean not null default false,
  add column verifiee_le timestamptz,
  add column verifiee_par uuid references public.ambassadeur (id) on delete set null;

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
  update public.marchand
  set verifiee_terrain = true, verifiee_le = now(), verifiee_par = auth.uid()
  where id = p_marchand_id and cree_par_ambassadeur = auth.uid();
  if not found then raise exception 'Fiche introuvable ou non attribuee' using errcode = 'insufficient_privilege'; end if;
end;
$$;

revoke execute on function public.certifier_fiche(uuid) from public, anon;
grant execute on function public.certifier_fiche(uuid) to authenticated;

create or replace view public.marchand_public as
select m.id, m.nom_enseigne, m.categorie_slug, m.description, m.repere,
  st_y(m.localisation::geometry) as latitude, st_x(m.localisation::geometry) as longitude,
  m.localisation_ajustee, m.horaires, m.statut, m.zone_id, m.derniere_confirmation,
  extract(day from now() - m.derniere_confirmation)::integer as jours_depuis_confirmation,
  p.chemin as photo_principale, m.cree_le, m.verifiee_terrain, m.verifiee_le
from public.marchand m
left join lateral (select ph.chemin from public.photo_marchand ph where ph.marchand_id = m.id and ph.moderee order by ph.ordre, ph.cree_le limit 1) p on true
where m.statut in ('active', 'a_confirmer');
