/* =====================================================================
   2) OÙ TROUVER LE DRAPEAU / LE CONTOUR
   On cherche D'ABORD ton fichier local (dossier "drapeaux"). Si le
   fichier n'existe pas encore, on bascule automatiquement sur l'image
   en ligne (voir la fonction poserQuestion, plus bas). Les contours
   n'ont pas de secours en ligne : PAYS_CONTOURS ne contient que les
   pays pour lesquels le fichier existe déjà.
   ===================================================================== */
function flagUrlLocal(code){ return `drapeaux/${code.toUpperCase()}.svg`; } // TES fichiers
function flagUrlSecours(code){ return `https://flagcdn.com/w320/${code}.png`; } // secours en ligne
function contourUrlLocal(code){ return `contours/${code}.svg`; }

/* =====================================================================
   3) LE MOTEUR DE JEU
   ===================================================================== */
let nbQuestions = 10;        // ★ NB QUESTIONS : choisi sur l'accueil (10/20/50)
let continentActuel = 'monde'; // ★ CONTINENT : 'monde' = pas de filtre
let partie = [];             // la partie en cours : liste de {pays, mode}
let index = 0;
let score = 0;
let erreurs = [];            // ★ RÉCAP : les questions ratées de la partie en cours
let format = 'qcm';          // 'qcm' ou 'saisie'
let repondu = false;         // évite de valider deux fois la même question
let modeActuel = 'drapeaux'; // mode de la PARTIE : un des modes ci-dessous, ou 'revision'
let modeQuestion = 'drapeaux'; // ★ RÉVISION : mode de la QUESTION en cours (en révision,
                               // chaque question garde le mode où l'erreur a été faite)
let dotsEnTexte = false;     // ★ NB QUESTIONS : au-delà de 20, compteur texte au lieu des points
let chronoActuel = 0;        // ★ CHRONO : secondes par question (0 = pas de chrono)
let chronoRAF = null;        // ★ CHRONO : animation en cours (requestAnimationFrame)
let chronoFinA = 0;          // ★ CHRONO : instant où le temps sera écoulé
let streak = 0;              // ★ STREAK : bonnes réponses d'affilée en cours
let meilleureStreak = 0;     // ★ STREAK : meilleure série de la partie

/* ★ SEO : liste des modes accessibles par l'adresse (…/#capitales) et
   titre d'onglet propre à chacun (mis à jour quand on lance une partie) */
const MODES_VALIDES = ['drapeaux','inverse','contours','capitales','monnaies','revision'];
const TITRES_MODES = {
  drapeaux:'Quiz Drapeaux', inverse:'Quiz Drapeaux inversés', contours:'Quiz Contours',
  capitales:'Quiz Capitales', monnaies:'Quiz Monnaies', revision:'Révision'
};
const TITRE_DEFAUT = document.title;

// mélange un tableau
function melange(tab){
  const t = [...tab];
  for(let i = t.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [t[i], t[j]] = [t[j], t[i]];
  }
  return t;
}

// enlève accents/majuscules/tirets pour comparer les saisies
function normaliser(s){
  return s.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'') // enlève les accents
    .replace(/[^a-z0-9]/g,'');                        // enlève espaces, tirets, apostrophes
}

/* Le texte attendu/affiché selon le mode de la question :
   capitale en mode Capitales, nom du pays partout ailleurs */
function libelleReponse(pays){
  return modeQuestion === 'capitales' ? pays.cap : pays.nom;
}
function bonneSaisie(valeur, bonPays){
  const v = normaliser(valeur);
  if(v === normaliser(libelleReponse(bonPays))) return true;
  if(modeQuestion === 'capitales' && bonPays.capAlt){
    return bonPays.capAlt.some(alt => v === normaliser(alt));
  }
  return false;
}

/* =====================================================================
   ★ RÉVISION : la « banque d'erreurs » retient (dans le navigateur)
   les questions ratées : {mode, code pays}. Une bonne réponse en mode
   Révision retire l'entrée. Plafonnée à 100 entrées (plus ancien évincé).
   ===================================================================== */
