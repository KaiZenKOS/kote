-- Elements indispensables au lancement : préférences utilisateur et file de modération.
set search_path = public, extensions;

alter table public.profil
  add column if not exists notifications_activees boolean not null default true,
  add column if not exists consentement_le timestamptz;

alter table public.signalement
  add column if not exists decision text check (decision in ('conserve', 'mise_a_confirmer', 'retiree')),
  add column if not exists traite_par uuid references public.profil (id) on delete set null,
  add column if not exists note_moderation text check (note_moderation is null or length(note_moderation) <= 500);

create or replace function public.traiter_signalement(
  p_signalement_id uuid,
  p_decision text,
  p_note text default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_marchand uuid;
begin
  if not public.est_admin() then raise exception 'Action reservee a la moderation' using errcode = 'insufficient_privilege'; end if;
  if p_decision not in ('conserve', 'mise_a_confirmer', 'retiree') then raise exception 'Decision invalide' using errcode = 'check_violation'; end if;
  update public.signalement
    set traite_le = now(), traite_par = auth.uid(), decision = p_decision, note_moderation = left(nullif(btrim(p_note), ''), 500)
    where id = p_signalement_id and traite_le is null
    returning marchand_id into v_marchand;
  if v_marchand is null then raise exception 'Signalement introuvable ou deja traite' using errcode = 'no_data_found'; end if;
  if p_decision = 'mise_a_confirmer' then update public.marchand set statut = 'a_confirmer' where id = v_marchand and statut = 'active'; end if;
  if p_decision = 'retiree' then update public.marchand set statut = 'retiree' where id = v_marchand; end if;
end; $$;

create or replace function public.file_moderation(p_limite integer default 50)
returns table(signalement_id uuid, marchand_id uuid, nom_enseigne text, motif public.motif_signalement, commentaire text, cree_le timestamptz)
language sql stable security definer set search_path = public as $$
  select s.id, s.marchand_id, m.nom_enseigne, s.motif, s.commentaire, s.cree_le
  from public.signalement s join public.marchand m on m.id = s.marchand_id
  where s.traite_le is null and public.est_admin()
  order by s.cree_le asc limit least(greatest(p_limite, 1), 100)
$$;

revoke all on function public.traiter_signalement(uuid, text, text) from public, anon;
revoke all on function public.file_moderation(integer) from public, anon;
grant execute on function public.traiter_signalement(uuid, text, text) to authenticated;
grant execute on function public.file_moderation(integer) to authenticated;
