-- ---------------------------------------------------------------------------
-- Stockage des photos de fiche.
--
-- Bucket public en lecture : une image de fiche n'est pas une donnee sensible,
-- et l'URL signee ajouterait un aller-retour reseau par vignette. Sur une
-- connexion mobile prepayee, cet aller-retour se paie (CDC 2.4).
--
-- Convention de chemin : {marchand_id}/{taille}/{fichier}.webp
-- Les trois tailles sont generees a l'ingestion (CDC 8).
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos-marchands',
  'photos-marchands',
  true,
  5242880,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

-- Lecture ouverte.
create policy "photos lecture publique"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'photos-marchands');

-- Ecriture : uniquement dans le dossier d'une fiche que l'on gere. Le premier
-- segment du chemin doit etre l'identifiant de cette fiche.
create policy "photos ecriture proprietaire"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'photos-marchands'
    and array_length(storage.foldername(name), 1) >= 1
    and exists (
      select 1 from public.marchand m
      where m.id::text = (storage.foldername(name))[1]
        and (m.proprietaire_id = auth.uid()
             or (m.cree_par_ambassadeur = auth.uid() and m.proprietaire_id is null)
             or public.est_admin())
    )
  );

create policy "photos suppression proprietaire"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'photos-marchands'
    and array_length(storage.foldername(name), 1) >= 1
    and exists (
      select 1 from public.marchand m
      where m.id::text = (storage.foldername(name))[1]
        and (m.proprietaire_id = auth.uid()
             or (m.cree_par_ambassadeur = auth.uid() and m.proprietaire_id is null)
             or public.est_admin())
    )
  );
