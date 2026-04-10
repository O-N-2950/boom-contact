// client/src/components/OfflineBanner.tsx
// Banner affiche quand l'utilisateur est hors ligne + pending sync count

import React from 'react';
import { useOffline } from '../hooks/useOffline';

export default function OfflineBanner() {
  const { isOffline, pendingCount, isSyncing } = useOffline();

  // Show syncing indicator briefly even when back online
  if (!isOffline && !isSyncing && pendingCount === 0) return null;

  // Online but still syncing or has pending items
  if (!isOffline && (isSyncing || pendingCount > 0)) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-[9999] text-white flex items-center justify-center gap-2.5 text-[13px] font-semibold px-4 py-2"
        style={{ background: 'linear-gradient(90deg, #2563eb, #1d4ed8)', boxShadow: '0 2px 12px rgba(37,99,235,0.4)' }}
      >
        <span className="inline-block w-3 h-3 rounded-full border-2 border-white border-t-transparent" style={{ animation: 'spin 0.8s linear infinite' }} />
        <span>
          Synchronisation en cours...
          {pendingCount > 0 && ` (${pendingCount} action${pendingCount > 1 ? 's' : ''} restante${pendingCount > 1 ? 's' : ''})`}
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Offline state
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 left-0 right-0 z-[9999] text-white flex items-center justify-center gap-2.5 text-[13px] font-semibold px-4 py-2.5"
      style={{ background: 'linear-gradient(90deg, #FF6B00, #FF3500)', boxShadow: '0 2px 12px rgba(255,53,0,0.4)' }}
    >
      <span aria-hidden="true" style={{ fontSize: '14px' }}>&#x1F4E1;</span>
      <span>
        Mode hors-ligne &mdash; vos donn&eacute;es seront synchronis&eacute;es automatiquement
        {pendingCount > 0 && ` (${pendingCount} action${pendingCount > 1 ? 's' : ''} en attente de sync)`}
      </span>
    </div>
  );
}
