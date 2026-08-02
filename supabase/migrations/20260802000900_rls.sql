-- ---------------------------------------------------------------------------
-- Securite : privileges, politiques RLS et exposition de l'API.
--
-- Principe directeur, issu de la section 9 du CDC : la confiance du marchand
-- est la condition d'existence du produit. Une fuite de numeros de telephone ou
-- une base aspirable detruirait le projet plus surement qu'un bug fonctionnel.
--
-- Trois regles :
--   1. Le role anonyme ne touche jamais la table `marchand`. Il lit la vue
--      publique et appelle les fonctions de recherche, qui ne projettent pas
--      le numero WhatsApp.
--   2. Un compte authentifie ne voit en clair que ses propres fiches (ou celles
--      qu'il a saisies comme ambassadeur).
--   3. Tout ce qui s'ecrit sans authentification (journal d'usage,
--      signalements) passe par une fonction edge en role de service, avec
--      limitation d'appels. Sinon les statistiques d'une fiche seraient
--      gonflables, donc la commission ambassadeur fraudable.
-- ---------------------------------------------------------------------------

set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- Activation de RLS partout. Aucune table du schema public n'y echappe.
-- ---------------------------------------------------------------------------
alter table public.categorie          enable row level security;
alter table public.zone               enable row level security;
alter table public.parametre          enable row level security;
alter table public.profil             enable row level security;
alter table public.ambassadeur        enable row level security;
alter table public.marchand           enable row level security;
alter table public.photo_marchand     enable row level security;
alter table public.confirmation       enable row level security;
alter table public.jeton_confirmation enable row level security;
alter table public.signalement        enable row level security;
alter table public.evenement_usage    enable row level security;
alter table public.commission         enable row level security;
alter table public.limitation_appel   enable row level security;

-- ---------------------------------------------------------------------------
-- Table rase des privileges par defaut, puis attribution explicite.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Referentiels : lecture ouverte, ecriture reservee a l'exploitation.
-- ---------------------------------------------------------------------------
grant select on public.categorie to anon, authenticated;
grant select on public.zone to anon, authenticated;

create policy categorie_lecture on public.categorie
  for select to anon, authenticated using (actif);

create policy zone_lecture on public.zone
  for select to anon, authenticated using (actif);

-- `parametre` porte les seuils de fraicheur et les quotas : aucune raison de
-- l'exposer, aucune politique n'est creee, donc rien n'est lisible hors service.

-- ---------------------------------------------------------------------------
-- Profil : chacun le sien. `est_admin` n'est pas modifiable par son porteur.
-- ---------------------------------------------------------------------------
grant select on public.profil to authenticated;
grant update (nom_affichage) on public.profil to authenticated;

create policy profil_lecture on public.profil
  for select to authenticated
  using (id = auth.uid() or public.est_admin());

create policy profil_maj on public.profil
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- Ambassadeur : lecture de sa propre affectation. La creation et la
-- desactivation relevent de l'exploitation, pas de l'API publique.
-- ---------------------------------------------------------------------------
grant select on public.ambassadeur to authenticated;

create policy ambassadeur_lecture on public.ambassadeur
  for select to authenticated
  using (id = auth.uid() or public.est_admin());

-- ---------------------------------------------------------------------------
-- Marchand.
--
-- Le role anonyme n'obtient aucun privilege sur cette table : sans GRANT,
-- aucune politique RLS ne peut le rattraper. C'est la garantie que le numero
-- WhatsApp ne fuit pas, meme en cas d'erreur de politique.
--
-- Les colonnes modifiables sont enumerees : `statut` et `derniere_confirmation`
-- en sont exclus, sinon une fiche pourrait s'auto-declarer fraiche et
-- contourner la boucle de fraicheur. Ces deux champs ne bougent que par
-- confirmation ou par les fonctions dediees.
-- ---------------------------------------------------------------------------
grant select on public.marchand to authenticated;
grant insert (
  proprietaire_id, cree_par_ambassadeur, nom_enseigne, categorie_slug, description,
  telephone_whatsapp, repere, localisation, localisation_ajustee, precision_m,
  horaires, cle_idempotence
) on public.marchand to authenticated;
grant update (
  nom_enseigne, categorie_slug, description, telephone_whatsapp, repere,
  localisation, localisation_ajustee, precision_m, horaires
) on public.marchand to authenticated;

create policy marchand_lecture_proprietaire on public.marchand
  for select to authenticated
  using (proprietaire_id = auth.uid());

