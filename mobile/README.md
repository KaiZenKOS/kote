# Koté — application mobile

React Native (Expo SDK 57), Android d'abord. Le design fait foi : `togo.pen`,
ouvert dans Pencil. Les jetons de style sont repris tels quels dans
[src/theme/tokens.ts](src/theme/tokens.ts) — cette source est le `.pen`, jamais
l'inverse.

## Démarrer

```bash
npm install
```

Copier `.env.example` en `.env` et renseigner les deux variables avec les
valeurs de `npx supabase status` à la racine du projet.

```bash
npm start
```

```bash
npm run typecheck
```

---

## La couche de données

C'est la partie la plus chargée en décisions, et elle mérite d'être lue avant
d'ajouter la moindre requête. Le fichier de référence est
[src/query/politique.ts](src/query/politique.ts).

### Pourquoi le cache n'est pas une optimisation ici

Au Togo, la donnée mobile s'achète par forfaits prépayés de petite taille et le
réseau tombe. **Une requête évitée n'est pas un gain de confort, c'est de
l'argent que l'utilisateur ne dépense pas.** Un écran qui recharge à chaque
retour est un écran qu'on finit par ne plus ouvrir.

Et le cas d'usage hors ligne dominant n'est pas « ouvrir l'application sans
réseau ». C'est **consulter la fiche en marchant vers la boutique** — le moment
où l'on perd le signal entre deux quartiers, et précisément celui où le point
de repère devient indispensable puisqu'il n'y a pas d'adresse à Lomé.

### Ce qui est gardé, et combien de temps

| Donnée | Fraîche pendant | Gardée en cache | Écrite sur le disque | Pourquoi |
| --- | --- | --- | --- | --- |
| Catégories | 24 h | 30 j | 30 j | Sans elles, l'accueil est vide hors ligne — et c'est le premier écran |
| Compteurs par catégorie | 10 min | 7 j | 3 j | Pastille indicative, une valeur un peu périmée ne coûte rien |
| Résultats de recherche | 5 min | 7 j | 1 j | Rouvrir sans réseau montre la dernière recherche |
| Fiche commerçant | 15 min | 30 j | 30 j | **La plus longue, volontairement** : c'est la donnée consultée en chemin |
| Photos d'une fiche | 1 h | 30 j | 30 j | Suit la fiche |

### Trois décisions non évidentes

