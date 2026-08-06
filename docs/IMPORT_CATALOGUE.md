# Importer le premier catalogue Koté

Le fichier CSV doit reprendre exactement les colonnes du modèle `catalogue-modele.csv` : `nom`, `categorie`, `telephone`, `repere`, `latitude`, `longitude`, `description`.

- Les catégories doivent déjà exister dans Supabase.
- Les coordonnées doivent être au Togo.
- Le téléphone doit être au format international, par exemple `+22890000000`.
- Un lot est limité à 100 lignes.
- Chaque fiche importée arrive en **brouillon** : un administrateur ou ambassadeur la vérifie avant publication.

L’endpoint `importer-catalogue` est réservé à un profil avec `est_admin = true`. Il accepte `{ "lignes": [...] }` après conversion du CSV par l’interface d’administration ou un outil interne.
