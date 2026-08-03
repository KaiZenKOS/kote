# Lancer Koté

## En une commande

Depuis `C:\Users\theca\Desktop\Projet_marche_togo`, dans PowerShell :

```bash
npm run demarrer
```

C'est tout. Le script fait le reste, dans l'ordre :

1. démarre Docker Desktop s'il est éteint, et attend qu'il réponde ;
2. installe les dépendances manquantes (racine et application) ;
3. démarre la pile Supabase si elle ne tourne pas déjà ;
4. **lit la clé anonyme et écrit `mobile/.env` tout seul** — plus rien à
   recopier à la main ;
5. démarre l'émulateur Android s'il n'y a aucun appareil branché, et attend son
   démarrage complet ;
6. **choisit la bonne adresse de backend selon la cible** : `10.0.2.2` pour un
   émulateur, l'adresse du PC sur le wifi pour un téléphone réel ;
7. pointe `JAVA_HOME` sur le JDK d'Android Studio ;
8. **place l'émulateur à Hédzranawoé**, où se trouvent les commerces du jeu de
   données ;
9. compile et installe l'application.

Le script est idempotent : on peut le relancer autant de fois qu'on veut, il ne
refait que ce qui manque. Le premier build Gradle prend 10 à 20 minutes ; les
suivants sont rapides.

### Variantes

```bash
npm run demarrer -- -SansApp
```

Backend seul, sans toucher à l'application.

```bash
npm run demarrer -- -Tests
```

Backend, puis les trois suites pgTAP et la vérification de l'exposition de
l'API. Sort sans compiler.

```bash
npm run demarrer -- -Reinitialiser
```

Rejoue toutes les migrations et le jeu de données avant de lancer le reste.

### Ensuite

Une fois l'application installée, plus besoin de recompiler :

```bash
npm run app
```

**Attention : ne lancez pas un second Metro.** `npm run demarrer` en laisse déjà
un sur le port 8081, et c'est celui-là que l'application installée interroge. Si
vous en démarrez un autre, Expo le placera sur le port 8082 — l'application ne
le verra jamais et continuera de parler au premier. Pour vérifier qui occupe
8081 :

```bash
Get-NetTCPConnection -LocalPort 8081 -State Listen | Select-Object OwningProcess
```

Si un Metro tourne déjà, il n'y a rien à relancer : secouez l'appareil ou
appuyez deux fois sur `R` pour recharger.

**Le web n'est pas une cible du projet.** `react-native-web` n'est pas installé,
et l'application dépend de code natif (MapLibre) qui n'a pas d'équivalent
navigateur. Les scripts `web` et `ios` ont été retirés pour qu'une touche `w`
pressée par habitude ne produise pas une erreur de résolution déroutante.

De même, `npm run app` force `--dev-client` : sans ce drapeau, Expo propose
Expo Go, qui ne sait pas charger MapLibre et afficherait un écran cassé.

---

## Version web — pour visualiser rapidement

Le plus simple pour regarder les écrans sans émulateur :

```bash
npm run web --prefix mobile
```

Puis ouvrez **http://localhost:8090**. Redimensionnez la fenêtre en format
téléphone pour un rendu fidèle.

C'est aussi le seul moyen de voir le fond de carte tant que l'émulateur n'a pas
d'accès Internet : le navigateur, lui, en a un.

**Pensez à l'adresse du backend.** `demarrer.ps1` écrit `mobile/.env` pour la
cible mobile (`10.0.2.2`). Pour le web, il faut `127.0.0.1` :

```bash
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
```

### Comment le web est possible sans dupliquer les écrans

MapLibre React Native est du code natif, sans équivalent navigateur. Plutôt que
d'écrire une version web de chaque écran affichant une carte — et donc de
maintenir deux fois la même logique — **c'est la carte seule qui est
encapsulée**, dans `src/carte/CarteInteractive.tsx` et son jumeau `.web.tsx`.

| | Android | Web |
| --- | --- | --- |
| Moteur | MapLibre React Native | MapLibre GL JS |
| Fichier de style | `style-sombre.json` | **le même** |
| Interface du composant | identique | identique |

Même moteur de rendu et même style : ce que montre le navigateur correspond à ce
que verra un utilisateur, aux interactions tactiles près. Les écrans, eux,
n'existent qu'en un seul exemplaire.

`src/carte/horsLigne.web.ts` neutralise le téléchargement de tuiles hors ligne,
qui n'a de sens que sur mobile — et sert surtout à garantir que le bundle web ne
tire jamais le module natif.

---

## Les trois pièges que le script vous évite

Ils sont documentés ici parce qu'ils échouent tous **silencieusement** : rien ne
plante, mais rien ne marche non plus.

**1. La version de Java.** Cette machine a Java 22 en système ; Gradle ne le
supporte pas pour ce projet. Le script bascule sur le JDK 21 livré avec Android
Studio.

**2. `127.0.0.1` désigne le téléphone, pas le PC.** Un émulateur joint la
machine hôte par `10.0.2.2` ; un téléphone réel passe par l'adresse du PC sur le
wifi. Le script détecte la cible et écrit la bonne valeur.

**3. Un émulateur neuf se croit en Californie.** L'application cherche dans un
rayon d'un kilomètre autour du téléphone : à Mountain View elle affiche
« Aucun commerce trouvé » alors que tout fonctionne parfaitement. Le script le
place à Hédzranawoé (1.2360, 6.1780).

---

## Ce que vous devriez voir

1. **Accueil** — la salutation, les six catégories avec leurs compteurs, trois
   commerces sous « Près de vous ».
2. **Une fiche** — la photo, le point de repère mis en valeur, la pastille de
   fraîcheur, le bouton WhatsApp.
3. **Le bouton WhatsApp** ouvre la conversation avec le message pré-rempli
   « Bonjour, je vous ai trouvé sur Koté. Êtes-vous disponible ? ». Sur un
   émulateur sans WhatsApp installé, il échoue proprement : c'est normal.
4. **La carte** — le fond sombre MapLibre avec les commerces épinglés.
5. **L'espace marchand** — depuis l'écran d'aide, « Ouvrir mon espace ».

---

## Ce qui ne marchera pas en local, et pourquoi

- **La connexion de l'espace marchand.** La CLI Supabase désactive l'envoi de
  codes par téléphone faute de fournisseur configuré ; elle l'annonce au
  démarrage (`no SMS provider is enabled`). Des numéros de test sont déclarés
  dans `supabase/config.toml` mais n'ont d'effet qu'une fois un fournisseur
  branché. Le choix du canal — SMS ou WhatsApp — est la décision 3 du cahier des
  charges, toujours ouverte.
- **L'assistance à la rédaction par IA.** Elle répond 503 tant que
  `ANTHROPIC_API_KEY` n'est pas renseignée dans `supabase/functions/.env`. C'est
  volontaire : le marchand doit pouvoir publier sa fiche sans elle.

---

## Tout arrêter

```bash
npm run backend:arret
```

Les données sont conservées.

---

## Note pour qui modifiera `demarrer.ps1`

**Le fichier doit rester enregistré en UTF-8 avec BOM.** PowerShell 5.1 lit un
`.ps1` sans BOM comme de l'ANSI : un caractère non ASCII y devient plusieurs
octets, et certains — le tiret cadratin en particulier — produisent un guillemet
double qui ferme une chaîne en plein milieu. Le reste du script est alors
reparsé de travers, sans la moindre erreur affichée : des blocs entiers cessent
simplement de s'exécuter.
