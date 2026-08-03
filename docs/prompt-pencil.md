# Prompt Pencil — écrans client

Ce document contient le prompt à coller dans Pencil pour obtenir la première
maquette, et l'explication des écarts assumés avec la référence visuelle.

La référence retenue est une application de location de motos : fond sombre
chaud, halo orange, grandes cartes arrondies, tuiles d'information empilées,
typographie d'affichage large. **C'est le langage visuel qui est repris, pas le
contenu ni la structure de navigation.**

---

## Ce qui est repris de la référence

- Fond sombre chaud avec halo orange en arrière-plan
- Grandes cartes arrondies (24 à 32 px), superposées avec une vraie hiérarchie
  de profondeur
- Tuiles d'information côte à côte, chiffre en gros, libellé au-dessus
- Un nom en typographie d'affichage large comme point d'ancrage de l'écran
- Boutons circulaires pour les actions secondaires

## Ce qui est écarté, et pourquoi

| Élément de la référence | Décision | Motif |
| --- | --- | --- |
| Flou de fond sur les cartes | Écarté | `backdrop-blur` est coûteux en GPU sur Android d'entrée de gamme, cible majoritaire du parc |
| Libellés à 10 px, contraste ~2:1 | Écarté | Illisible en plein soleil, et la cible marchande est faiblement alphabétisée |
| Rendus photographiques plein cadre | Écarté | Les photos réelles sont prises au téléphone dans un marché. La maquette doit rester belle avec une photo médiocre de 400 px, sinon elle ment |
| Texte posé directement sur la photo | Écarté | Illisible dès que la photo est chargée ou mal exposée |
| Carte en écran d'accueil | Écarté | Cahier des charges 5.1 : l'utilisateur formule un besoin, il ne parcourt pas une carte. La carte est une vue de résultats |

---

## Le nom

**Koté** — « juste à côté ». Arbitré le 2026-08-03.

La promesse tient dans le mot : le service est juste à côté. Le nom ne désigne
aucun métier, ce qui préserve l'étendue de l'offre côté client, et il ne porte
aucune connotation administrative ou fiscale. Il se prononce identiquement en
français, en mina, en éwé et en kabyè.

Le test décisif était la phrase qui part réellement dans WhatsApp, seul endroit
où tous les marchands liront le nom :

> Bonjour, je vous ai trouvé sur Koté. Êtes-vous disponible ?

---

## Le prompt

