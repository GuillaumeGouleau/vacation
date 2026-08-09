/* Service worker — Dépenses Vacances */
const CACHE = 'dv-cache-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-database-compat.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(ASSETS.map(a => c.add(a))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const sameOrigin = url.origin === location.origin;
  const isFirebaseSdk = url.host === 'www.gstatic.com';
  if (!sameOrigin && !isFirebaseSdk) return; // ne pas intercepter la base de données temps réel

  // Pages HTML : réseau d'abord (pour recevoir les mises à jour), cache en secours (hors ligne)
  if (e.request.mode === 'navigate' || (sameOrigin && url.pathname.endsWith('/index.html'))) {
    e.respondWith(
      fetch(e.request)
        .then(r => { const cl = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', cl)); return r; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Autres ressources : cache d'abord, réseau en secours (mis en cache au passage)
  e.respondWith(
    caches.match(e.request).then(hit =>
      hit || fetch(e.request).then(r => {
        const cl = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, cl));
        return r;
      })
    )
  );
});
