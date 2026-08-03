# Cahier des charges — Plateforme de visibilité des commerçants et artisans (Togo)

Nom de code du dépôt : **Projet Marché Togo**.
Nom commercial retenu : **Koté** — « juste à côté ». Arbitré le 2026-08-03, voir section 14.
Version : 0.2 — 2026-08-03
Statut : document de cadrage, à valider avant tout développement.

> Avertissement sur les chiffres : les données de contexte ci-dessous sont des ordres de
> grandeur issus de la connaissance générale du pays. Toute donnée destinée à un document
> public, un dossier investisseur ou une demande de subvention doit être re-sourcée
> (INSEED Togo, BCEAO, UEMOA, ARCEP Togo, Banque mondiale). Les points marqués
> `[à vérifier]` sont ceux qui changent une décision produit et doivent être confirmés
> en priorité.

---

## 1. Résumé exécutif

### 1.1 Le problème

Au Togo, l'écrasante majorité de l'activité économique se fait hors des circuits formels :
tailleurs, mécaniciens, coiffeuses, vendeuses de marché, restauration de rue, réparateurs.
Ces acteurs n'ont ni vitrine, ni adresse exploitable, ni compétence marketing. Le client
qui cherche un service précis à proximité n'a qu'un seul outil : le bouche-à-oreille de
son quartier. Résultat : des marchands sous-employés à 500 m de clients qui ne les
trouvent pas.

### 1.2 La proposition

Une application mobile qui rend visible et joignable, en deux gestes, le commerçant ou
l'artisan pertinent le plus proche — avec la carte comme vue de résultats et WhatsApp
comme canal de mise en relation. Côté marchand, un outil d'assistance à la création de
contenu (description, photos, visuels de statut WhatsApp) qui compense l'absence de
compétence marketing.

### 1.3 Le principe directeur

**On ne vend pas la formalisation, on vend des clients.**
La « formalisation de l'informel » est l'effet recherché à l'échelle macro-économique.
Ce n'est ni le discours commercial, ni le vocabulaire de l'interface, ni la promesse faite
au marchand. Voir section 3.1 — c'est le point le plus structurant du projet.

---

## 2. Contexte pays : ce qui contraint réellement le produit

Cette section n'est pas décorative. Chaque sous-partie se termine par les conséquences
concrètes sur le produit ou l'architecture.

### 2.1 Contexte macro-économique

- Population : environ 9 millions d'habitants, dont approximativement un quart dans le
  Grand Lomé. Le marché adressable réel du MVP, c'est Lomé — pas le Togo.
- PIB par habitant de l'ordre de 1 000 USD. Le revenu disponible mensuel d'un artisan
  de quartier se compte en dizaines de milliers de FCFA, pas en centaines.
- Emploi informel : de l'ordre de 80 à 90 % de l'emploi total, part majoritaire de la
  valeur ajoutée hors administration. `[à vérifier]` C'est à la fois la taille du marché
  et la difficulté : il n'existe aucun registre exploitable de ces acteurs. La base de
  données devra être construite à la main, sur le terrain.
