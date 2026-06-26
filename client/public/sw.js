// boom.contact — Service Worker v38
// Full PWA offline mode: CacheFirst for shell, NetworkFirst for API, CacheFirst for tiles
// Backward-compatible with v24 — all old caches purged on activate

const CACHE_NAME = 'boom-contact-v42';
const TILE_CACHE = 'boom-tiles-v1';
const API_CACHE = 'boom-api-v1';
const OFFLINE_URL = '/';
const TILE_CACHE_LIMIT = 500;

// App shell resources to precache during install
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/logo-mark.webp',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

// ── INSTALL — precache app shell ──────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    }).then(() => {
      // skipWaiting immediat — crucial pour iOS PWA
      return self.skipWaiting();
    })
  );
});

// ── ACTIVATE — purge ALL old caches ───────────────────────────
self.addEventListener('activate', (event) => {
  const KEEP = [CACHE_NAME, TILE_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !KEEP.includes(k)).map((k) => {
          console.log('[SW v38] Suppression cache obsolete:', k);
          return caches.delete(k);
        })
      )
    ).then(() => {
      console.log('[SW v38] Actif — anciens caches supprimes');
      return self.clients.claim();
    })
  );
});

// ── FETCH — smart routing per resource type ───────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ne jamais intercepter les requetes non-http (chrome-extension://, data:, blob:, etc.) :
  // elles ne sont pas cachables et cache.put() leverait
  // "Failed to execute 'put' on 'Cache': Request scheme '...' is unsupported".
  // On laisse le navigateur les gerer nativement.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Only handle GET for caching (POST/PUT mutations handled by app-side queue)
  // Socket.io: always network, never cached
  if (url.pathname.startsWith('/socket.io')) return;

  // tRPC API: NetworkFirst with cached fallback for queries
  if (url.pathname.startsWith('/trpc')) {
    // Only cache GET requests (tRPC queries via httpBatchLink use GET by default)
    if (request.method === 'GET') {
      event.respondWith(networkFirstAPI(request));
    } else {
      // POST mutations: try network, return offline error if down
      event.respondWith(
        fetch(request).catch(() =>
          new Response(JSON.stringify({
            error: { message: 'OFFLINE', code: 'OFFLINE' }
          }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          })
        )
      );
    }
    return;
  }

  // OSM tile images: CacheFirst with size limit
  if (url.hostname.includes('tile.openstreetmap.org') ||
      url.hostname.includes('tiles.') ||
      url.pathname.includes('/tile/')) {
    event.respondWith(cacheFirstTile(request));
    return;
  }

  // Hashed static assets (JS, CSS with content hash): CacheFirst (immutable)
  // Files like /assets/vendor-abc123.js never change — safe to serve from cache forever
  const isHashedAsset = /\/assets\/[^/]+\.[a-f0-9]{8,}\.(js|css)$/.test(url.pathname);
  if (isHashedAsset) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Fonts: CacheFirst (they never change for a given URL)
  const ext = url.pathname.split('.').pop();
  if (['woff2', 'woff', 'ttf', 'otf', 'eot'].includes(ext)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Other static assets (images, svg, etc.): StaleWhileRevalidate
  if (['js', 'css', 'png', 'jpg', 'jpeg', 'webp', 'svg', 'ico', 'gif'].includes(ext)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // HTML and everything else: NetworkFirst (SPA navigation)
  event.respondWith(networkFirst(request));
});

// ── CacheFirst — for immutable content (hashed assets, fonts) ──
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok && request.method === 'GET') {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

// ── CacheFirst for tiles — with LRU eviction ──────────────────
async function cacheFirstTile(request) {
  const cache = await caches.open(TILE_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok && request.method === 'GET') {
      cache.put(request, response.clone());
      // Evict old tiles if over limit (async, non-blocking)
      trimCache(TILE_CACHE, TILE_CACHE_LIMIT);
    }
    return response;
  } catch {
    // Return a transparent 1px PNG as fallback for missing tiles
    return new Response(
      Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='), c => c.charCodeAt(0)),
      { status: 200, headers: { 'Content-Type': 'image/png' } }
    );
  }
}

// ── NetworkFirst for API — cache GET responses for offline reads ──
async function networkFirstAPI(request) {
  try {
    const response = await fetch(request);
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Fallback to cached API response
    const cached = await caches.match(request);
    if (cached) return cached;

    return new Response(JSON.stringify({
      error: { message: 'OFFLINE', code: 'OFFLINE' }
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ── StaleWhileRevalidate ──────────────────────────────────────
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  // Fetch fresh version in background
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok && request.method === 'GET') {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  // Return cached immediately if available, otherwise wait for network
  return cached || (await fetchPromise) || new Response('Offline', { status: 503 });
}

// ── NetworkFirst — for HTML / SPA navigation ──────────────────
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Fallback: serve SPA shell for navigation requests
    const fallback = await caches.match(OFFLINE_URL);
    return fallback || new Response('boom.contact — Hors ligne', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

// ── Trim cache to max entries (LRU-style: remove oldest) ──────
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      // Delete oldest entries (FIFO)
      const toDelete = keys.slice(0, keys.length - maxItems);
      await Promise.all(toDelete.map((k) => cache.delete(k)));
    }
  } catch (e) {
    console.debug('[SW] trimCache error', e);
  }
}

// ── MESSAGE — force update depuis l'app ────────────────────────
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data === 'GET_VERSION') {
    event.source?.postMessage({ version: 'v38', cache: CACHE_NAME });
  }
  // Replay mutations — triggered from app when back online
  if (event.data === 'REPLAY_MUTATIONS') {
    event.waitUntil(replayMutations());
  }
});

// ── BACKGROUND SYNC ────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-session') {
    event.waitUntil(syncPendingSessions());
  }
  if (event.tag === 'sync-mutations') {
    event.waitUntil(replayMutations());
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
      } catch (error) { console.error('SW: session sync failed', error); }
    }
  } catch (error) { console.error('SW: syncPendingSessions failed', error); }
}

// ── Replay queued mutations from IndexedDB ─────────────────────
async function replayMutations() {
  try {
    const db = await openMutationDB();
    const mutations = await getAllMutations(db);
    let replayedCount = 0;

    for (const mutation of mutations) {
      try {
        const token = mutation.authToken;
        const headers = {
          'Content-Type': 'application/json',
          'X-Requested-With': 'trpc-client',
        };
        if (token) headers['Authorization'] = 'Bearer ' + token;

        const response = await fetch(mutation.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(mutation.body),
        });

        if (response.ok || response.status < 500) {
          // Success or client error (4xx) — remove from queue either way
          await deleteMutation(db, mutation.id);
          replayedCount++;
        }
        // 5xx — keep in queue for next retry
      } catch {
        // Network still down — stop replay
        break;
      }
    }

    // Notify all clients about the updated count
    if (replayedCount > 0) {
      const clients = await self.clients.matchAll();
      const remaining = mutations.length - replayedCount;
      clients.forEach((client) => {
        client.postMessage({ type: 'MUTATIONS_SYNCED', remaining });
      });
    }
  } catch (error) {
    console.error('SW: replayMutations failed', error);
  }
}

// ── IndexedDB helpers (pending_sessions — legacy) ──────────────
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

// ── IndexedDB helpers (mutation queue) ─────────────────────────
function openMutationDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('boom-mutations', 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('mutations')) {
        db.createObjectStore('mutations', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getAllMutations(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('mutations', 'readonly');
    const req = tx.objectStore('mutations').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function deleteMutation(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('mutations', 'readwrite');
    const req = tx.objectStore('mutations').delete(id);
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
