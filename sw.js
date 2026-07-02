// ★ SERVICE WORKER — Atlas Quiz géographique
// Change le numéro de version (v1 → v2, etc.) quand tu veux forcer
// la mise à jour du cache chez les utilisateurs.
const CACHE = 'atlas-v1';

// Fichiers mis en cache dès l'installation (le strict nécessaire)
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
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

// Stratégie : réseau d'abord, cache en secours.
// En plus, tout ce qui est téléchargé (drapeaux, contours…) est
// automatiquement gardé en cache pour la prochaine fois hors ligne.
self.addEventListener('fetch', event => {
  // On ne gère que les requêtes GET (pas d'envoi de données)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Copie de la réponse mise en cache au passage
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request)) // hors ligne → cache
  );
});
