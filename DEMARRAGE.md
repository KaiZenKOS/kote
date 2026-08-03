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
npm start --prefix mobile
```

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
