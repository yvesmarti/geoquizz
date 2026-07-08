# Contexte du projet GeoQuizz

Ce document décrit fidèlement l'état actuel du site tel qu'implémenté dans le code, pour servir de base à un futur travail de développement.

## 1. Aperçu général

- **Nom affiché** : « Atlas — Quiz géographique »
- **Nature** : application web à page unique (SPA), 100 % côté client, installable (PWA)
- **Stack** : HTML5, CSS3 et JavaScript vanilla — aucun framework, aucune dépendance externe, aucun bundler/build
- **Fichier principal** : `index.html` (contient le HTML, le CSS et le JS)
- **Backend / base de données** : aucun. Les données des pays sont codées en dur dans le JavaScript
- **Déploiement** : fichiers statiques, servables tels quels (hébergement statique type GitHub Pages)
- **Langue** : interface entièrement en français, pas d'i18n

## 2. Structure du dépôt

```
/
├── index.html            # l'application (HTML + CSS + JS)
├── sw.js                 # service worker (cache hors-ligne, réseau d'abord)
├── manifest.webmanifest  # manifest PWA (installation sur l'écran d'accueil)
├── robots.txt            # SEO : autorise l'indexation, pointe le sitemap
├── sitemap.xml           # SEO : plan du site (URL racine)
├── og-image.png          # SEO : image d'aperçu 1200×630 pour les partages
├── icon-192.png / icon-512.png / apple-touch-icon.png  # icônes PWA
├── drapeaux/             # 180 SVG de drapeaux (code ISO 2 lettres en MAJUSCULES, ex: FR.svg)
└── contours/             # 242 SVG de silhouettes de pays (code ISO en minuscules, ex: fr.svg)
```

Il n'y a pas de README, pas de package.json, pas de configuration de build ni de tests.

## 3. Parcours utilisateur (3 écrans, navigation par affichage/masquage CSS)

### Écran 1 — Accueil (`#screen-home`)
- Titre : « Reconnais-tu le monde ? »
- **Sélecteurs d'options** (boutons segmentés) :
  - **Réponses** : QCM à 4 choix (défaut) ou Saisie libre
  - **Questions** : 10 (défaut), 20 ou 50 par partie
  - **Continent** : Monde (défaut), Europe, Asie, Afrique, Amériques, Océanie
  - **Chrono** : Sans (défaut), 10 s ou 5 s par question