const CLE_BANQUE = 'atlas-banque-erreurs';
function lireBanque(){
  try{ return JSON.parse(localStorage.getItem(CLE_BANQUE)) || []; }
  catch(e){ return []; }
}
function ecrireBanque(banque){
  localStorage.setItem(CLE_BANQUE, JSON.stringify(banque));
}
function ajouterBanque(mode, code){
  const banque = lireBanque().filter(e => !(e.mode === mode && e.code === code));
  banque.push({mode, code});
  while(banque.length > 100) banque.shift();
  ecrireBanque(banque);
}
function retirerBanque(mode, code){
  ecrireBanque(lireBanque().filter(e => !(e.mode === mode && e.code === code)));
}
/* active/désactive la carte Révision de l'accueil selon la banque */
function majCarteRevision(){
  const carte = document.getElementById('modeRevision');
  const badge = document.getElementById('revisionBadge');
  const n = lireBanque().length;
  carte.disabled = n === 0;
  carte.classList.toggle('soon', n === 0);
  badge.className = 'badge ' + (n === 0 ? 'off' : 'on');
  badge.textContent = n === 0 ? 'Vide' : n + ' à revoir';
}
/* note une erreur : récap de la partie + banque de révision */
function noterErreur(bonPays, donnee){
  erreurs.push({pays: bonPays, mode: modeQuestion, donnee});
  ajouterBanque(modeQuestion, bonPays.code);
}

/* ---- réglages de l'accueil ---- */
function choisirFormat(f){
  format = f;
  document.querySelectorAll('#segFormat button').forEach(b => {
    const on = b.dataset.format === f;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  });
}
/* ★ NB QUESTIONS */
function choisirNb(n){
  nbQuestions = n;
  document.querySelectorAll('#segNb button').forEach(b => {
    const on = +b.dataset.nb === n;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  });
}
/* ★ CONTINENT */
function choisirContinent(c){
  continentActuel = c;
  document.querySelectorAll('#segContinent button').forEach(b => {
    const on = b.dataset.cont === c;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  });
}
/* ★ CHRONO */
function choisirChrono(s){
  chronoActuel = s;
  document.querySelectorAll('#segChrono button').forEach(b => {
    const on = +b.dataset.chrono === s;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  });
}

function afficherEcran(id){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0,0);
}

function startQuiz(mode){
  /* ★ RÉVISION : la partie est tirée de la banque d'erreurs ; chaque
     question sera posée dans le mode où l'erreur avait été faite */
  if(mode === 'revision'){
    const banque = lireBanque();
    if(banque.length === 0){ goHome(); return; }
    const entrees = melange(banque).slice(0, nbQuestions)
      .map(e => ({pays: PAYS.find(p => p.code === e.code), mode: e.mode}))
      .filter(e => e.pays);
    lancerPartie(entrees, 'revision');
    return;
  }
  // pool de base selon le mode (le mode inversé pioche dans tous les pays,
  // comme Drapeaux et Capitales, grâce au secours en ligne des drapeaux)
  let pool = mode === 'contours' ? PAYS_CONTOURS : PAYS;
  // ★ CONTINENT : filtre facultatif
  if(continentActuel !== 'monde') pool = pool.filter(p => p.continent === continentActuel);
  // ★ NB QUESTIONS : si le pool est plus petit que demandé (ex. Océanie en 50
  // questions), la partie fait simplement la taille du pool
  lancerPartie(melange(pool).slice(0, nbQuestions).map(p => ({pays: p, mode})), mode);
}

/* ★ RÉVISION (résultat) : relance uniquement les questions ratées de la
   partie qui vient de se terminer, chacune dans son mode d'origine */
function rejouerErreurs(){
  if(erreurs.length === 0) return;
  lancerPartie(melange(erreurs.map(e => ({pays: e.pays, mode: e.mode}))), 'revision');
}

