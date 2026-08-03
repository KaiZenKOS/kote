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

## État d'avancement

Fait : couche de données complète, thème issu du `.pen`, navigation
`expo-router`, écran d'accueil branché sur l'API réelle.

Reste à faire : les dix autres écrans du `.pen` (résultats, carte, fiche,
signalement, hors ligne, erreur, introuvable, aucun résultat, aide, mentions
légales), l'extraction des sept composants réutilisables, et la police Sora.
