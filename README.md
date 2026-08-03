# Koté — backend

Backend d'une plateforme de visibilité des commerçants et artisans au Togo.
**Koté** — « juste à côté » : la promesse tient dans le nom, le service est à
côté de chez vous. Le nom ne désigne aucun métier, ce qui préserve l'étendue de
l'offre côté client, et ne porte aucune connotation administrative ni fiscale.

Le cahier des charges fait foi : [docs/cahier-des-charges.md](docs/cahier-des-charges.md).
Le prompt de maquette : [docs/prompt-pencil.md](docs/prompt-pencil.md).

Ce dépôt ne contient que le backend. L'interface viendra ensuite, sur la base
d'une API déjà stable et interrogeable.

---

## Prérequis

- Docker Desktop démarré
- Node 18 ou supérieur

## Démarrer

```bash
npm install
```

```bash
npx supabase start
```

Le premier démarrage télécharge les images Docker de la pile Supabase, ce qui
prend plusieurs minutes. `npx supabase status` affiche ensuite les URL et les
clés locales.

```bash
npx supabase db reset
```

Rejoue toutes les migrations puis `seed.sql`, qui crée un échantillon de
quartier pilote (Hédzranawoé) pour exercer la recherche de proximité.

## Tester

```bash
npx supabase test db
```

Trois suites pgTAP :

| Fichier | Ce qu'il protège |
| --- | --- |
| `supabase/tests/010_recherche_test.sql` | Rayon, tri par distance, filtre de catégorie, recherche sans accent |
| `supabase/tests/020_securite_test.sql` | Privilèges effectifs : ce qu'un tiers peut atteindre sans compte |
| `supabase/tests/030_fraicheur_test.sql` | Cycle de vie des fiches, relances, quotas, garde-fous |

Puis la vérification de bout en bout, qui interroge l'API réelle avec la clé
anonyme et vérifie qu'aucun numéro de téléphone n'en sort :

```bash
node scripts/verifier-api.mjs
```

La clé anonyme est donnée par `npx supabase status`, à passer via la variable
d'environnement `CLE_ANON`.

## Fonctions edge

```bash
npx supabase functions serve --no-verify-jwt
```

Copier `.env.example` en `supabase/.env.local` et renseigner les variables.

---

## Ce que fait ce backend, et pourquoi

L'architecture suit trois contraintes du contexte togolais, détaillées en
section 2 du cahier des charges. Elles expliquent la plupart des décisions
techniques.

### 1. La confiance du marchand est la condition d'existence du produit

L'administration fiscale élargit son assiette vers les micro-activités. Un
marchand qui perçoit l'application comme un registre géolocalisé de son
activité ne s'inscrit pas, et la première rumeur de contrôle vide la base.

Conséquences dans le code :

- **Le numéro WhatsApp ne sort jamais en masse.** Le rôle anonyme n'a aucun
  privilège sur la table `marchand`. La lecture publique passe par la vue
  `marchand_public` et par `rechercher_marchands`, qui ne projettent pas cette
  colonne. La mise en relation se fait à l'unité, par la fonction edge
  `contact`, après journalisation et contrôle de débit.
- **Minimisation stricte.** Aucune colonne de chiffre d'affaires, de stock, de
  revenu ni de pièce d'identité. Cette absence est délibérée.
- **Droit de retrait immédiat**, par `retirer_ma_fiche`, sans intervention
  humaine ni délai.
- La position d'un client n'est jamais stockée au mètre près : elle est
  arrondie à environ 100 m avant insertion dans le journal d'usage.

### 2. La fraîcheur des données décide de la survie du produit

Dans l'informel, un marchand déménage, ferme trois mois, change d'activité.
Une carte fausse ne se rattrape pas : le client qui se déplace pour rien ne
revient pas.

Le cycle `active` → `a_confirmer` (90 j) → `en_veille` (180 j) est implémenté
dans `appliquer_transitions_fraicheur`, avec trois sources de remise à zéro :
action du marchand, réponse en un clic à la relance WhatsApp (`confirmer`),
passage d'un ambassadeur. Les seuils sont dans la table `parametre`, ajustables
sans migration.

