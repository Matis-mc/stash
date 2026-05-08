// Service Worker pour STASH
const CACHE_NAME = 'stash-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/app.js',
  '/style.css',
  '/sources.json',
  '/manifest.json'
];

/* =============================================
   INSTALL EVENT
============================================= */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(URLS_TO_CACHE);
      })
      .catch((e) => {
        console.warn('[SW] Cache setup error:', e);
      })
  );
  self.skipWaiting();
});

/* =============================================
   ACTIVATE EVENT
============================================= */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
  );
  self.clients.claim();
});

/* =============================================
   FETCH EVENT - Cache First + Network Fallback
============================================= */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes externes et les URLs non-HTTPS/localhost
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Stratégie pour les assets statiques (JS, CSS, JSON)
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.url.includes('.json') ||
    request.url.includes('.svg') ||
    request.url.includes('.png') ||
    request.url.includes('.jpg') ||
    request.url.includes('.jpeg')
  ) {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) return response;
          return fetch(request)
            .then((response) => {
              // Mettre en cache les nouvelles requêtes
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, responseClone);
                });
              }
              return response;
            });
        })
        .catch(() => {
          // Fallback pour les assets critiques
          if (request.destination === 'style') {
            return new Response('body { background: #f7f3ee; color: #1a1a1a; }', {
              headers: { 'Content-Type': 'text/css' }
            });
          }
          return new Response('', { status: 404 });
        })
    );
  }

  // Stratégie par défaut pour HTML et autres requêtes
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) return response;
        return fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          });
      })
      .catch(() => {
        // Offline fallback
        return caches.match('/index.html')
          .then((response) => {
            return response || new Response(
              '<!DOCTYPE html><html><body><h1>Offline</h1><p>Vous êtes hors ligne. Les données en cache sont disponibles.</p></body></html>',
              { headers: { 'Content-Type': 'text/html' } }
            );
          });
      })
  );
});


