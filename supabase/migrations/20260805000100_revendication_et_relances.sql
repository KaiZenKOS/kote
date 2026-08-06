-- Revendication simple : apres connexion avec son numero, un marchand reprend
-- toutes les fiches encore non revendiquees saisies pour lui.
create or replace function public.revendiquer_mes_fiches()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_telephone text;
  v_nombre integer;
begin
  select phone into v_telephone from auth.users where id = auth.uid();
  if v_telephone is null then
    raise exception 'Compte sans numero verifie' using errcode = 'insufficient_privilege';
  end if;
  with reprises as (
    update public.marchand
    set proprietaire_id = auth.uid()
    where proprietaire_id is null
      and regexp_replace(telephone_whatsapp, '^\+', '') = v_telephone
    returning id
  )
  select count(*) into v_nombre from reprises;
  return v_nombre;
end;
$$;

revoke execute on function public.revendiquer_mes_fiches() from public, anon;
grant execute on function public.revendiquer_mes_fiches() to authenticated;