/* démarre une partie déjà construite (liste de {pays, mode}) */
function lancerPartie(entrees, modeJeu){
  modeActuel = modeJeu;
  partie = entrees;
  index = 0; score = 0;
  erreurs = [];              // ★ RÉCAP
  streak = 0; meilleureStreak = 0;   // ★ STREAK
  majStreakBadge(false);
  document.getElementById('scoreVal').textContent = 0;
  construireDots();
  /* ★ SEO : adresse partageable (…/#capitales) + titre d'onglet du mode */
  if(location.hash !== '#' + modeJeu) location.hash = modeJeu;
  document.title = TITRES_MODES[modeJeu] + ' — Atlas';
  afficherEcran('screen-quiz');
  poserQuestion();
}

function construireDots(){
  const box = document.getElementById('dots');
  box.innerHTML = '';
  dotsEnTexte = partie.length > 20;   // ★ NB QUESTIONS
  if(dotsEnTexte){
    const s = document.createElement('span');
    s.className = 'progress-txt'; s.id = 'progressTxt';
    box.appendChild(s);
    return;
  }
  for(let i = 0; i < partie.length; i++){
    const d = document.createElement('span'); d.className = 'dot'; box.appendChild(d);
  }
}
function majDots(){
  if(dotsEnTexte){   // ★ NB QUESTIONS : compteur "7 / 50"
    document.getElementById('progressTxt').innerHTML = '<b>' + (index + 1) + '</b> / ' + partie.length;
    return;
  }
  document.querySelectorAll('.dot').forEach((d, i) => {
    d.className = 'dot' + (i < index ? ' done' : i === index ? ' now' : '');
  });
}

function poserQuestion(){
  const bonPays = partie[index].pays;
  /* ★ RÉVISION : le mode de la question (identique au mode de la partie,
     sauf en révision où chaque question garde son mode d'origine) */
  modeQuestion = partie[index].mode;
  repondu = false;
  majDots();

  const img = document.getElementById('flagImg');
  const label = document.getElementById('qLabel');
  const nomEl = document.getElementById('paysNom');
  img.classList.toggle('contour-img', modeQuestion === 'contours');
  img.style.display = 'block';
  nomEl.classList.remove('solo');

  if(modeQuestion === 'contours'){
    label.textContent = 'Quel est ce pays ?';
    nomEl.style.display = 'none';
    img.onerror = null;
    img.alt = 'Silhouette du pays à identifier';
    img.src = contourUrlLocal(bonPays.code);

  } else if(modeQuestion === 'capitales'){
    label.textContent = 'Quelle est la capitale de ce pays ?';
    nomEl.style.display = 'block';
    nomEl.textContent = bonPays.nom;
    img.onerror = () => { img.onerror = null; img.src = flagUrlSecours(bonPays.code); };
    img.alt = 'Drapeau : ' + bonPays.nom;
    img.src = flagUrlLocal(bonPays.code);

  } else if(modeQuestion === 'monnaies'){
    /* ★ MONNAIES : même présentation que Capitales (drapeau + nom du pays) */
    label.textContent = 'Quelle est la monnaie de ce pays ?';
    nomEl.style.display = 'block';
    nomEl.textContent = bonPays.nom;
    img.onerror = () => { img.onerror = null; img.src = flagUrlSecours(bonPays.code); };
    img.alt = 'Drapeau : ' + bonPays.nom;
    img.src = flagUrlLocal(bonPays.code);

  } else if(modeQuestion === 'inverse'){
    /* ★ INVERSÉ : pas d'image dans la carte, juste le nom du pays.
       Les drapeaux sont dans les boutons de réponse. */
    label.textContent = 'Quel est le drapeau de ce pays ?';
    img.style.display = 'none';
    nomEl.style.display = 'block';
    nomEl.classList.add('solo');
    nomEl.textContent = bonPays.nom;

  } else {
    label.textContent = 'Quel est ce pays ?';
    nomEl.style.display = 'none';
    img.onerror = () => { img.onerror = null; img.src = flagUrlSecours(bonPays.code); };
    img.alt = 'Drapeau à identifier';
    img.src = flagUrlLocal(bonPays.code);
  }

  document.getElementById('nextBtn').style.display = 'none';

  /* ★ FLUIDITÉ : on télécharge discrètement l'image de la question
     SUIVANTE pendant que le joueur réfléchit. Résultat : plus de temps
     de chargement visible entre deux questions (utile en 4G). */
  const suivant = partie[index + 1];
  if(suivant){
    const pre = new Image();
    if(suivant.mode === 'contours'){
      pre.src = contourUrlLocal(suivant.pays.code);
    } else {
      pre.onerror = () => { pre.onerror = null; pre.src = flagUrlSecours(suivant.pays.code); };
      pre.src = flagUrlLocal(suivant.pays.code);
    }
  }

  /* ★ INVERSÉ / MONNAIES : ces modes sont toujours en QCM (drapeau à
     cliquer, ou noms de monnaie partagés entre pays), quel que soit le
     format choisi à l'accueil */
  if(modeQuestion === 'inverse' || modeQuestion === 'monnaies') poserQCM(bonPays);
  else if(format === 'qcm') poserQCM(bonPays);
  else poserSaisie(bonPays);

  demarrerChrono();   // ★ CHRONO : sans effet si le chrono est désactivé
}

