-- ---------------------------------------------------------------------------
-- Extensions et fonctions utilitaires transverses.
--
-- postgis   : recherche de proximite native (ST_DWithin sur un index GiST).
--             C'est la brique qui justifie PostgreSQL pour ce projet (CDC 10.2).
-- pg_trgm   : recherche textuelle tolerante aux fautes de frappe.
-- unaccent  : les utilisateurs saisissent sans accent ("mecanicien", "couturiere").
-- ---------------------------------------------------------------------------

-- pgcrypto : jetons de confirmation en un clic (gen_random_bytes).
create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- unaccent(text) n'est pas marquee immutable, ce qui interdit son usage dans une
-- colonne generee ou un index. On passe par la signature a deux arguments, qui
-- l'est, via ce wrapper.
-- ---------------------------------------------------------------------------
create or replace function public.sans_accent(txt text)
returns text
language sql
immutable
strict
parallel safe
set search_path = public, extensions
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, txt);
$$;

comment on function public.sans_accent(text) is
  'Retire les accents de maniere immutable (utilisable en colonne generee et en index).';

-- ---------------------------------------------------------------------------
-- Horodatage de modification, applique par declencheur sur les tables mutables.
-- ---------------------------------------------------------------------------
create or replace function public.touche_maj_le()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.maj_le := now();
  return new;
end;
$$;