**1. Les coordonnées GPS sont arrondies avant d'entrer dans la clé de cache.**
Sans cet arrondi (une grille d'environ 220 m), chaque mètre de dérive du GPS
produirait une clé différente : le cache ne servirait jamais et chaque retour
sur l'écran referait payer la requête. Effet de bord utile — la position exacte
de l'utilisateur ne sert jamais de clé, ce qui va dans le sens de la
minimisation des données.

**2. `refetchOnWindowFocus` est désactivé.** Le parcours le plus fréquent de
l'application est : ouvrir une fiche, partir vers WhatsApp, revenir. Avec le
réglage par défaut, ce retour déclencherait un rechargement complet — facturé à
l'utilisateur, à chaque fois.

**3. `networkMode: "offlineFirst"` plutôt que `"online"`.** La détection de
connectivité ment souvent ici : une puce se déclare connectée au réseau mobile
sans qu'aucune donnée ne passe, et l'inverse arrive aussi. On tente donc une
fois avant de se mettre en pause.

### Ce qui survit à la fermeture de l'application, et ce qui ne doit pas

La persistance des mutations est une **liste blanche explicite**
([src/query/mutations.ts](src/query/mutations.ts)) :

- **`signalement` est persisté.** Le client est souvent devant une boutique
  fermée, donc loin d'une bonne connexion. C'est exactement là qu'il faut
  capter l'information, quitte à l'envoyer plus tard. Le rejeu est sans danger,
  le serveur déduplique par appareil et par motif.
- **`contact` ne l'est jamais, et échoue immédiatement hors ligne.** Ouvrir
  WhatsApp deux heures plus tard n'aurait aucun sens — et surtout, cela
  enregistrerait un contact client qui n'a pas eu lieu. Ce compteur est
  l'indicateur central du produit et il conditionne la seconde part de
  commission des ambassadeurs : le gonfler, même accidentellement, corromprait
  la paie et la mesure.

### Le journal d'usage n'utilise pas TanStack

[src/journal/file.ts](src/journal/file.ts) est une file maison, pour deux
raisons :

1. Elle doit être **bornée et jetable**. Un utilisateur hors ligne trois jours
   ne doit pas accumuler des milliers d'événements sur un téléphone où le
   stockage est rare. Au-delà de 200, les plus anciens sont abandonnés : perdre
   une statistique est sans conséquence, saturer le téléphone en a une.
2. Une mutation persistée rejouée après une réponse perdue compterait deux fois
   le même événement.

Point de conception à conserver : **`clic_whatsapp` n'entre jamais dans cette
file.** Il est écrit par la fonction edge `contact`, côté serveur, et par elle
seule. C'est ce qui rend l'indicateur central insensible à ce que raconte le
client.

Les événements partent par lots, à trois moments : retour du réseau, passage en
arrière-plan (typiquement quand l'utilisateur bascule vers WhatsApp), et un
battement lent de secours. Un appel réseau par vue de fiche ferait payer à
l'utilisateur une statistique qui ne lui sert pas.

### Limites connues

- **AsyncStorage est plafonné à 6 Mo par défaut sur Android.** Les fenêtres
  d'écriture du tableau ci-dessus sont dimensionnées pour rester loin de cette
  limite. Au passage en build de développement, remplacer le persister par
  `react-native-mmkv` : nettement plus rapide et sans ce plafond. Le point de
  changement est isolé dans [src/query/persistance.ts](src/query/persistance.ts).
- `VERSION_CACHE` dans ce même fichier doit être incrémenté à chaque changement
  de forme des données mises en cache, sinon les téléphones déjà équipés
  liraient un cache incompatible.
- `.npmrc` force `legacy-peer-deps` : `expo-router@57` dépend de `vaul` → Radix
  → `react-dom ^19.2.8`, alors que le SDK épingle `react 19.2.3`. Le conflit est
  interne au graphe d'Expo et sans effet sur React Native.

---

## Écrans

| Route | Écran du `.pen` |
| --- | --- |
| `/` | 1 · Accueil |
| `/resultats` | 2 · Résultats, 9 · Aucun résultat, 6 · Hors ligne, 7 · Erreur |
| `/carte` | 3 · Carte |
| `/fiche/[id]` | 4 · Fiche commerçant, 8 · Introuvable |
| `/signalement/[id]` | 5 · Signalement (feuille modale) |
| `/aide` | 10 · Aide & légal |
| `/+not-found` | 8 · Introuvable |

Les écrans 6 à 9 du `.pen` ne sont pas des routes mais des **états** : le
design les dessine séparément pour les documenter, l'application les rend là où
ils se produisent. Un écran « hors ligne » atteignable par navigation n'aurait
aucun sens.

Règle appliquée partout : **dès qu'il existe une donnée en cache, même
ancienne, on l'affiche plutôt qu'un état d'erreur.** Une liste d'hier vaut mieux
qu'un écran vide. L'état plein écran n'apparaît que lorsqu'il n'y a
strictement rien à montrer.

### Points de fidélité au design

- La police Sora est chargée en quatre graisses et nommée explicitement partout :
  React Native ne synthétise pas les graisses d'une police personnalisée,
  `fontWeight` seul laisserait tout en Regular.
- Le halo orange est rendu en SVG, en dégradé **radial**. L'approximer par un
  dégradé linéaire aurait changé l'ambiance de façon visible.
- Aucun flou d'arrière-plan nulle part : la profondeur passe par des surfaces
  opaques successives.
- Les listes utilisent `FlatList` avec `removeClippedSubviews` et de petits
  lots de rendu — au-delà d'une vingtaine de cartes, un `ScrollView` saccade sur
  un Android d'entrée de gamme.

## La carte

**MapLibre + tuiles OpenStreetMap**, pas un service facturé au chargement.

Le raisonnement est économique avant d'être technique : sur un produit dont le
revenu attendu par marchand se compte en centaines de francs par mois, une
facturation à l'usage de la carte est un coût qui grandit exactement au rythme
du succès. MapLibre permet en plus ce que le cahier des charges demande
explicitement et qu'aucun service facturé ne permet vraiment :
**pré-télécharger le Grand Lomé**.

- Le style est un JSON sombre embarqué dans l'application
  ([src/carte/style-sombre.json](src/carte/style-sombre.json)), aux couleurs du
  `.pen`. Quelques kilo-octets, jamais retéléchargés — seules les tuiles
  voyagent.
- Le paquet hors ligne couvre l'emprise du Grand Lomé aux zooms 11 à 16. En
  dessous, la ville tient dans quelques tuiles ; au-delà, le poids explose pour
  un gain nul puisqu'on se repère au point de repère, pas au numéro de rue.
- **Le téléchargement est toujours déclenché par l'utilisateur**, depuis l'écran
  d'aide, jamais automatiquement. Consommer plusieurs mégaoctets à son insu est
  exactement ce qui fait désinstaller une application ici.

## Espace marchand et ambassadeur

Ces écrans ne figurent pas dans `togo.pen` : ils reprennent les mêmes jetons
avec des règles plus strictes, tirées de la section 2.4 du cahier des charges.
Le critère de réussite est qu'une commerçante de 50 ans y arrive **seule, du
premier coup**.

- Cibles tactiles de 64 px au lieu de 48, corps de texte à 18 px.
- Un seul choix par écran quand c'est possible ; création de fiche en trois
  étapes.
- Aucune saisie libre obligatoire au-delà du point de repère.
- Les statuts sont dits en français courant : « brouillon » devient « pas
  encore publiée », « en_veille » devient « retirée des résultats ».
- Le discours ne parle jamais de formalisation, d'enregistrement ni
  d'administration. Le marchand achète de la visibilité et des clients.

| Route | Contenu |
| --- | --- |
| `/espace` | Connexion par téléphone, puis tableau de bord ou liste d'inscriptions |
| `/espace/nouvelle` | Création de fiche en 3 étapes, avec placement sur la carte |
| `/espace/fiche/[id]` | Statistiques, confirmation d'activité, correction du repère, retrait |

**Le tableau de bord met en avant le nombre de clients qui ont écrit**, pas le
nombre de vues. C'est la seule preuve concrète que la plateforme sert au
marchand ; le nombre de vues est plus flatteur mais creux.

**Le droit de retrait est en clair sur l'écran**, pas caché dans un menu : c'est
la contrepartie de la confiance demandée au marchand (cahier des charges,
section 9.2).

### Ce qui rend la tournée d'un ambassadeur possible hors ligne

Trois mécanismes se combinent :

1. La création de fiche porte une **clé d'idempotence générée sur le
   téléphone**. Rejouer la même saisie relit la fiche existante au lieu d'en
   créer une seconde.
2. La mutation est donc **persistée sur disque** : l'ambassadeur inscrit dix
   marchands dans un marché sans couverture, ferme l'application, et tout part
   au retour du réseau.
3. Même chose pour la confirmation d'activité — le marchand appuie sur « je suis
   toujours là » depuis son étal, souvent sans réseau. Perdre ce geste ferait
   basculer sa fiche en veille alors qu'il vient justement de la confirmer.

## État d'avancement

Écarts assumés par rapport au `.pen` :

- **Les favoris restent sur le téléphone.** Ils ne demandent ni compte client
  ni connexion et ne remontent jamais au serveur : le client peut retrouver un
  commerce repéré sans créer une nouvelle donnée personnelle.
- **Le tri des résultats n'est pas exposé.** Le backend ordonne par fraîcheur
  puis distance ; un sélecteur sans effet réel serait un contrôle mort.
- L'icône WhatsApp du `.pen` vient de Phosphor ; Lucide n'a pas d'icône de
  marque, `MessageCircle` la remplace.
- **Le regroupement des points de la carte** (clusters) n'est pas fait. Régler
  un rayon de regroupement sans voir le résultat sur un appareil serait de la
  devinette ; à faire au premier passage sur téléphone réel.

Ce qui n'a pas pu être vérifié ici, et pourquoi :

- **MapLibre exige un build de développement** (`npx expo run:android` ou EAS).
  Il ne fonctionne pas dans Expo Go. Le code compile et se bundle, mais le rendu
  n'a pas été observé sur un appareil.
- **L'authentification par code à usage unique n'est pas testable en local** :
  la CLI Supabase désactive la connexion par téléphone faute de fournisseur
  configuré. Le choix du canal — SMS ou WhatsApp — reste ouvert (cahier des
  charges, section 14, décision 3).