create policy marchand_lecture_ambassadeur on public.marchand
  for select to authenticated
  using (cree_par_ambassadeur = auth.uid());

create policy marchand_lecture_admin on public.marchand
  for select to authenticated
  using (public.est_admin());

-- Un marchand cree sa propre fiche.
create policy marchand_creation_proprietaire on public.marchand
  for insert to authenticated
  with check (proprietaire_id = auth.uid() and cree_par_ambassadeur is null);

-- Un ambassadeur actif saisit pour le compte d'un tiers, en se designant.
create policy marchand_creation_ambassadeur on public.marchand
  for insert to authenticated
  with check (
    public.est_ambassadeur_actif()
    and cree_par_ambassadeur = auth.uid()
    and proprietaire_id is null
  );

create policy marchand_maj_proprietaire on public.marchand
  for update to authenticated
  using (proprietaire_id = auth.uid())
  with check (proprietaire_id = auth.uid());

-- L'ambassadeur ne peut corriger sa saisie que tant que la fiche n'a pas ete
-- revendiquee par le marchand. Une fois revendiquee, elle lui echappe.
create policy marchand_maj_ambassadeur on public.marchand
  for update to authenticated
  using (cree_par_ambassadeur = auth.uid() and proprietaire_id is null)
  with check (cree_par_ambassadeur = auth.uid() and proprietaire_id is null);

create policy marchand_maj_admin on public.marchand
  for update to authenticated
  using (public.est_admin())
  with check (public.est_admin());

-- Aucune politique DELETE : le droit de retrait (CDC 9.2) s'exerce par
-- `retirer_ma_fiche`, qui conserve la trace sans exposer la fiche.