/* ★ MONNAIES : tire 3 monnaies différentes de celle de bonPays, dédoublonnées
   par code monnaie (pas par pays, plusieurs pays partagent une monnaie).
   Priorité aux pays du même continent, complément dans le reste du monde
   si besoin (le Set des codes déjà vus n'est pas réinitialisé). */
function leurresMonnaie(bonPays){
  const bonneMonnaie = MONNAIES[bonPays.code];
  const dejaVus = new Set([bonneMonnaie.code]);
  const resultat = [];
  function ajouterDepuis(liste){
    for(const pays of melange(liste)){
      if(resultat.length >= 3) break;
      const m = MONNAIES[pays.code];
      if(dejaVus.has(m.code)) continue;
      dejaVus.add(m.code);
      resultat.push(m);
    }
  }
  ajouterDepuis(PAYS.filter(p => p.continent === bonPays.continent && p.code !== bonPays.code));
  if(resultat.length < 3) ajouterDepuis(PAYS.filter(p => p.code !== bonPays.code));
  return resultat;
}

/* ---- mode QCM (textes OU drapeaux selon le mode) ---- */
function poserQCM(bonPays){
  document.getElementById('answers').style.display = 'grid';
  document.getElementById('saisie').style.display = 'none';

  if(modeQuestion === 'monnaies'){
    /* ★ MONNAIES : boutons de monnaies (pas de pays), validation par code */
    const bonneMonnaie = MONNAIES[bonPays.code];
    const choix = melange([bonneMonnaie, ...leurresMonnaie(bonPays)]);
    const box = document.getElementById('answers');
    box.innerHTML = '';
    choix.forEach(monnaie => {
      const b = document.createElement('button');
      b.className = 'ans';
      b.dataset.code = monnaie.code;   // code monnaie (ex. "EUR"), pas le nom
      b.textContent = monnaie.nom;
      b.onclick = () => repondreQCM(b, monnaie, bonPays);
      box.appendChild(b);
    });
    return;
  }

  const memeContinent = PAYS.filter(p => p.continent === bonPays.continent && p.code !== bonPays.code);
  let leurres = melange(memeContinent).slice(0, 3);
  if(leurres.length < 3){
    const autres = melange(PAYS.filter(p => p.code !== bonPays.code && !leurres.includes(p)));
    leurres = leurres.concat(autres).slice(0, 3);
  }
  const choix = melange([bonPays, ...leurres]);

  const box = document.getElementById('answers');
  box.innerHTML = '';
  choix.forEach(pays => {
    const b = document.createElement('button');
    b.dataset.code = pays.code;   // repère fiable pour retrouver la bonne réponse
    if(modeQuestion === 'inverse'){
      /* ★ INVERSÉ : le bouton contient un drapeau */
      b.className = 'ans flag-ans';
      const im = document.createElement('img');
      im.alt = 'Drapeau proposé';
      im.onerror = () => { im.onerror = null; im.src = flagUrlSecours(pays.code); };
      im.src = flagUrlLocal(pays.code);
      b.appendChild(im);
    } else {
      b.className = 'ans';
      b.textContent = libelleReponse(pays);   // nom du pays OU sa capitale
    }
    b.onclick = () => repondreQCM(b, pays, bonPays);
    box.appendChild(b);
  });
}
/* code attendu pour la bonne réponse : celui du pays, sauf en mode
   Monnaies où on compare des codes de monnaie (ex. "EUR"), pas de pays */
