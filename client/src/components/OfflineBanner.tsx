// client/src/components/OfflineBanner.tsx
// Banner affiché quand l'utilisateur est hors ligne

import React from 'react';
import { useOffline } from '../hooks/useOffline';

export default function OfflineBanner() {
  const { isOffline, pendingCount } = useOffline();

  if (!isOffline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-0 left-0 right-0 z-[9999] text-white flex items-center justify-center gap-2.5 text-[13px] font-semibold px-4 py-2.5" style={{ background: 'linear-gradient(90deg, #FF6B00, #FF3500)', boxShadow: '0 2px 12px rgba(255,53,0,0.4)' }}>
      <span className="text-base">📡</span>
      <span>
        Mode hors ligne — vos données sont sauvegardées localement
        {pendingCount > 0 && ` (${pendingCount} en attente de sync)`}
      </span>
    </div>
  );
}
