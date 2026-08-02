-- ---------------------------------------------------------------------------
-- Lecture publique et recherche de proximite.
--
-- Regle d'exposition : la table `marchand` n'est jamais lisible directement par
-- un client anonyme, parce qu'elle porte le numero WhatsApp. Toute lecture
-- publique passe par la vue `marchand_public` ou par la fonction de recherche,
-- qui ne projettent jamais cette colonne (CDC 8, securite).
-- ---------------------------------------------------------------------------

set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- Vue publique d'une fiche.
--
-- Latitude et longitude sont projetees en nombres plutot qu'en geometrie : le
-- client mobile n'a pas a embarquer un decodeur WKB, et la charge utile est
-- plus petite (CDC 8, budget de donnees).
-- ---------------------------------------------------------------------------
create view public.marchand_public as
select
  m.id,
  m.nom_enseigne,
  m.categorie_slug,
  m.description,
  m.repere,
  st_y(m.localisation::geometry) as latitude,
  st_x(m.localisation::geometry) as longitude,
  m.localisation_ajustee,
  m.horaires,
  m.statut,
  m.zone_id,
  m.derniere_confirmation,
  -- Indicateur de fraicheur affiche sur la fiche : signal de confiance pour le
  -- client autant qu'outil de nettoyage (CDC 6).
  extract(day from now() - m.derniere_confirmation)::integer as jours_depuis_confirmation,
  p.chemin as photo_principale,
  m.cree_le
from public.marchand m
left join lateral (
  select ph.chemin
  from public.photo_marchand ph
  where ph.marchand_id = m.id and ph.moderee
  order by ph.ordre, ph.cree_le
  limit 1
) p on true
where m.statut in ('active', 'a_confirmer');

comment on view public.marchand_public is
  'Projection publique d''une fiche visible. N''expose jamais le numero WhatsApp.';

-- ---------------------------------------------------------------------------
-- Recherche de proximite.
--
-- L'ecran d'accueil n'est pas la carte mais une recherche : un utilisateur qui
-- a une crevaison ne parcourt pas une carte, il formule un besoin (CDC 5.1).
-- Cette fonction est donc le point d'entree principal de l'application.
--
-- Ordre de tri : les fiches confirmees recemment passent devant, puis la
-- distance. Une fiche `a_confirmer` reste visible mais ne remonte pas.
-- ---------------------------------------------------------------------------
create or replace function public.rechercher_marchands(
  p_lat        double precision,
  p_lng        double precision,
  p_rayon_m    integer default 3000,
  p_categorie  text    default null,
  p_q          text    default null,
  p_limite     integer default 20,
  p_decalage   integer default 0
)
returns table (
  id                       uuid,
  nom_enseigne             text,
  categorie_slug           text,
  description              text,
  repere                   text,
  latitude                 double precision,
  longitude                double precision,
  distance_m               integer,
  statut                   public.statut_marchand,
  jours_depuis_confirmation integer,
  photo_principale         text
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with reference as (
    select
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as point,
      -- Plafond de rayon : evite qu'une requete unique ne ramene toute la base,
      -- et borne la charge utile renvoyee au mobile.
      least(greatest(coalesce(p_rayon_m, 3000), 100), 20000) as rayon,
      nullif(btrim(coalesce(p_q, '')), '') as terme
  )
  select
    m.id,
    m.nom_enseigne,
    m.categorie_slug,
    m.description,
    m.repere,
    st_y(m.localisation::geometry),
    st_x(m.localisation::geometry),
    st_distance(m.localisation, r.point)::integer,
    m.statut,
    extract(day from now() - m.derniere_confirmation)::integer,
    ph.chemin
  from public.marchand m
  cross join reference r
  left join lateral (
    select p.chemin
    from public.photo_marchand p
    where p.marchand_id = m.id and p.moderee
    order by p.ordre, p.cree_le
    limit 1
  ) ph on true
  where m.statut in ('active', 'a_confirmer')
    and st_dwithin(m.localisation, r.point, r.rayon)
    and (p_categorie is null or m.categorie_slug = p_categorie)
    and (
      r.terme is null
      or m.recherche like '%' || lower(public.sans_accent(r.terme)) || '%'
      or m.recherche % lower(public.sans_accent(r.terme))
    )
  order by
    (m.statut = 'active') desc,
    case when r.terme is null then 0
         else -extensions.similarity(m.recherche, lower(public.sans_accent(r.terme)))
    end,
    st_distance(m.localisation, r.point)
  limit least(greatest(coalesce(p_limite, 20), 1), 50)
  offset greatest(coalesce(p_decalage, 0), 0);
$$;

comment on function public.rechercher_marchands is
  'Recherche par proximite, categorie et texte libre. Ne renvoie jamais le numero WhatsApp.';

-- ---------------------------------------------------------------------------
-- Comptage par categorie dans un rayon : alimente les pastilles des filtres
-- rapides sans avoir a charger les resultats de chaque categorie.
-- Une seule requete la ou le client en aurait fait six (CDC 8).
-- ---------------------------------------------------------------------------
create or replace function public.compter_par_categorie(
  p_lat     double precision,
  p_lng     double precision,
  p_rayon_m integer default 3000
)
returns table (categorie_slug text, libelle_fr text, icone text, nombre integer)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with reference as (
    select
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as point,
      least(greatest(coalesce(p_rayon_m, 3000), 100), 20000) as rayon
  )
  select c.slug, c.libelle_fr, c.icone, count(m.id)::integer
  from public.categorie c
  cross join reference r
  left join public.marchand m
    on m.categorie_slug = c.slug
   and m.statut in ('active', 'a_confirmer')
   and st_dwithin(m.localisation, r.point, r.rayon)
  where c.actif
  group by c.slug, c.libelle_fr, c.icone, c.ordre
  order by c.ordre;
$$;