function codeAttendu(bonPays){
  return modeQuestion === 'monnaies' ? MONNAIES[bonPays.code].code : bonPays.code;
}
function repondreQCM(bouton, choisi, bonPays){
  if(repondu) return;
  repondu = true;
  stopChrono();   // ★ CHRONO : le temps s'arrête dès qu'on répond
  const bonCode = codeAttendu(bonPays);
  document.querySelectorAll('.ans').forEach(b => {
    b.disabled = true;
    if(b.dataset.code === bonCode) b.classList.add('correct');
  });
  if(choisi.code === bonCode){
    bonneReponse(bonPays);
  } else {
    bouton.classList.add('wrong');
    casserStreak();                       // ★ STREAK
    noterErreur(bonPays, choisi.nom);     // ★ RÉCAP + banque de révision
  }
  montrerSuivant();
}

/* ★ commun aux deux formats : score, streak, et retrait de la banque
   d'erreurs quand une question est corrigée en mode Révision */
function bonneReponse(bonPays){
  score++;
  bumpScore();   // ★ FEEDBACK : petit rebond du compteur de score
  streak++;      // ★ STREAK
  if(streak > meilleureStreak) meilleureStreak = streak;
  majStreakBadge(true);
  if(modeActuel === 'revision') retirerBanque(modeQuestion, bonPays.code);
}
/* ★ STREAK : le badge 🔥 apparaît à partir de 3 bonnes réponses d'affilée */
function casserStreak(){ streak = 0; majStreakBadge(false); }
function majStreakBadge(rebond){
  const badge = document.getElementById('streakBadge');
  const val = document.getElementById('streakVal');
  badge.style.display = streak >= 3 ? 'block' : 'none';
  val.textContent = streak;
  if(rebond && streak >= 3){
    val.classList.remove('bump');
    void val.offsetWidth;
    val.classList.add('bump');
  }
}

/* ★ FEEDBACK : met à jour le score avec un rebond. L'astuce
   "void offsetWidth" force le navigateur à redémarrer l'animation
   même si la classe était déjà présente. */
function bumpScore(){
  const sv = document.getElementById('scoreVal');
  sv.textContent = score;
  sv.classList.remove('bump');
  void sv.offsetWidth;
  sv.classList.add('bump');
}

/* ---- mode SAISIE ---- */
function poserSaisie(bonPays){
  document.getElementById('answers').style.display = 'none';
  document.getElementById('saisie').style.display = 'block';

  const input = document.getElementById('saisieInput');
  const verdict = document.getElementById('verdict');
  input.value = '';
  input.disabled = false;
  input.classList.remove('correct','wrong');   // ★ FEEDBACK : on repart propre
  input.placeholder = modeActuel === 'capitales' ? 'Écris le nom de la capitale…' : 'Écris le nom du pays…';
  verdict.textContent = '';
  verdict.className = 'verdict';
  document.getElementById('validerBtn').disabled = false;

  input.onkeydown = (e) => { if(e.key === 'Enter') validerSaisie(); };
  input.focus();
}
function validerSaisie(){
  if(repondu) return;
  const bonPays = partie[index].pays;
  const input = document.getElementById('saisieInput');
  const verdict = document.getElementById('verdict');
  if(input.value.trim() === '') return; // rien tapé : on ne valide pas

  repondu = true;
  stopChrono();   // ★ CHRONO : le temps s'arrête dès qu'on répond
  input.disabled = true;
  document.getElementById('validerBtn').disabled = true;

  if(bonneSaisie(input.value, bonPays)){
    bonneReponse(bonPays);              // score + streak (+ révision)
    input.classList.add('correct');     // bordure verte sur le champ
    verdict.className = 'verdict ok';
    verdict.textContent = '✓ Correct !';
  } else {
    input.classList.add('wrong');       // ★ FEEDBACK : le champ tremble en rouge
    verdict.className = 'verdict ko';
    verdict.innerHTML = '✗ Raté. C\'était <b>' + libelleReponse(bonPays) + '</b>.';
    casserStreak();                     // ★ STREAK
    /* ★ RÉCAP + banque de révision : on note l'erreur avec la saisie du joueur */
    noterErreur(bonPays, input.value.trim());
  }
  montrerSuivant();
}