```
Conçois une application mobile Android en français, mode sombre uniquement.

L'application s'appelle Koté. Le nom signifie « juste à côté » : c'est la
promesse du produit, la proximité. Il apparaît dans l'en-tête de l'écran
d'accueil, en petit et sobre — c'est le contenu qui doit dominer, pas la
marque.

CONTEXTE PRODUIT
L'application permet aux habitants de Lomé, au Togo, de trouver un commerçant
ou un artisan de quartier disponible tout de suite près d'eux : couturière,
mécanicien deux-roues, coiffeuse, restauration de rue, réparateur,
petit commerce. La mise en relation se fait par WhatsApp.

CONTRAINTES NON NÉGOCIABLES
- Cible : Android d'entrée de gamme, écran 5,5 à 6,1 pouces, connexion 3G
  souvent dégradée, forfait data prépayé acheté au mégaoctet.
- Aucun flou de fond, aucune transparence coûteuse, aucun dégradé animé.
  La profondeur se fait par des surfaces opaques successives et des ombres
  douces, jamais par du verre dépoli.
- Contraste minimum 4,5:1 pour tout texte, sans exception. L'écran est
  consulté en plein soleil.
- Aucun texte posé directement sur une photographie.
- Taille de texte minimale 13 px. Aucun libellé plus petit.
- Cibles tactiles d'au moins 48 x 48 px.
- Maximum 3 images par écran. Les photos sont prises au téléphone par les
  commerçants eux-mêmes : elles sont mal cadrées, mal exposées, parfois
  floues. La maquette doit rester lisible et élégante avec de telles photos,
  pas avec des rendus de studio.
- Aucun emoji, nulle part.
- Il n'existe pas d'adressage de rue à Lomé. On se repère par point de
  repère en texte libre. Ce champ est aussi important que le nom.

DIRECTION ARTISTIQUE
Fond sombre chaud, presque brun, avec un halo orange diffus en haut de
l'écran, comme une lumière de fin de journée. Grandes cartes arrondies aux
angles généreux, empilées avec une hiérarchie de profondeur nette. Tuiles
d'information côte à côte : libellé discret au-dessus, chiffre en grand
au-dessous. Le nom du commerce est le point d'ancrage de chaque écran, en
typographie d'affichage large. Boutons circulaires pour les actions
secondaires. Une seule couleur d'accent, l'orange, utilisée avec parcimonie :
elle signale l'action principale et rien d'autre.

Registre : chaleureux et direct, jamais luxueux ni corporate. C'est un outil
de quartier, pas une application premium.

COULEURS
fond               #14100E
halo orange        radial du haut, #FF6B2C à 18 % d'opacité, très diffus
surface 1          #1F1917
surface 2          #2A2320
bordure            #3A312C
accent             #FF6B2C
accent doux        #FFB088
texte principal    #F5EFEA
texte secondaire   #C2B4AA
fraîcheur bonne    #6FCF97
fraîcheur à vérifier #E2B93B

TYPOGRAPHIE
Une seule famille sans serif géométrique à large gamme de graisses.
Affichage 34 px / graisse 700 / interlettrage serré
Titre 22 px / 600
Corps 16 px / 400
Libellé 13 px / 500 / majuscules douces, interlettrage large
Chiffre de tuile 26 px / 600

FORMES
Rayon des cartes 28 px, rayon des tuiles 20 px, rayon des puces 999 px.
Espacement sur une échelle de 4 : 8, 12, 16, 24, 32.

ÉCRANS À PRODUIRE

1. ACCUEIL — recherche et catégories
   En-tête : salutation courte et avatar à droite.
   Champ de recherche proéminent, en position haute, avec l'exemple
   « Que cherchez-vous ? Couturière, mécanicien... ».
   Six puces de catégorie sur deux rangées, chacune avec une icône et un
   compteur du nombre de commerces ouverts dans le rayon :
   Couture et mode, Nourriture et boissons, Beauté et coiffure,
   Mécanique et deux-roues, Réparation et bricolage, Commerce et revente.
   En dessous, un bloc « Près de vous » avec trois cartes de commerce.
   Un bouton flottant discret « Voir sur la carte » en bas.
   La carte n'est PAS l'écran d'accueil.

2. RÉSULTATS — liste
   Barre de recherche remplie avec « couturière ».
   Filtre de rayon : 500 m, 1 km, 3 km, sous forme de puces.
   Liste de cartes de commerce. Chaque carte contient :
   photo carrée à gauche (96 px, angles arrondis, jamais de texte dessus),
   nom du commerce en titre,
   catégorie et distance sur une ligne,
   le point de repère en texte secondaire sur deux lignes maximum,
   une pastille de fraîcheur : point vert et « confirmé il y a 5 jours »,
   ou point ambre et « à confirmer ».
   Exemples de contenu réel à utiliser :
   - Atelier Afiavi Couture, Couture et mode, 240 m,
     « En face de la pharmacie du carrefour, première porte à gauche »,
     confirmé il y a 5 jours
   - Couture Assigamé, Couture et mode, 1,2 km,
     « Intérieur du Grand Marché, allée des tissus »,
     confirmé il y a 8 jours
   - Chez Mama Adjo, Nourriture et boissons, 310 m,
     « Sous le grand manguier, en face de l'école primaire »,
     confirmé il y a 2 jours

3. CARTE — vue de résultats
   Carte sombre plein écran, teinte chaude cohérente avec le reste.
   Points regroupés en grappes avec un compteur au centre.
   Une carte d'aperçu ancrée en bas, glissable horizontalement, reprenant le
   format de la liste en version compacte.
   Bouton de retour à la liste, et bouton de recentrage sur la position.

4. FICHE COMMERÇANT
   Photo en haut, hauteur limitée à 40 % de l'écran, avec un dégradé opaque
   vers le fond sous la photo — le texte commence APRÈS la photo, jamais
   dessus.
   Nom du commerce en typographie d'affichage.
   Catégorie et distance.
   Bloc repère mis en valeur, avec une icône de balise : c'est l'information
   la plus utile de l'écran, elle doit peser autant que le nom.
   Deux tuiles côte à côte : « Confirmé » avec « il y a 5 jours », et
   « Distance » avec « 240 m ».
   Horaires indicatifs, présentés comme indicatifs et non comme un engagement.
   Deux boutons pleine largeur empilés en bas, fixés au-dessus du bord :
   bouton principal orange « Contacter sur WhatsApp »,
   bouton secondaire contour « Itinéraire ».
   Un lien discret « Signaler un problème » sous les boutons.

5. FEUILLE DE SIGNALEMENT
   Feuille modale montant du bas, hauteur réduite.
   Titre « Cette information est-elle fausse ? »
   Trois grands boutons empilés, en pleine largeur, chacun avec une icône :
   « C'est fermé », « A déménagé », « Les informations sont fausses ».
   Un champ commentaire optionnel, replié par défaut.
   Le parcours doit tenir en un seul appui pour les trois cas courants.

LIVRABLE
Cinq écrans, format 390 x 844, cohérents entre eux, avec les composants
réutilisables extraits : carte de commerce, tuile d'information, puce de
catégorie, pastille de fraîcheur, bouton principal, bouton secondaire.
```

---

## Après la maquette client

Un second prompt couvrira l'espace marchand et l'espace ambassadeur, qui
obéissent à des règles différentes et plus strictes :

- **Marchand** : création de fiche en trois écrans, ajustement manuel du point
  sur la carte, tableau de bord (vues, contacts WhatsApp), confirmation
  d'activité. Interface à très gros boutons, très peu de texte, aucune saisie
  libre obligatoire au-delà du repère.
- **Ambassadeur** : saisie hors ligne avec file d'attente de synchronisation
  visible, suivi des inscriptions et de leur statut de validation.

Ces écrans ne doivent pas hériter de la sophistication visuelle des écrans
client. Leur critère de réussite est qu'une commerçante de 50 ans les utilise
seule, sans aide, du premier coup.
