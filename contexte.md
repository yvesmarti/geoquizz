# Contexte du projet GeoQuizz

Ce document décrit fidèlement l'état actuel du site tel qu'implémenté dans le code, pour servir de base à un futur travail de développement.

## 1. Aperçu général

- **Nom affiché** : « Atlas — Quiz géographique »
- **Nature** : application web à page unique (SPA), 100 % côté client
- **Stack** : HTML5, CSS3 et JavaScript vanilla — aucun framework, aucune dépendance externe, aucun bundler/build
- **Fichier principal** : `index.html` (~640 lignes, contient le HTML, le CSS et le JS)
- **Backend / base de données** : aucun. Les données des pays sont codées en dur dans le JavaScript
- **Déploiement** : fichier statique, servable tel quel (hébergement statique type GitHub Pages)
- **Langue** : interface entièrement en français, pas d'i18n

## 2. Structure du dépôt

```
/
├── index.html      # l'application (HTML + CSS + JS)
├── drapeaux/       # 180 fichiers SVG de drapeaux (code ISO 2 lettres en MAJUSCULES, ex: FR.svg)
└── contours/       # 242 fichiers SVG de silhouettes de pays (code ISO 2 lettres en minuscules, ex: fr.svg)
```

Il n'y a pas de README, pas de package.json, pas de fichier de configuration de build ou de tests.

## 3. Parcours utilisateur (3 écrans, navigation par affichage/masquage CSS)

### Écran 1 — Accueil (`#screen-home`)
- Titre : « Reconnais-tu le monde ? »
- Texte d'intro précisant que Drapeaux et Contours sont jouables, Hymnes arrive bientôt
- **Sélecteur de format de réponse** : QCM à 4 choix (par défaut) ou Saisie libre
- **Sélecteur de mode de quiz**, sous forme de 3 cartes :
  - 🚩 **Drapeaux** — jouable
  - 🗺️ **Contours** — jouable
  - 🎵 **Hymnes** — désactivé, badge « Bientôt »