/* =====================================================================
   ★ CHRONO : compte à rebours par question. La barre est animée en
   JavaScript (requestAnimationFrame) : elle reste donc exacte même si
   les animations CSS sont désactivées (prefers-reduced-motion), et il
   suffit d'annuler l'animation pour figer la barre quand on répond.
   ===================================================================== */
function demarrerChrono(){
  const bar = document.getElementById('chronoBar');
  if(!chronoActuel){ bar.style.display = 'none'; return; }
  const fill = document.getElementById('chronoFill');
  bar.style.display = 'block';
  fill.classList.remove('urgent');
  fill.style.width = '100%';
  chronoFinA = performance.now() + chronoActuel * 1000;
  const tick = (maintenant) => {
    const reste = Math.max(0, chronoFinA - maintenant);
    fill.style.width = (reste / (chronoActuel * 1000) * 100) + '%';
    fill.classList.toggle('urgent', reste <= 3000);   // rouge sous 3 s
    if(reste <= 0){ chronoRAF = null; tempsEcoule(); return; }
    chronoRAF = requestAnimationFrame(tick);
  };
  chronoRAF = requestAnimationFrame(tick);
}
function stopChrono(){
  if(chronoRAF){ cancelAnimationFrame(chronoRAF); chronoRAF = null; }
}
/* temps écoulé = mauvaise réponse : on révèle la bonne réponse,
   on note l'erreur, et on passe à la suite comme d'habitude */
function tempsEcoule(){
  if(repondu) return;
  repondu = true;
  const bonPays = partie[index].pays;
  const bonCode = codeAttendu(bonPays);
  // format QCM : on désactive les boutons et on montre la bonne réponse
  document.querySelectorAll('.ans').forEach(b => {
    b.disabled = true;
    if(b.dataset.code === bonCode) b.classList.add('correct');
  });
  // format Saisie : on fige le champ et on affiche la correction
  const saisieVisible = document.getElementById('saisie').style.display !== 'none';
  if(saisieVisible){
    const input = document.getElementById('saisieInput');
    const verdict = document.getElementById('verdict');
    input.disabled = true;
    document.getElementById('validerBtn').disabled = true;
    verdict.className = 'verdict ko';
    verdict.innerHTML = '⏱ Temps écoulé ! C\'était <b>' + libelleReponse(bonPays) + '</b>.';
  }
  casserStreak();                       // ★ STREAK
  noterErreur(bonPays, '⏱ temps écoulé');
  montrerSuivant();
}

/* ---- commun aux deux modes ---- */
function montrerSuivant(){
  const btn = document.getElementById('nextBtn');
  btn.style.display = 'inline-block';
  btn.focus();
}
function nextQuestion(){
  index++;
  if(index < partie.length) poserQuestion();
  else afficherResultat();
}

