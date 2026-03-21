// client/src/hooks/useOffline.ts
// Détecte l'état réseau et expose un banner + IndexedDB helpers

import { useState, useEffect, useCallback } from 'react';

export interface OfflineSession {
  id: string;
  data: unknown;
  savedAt: string;
}

export function useOffline() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      setIsOffline(false);
      // Déclencher sync si supporté
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then((sw) => {
          sw.sync.register('sync-session').catch(() => {});
        });
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Sauvegarder session localement si offline
  const saveOffline = useCallback(async (sessionData: unknown): Promise<string> => {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('boom-offline', 1);
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('pending_sessions')) {
          db.createObjectStore('pending_sessions', { keyPath: 'id', autoIncrement: true });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('pending_sessions', 'readwrite');
        const store = tx.objectStore('pending_sessions');
        const id = `offline_${Date.now()}`;
        const addReq = store.add({ id, data: sessionData, savedAt: new Date().toISOString() });
        addReq.onsuccess = () => {
          setPendingCount((c) => c + 1);
          resolve(id);
        };
        addReq.onerror = () => reject(addReq.error);
      };
      req.onerror = () => reject(req.error);
    });
  }, []);

  return { isOffline, pendingCount, saveOffline };
}