### Écran 2 — Quiz (`#screen-quiz`)
- En-tête : score courant + rangée de « dots » de progression (un par question)
- Carte de question : image du drapeau ou du contour à identifier
- Deux modes de réponse mutuellement exclusifs (selon le format choisi à l'accueil) :
  - **QCM** : grille de 4 boutons de réponse
  - **Saisie** : champ texte + bouton « Valider » (ou touche Entrée)
- Feedback visuel immédiat après réponse (vert = correct, rouge = incorrect ; en saisie, le nom correct est affiché si l'utilisateur se trompe)
- Bouton « Suivant → » qui apparaît après avoir répondu

### Écran 3 — Résultat (`#screen-result`)
- Score final affiché en grand (X/10)
- Titre et message contextuels selon le taux de réussite :
  - 100 % → « Sans-faute ! 🌍 »
  - ≥ 70 % → « Beau parcours ! »
  - ≥ 40 % → « Pas mal ! »
  - < 40 % → « En route ! »
- Boutons « Rejouer » (relance le même mode) et « Menu » (retour à l'accueil)

## 4. Fonctionnalités de jeu

### Modes de quiz
- **Drapeaux** : 198 pays disponibles, image = SVG local dans `drapeaux/{CODE}.svg` (code en majuscules), avec repli automatique sur `https://flagcdn.com/w320/{code}.png` si le fichier local est absent (géré par `img.onerror`)
- **Contours** : 157 pays disponibles (198 − 41 exclus), image = SVG local dans `contours/{code}.svg` uniquement, sans repli en ligne
  - Pays exclus du mode Contours faute de fichier SVG (`PAYS_SANS_CONTOUR`) : Micronésie (fm), Îles Marshall (mh), Palestine (ps), Tuvalu (tv), Kosovo (xk)
- **Hymnes** : mode prévu mais non implémenté, bouton désactivé dans l'UI

### Formats de réponse
- **QCM à 4 choix** :
  - 3 leurres tirés en priorité parmi les pays du même continent que la bonne réponse
  - si le continent ne fournit pas assez de leurres, complète avec des pays pris au hasard dans l'ensemble des pays
  - les 4 options sont mélangées puis affichées ; boutons désactivés après le premier clic
- **Saisie libre** :
  - comparaison après normalisation (`normaliser()`) : minuscules, suppression des accents (NFD), suppression de tout caractère non alphanumérique — tolère espaces, tirets, apostrophes et accents

### Moteur de quiz
- 10 questions par partie (`NB_QUESTIONS = 10`), tirées aléatoirement sans remise dans le pool du mode choisi via un mélange Fisher-Yates (`melange()`)
- Score binaire : +1 point par bonne réponse, 0 sinon, pas de pénalité
- Aucune persistance : pas de localStorage, pas de cookies, pas de compte utilisateur, pas d'historique entre les parties — chaque partie repart de zéro

## 5. Données

Les pays sont définis en dur dans la constante `PAYS` (tableau d'objets `{code, nom, continent}`), soit **198 pays** au total répartis par continent :

| Continent | Nombre de pays |
|-----------|---------------:|
| Europe | 46 |
| Asie | 47 |
| Afrique | 54 |
| Amériques | 35 |
| Océanie | 16 |
| **Total** | **198** |

Assets disponibles : 180 SVG de drapeaux, 242 SVG de contours (mais seuls 157 sont utilisés, les 5 pays de `PAYS_SANS_CONTOUR` étant exclus du mode Contours).

## 6. Design / UI

- **Thème** : « atlas de nuit » — fond bleu marine sombre avec grille en filigrane évoquant des méridiens, accents dorés
- **Palette (variables CSS)** : `--bg` #0f1a2b, `--panel` #17253c, `--panel-2` #1e304c, `--text` #eaf1f9, `--muted` #8ea6c2, `--gold` #e6b74d (accent), `--ok` #3fb68b (vert succès), `--ko` #e2604c (rouge erreur)
- **Typographies** : Bricolage Grotesque (titres/display) + Inter (texte), chargées depuis Google Fonts
- **Mise en page** : conteneur centré max 640px, mobile-first, grille de réponses en 2 colonnes qui passe à 1 colonne sous 400px
- **Accessibilité** : `prefers-reduced-motion` respecté (désactive les transitions), `:focus-visible` avec contour doré, `scroll-behavior: smooth`
- **Composants principaux** : logo/rose des vents (SVG inline), sélecteur segmenté (`.seg`), cartes de mode (`.mode`), badges de statut (`.badge.on` / `.badge.off`), dots de progression, carte de question (`.flag-card`), boutons de réponse QCM (`.ans` avec états `.correct`/`.wrong`), bloc de saisie avec verdict (`.verdict.ok`/`.verdict.ko`)

## 7. Architecture technique (JavaScript)

Approche entièrement fonctionnelle, sans classes, sans framework, état conservé dans des variables globales :

- `partie[]` : pool de questions de la partie en cours (résultat du mélange + slice à 10)
- `index` : index de la question courante
- `score` : score courant
- `format` : `'qcm'` ou `'saisie'`
- `repondu` : empêche de valider deux fois la même question
- `modeActuel` : `'drapeaux'` ou `'contours'`

Fonctions clés :

| Fonction | Rôle |
|---|---|
| `melange(tab)` | mélange Fisher-Yates |
| `normaliser(s)` | normalise une saisie texte pour comparaison |
| `choisirFormat(f)` | change le format de réponse (accueil) |
| `afficherEcran(id)` | bascule l'écran actif (SPA) |
| `startQuiz(mode)` | initialise une nouvelle partie |
| `construireDots()` / `majDots()` | gèrent l'affichage de la progression |
| `poserQuestion()` | affiche la question courante (image + branchement QCM/Saisie) |
| `poserQCM(bonPays)` / `repondreQCM(...)` | logique du mode QCM |
| `poserSaisie(bonPays)` / `validerSaisie()` | logique du mode Saisie |
| `montrerSuivant()` / `nextQuestion()` | navigation entre questions |
| `afficherResultat()` | calcule et affiche l'écran de résultat |
| `goHome()` | retour à l'accueil |

## 8. Limites actuelles et pistes connues

- Pas de persistance des scores ni d'historique entre les parties
- Pas de comptes utilisateurs / authentification
- Pas de multi-langue (français uniquement)
- Nombre de questions fixe (10), pas de niveaux de difficulté, pas de mode chronométré, pas de multijoueur
- Pas de back-office / outil d'administration des données
- Aucun test automatisé, aucun linting configuré
- Mode Hymnes annoncé dans l'UI mais non implémenté
- 41 pays (sur les 198) n'ont pas encore de SVG de contour et sont donc exclus du mode Contours

## 9. Historique récent (d'après les commits)

- Ajout des SVG de drapeaux, extension de la liste des pays
- Ajout des SVG de contours de pays
- Activation du mode Contours (Contours passe de « bientôt » à jouable)
- Extension récente de la liste des pays : Finlande, Hongrie, Ukraine, Haïti, Honduras, Jamaïque, Uruguay, Jordanie, Oman, Qatar
