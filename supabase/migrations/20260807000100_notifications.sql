set search_path = public, extensions;
create table public.notification_appareil (
  id uuid primary key default gen_random_uuid(), profil_id uuid not null references public.profil(id) on delete cascade,
  jeton text not null unique, plateforme text not null check (plateforme in ('android','ios')), actif boolean not null default true,
  cree_le timestamptz not null default now(), maj_le timestamptz not null default now()
);
create trigger notification_appareil_maj before update on public.notification_appareil for each row execute function public.touche_maj_le();
alter table public.notification_appareil enable row level security;
revoke all on public.notification_appareil from anon, authenticated;
