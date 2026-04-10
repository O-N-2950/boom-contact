// client/src/hooks/useOffline.ts
// Detects network state, queues offline mutations in IndexedDB, replays on reconnect

import { useState, useEffect, useCallback, useRef } from 'react';

// ── Types ─────────────────────────────────────────────────────

export interface OfflineSession {
  id: string;
  data: unknown;
  savedAt: string;
}

export interface QueuedMutation {
  id?: number;
  url: string;
  body: unknown;
  authToken: string | null;
  createdAt: string;
  procedureName: string;
}

// ── IndexedDB: mutation queue ─────────────────────────────────

const MUTATION_DB_NAME = 'boom-mutations';
const MUTATION_STORE = 'mutations';
const MUTATION_DB_VERSION = 1;

function openMutationDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(MUTATION_DB_NAME, MUTATION_DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(MUTATION_STORE)) {
        db.createObjectStore(MUTATION_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function addMutation(mutation: Omit<QueuedMutation, 'id'>): Promise<number> {
  const db = await openMutationDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MUTATION_STORE, 'readwrite');
    const store = tx.objectStore(MUTATION_STORE);
    const req = store.add(mutation);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function getAllMutations(): Promise<QueuedMutation[]> {
  const db = await openMutationDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MUTATION_STORE, 'readonly');
    const store = tx.objectStore(MUTATION_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as QueuedMutation[]);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function deleteMutation(id: number): Promise<void> {
  const db = await openMutationDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MUTATION_STORE, 'readwrite');
    const store = tx.objectStore(MUTATION_STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function countMutations(): Promise<number> {
  const db = await openMutationDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MUTATION_STORE, 'readonly');
    const store = tx.objectStore(MUTATION_STORE);
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

// ── IndexedDB: legacy pending sessions ────────────────────────

const SESSION_DB_NAME = 'boom-offline';
const SESSION_STORE = 'pending_sessions';

function openSessionDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(SESSION_DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(SESSION_STORE)) {
        db.createObjectStore(SESSION_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Replay logic (app-side, for browsers without Background Sync) ──

async function replayAllMutations(): Promise<number> {
  const mutations = await getAllMutations();
  let replayed = 0;

  for (const mutation of mutations) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'trpc-client',
      };
      if (mutation.authToken) {
        headers['Authorization'] = `Bearer ${mutation.authToken}`;
      }

      const response = await fetch(mutation.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(mutation.body),
      });

      if (response.ok || response.status < 500) {
        // Success or client error — remove from queue
        if (mutation.id != null) {
          await deleteMutation(mutation.id);
        }
        replayed++;
      }
      // 5xx: keep in queue for next attempt
    } catch {
      // Network still down — stop replaying
      break;
    }
  }

  return replayed;
}

// ── Hook ──────────────────────────────────────────────────────

export function useOffline() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const replayingRef = useRef(false);

  // Refresh pending count from IndexedDB
  const refreshCount = useCallback(async () => {
    try {
      const count = await countMutations();
      setPendingCount(count);
    } catch {
      // IndexedDB unavailable
    }
  }, []);

  // Replay mutations when online
  const replay = useCallback(async () => {
    if (replayingRef.current) return;
    replayingRef.current = true;
    setIsSyncing(true);

    try {
      // First, try Background Sync via SW
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        const sw = await navigator.serviceWorker.ready;
        try {
          await (sw as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register('sync-mutations');
        } catch {
          // Background Sync not available, fall through to app-side replay
        }
        // Also register legacy sync tag
        try {
          await (sw as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register('sync-session');
        } catch {
          // ignore
        }
      }

      // App-side replay as fallback (works on all browsers including iOS Safari)
      await replayAllMutations();
      await refreshCount();
    } finally {
      setIsSyncing(false);
      replayingRef.current = false;
    }
  }, [refreshCount]);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      setIsOffline(false);
      // Replay queued mutations
      replay();
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // Listen for SW messages about synced mutations
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'MUTATIONS_SYNCED') {
        setPendingCount(event.data.remaining ?? 0);
      }
    };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    // Initial count
    refreshCount();

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, [replay, refreshCount]);

  // Queue a mutation for later replay
  const queueMutation = useCallback(async (
    procedureName: string,
    url: string,
    body: unknown,
  ): Promise<number> => {
    const authToken = localStorage.getItem('boom_user_token');
    const id = await addMutation({
      url,
      body,
      authToken,
      procedureName,
      createdAt: new Date().toISOString(),
    });
    setPendingCount((c) => c + 1);
    return id;
  }, []);

  // Legacy: save session data offline (for backward compat)
  const saveOffline = useCallback(async (sessionData: unknown): Promise<string> => {
    return new Promise((resolve, reject) => {
      openSessionDB().then((db) => {
        const tx = db.transaction(SESSION_STORE, 'readwrite');
        const store = tx.objectStore(SESSION_STORE);
        const id = `offline_${Date.now()}`;
        const addReq = store.add({ id, data: sessionData, savedAt: new Date().toISOString() });
        addReq.onsuccess = () => {
          setPendingCount((c) => c + 1);
          db.close();
          resolve(id);
        };
        addReq.onerror = () => {
          db.close();
          reject(addReq.error);
        };
      }).catch(reject);
    });
  }, []);

  return {
    isOffline,
    pendingCount,
    isSyncing,
    queueMutation,
    saveOffline,
    replay,
    refreshCount,
  };
}