- **Cartes de mode** :
  - 🚩 **Drapeaux** — devine le pays d'après son drapeau
  - 🎯 **Drapeaux inversés** — trouve le drapeau du pays nommé (toujours en QCM)
  - 🗺️ **Contours** — devine le pays d'après sa silhouette
  - 🏛️ **Capitales** — trouve la capitale du pays affiché
  - 💱 **Monnaies** — trouve la monnaie du pays affiché (toujours en QCM)
  - 📚 **Révision** — rejoue les questions ratées (désactivée si la banque d'erreurs est vide ; badge « n à revoir » sinon)
- Footer descriptif (texte SEO)

### Écran 2 — Quiz (`#screen-quiz`)
- En-tête : bouton « ← Menu » (avec confirmation), score courant, badge de série 🔥 (dès 3 bonnes réponses d'affilée), progression (dots jusqu'à 20 questions, compteur texte au-delà)
- Barre de chrono qui se vide (si chrono actif ; rouge sous 3 s ; temps écoulé = question comptée fausse, bonne réponse révélée)
- Carte de question : drapeau, contour, ou nom du pays selon le mode
- **QCM** : 4 boutons (leurres tirés en priorité dans le même continent ; en Monnaies, dédoublonnés par code monnaie) — touches 1-4 au clavier sur ordinateur
- **Saisie** : champ texte, comparaison insensible aux accents/majuscules/ponctuations (`normaliser()`), réponses alternatives acceptées pour certaines capitales (`capAlt`)
- Feedback immédiat (vert/rouge, animations), préchargement de l'image suivante

### Écran 3 — Résultat (`#screen-result`)
- Score final X/total, titre et message contextuels selon le taux de réussite
- Ligne record : meilleur pourcentage par mode (records séparés quand le chrono est actif), stocké en localStorage
- Ligne série : meilleure série de la partie + record absolu de série (localStorage `atlas-streak`)
- Boutons « Rejouer », « Rejouer mes erreurs (n) » (si erreurs) et « Menu »
- **Récap « À retenir »** : liste des erreurs avec vignette, bonne réponse et réponse donnée

## 4. Fonctionnalités transverses

### Banque d'erreurs / mode Révision
- Chaque erreur (`{mode, code pays}`) est enregistrée en localStorage (`atlas-banque-erreurs`, dédupliquée, plafonnée à 100 entrées)
- Le mode **Révision** tire ses questions de cette banque ; chaque question est posée dans le mode où l'erreur avait été faite (quiz mixte)
- Une bonne réponse en révision retire l'entrée de la banque ; pas de record dans ce mode
- « Rejouer mes erreurs » relance immédiatement les questions ratées de la partie qui vient de finir

### Navigation par URL / SEO
- Chaque mode est accessible par hash : `…/#drapeaux`, `…/#capitales`, etc. (lance la partie au chargement) ; le titre d'onglet est mis à jour par mode ; bouton Précédent = retour menu
- Balises Open Graph + Twitter Card (image `og-image.png`), `canonical`, données structurées JSON-LD (`WebApplication`), `robots.txt` et `sitemap.xml`

### PWA / hors-ligne
- `sw.js` : cache `atlas-v3`, stratégie réseau d'abord avec repli cache ; tout ce qui est téléchargé (drapeaux, contours) est gardé pour le hors-ligne
- Manifest : installation sur l'écran d'accueil, plein écran

### Persistance (localStorage uniquement, pas de compte)
- `atlas-record-{mode}` et `atlas-record-{mode}-chrono{n}` : meilleur % par mode
- `atlas-streak` : meilleure série absolue
- `atlas-banque-erreurs` : banque de révision

## 5. Données

- `PAYS` : ~198 pays `{code, nom, continent, cap, capAlt?}` (code ISO-2 minuscule) — Europe 46, Asie 47, Afrique 54, Amériques 35, Océanie 16
- `PAYS_SANS_CONTOUR` : fm, mh, ps, tv, xk — exclus du mode Contours
- `MONNAIES` : une entrée par pays `{code, nom, symbole}` (plusieurs pays partagent une monnaie : Euro, Francs CFA…)
- Drapeaux : SVG local `drapeaux/{CODE}.svg` avec repli en ligne `flagcdn.com` ; contours : SVG local uniquement

## 6. Design / UI

- **Thème** : « atlas de nuit » — fond bleu marine sombre avec grille en filigrane évoquant des méridiens, accents dorés
- **Palette (variables CSS)** : `--bg` #0f1a2b, `--panel` #17253c, `--panel-2` #1e304c, `--text` #eaf1f9, `--muted` #8ea6c2, `--gold` #e6b74d (accent), `--ok` #3fb68b, `--ko` #e2604c
- **Typographies** : Bricolage Grotesque (titres) + Inter (texte), via Google Fonts
- **Mise en page** : mobile-first, conteneur 640px (960/1120px sur grand écran, modes en 2 colonnes), réponses en 1 colonne sous 400px
- **Accessibilité** : `prefers-reduced-motion` respecté (la barre de chrono est pilotée en JS et reste exacte), `:focus-visible` doré, alt sur les images

## 7. Architecture technique (JavaScript)

Approche fonctionnelle, sans classes, état dans des variables globales :

- `partie[]` : liste de `{pays, mode}` (le mode par question permet la révision mixte)
- `modeActuel` : mode de la partie (`'drapeaux'`, `'inverse'`, `'contours'`, `'capitales'`, `'monnaies'` ou `'revision'`)
- `modeQuestion` : mode de la question en cours
- `index`, `score`, `erreurs[]`, `format`, `repondu`, `nbQuestions`, `continentActuel`, `chronoActuel`, `streak`, `meilleureStreak`

Fonctions clés : `melange()`, `normaliser()`, `startQuiz(mode)`, `lancerPartie(entrees, modeJeu)`, `poserQuestion()`, `poserQCM()`/`repondreQCM()`, `poserSaisie()`/`validerSaisie()`, `demarrerChrono()`/`stopChrono()`/`tempsEcoule()`, `bonneReponse()`/`casserStreak()`, `lireBanque()`/`ajouterBanque()`/`retirerBanque()`, `rejouerErreurs()`, `afficherResultat()`, `construireRecap()`, `appliquerHash()`.

## 8. Limites actuelles et pistes connues

- Pas de comptes utilisateurs / classements en ligne (localStorage uniquement)
- Pas de multi-langue (français uniquement)
- Pas de quiz du jour / partage de score, pas de multijoueur, pas de niveaux de difficulté
- Aucun test automatisé, aucun linting configuré
- 41 pays (sur ~198) n'ont pas de SVG de contour et sont exclus du mode Contours
