// boom.contact — Service Worker v3.0 — cache purgé automatiquement à chaque déploiement
// Offline-first : critique pour accidents en montagne / tunnel / campagne

const CACHE_NAME = 'boom-contact-v3';
const STATIC_CACHE = 'boom-static-v3';
const DATA_CACHE = 'boom-data-v3';

// Assets à cacher immédiatement à l'installation
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png',
];

// ——— INSTALL ———
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ——— ACTIVATE — purge tous les anciens caches ———
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== DATA_CACHE)
          .map((k) => {
            console.log('[SW] Suppression ancien cache:', k);
            return caches.delete(k);
          })
      )
    ).then(() => {
      console.log('[SW] v3 actif — caches purgés');
      return self.clients.claim();
    })
  );
});

// Message pour forcer la mise à jour depuis l'app
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ——— FETCH ———
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ne pas intercepter les requêtes tRPC en offline — laisser passer pour erreur explicite
  // sauf pour les assets statiques
  if (url.pathname.startsWith('/trpc')) {
    // Stratégie network-first pour les appels API
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  // Pour socket.io : toujours network
  if (url.pathname.startsWith('/socket.io')) {
    return;
  }

  // Pour tous les assets (JS, CSS, images) : cache-first
  event.respondWith(cacheFirst(request));
});

// Cache-first : pour assets statiques
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline et pas en cache → retourner la page principale (SPA fallback)
    const fallback = await caches.match('/');
    return fallback || new Response('Hors ligne — boom.contact', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

// Network-first : pour les appels API
async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    // Offline → retourner erreur JSON structurée pour que l'app gère proprement
    return new Response(JSON.stringify({
      error: { message: 'OFFLINE', code: 'OFFLINE' }
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ——— BACKGROUND SYNC (pour sauvegarder session hors ligne) ———
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-session') {
    event.waitUntil(syncPendingSessions());
  }
});

async function syncPendingSessions() {
  try {
    const db = await openIndexedDB();
    const pending = await getPendingSessions(db);
    for (const session of pending) {
      try {
        await fetch('/trpc/session.syncOffline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(session.data)
        });
        await markSynced(db, session.id);
      } catch {
        // Sera retenté au prochain sync
      }
    }
  } catch {
    // IndexedDB non dispo
  }
}

// ——— IndexedDB helpers ———
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('boom-offline', 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('pending_sessions')) {
        db.createObjectStore('pending_sessions', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getPendingSessions(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_sessions', 'readonly');
    const req = tx.objectStore('pending_sessions').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function markSynced(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_sessions', 'readwrite');
    const req = tx.objectStore('pending_sessions').delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ——— PUSH NOTIFICATIONS (optionnel — préparé pour le module Police) ———
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'boom.contact', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'boom-notification',
    })
  );
});

