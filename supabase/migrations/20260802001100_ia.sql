-- ---------------------------------------------------------------------------
-- Assistance a la redaction (CDC 5.1, "generation de la description a partir
-- de trois mots-cles").
--
-- Contrainte economique dominante (CDC 7.1) : le revenu attendu par marchand se
-- compte en centaines de FCFA par mois. Le cout d'IA par marchand doit donc
-- rester en centimes. D'ou deux mecanismes obligatoires :
--
--   - un cache par (categorie, mots-cles) : deux couturieres de quartier
--     saisissent souvent les memes mots. La deuxieme generation est gratuite.
--   - un quota journalier par fiche, parametre en base.
--
-- L'appel au fournisseur se fait exclusivement cote serveur, jamais depuis le
-- mobile : cela protege la cle, permet le cache, le quota et le repli.
-- ---------------------------------------------------------------------------

set search_path = public, extensions;

create table public.cache_ia (
  empreinte      text primary key,
  categorie_slug text not null references public.categorie (slug),
  mots_cles      text[] not null,
  propositions   jsonb not null,
  reutilisations integer not null default 0,
  cree_le        timestamptz not null default now()
);

create index cache_ia_categorie_idx on public.cache_ia (categorie_slug, cree_le desc);

comment on table public.cache_ia is
  'Cache des generations de description. Un cout d''IA paye une fois sert a plusieurs fiches.';

create table public.generation_ia (
  id             bigint generated always as identity primary key,
  marchand_id    uuid not null references public.marchand (id) on delete cascade,
  depuis_cache   boolean not null default false,
  jetons_entree  integer,
  jetons_sortie  integer,
  cree_le        timestamptz not null default now()
);

create index generation_ia_quota_idx on public.generation_ia (marchand_id, cree_le desc);

alter table public.cache_ia enable row level security;
alter table public.generation_ia enable row level security;

-- Aucun privilege pour anon ni authenticated : tout passe par la fonction edge.
revoke all on public.cache_ia from anon, authenticated;
revoke all on public.generation_ia from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Verification et consommation du quota journalier, en une seule aller-retour.
-- ---------------------------------------------------------------------------
create or replace function public.quota_ia_restant(p_marchand_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quota  integer;
  v_utilise integer;
begin
  select valeur into v_quota from public.parametre where cle = 'ia_description_quota_jour';

  select count(*)::integer into v_utilise
  from public.generation_ia g
  where g.marchand_id = p_marchand_id
    and not g.depuis_cache
    and g.cree_le >= date_trunc('day', now());

  return greatest(coalesce(v_quota, 5) - v_utilise, 0);
end;
$$;

-- Appelee uniquement par la fonction edge, en role de service.
revoke execute on function public.quota_ia_restant(uuid) from public, anon, authenticated;
