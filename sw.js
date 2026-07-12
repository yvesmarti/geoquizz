// ★ SERVICE WORKER — Atlas Quiz géographique
// Change le numéro de version (v1 → v2, etc.) quand tu veux forcer
// la mise à jour du cache chez les utilisateurs.
const CACHE = 'atlas-v4';

// Fichiers mis en cache dès l'installation (le strict nécessaire)
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

// Installation : on met en cache les fichiers de base
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(CORE))
  );
  self.skipWaiting(); // active la nouvelle version sans attendre
});

// Activation : on supprime les anciens caches (versions précédentes)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Stratégie mixte :
// - drapeaux/ et contours/ ne changent jamais une fois publiés → cache
//   d'abord (rapide, pas de re-téléchargement inutile à chaque partie),
//   avec le réseau en secours si l'image n'est pas encore en cache.
// - le reste (app, manifest…) → réseau d'abord, cache en secours, pour
//   que les mises à jour du site arrivent sans attendre.
// Seules les réponses valides (response.ok) sont mises en cache, pour
// ne jamais figer une erreur réseau (404/5xx) dans le cache hors ligne.
const ASSETS_IMMUABLES = /\/(drapeaux|contours)\//;

self.addEventListener('fetch', event => {
  // On ne gère que les requêtes GET (pas d'envoi de données)
  if (event.request.method !== 'GET') return;

  const estAssetImmuable = ASSETS_IMMUABLES.test(new URL(event.request.url).pathname);

  event.respondWith(
    estAssetImmuable
      ? caches.match(event.request).then(reponse => reponse || depuisReseau(event.request))
      : depuisReseau(event.request).catch(() => caches.match(event.request))
  );
});

function depuisReseau(request){
  return fetch(request).then(response => {
    if(response.ok){
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(request, copy));
    }
    return response;
  });
}
