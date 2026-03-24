// boom.contact — Service Worker v4
// Stratégie : Network-First pour tout
// iOS PWA : toujours servir la version fraîche du réseau

const CACHE_NAME = 'boom-contact-v4';
const OFFLINE_URL = '/';

// ── INSTALL — minimal, juste mettre en cache la page principale ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([OFFLINE_URL, '/manifest.json']);
    }).then(() => {
      // skipWaiting immédiat — crucial pour iOS PWA
      return self.skipWaiting();
    })
  );
});

// ── ACTIVATE — purger TOUS les anciens caches ──────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => {
          console.log('[SW v4] Suppression cache obsolète:', k);
          return caches.delete(k);
        })
      )
    ).then(() => {
      console.log('[SW v4] Actif — tous les anciens caches supprimés');
      return self.clients.claim();
    })
  );
});

// ── FETCH — Network-First pour tout ───────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Socket.io : toujours réseau, jamais caché
  if (url.pathname.startsWith('/socket.io')) return;

  // tRPC API : network-only avec fallback JSON d'erreur
  if (url.pathname.startsWith('/trpc')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: { message: 'OFFLINE', code: 'OFFLINE' } }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // Tout le reste (HTML, JS, CSS, images) : Network-First
  event.respondWith(networkFirst(request));
});

async function networkFirst(request) {
  try {
    // Toujours essayer le réseau en premier
    const response = await fetch(request);
    
    // Mettre en cache la réponse fraîche
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Réseau indispo → fallback cache
    const cached = await caches.match(request);
    if (cached) return cached;
    
    // Pas de cache → page principale (SPA)
    const fallback = await caches.match(OFFLINE_URL);
    return fallback || new Response('boom.contact — Hors ligne', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

// ── MESSAGE — force update depuis l'app ────────────────────────
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data === 'GET_VERSION') {
    event.source?.postMessage({ version: 'v4', cache: CACHE_NAME });
  }
});

// ── BACKGROUND SYNC ────────────────────────────────────────────
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
      } catch { }
    }
  } catch { }
}

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

// ── PUSH NOTIFICATIONS ─────────────────────────────────────────
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