-- ---------------------------------------------------------------------------
-- Vue publique.
--
-- La vue n'est pas en `security_invoker` : elle s'execute avec les droits de
-- son proprietaire et court-circuite donc RLS sur `marchand`. C'est voulu et
-- c'est le seul chemin de lecture anonyme. Son filtre `statut in
-- ('active','a_confirmer')` et sa projection sans telephone constituent la
-- frontiere de securite. Toute modification de cette vue doit etre relue
-- comme une modification de politique de securite.
-- ---------------------------------------------------------------------------
grant select on public.marchand_public to anon, authenticated;

create view public.photo_marchand_public as
select ph.id, ph.marchand_id, ph.chemin, ph.ordre, ph.largeur, ph.hauteur
from public.photo_marchand ph
join public.marchand m on m.id = ph.marchand_id
where ph.moderee and m.statut in ('active', 'a_confirmer');

revoke all on public.photo_marchand_public from anon, authenticated;
grant select on public.photo_marchand_public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Photos : gestion par le proprietaire de la fiche ou par l'ambassadeur qui
-- l'a saisie.
-- ---------------------------------------------------------------------------
grant select, insert, delete on public.photo_marchand to authenticated;

create policy photo_gestion on public.photo_marchand
  for all to authenticated
  using (
    exists (
      select 1 from public.marchand m
      where m.id = photo_marchand.marchand_id
        and (m.proprietaire_id = auth.uid()
             or (m.cree_par_ambassadeur = auth.uid() and m.proprietaire_id is null)
             or public.est_admin())
    )
  )
  with check (
    exists (
      select 1 from public.marchand m
      where m.id = photo_marchand.marchand_id
        and (m.proprietaire_id = auth.uid()
             or (m.cree_par_ambassadeur = auth.uid() and m.proprietaire_id is null)
             or public.est_admin())
    )
  );

-- ---------------------------------------------------------------------------
-- Confirmations : un marchand ou un ambassadeur peut attester de l'activite.
-- La confirmation par relance passe par la fonction edge, en role de service.
-- ---------------------------------------------------------------------------
grant select, insert on public.confirmation to authenticated;

create policy confirmation_lecture on public.confirmation
  for select to authenticated
  using (
    exists (
      select 1 from public.marchand m
      where m.id = confirmation.marchand_id
        and (m.proprietaire_id = auth.uid() or m.cree_par_ambassadeur = auth.uid())
    )
    or public.est_admin()
  );

create policy confirmation_creation on public.confirmation
  for insert to authenticated
  with check (
    auteur_id = auth.uid()
    and source in ('marchand', 'ambassadeur')
    and exists (
      select 1 from public.marchand m
      where m.id = confirmation.marchand_id
        and (m.proprietaire_id = auth.uid() or m.cree_par_ambassadeur = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Journal d'usage : lecture par le marchand concerne, ecriture reservee au
-- role de service. C'est ce qui rend le tableau de bord credible et la
-- commission a J+30 non fraudable.
-- ---------------------------------------------------------------------------
grant select on public.evenement_usage to authenticated;

create policy evenement_lecture_marchand on public.evenement_usage
  for select to authenticated
  using (
    marchand_id is not null
    and exists (
      select 1 from public.marchand m
      where m.id = evenement_usage.marchand_id
        and m.proprietaire_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Commissions : un ambassadeur voit les siennes, sans pouvoir les modifier.
-- ---------------------------------------------------------------------------
grant select on public.commission to authenticated;

create policy commission_lecture on public.commission
  for select to authenticated
  using (ambassadeur_id = auth.uid() or public.est_admin());

-- `signalement`, `jeton_confirmation` et `limitation_appel` ne recoivent aucun
-- privilege : ils ne sont manipules que par les fonctions edge.

-- ---------------------------------------------------------------------------
-- Fonctions exposees par l'API.
-- ---------------------------------------------------------------------------
grant execute on function public.sans_accent(text) to anon, authenticated;
grant execute on function public.rechercher_marchands(
  double precision, double precision, integer, text, text, integer, integer
) to anon, authenticated;
grant execute on function public.compter_par_categorie(
  double precision, double precision, integer
) to anon, authenticated;
grant execute on function public.statistiques_marchand(uuid, integer) to authenticated;

-- Les fonctions d'exploitation restent hors de portee de l'API : transitions de
-- fraicheur, relances, commissions, quotas. Seul le role de service les appelle.

-- ---------------------------------------------------------------------------
-- Actions explicites du marchand sur le statut de sa fiche.
-- Le statut n'etant pas une colonne modifiable, il passe par ces deux points
-- d'entree, qui tracent l'intention.
-- ---------------------------------------------------------------------------
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
  set statut = 'active',
      derniere_confirmation = now()
  where m.id = p_marchand_id
    and m.statut in ('brouillon', 'a_confirmer', 'en_veille', 'retiree')
    and (m.proprietaire_id = auth.uid()
         or (m.cree_par_ambassadeur = auth.uid() and m.proprietaire_id is null))
  returning m.statut into v_statut;

  if v_statut is null then
    raise exception 'Fiche introuvable ou non modifiable' using errcode = 'insufficient_privilege';
  end if;

  return v_statut;
end;
$$;

-- Droit de retrait (CDC 9.2) : immediat, sans intervention humaine, sans delai.
create or replace function public.retirer_ma_fiche(p_marchand_id uuid)
returns public.statut_marchand
language plpgsql
security definer
set search_path = public
as $$
declare
  v_statut public.statut_marchand;
begin
  update public.marchand m
  set statut = 'retiree'
  where m.id = p_marchand_id
    and m.proprietaire_id = auth.uid()
  returning m.statut into v_statut;

  if v_statut is null then
    raise exception 'Fiche introuvable ou non modifiable' using errcode = 'insufficient_privilege';
  end if;

  return v_statut;
end;
$$;

-- Revendication d'une fiche saisie par un ambassadeur : le marchand s'est
-- authentifie au meme numero WhatsApp que celui porte par la fiche.
create or replace function public.revendiquer_ma_fiche(p_marchand_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_telephone text;
  v_id        uuid;
begin
  select phone into v_telephone from auth.users where id = auth.uid();

  if v_telephone is null then
    raise exception 'Compte sans numero de telephone verifie' using errcode = 'insufficient_privilege';
  end if;

  update public.marchand m
  set proprietaire_id = auth.uid()
  where m.id = p_marchand_id
    and m.proprietaire_id is null
    -- auth.users.phone est stocke sans le signe plus.
    and regexp_replace(m.telephone_whatsapp, '^\+', '') = v_telephone
  returning m.id into v_id;

  if v_id is null then
    raise exception 'Aucune fiche revendicable pour ce numero' using errcode = 'insufficient_privilege';
  end if;

  insert into public.confirmation (marchand_id, source, auteur_id)
  values (v_id, 'marchand', auth.uid());

  return v_id;
end;
$$;

revoke execute on function public.publier_ma_fiche(uuid) from public, anon;
revoke execute on function public.retirer_ma_fiche(uuid) from public, anon;
revoke execute on function public.revendiquer_ma_fiche(uuid) from public, anon;

grant execute on function public.publier_ma_fiche(uuid) to authenticated;
grant execute on function public.retirer_ma_fiche(uuid) to authenticated;
grant execute on function public.revendiquer_ma_fiche(uuid) to authenticated;