function afficherResultat(){
  document.getElementById('finalScore').textContent = score;
  document.getElementById('finalTotal').textContent = partie.length;
  const ratio = score / partie.length;
  let titre, msg;
  if(modeActuel === 'revision'){
    /* ★ RÉVISION : pas de record, un message sur les notions corrigées */
    titre = "Révision terminée&nbsp;! 📚";
    msg = score === 0 ? "Ces questions reviendront : rejoue-les pour les retenir."
      : score + (score > 1 ? " notions corrigées" : " notion corrigée")
        + " — elles sortent de ta pile de révision.";
  }
  else if(ratio === 1){ titre = "Sans-faute&nbsp;! 🌍"; msg = "Un vrai géographe. Chapeau."; }
  else if(ratio >= .7){ titre = "Beau parcours&nbsp;!"; msg = "Tu maîtrises la carte du monde."; }
  else if(ratio >= .4){ titre = "Pas mal&nbsp;!"; msg = "Encore quelques tours et ce sera parfait."; }
  else { titre = "En route&nbsp;!"; msg = "Le monde est vaste, rejoue pour progresser."; }
  document.getElementById('resultTitle').innerHTML = titre;
  document.getElementById('resultMsg').textContent = msg;

  /* ★ RECORD : localStorage = petite mémoire du navigateur qui survit
     à la fermeture de la page. On garde le meilleur pourcentage par mode
     (records séparés quand le chrono est actif). Pas de record en révision. */
  const recEl = document.getElementById('recordMsg');
  if(modeActuel === 'revision'){
    const reste = lireBanque().length;
    recEl.textContent = reste === 0 ? '✨ Ta pile de révision est vide, bravo !'
      : 'Encore ' + reste + ' question' + (reste > 1 ? 's' : '') + ' dans ta pile de révision.';
    recEl.style.color = 'var(--muted)';
  } else {
    const pct = Math.round(ratio * 100);
    const cle = 'atlas-record-' + modeActuel + (chronoActuel ? '-chrono' + chronoActuel : '');
    const ancien = +(localStorage.getItem(cle) || 0);
    const suffixe = chronoActuel ? ' (chrono ' + chronoActuel + ' s)' : '';
    if(pct > ancien){
      localStorage.setItem(cle, pct);
      recEl.textContent = '🏆 Nouveau record' + suffixe + ' : ' + pct + ' % de bonnes réponses !';
      recEl.style.color = 'var(--gold)';
    } else {
      recEl.textContent = 'Ton record dans ce mode' + suffixe + ' : ' + ancien + ' %';
      recEl.style.color = 'var(--muted)';
    }
  }

  /* ★ STREAK : meilleure série de la partie + record absolu de série */
  const stEl = document.getElementById('streakMsg');
  if(meilleureStreak >= 3){
    const ancienStreak = +(localStorage.getItem('atlas-streak') || 0);
    if(meilleureStreak > ancienStreak){
      localStorage.setItem('atlas-streak', meilleureStreak);
      stEl.textContent = '🔥 Nouveau record de série : ' + meilleureStreak + " bonnes réponses d'affilée !";
      stEl.style.color = 'var(--gold)';
    } else {
      stEl.textContent = '🔥 Meilleure série de la partie : ' + meilleureStreak;
      stEl.style.color = 'var(--muted)';
    }
  } else {
    stEl.textContent = '';
  }

  /* ★ RÉVISION : bouton pour rejouer immédiatement les erreurs de la partie */
  const btnErr = document.getElementById('btnRejouerErreurs');
  btnErr.style.display = erreurs.length > 0 ? 'inline-block' : 'none';
  btnErr.textContent = 'Rejouer mes erreurs (' + erreurs.length + ')';

  construireRecap();   // ★ RÉCAP
  afficherEcran('screen-result');
}

/* ★ RÉCAP : construit la liste des erreurs avec la correction.
   Chaque ligne : vignette (drapeau ou contour) + bonne réponse
   + ce que le joueur avait répondu. Rien ne s'affiche en cas
   de sans-faute. */
function construireRecap(){
  const box = document.getElementById('recap');
  box.innerHTML = '';
  if(erreurs.length === 0) return;

  const h = document.createElement('h3');
  h.textContent = 'À retenir (' + erreurs.length + ')';
  box.appendChild(h);

  erreurs.forEach(e => {
    const item = document.createElement('div');
    item.className = 'err-item';

    // vignette : contour en mode Contours, drapeau partout ailleurs
    // (chaque erreur garde son propre mode : indispensable en révision)
    const im = document.createElement('img');
    if(e.mode === 'contours'){
      im.className = 'contour-mini';
      im.src = contourUrlLocal(e.pays.code);
    } else {
      im.onerror = () => { im.onerror = null; im.src = flagUrlSecours(e.pays.code); };
      im.src = flagUrlLocal(e.pays.code);
    }
    im.alt = 'Drapeau : ' + e.pays.nom;

    // texte : bonne réponse en gras, réponse donnée en dessous
    const txt = document.createElement('div');
    txt.className = 'txt';
    const bonne = document.createElement('b');
    bonne.textContent = e.mode === 'capitales' ? e.pays.nom + ' → ' + e.pays.cap
      : e.mode === 'monnaies' ? e.pays.nom + ' → ' + MONNAIES[e.pays.code].nom
      : e.pays.nom;
    const detail = document.createElement('small');
    detail.innerHTML = 'Ta réponse : <span></span>';
    detail.querySelector('span').textContent = e.donnee;
    txt.appendChild(bonne);
    txt.appendChild(detail);

    item.appendChild(im);
    item.appendChild(txt);
    box.appendChild(item);
  });
}