`statut` et `derniere_confirmation` ne sont pas des colonnes modifiables par le
marchand — sinon une fiche s'auto-déclarerait fraîche et contournerait la
boucle.

### 3. La donnée mobile est chère et le réseau peut être coupé

- `max_rows` de l'API est plafonné, le rayon de recherche aussi.
- Latitude et longitude sont projetées en nombres, pas en géométrie : pas de
  décodeur WKB embarqué, charge utile plus petite.
- `compter_par_categorie` renvoie les pastilles des six filtres en une requête
  au lieu de six.
- Les événements d'usage remontent par lots, ce qui fonctionne aussi bien après
  une période hors ligne — cas nominal, pas cas d'erreur.
- Les inscriptions d'ambassadeur portent une `cle_idempotence` générée côté
  client : rejouer une synchronisation ne crée pas de doublon.

### 4. Le coût d'IA doit rester en centimes

Le revenu attendu par marchand se compte en centaines de FCFA par mois. La
fonction `ia-description` applique donc, dans cet ordre : cache par
(catégorie, mots-clés), quota journalier par fiche, puis seulement appel au
fournisseur. Sans clé configurée, elle répond 503 et le marchand publie quand
même sa fiche.

---

## Structure

```
docs/cahier-des-charges.md        Le document de référence
supabase/config.toml              Configuration de la pile locale
supabase/migrations/              Schéma, sécurité, logique métier
supabase/functions/               Fonctions edge (Deno)
supabase/tests/                   Suites pgTAP
supabase/seed.sql                 Échantillon de quartier pilote
scripts/verifier-api.mjs          Vérification de l'exposition publique
```

### Migrations

| Fichier | Contenu |
| --- | --- |
| `..000100_extensions` | PostGIS, pg_trgm, unaccent, pgcrypto, utilitaires |
| `..000200_types` | Énumérations métier |
| `..000300_referentiel` | Catégories et zones de Lomé |
| `..000400_acteurs` | Profils, ambassadeurs, fonctions d'aide RLS |
| `..000500_marchand` | Table centrale, index spatial et trigrammes, photos |
| `..000600_fraicheur` | Confirmations, jetons, signalements, transitions |
| `..000700_usage` | Journal d'usage, commissions, limitation d'appels |
| `..000800_recherche` | Vue publique et recherche de proximité |
| `..000900_rls` | Privilèges et politiques — à relire comme du code de sécurité |
| `..001000_stockage` | Bucket photos et politiques |
| `..001100_ia` | Cache, quotas et traçabilité de l'assistance à la rédaction |

### Fonctions edge

| Fonction | Accès | Rôle |
| --- | --- | --- |
| `contact` | public | Journalise puis renvoie le lien WhatsApp. Point d'entrée de l'indicateur central du projet |
| `evenement` | public | Journal d'usage par lots |
| `signalement` | public | « fermé », « a déménagé », « informations fausses » |
| `confirmer` | public | Confirmation en un clic depuis la relance WhatsApp |
| `ia-description` | authentifié | Trois propositions de description |
| `entretien` | secret partagé | Tâche quotidienne : fraîcheur, commissions, purge, relances |

---

## Ce qui n'est pas fait, et pourquoi

- **Envoi effectif des relances WhatsApp.** `entretien` produit la liste et les
  jetons ; le connecteur d'envoi attend l'arbitrage du canal (cahier des
  charges, section 14, décision 3).
- **Redimensionnement des photos à l'ingestion.** Le bucket et la convention de
  chemin `{marchand_id}/{taille}/` sont posés ; la génération des trois tailles
  reste à brancher.
- **Amélioration des photos et générateur de visuels WhatsApp.** Reportés en
  phase 4 : confort, pas cœur de valeur, et coûteux en 3G.
- **Paiements.** Hors périmètre v1 : l'émission de monnaie électronique et le
  transfert de fonds relèvent d'un agrément BCEAO.
- **Formalité de protection des données.** À accomplir auprès de l'autorité
  togolaise **avant toute mise en production** : le traitement combine numéro
  de téléphone, géolocalisation et photographies.
