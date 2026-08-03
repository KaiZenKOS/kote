# Lancer Koté en local

Trois choses à lancer : la base et l'API (Docker), puis l'application Android.

---

## 1. Le backend

Depuis `C:\Users\theca\Desktop\Projet_marche_togo` :

```bash
npx supabase start
```

Au premier lancement, cela télécharge les images Docker (plusieurs minutes).
Ensuite c'est quasi instantané. La commande affiche les URL et les clés — garde
`ANON_KEY` sous la main.

Commandes utiles :

```bash
npx supabase status
```

```bash
npx supabase db reset
```

`db reset` rejoue toutes les migrations puis `seed.sql`, qui crée sept commerces
fictifs à Hédzranawoé. C'est ce jeu de données qui permet de voir quelque chose
dans l'application.

```bash
npx supabase test db
```

Studio (pour regarder la base à la main) : http://127.0.0.1:54323

---

## 2. L'application Android

### Piège n° 1 — la version de Java

Ta machine a Java 22 en système. Gradle ne le supporte pas encore pour ce
projet ; il faut celui d'Android Studio (JDK 21).

**À faire une fois, dans le terminal où tu lances l'app :**

```bash
export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr"
```

En PowerShell :

```bash
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
```

### Piège n° 2 — l'adresse du backend

`127.0.0.1` désigne le téléphone lui-même, pas ton PC. Il faut changer l'URL
dans `mobile/.env` selon la cible :

| Cible | `EXPO_PUBLIC_SUPABASE_URL` |
| --- | --- |
| Émulateur Android | `http://10.0.2.2:54321` |
| Téléphone réel (même wifi) | `http://192.168.1.72:54321` |

L'API est déjà exposée sur le réseau local, rien d'autre à configurer.

### Piège n° 3 — Expo Go ne suffit pas

L'application utilise MapLibre, qui est du code natif. Il faut un **build de
développement**, pas Expo Go. C'est une compilation à faire une seule fois ;
ensuite le rechargement est instantané comme d'habitude.

### Lancer

Démarrer l'émulateur :

```bash
"$ANDROID_HOME/emulator/emulator.exe" -avd Pixel_7
```

Puis, depuis `mobile/` :

```bash
npm install
```

```bash
npx expo run:android
```

Le premier build prend 10 à 20 minutes : Gradle télécharge tout. Les fois
suivantes, il suffit de :

```bash
npx expo start --dev-client
```

---

## 3. Le piège qui fait croire que rien ne marche

**Un émulateur Android neuf se croit en Californie.** L'application cherche des
commerces dans un rayon d'un kilomètre autour de la position du téléphone : à
Mountain View, elle ne trouvera évidemment rien, et affichera « Aucun commerce
trouvé » alors que tout fonctionne.

Il faut placer l'émulateur à Lomé :

```bash
"$ANDROID_HOME/platform-tools/adb.exe" emu geo fix 1.2360 6.1780
```

Ces coordonnées sont celles du quartier pilote, Hédzranawoé, où se trouvent les
commerces du jeu de données. On peut aussi passer par les *Extended controls* de
l'émulateur (les trois points) → *Location*.

Sur un téléphone réel au Togo, la question ne se pose pas.

---

## Ce que tu devrais voir

1. **Accueil** — la salutation, les six catégories avec leurs compteurs, et
   trois commerces sous « Près de vous ».
2. **Une fiche** — la photo, le point de repère mis en valeur, la pastille de
   fraîcheur, et le bouton WhatsApp.
3. **Le bouton WhatsApp** ouvre la conversation avec le message pré-rempli
   « Bonjour, je vous ai trouvé sur Koté. Êtes-vous disponible ? ». Sur un
   émulateur sans WhatsApp installé, il échouera proprement — c'est normal.
4. **La carte** — le fond sombre MapLibre avec les commerces épinglés.

---

## Ce qui ne marchera pas en local, et pourquoi

- **La connexion de l'espace marchand.** La CLI Supabase désactive l'envoi de
  codes par téléphone faute de fournisseur configuré (elle l'annonce au
  démarrage : `no SMS provider is enabled`). Deux numéros de test sont déclarés
  dans `supabase/config.toml` (`22890000001` et `22890000002`, code `123456`)
  mais ils n'ont d'effet qu'une fois un fournisseur branché. Le choix du canal —
  SMS ou WhatsApp — reste à trancher.
- **L'assistance à la rédaction par IA.** Elle répond 503 tant que
  `ANTHROPIC_API_KEY` n'est pas renseignée dans `supabase/functions/.env`. C'est
  volontaire : le marchand doit pouvoir publier sa fiche sans elle.

---

## Tout arrêter

```bash
npx supabase stop
```

Les données sont conservées. `npx supabase stop --no-backup` repart de zéro.