function goHome(){
  stopChrono();                 // ★ CHRONO : au cas où une question était en cours
  majCarteRevision();           // ★ RÉVISION : rafraîchit le compteur de la carte
  /* ★ SEO : on retire le #mode de l'adresse et on remet le titre d'origine
     (replaceState = changer l'adresse sans recharger ni créer d'historique) */
  history.replaceState(null, '', location.pathname + location.search);
  document.title = TITRE_DEFAUT;
  afficherEcran('screen-home');
}

/* ★ MODALE : confirmation personnalisée, générique.
   showConfirm(message, onYes) affiche la modale ; onYes est appelé sur OK.
   Fermeture : Annuler, clic sur le fond ou touche Échap. */
let confirmCallback = null;
function showConfirm(message, onYes){
  document.getElementById('confirmMsg').textContent = message;
  confirmCallback = onYes;
  document.getElementById('confirmOverlay').style.display = 'flex';
  document.getElementById('confirmNo').focus();
}
function hideConfirm(){
  document.getElementById('confirmOverlay').style.display = 'none';
  confirmCallback = null;
}
document.getElementById('confirmYes').addEventListener('click', () => {
  const cb = confirmCallback;
  hideConfirm();
  if(cb) cb();
});
document.getElementById('confirmNo').addEventListener('click', hideConfirm);
document.getElementById('confirmOverlay').addEventListener('click', (e) => {
  if(e.target.id === 'confirmOverlay') hideConfirm();
});
document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape' && document.getElementById('confirmOverlay').style.display !== 'none') hideConfirm();
});

/* ★ QUITTER : retour au menu en plein milieu d'une partie, avec
   confirmation pour éviter de perdre sa progression par erreur */
function quitQuiz(){
  showConfirm('Quitter la partie en cours et revenir au menu ?', goHome);
}

/* ★ SEO : navigation par l'adresse. Ouvrir …/#capitales lance le quiz
   Capitales ; le bouton Précédent du navigateur ramène au menu. */
function appliquerHash(){
  const m = location.hash.slice(1);
  if(MODES_VALIDES.includes(m)){
    // ne rien faire si la partie demandée est déjà en cours
    const quizActif = document.getElementById('screen-quiz').classList.contains('active');
    if(!(quizActif && modeActuel === m)) startQuiz(m);
  } else if(!document.getElementById('screen-home').classList.contains('active')){
    goHome();
  }
}
window.addEventListener('hashchange', appliquerHash);

/* ★ CLAVIER : sur ordinateur, les touches 1 à 4 répondent au QCM.
   Sans effet sur téléphone, et ignoré pendant la saisie libre. */
document.addEventListener('keydown', (e) => {
  if(!document.getElementById('screen-quiz').classList.contains('active')) return;
  if(document.getElementById('confirmOverlay').style.display !== 'none') return;
  if(repondu || document.activeElement.tagName === 'INPUT') return;
  const n = ['1','2','3','4'].indexOf(e.key);
  if(n === -1) return;
  const boutons = document.querySelectorAll('#answers .ans');
  if(boutons[n]) boutons[n].click();
});

/* ---- au chargement ---- */
majCarteRevision();   // ★ RÉVISION : active la carte si la banque n'est pas vide
/* ★ SEO : si l'adresse contient déjà un mode (…/#capitales), on lance
   directement la partie correspondante */
if(MODES_VALIDES.includes(location.hash.slice(1))) appliquerHash();