- Monnaie : franc CFA (XOF), parité fixe avec l'euro (1 EUR = 655,957 XOF). Conséquence
  directe : pas de risque de change sur les coûts libellés en euros, mais exposition
  réelle sur les coûts en dollars (API d'IA, cloud américain).
- Économie de commerce et de réexport, structurée par le port en eau profonde de Lomé,
  qui dessert le Sahel enclavé. Le commerce de détail et la revente sont donc des
  catégories massives, au-delà des seuls services artisanaux.
- Le commerce de marché est historiquement dominé par les femmes (héritage des
  « Nana Benz » du Grand Marché). Toute conception produit qui ignore cette réalité
  cible la mauvaise personne.

**Conséquences produit**
- Le prix acceptable pour un marchand se situe dans l'ordre de grandeur de quelques
  centaines à un ou deux milliers de FCFA par mois (soit environ 0,80 € à 3 €). Le coût
  technique complet par marchand actif doit rester très inférieur à ce montant, IA comprise.
- Concevoir l'interface marchand pour une femme commerçante de 35-55 ans, pas pour un
  jeune homme urbain équipé.
- Le MVP est un produit lomé-centré. « L'Afrique de l'Ouest » n'est pas un objectif de
  la version 1.

### 2.2 Contexte politique et sécuritaire

- Stabilité de long terme du pouvoir exécutif, avec une réforme constitutionnelle en 2024
  faisant passer le pays à un régime parlementaire. Le paysage institutionnel a bougé
  récemment ; l'interlocuteur public pertinent pour un partenariat peut changer de nom
  ou de périmètre. `[à vérifier avant toute démarche institutionnelle]`
- Des épisodes de tension urbaine et de manifestations ont eu lieu à Lomé, y compris
  récemment. Historiquement, ces épisodes se sont accompagnés de restrictions ou de
  coupures d'accès à internet et aux réseaux sociaux.
- Situation sécuritaire dégradée dans la région des Savanes (nord), exposée aux
  incursions armées depuis le Burkina Faso, avec un régime d'exception prolongé.
- Recomposition régionale : le retrait du Mali, du Burkina Faso et du Niger de la CEDEAO
  fragmente l'espace ouest-africain. Le Togo reste membre de la CEDEAO et de l'UEMOA,
  mais l'hypothèse d'un marché régional homogène pour une expansion rapide n'est plus
  acquise.

**Conséquences produit et architecture**
- **Résilience aux coupures réseau : exigence de conception, pas d'optimisation.**
  L'application doit rester utile hors ligne (fiches consultées récemment, carte du
  quartier en cache, brouillons d'inscription stockés localement et synchronisés plus tard).
  Un produit qui ne fonctionne que connecté est inutilisable les jours où il serait le
  plus utile.
- **Neutralité politique absolue du produit.** Aucune fonction de diffusion de masse,
  aucun fil d'actualité, aucun espace de commentaire libre non modéré. Une plateforme
  perçue comme un canal d'organisation collective devient une cible réglementaire.
- Expansion géographique : Lomé, puis axe côtier et villes secondaires du sud
  (Kpalimé, Atakpamé, Tsévié). Le nord n'est pas un objectif de court terme.

### 2.3 Contexte fiscal et réglementaire — le point critique

C'est ici que se joue l'adoption ou l'échec du produit.

- L'administration fiscale (Office Togolais des Recettes) mène une politique
  d'élargissement de l'assiette vers les petites activités, avec des régimes simplifiés
  de type taxe unique pour les micro-entreprises. `[à vérifier : dénomination exacte,
  seuils et barèmes en vigueur]`
- Le droit OHADA, applicable au Togo, prévoit un **statut de l'entreprenant** :
  déclaratif, sans capital, à comptabilité allégée. C'est la rampe d'accès légale
  naturelle pour un acteur de l'informel. `[à vérifier : modalités de déclaration
  auprès du greffe / RCCM au Togo]`
- Protection des données : le Togo dispose d'une loi sur la protection des données à
  caractère personnel et d'une autorité de contrôle dédiée. Un traitement combinant
  **numéro de téléphone + géolocalisation précise + photographies** est un traitement de
  données personnelles à part entière, soumis à formalité préalable.
  `[à vérifier : régime applicable — déclaration ou autorisation, et délais]`
- Services de paiement : l'émission de monnaie électronique et le transfert de fonds
  relèvent de l'agrément de la banque centrale régionale (BCEAO). Une plateforme ne
  peut pas encaisser et redistribuer des fonds pour le compte de tiers sans agrément ou
  sans passer par un établissement agréé.

**Conséquences produit — à traiter comme des règles non négociables**

1. **Le mot « formalisation » ne figure nulle part dans l'interface, ni dans le discours
   des ambassadeurs.** Le marchand achète de la visibilité et des clients. Rien d'autre.
2. **Engagement public de non-transmission des données individuelles à l'administration
   fiscale**, écrit dans les CGU et répété oralement à l'inscription. C'est la condition
   de la confiance. Sans elle, la première rumeur de contrôle vide la base.
3. **Minimisation des données** : ne jamais collecter chiffre d'affaires, stock, revenus,
   ni pièce d'identité. On collecte ce qui sert à être trouvé et contacté, point.
4. **Aucun encaissement dans le MVP.** Le paiement d'un éventuel abonnement passe par
   un opérateur de mobile money agréé, en flux direct marchand-vers-plateforme. Les
   paiements de la diaspora vers des prestataires locaux sont exclus du périmètre v1.
5. Si un partenariat institutionnel est envisagé plus tard (chambre de commerce,
   agence de promotion), il doit être **opt-in explicite du marchand**, jamais un
   déversement de base.

### 2.4 Contexte technique et infrastructurel

- Pénétration mobile élevée, mais parc majoritairement composé de smartphones Android
  d'entrée de gamme : peu de RAM, peu de stockage, écrans modestes, versions d'Android
  anciennes.
- Connexion majoritairement mobile, en prépayé, achetée par forfaits data de petite
  taille. Le coût de la donnée est un frein d'usage direct et conscient : un utilisateur
  ferme une application qui « mange le crédit ».
- Réseau : 4G disponible à Lomé, dégradée ou 3G en périphérie et dans les marchés denses.
- Deux acteurs mobile money dominants, adossés aux deux opérateurs télécoms nationaux.
  `[à vérifier : dénominations commerciales actuelles, qui ont changé récemment]`
- Accès à l'électricité correct à Lomé mais avec des coupures. L'autonomie de batterie
  est une ressource rare : une application qui garde le GPS actif en continu sera
  désinstallée.
- Langues : le français est la langue officielle et celle de l'écrit. À Lomé, la langue
  véhiculaire orale est le mina (gen) ; l'éwé et le kabyè sont les langues nationales.
  Le taux d'alphabétisation adulte est loin d'être universel, avec un écart défavorable
  aux femmes — c'est-à-dire précisément la cible marchande principale.
- Adressage : il n'existe pas d'adressage de rue exploitable à Lomé. On se repère par
  points de repère (« en face de la pharmacie X », « après le carrefour Y »). Les données
  cartographiques ouvertes couvrent les axes principaux mais très mal les intérieurs de
  quartier.

**Conséquences produit et architecture**
- Budget de données strict et mesuré : cible d'écran de résultats sous **150 Ko**,
  images servies en WebP/AVIF en trois tailles, tuiles cartographiques du Grand Lomé
  mises en cache localement, aucune vidéo, aucune police web distante.
- Le GPS ne s'active qu'à la demande explicite, jamais en tâche de fond.
- **L'itinéraire ne peut pas reposer sur une adresse.** Chaque fiche porte un champ
  « repère » en texte libre, obligatoire, et le partage de position WhatsApp est le
  mécanisme de guidage final.
- Interface marchande : gros boutons, icônes, très peu de texte, aucune saisie longue
  obligatoire. Prévoir dès la conception l'ajout d'un guidage audio en mina, sans le
  livrer forcément en v1.
- Taille de l'application installée : objectif sous 30 Mo. Le stockage est une contrainte
  réelle de désinstallation.

---

## 3. Positionnement et proposition de valeur

### 3.1 Le positionnement, en une phrase

Pour le marchand : *« Tes clients te cherchent. Ici, ils te trouvent. »*
Pour le client : *« Trouve tout de suite qui peut le faire, près de toi. »*

Ce qui n'est jamais dit au marchand : « aide-toi à te formaliser », « rejoins l'économie
formelle », « déclare ton activité ». Ce vocabulaire déclenche une association immédiate
avec le contrôle fiscal et fait échouer l'inscription.

### 3.2 Ce que la plateforme est, et n'est pas

| Elle est | Elle n'est pas |
| --- | --- |
| Un annuaire géolocalisé de proximité | Une marketplace avec paiement en ligne |
| Un déclencheur de conversation WhatsApp | Un canal de messagerie concurrent de WhatsApp |
| Un assistant de mise en valeur pour le marchand | Un outil de gestion ou de comptabilité |
| Un registre volontaire et privé | Un fichier transmissible à un tiers |

### 3.3 Concurrence et écosystème existant

Le concurrent réel n'est pas une autre application d'annuaire : c'est **WhatsApp lui-même**,
couplé au bouche-à-oreille et aux groupes de quartier Facebook. Les catalogues WhatsApp
Business existent déjà et sont gratuits. La valeur ajoutée doit donc porter exclusivement
sur ce que WhatsApp ne sait pas faire : **la découverte par proximité et par besoin**.

Il existe par ailleurs au moins un acteur local de type super-app, né à Lomé et déjà
implanté sur la mobilité et la livraison, disposant d'une base d'utilisateurs et d'une
brique paiement. `[à vérifier : périmètre actuel de ses services]` Il constitue
simultanément le concurrent le plus crédible sur une extension annuaire, et le partenaire
de distribution le plus évident. Ce point doit être tranché tôt : concurrencer ou
s'intégrer.

---

## 4. Cibles utilisateurs

### 4.1 Marchande / artisan — « l'offre »

Profil type : femme, 30-55 ans, couturière ou revendeuse installée dans un quartier ou
un marché, smartphone Android d'entrée de gamme, utilisatrice quotidienne de WhatsApp,
faiblement à l'aise avec l'écrit administratif, méfiante vis-à-vis de toute collecte
d'information sur son activité.
Motivation : plus de clients, sans effort et sans risque.
Frein principal : la peur que l'inscription serve à autre chose.

### 4.2 Client — « la demande »

Profil type : habitant du Grand Lomé, 20-45 ans, cherchant un service précis maintenant
(réparation, couture, repas, coiffure), sensible au coût de la data.
Motivation : trouver vite, près, et pouvoir juger de la fiabilité avant de se déplacer.
Frein principal : une base d'annonces obsolète, qui fait perdre un déplacement.

### 4.3 Ambassadeur — « l'acquisition »

Profil type : jeune du quartier, à l'aise avec le smartphone, rémunéré à la performance
pour inscrire les marchands sur le terrain.
C'est le vrai moteur d'acquisition côté offre, et le principal vecteur de fraude
potentielle (inscriptions fictives). Voir sections 7.3 et 9.3.

---

## 5. Périmètre du MVP

### 5.1 Dans le périmètre

**Espace client**
- Écran d'accueil : recherche + catégories. **Ce n'est pas la carte.** Un utilisateur qui
  a une crevaison ne parcourt pas une carte, il formule un besoin. La carte est la vue de
  résultats, pas la porte d'entrée — et elle coûte cher en données au chargement.
- Recherche textuelle en langage naturel, avec normalisation des formulations locales.
- Vue carte des résultats, avec regroupement des points (clustering) et rayon ajustable.
- Filtres par catégorie (icônes : couture, mécanique et deux-roues, alimentation,
  beauté et coiffure, réparation et bricolage, commerce général).
- Fiche marchand : nom, catégorie, distance, repère, photos, horaires indicatifs,
  indicateur de fraîcheur de la fiche.
- Bouton « Contacter sur WhatsApp » avec message pré-rempli.
- Bouton « Itinéraire » (carte + repère textuel + partage de position).
- Signalement : « fermé », « a déménagé », « informations fausses ».

**Espace marchand**
- Inscription par numéro de téléphone avec code à usage unique.
- Fiche en trois écrans maximum, aucune saisie libre obligatoire au-delà du repère.
- Ajustement manuel du point sur la carte, obligatoire à l'inscription : le GPS est
  imprécis dans les marchés denses, le marchand doit pouvoir corriger.
- Assistance IA : génération de la description à partir de trois mots-clés.
- Tableau de bord minimal : vues de la fiche, clics WhatsApp, sur 7 et 30 jours.
- Confirmation périodique d'activité (« êtes-vous toujours ici ? »).

**Espace ambassadeur**
- Inscription d'un marchand en mode hors ligne, synchronisée ensuite.
- Suivi de ses inscriptions et de leur statut de validation.

### 5.2 Hors périmètre du MVP — et pourquoi

| Fonction | Motif du report |
| --- | --- |
| Amélioration et détourage des photos par IA | Confort, pas cœur de valeur. Coûteux, lent en 3G. Phase 2. |
| Générateur de visuels de statut WhatsApp | Excellent levier viral, mais après validation de la demande. Phase 2. |
| Paiements de la diaspora | Activité réglementée (agrément BCEAO). Hors sujet en v1. |
| Notes et avis clients | Ingérable en modération avec une petite équipe, et vecteur de conflit de quartier. |
| Version iOS | Le parc est massivement Android. Android d'abord. |
| Guidage vocal en mina | À prévoir dans l'architecture, à livrer en phase 2. |
| Toute expansion hors du Grand Lomé | Densité avant surface. |

---

## 6. Le point qui décide de la survie du produit : la fraîcheur des données

Dans l'informel, un marchand déménage, ferme trois mois, change d'activité. Sans boucle
de rafraîchissement, une base construite en six mois est fausse à hauteur de 20 à 30 %
l'année suivante — et une carte fausse ne se rattrape pas : l'utilisateur qui se déplace
pour rien ne revient pas.

**C'est une fonctionnalité prioritaire du MVP, avant le studio IA.**

Mécanismes à implémenter dès la v1 :
- Champ `derniere_confirmation` sur chaque fiche, alimenté par trois sources :
  connexion du marchand, réponse à une relance, validation par un ambassadeur.
- Statut de fiche : `active` → `a_confirmer` (au-delà de 90 jours) → `en_veille`
  (au-delà de 180 jours, retirée des résultats par défaut).
- Relance automatique par message WhatsApp à J+75, avec réponse en un clic.
- Signalement client, avec seuil de déclenchement d'une revérification terrain.
- Indicateur de fraîcheur visible sur la fiche côté client (« confirmé il y a 12 jours »).
  C'est un signal de confiance autant qu'un outil de nettoyage.

---

## 7. Modèle économique

Absent du cadrage initial, c'est pourtant la question qui conditionne le recrutement
d'ambassadeurs (rémunérés sur quoi ?) et la viabilité.

### 7.1 Contrainte de prix

Le consentement à payer d'un artisan de quartier se situe dans un ordre de grandeur de
quelques centaines de FCFA par mois. Un abonnement à 1 000 FCFA/mois représente environ
1,52 €. Le coût technique complet par marchand actif (hébergement, cartographie, IA,
SMS) doit rester **très inférieur à ce montant** — ce qui exclut tout appel d'IA
générative fréquent et non mis en cache.

### 7.2 Pistes de monétisation, par ordre de réalisme

1. **Mise en avant payante à la semaine** (position privilégiée sur une catégorie et une
   zone), payée en mobile money. Achat ponctuel, montant faible, valeur immédiatement
   lisible. C'est la piste la plus adaptée à une trésorerie quotidienne.
2. **Abonnement mensuel de base** pour les fonctions d'assistance (visuels, statistiques
   détaillées). Modèle freemium : la fiche et le bouton WhatsApp restent gratuits à vie —
   c'est ce qui garantit la densité de la carte.
3. **Monétisation côté demande, plus tard** : mise en relation qualifiée pour des besoins
   à valeur plus élevée (bâtiment, événementiel, réparation).
4. **Financement de programme** (bailleurs, agences de développement, inclusion
   numérique des femmes entrepreneures). Réaliste au Togo, mais à traiter comme un
   financement d'amorçage, jamais comme un modèle : cela crée une dépendance et oriente
   le produit vers le reporting plutôt que vers l'usage.

**Recommandation** : gratuité totale pendant toute la phase d'amorçage. On ne monétise
pas une carte vide. La monétisation s'ouvre quand une zone atteint une densité suffisante
et un volume de contacts WhatsApp mesurable.

### 7.3 Rémunération des ambassadeurs

Ne jamais payer à l'inscription brute : c'est une incitation directe à créer des fiches
fictives. Payer sur un fait vérifiable et postérieur :
- une part à la validation de la fiche (photo géolocalisée + numéro joignable confirmé
  par code) ;
- le solde à J+30, conditionné à la fiche toujours active et à au moins un contact client
  réel enregistré.

---

## 8. Exigences non fonctionnelles

| Domaine | Exigence |
| --- | --- |
| Consommation de données | Écran de résultats < 150 Ko ; images WebP en 3 tailles ; pas de police distante |
| Hors ligne | Consultation des dernières fiches vues, tuiles du Grand Lomé en cache, inscription ambassadeur en file d'attente locale |
| Performance | Résultat de recherche affiché en moins de 3 s en 3G |
| Taille de l'app | Objectif < 30 Mo installée |
| Batterie | GPS à la demande uniquement, aucune tâche de fond de localisation |
| Accessibilité | Contraste élevé, cible tactile ≥ 48 dp, aucun parcours dépendant de la lecture d'un texte long |
| Langue | Français en v1, architecture i18n prête pour le mina et l'éwé |
| Disponibilité | Dégradation gracieuse : sans réseau, l'app affiche le cache, jamais une page blanche |
| Sécurité | Chiffrement en transit, numéros de téléphone non exposés en clair par l'API publique |

---

## 9. Gouvernance des données

### 9.1 Données collectées (minimisation stricte)

Marchand : numéro de téléphone, nom d'enseigne, catégorie, description, coordonnées
géographiques, repère textuel, photos de l'activité, horaires indicatifs.
Client : identifiant d'appareil anonyme, position ponctuelle au moment de la recherche
(non conservée en clair au-delà de l'agrégation), historique de recherche local.

**Jamais collecté** : chiffre d'affaires, prix pratiqués détaillés, stock, revenus,
pièce d'identité, relevé de position continu.

### 9.2 Engagements

- Aucune transmission de données individuelles à l'administration fiscale ou à un tiers
  sans consentement explicite et spécifique du marchand.
- Droit de retrait immédiat : un marchand peut faire disparaître sa fiche depuis
  l'application, sans intervention humaine, sans délai.
- Toute donnée agrégée publiée l'est à un niveau qui interdit la ré-identification.
- Formalité préalable auprès de l'autorité de protection des données à effectuer **avant
  la mise en production**. `[à vérifier : régime et délai applicables]`

### 9.3 Prévention de la fraude

Vérification du numéro par code à usage unique ; photo d'inscription horodatée et
géolocalisée ; détection des grappes d'inscriptions improbables (même ambassadeur, même
créneau, points trop proches) ; contrôle terrain par sondage sur un échantillon.

---

## 10. Architecture technique

### 10.1 Principes

Backend d'abord, autonome, testable sans interface. L'application mobile et la maquette
viendront consommer une API déjà stable. Aucune logique métier dans le client.

### 10.2 Choix retenus

| Composant | Choix | Justification |
| --- | --- | --- |
| Backend | NestJS, architecture hexagonale, TypeScript | Cohérent avec les compétences existantes de l'équipe ; domaine isolé et testable ; la logique OTP, anti-fraude, quotas d'IA et facturation devient vite trop riche pour un simple BaaS |
| Base de données | PostgreSQL + extension PostGIS | La recherche « autour de moi » est une requête spatiale native (`ST_DWithin`, index GiST), pas une astuce applicative |
| Stockage des images | Stockage objet compatible S3 | Coût faible, déchargement des fichiers hors de l'API, génération des trois tailles à l'ingestion |
| Cartographie | Fond de carte vectoriel type OpenStreetMap / Mapbox | Coût très inférieur aux API cartographiques dominantes, style personnalisable, tuiles cacheables |
| Mobile | React Native (Expo), Android d'abord | Base de code unique, mises à jour sans passage par le store |
| IA | Appels serveur uniquement, jamais depuis le mobile | Protège la clé, permet la mise en cache, le quota et le repli en cas d'indisponibilité |
| Hébergement | Plateforme managée (Render ou équivalent) + base managée | Simplicité d'exploitation ; la latence depuis Lomé reste acceptable, à mesurer réellement |

Note : Supabase reste une alternative crédible et plus rapide à démarrer. Elle est écartée
au profit de NestJS parce que le projet comporte trop de règles métier propres (fraîcheur,
anti-fraude ambassadeur, quotas IA, statistiques marchand) pour vivre confortablement dans
des règles de sécurité déclaratives.

### 10.3 Modèle de domaine (première esquisse)

- `Marchand` — identité, contact, statut, fraîcheur.
- `Localisation` — point géographique, précision, repère textuel, ajustement manuel.
- `Categorie` — arborescence à un seul niveau, libellés multilingues.
- `Photo` — fichier, dérivés, ordre d'affichage, modération.
- `Ambassadeur` — zone, inscriptions, commissions.
- `Inscription` — trace de création, idempotente (clé générée côté client pour le mode
  hors ligne).
- `Confirmation` — événement de fraîcheur, avec sa source.
- `Signalement` — motif, auteur, traitement.
- `EvenementUsage` — vue de fiche, clic WhatsApp, recherche (base du tableau de bord et
  de la détection de fraude).

### 10.4 Surface d'API du MVP

```
POST   /auth/otp/demande
POST   /auth/otp/verification
GET    /categories
GET    /marchands/recherche          ?lat&lng&rayon&categorie&q
GET    /marchands/:id
POST   /marchands                    (marchand ou ambassadeur, idempotent)
PATCH  /marchands/:id
POST   /marchands/:id/photos
POST   /marchands/:id/contact        (journalise puis renvoie le lien WhatsApp)
POST   /marchands/:id/signalements
POST   /marchands/:id/confirmation
GET    /moi/marchand/statistiques
GET    /moi/ambassadeur/inscriptions
POST   /ia/description               (quota, cache, repli)
```

---

## 11. Feuille de route révisée

Le cadrage initial prévoyait cinq mois de conception et de développement avant le premier
contact avec le terrain. C'est l'ordre inverse du risque réel : le risque n'est pas de
savoir construire l'application, il est de savoir si un habitant de Lomé cherchera un
tailleur dans une application plutôt que par son voisin.

| Phase | Durée | Contenu | Critère de passage |
| --- | --- | --- | --- |
| **0. Validation terrain sans application** | 1 mois | Un quartier (par exemple Hédzranawoé). 30 marchands saisis à la main. Un numéro WhatsApp qui répond manuellement aux demandes des clients. Affichage physique dans le quartier. | Volume de demandes clients réelles et récurrentes sur 4 semaines |
| **1. Backend** | 6 semaines | Domaine, PostGIS, API, OTP, fraîcheur, anti-fraude. Testé et déployé, sans interface. | Suite de tests verte, API déployée et documentée |
| **2. Maquette et interface** | 3 semaines | Conception des écrans, puis application Android connectée à l'API réelle | Parcours client et marchand complets sur appareil réel |
| **3. Alpha terrain** | 6 semaines | 10 ambassadeurs, objectif 300 marchands sur 2 quartiers contigus | Densité suffisante pour qu'une recherche aboutisse dans 80 % des cas |
| **4. Assistance IA et viralité** | 4 semaines | Amélioration des photos, générateur de visuels WhatsApp | Taux de partage mesurable |
| **5. Monétisation** | — | Mise en avant payante en mobile money sur les zones denses | Premiers paiements récurrents |

La phase 0 peut invalider le projet pour un coût quasi nul. C'est sa fonction.

---

## 12. Indicateurs de pilotage

- **Indicateur central** : nombre de contacts WhatsApp déclenchés par marchand actif et
  par semaine. C'est la seule preuve que la plateforme crée de la valeur pour le marchand.
- Taux de recherches aboutissant à au moins un résultat pertinent dans le rayon
  (mesure de densité).
- Part de fiches confirmées à moins de 90 jours (santé de la base).
- Rétention des marchands à J+60.
- Coût technique complet par marchand actif et par mois.
- Consommation de données moyenne par session.

---

## 13. Risques et parades

| Risque | Gravité | Parade |
| --- | --- | --- |
| Association du produit au contrôle fiscal | Critique | Discours et interface centrés sur les clients ; engagement écrit de non-transmission ; formation stricte des ambassadeurs |
| Base obsolète | Critique | Boucle de fraîcheur en v1 (section 6) |
| Densité insuffisante : le client ne trouve rien | Élevée | Concentration sur deux quartiers contigus, jamais de dispersion géographique |
| Fraude à l'inscription des ambassadeurs | Élevée | Rémunération différée et conditionnée à l'usage réel (7.3) |
| Coupures d'accès internet | Moyenne à élevée | Fonctionnement hors ligne et cache, dès la conception |
| Coûts d'IA supérieurs au revenu par marchand | Moyenne | IA côté serveur, mise en cache, quotas, report en phase 4 |
| Arrivée d'un acteur super-app local sur le créneau | Moyenne | Décider tôt : partenariat de distribution plutôt qu'affrontement frontal |
| Non-conformité en protection des données | Moyenne | Formalité préalable avant mise en production |

---

## 14. Décisions à arbitrer avant le développement

1. ~~**Nom commercial et positionnement de marque.**~~ **Arbitré le 2026-08-03 : Koté.**
   La promesse tient dans le mot : le service est juste à côté. Aucune référence à la
   formalisation, à l'administration ni à la fiscalité, conformément à la section 3.1.
   Le nom se prononce identiquement en français, en mina, en éwé et en kabyè, et il ne
   nomme aucun métier, ce qui préserve l'étendue de l'offre côté client.
   **Vérifications restant à faire avant tout dépôt** : absence de collision sur les
   magasins d'applications au Togo et au Ghana, disponibilité du nom de domaine, et
   dépôt de marque auprès de l'organisme compétent.
2. **Concurrencer ou s'intégrer** à l'acteur super-app local existant.
3. **Canal du code à usage unique** : SMS (coût par message et délivrance irrégulière)
   ou WhatsApp (gratuit, mais dépendance à un tiers et procédure de validation).
4. **Périmètre exact du quartier pilote.**
5. **Statut juridique de la structure porteuse** et calendrier de la formalité de
   protection des données.
6. **Choix du fournisseur d'IA** au regard du coût par requête et de la latence depuis
   l'Afrique de l'Ouest.

---

## 15. Prochaine étape

Développement du **backend seul**, sans interface, conformément à la phase 1 :
domaine métier, persistance PostGIS, recherche par proximité, authentification par code
à usage unique, boucle de fraîcheur, journalisation des contacts. La conception des
écrans interviendra ensuite, sur la base d'une API stable et réellement interrogeable.
