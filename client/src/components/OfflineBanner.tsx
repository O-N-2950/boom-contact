// client/src/components/OfflineBanner.tsx
// Banner affiché quand l'utilisateur est hors ligne

import React from 'react';
import { useOffline } from '../hooks/useOffline';

export default function OfflineBanner() {
  const { isOffline, pendingCount } = useOffline();

  if (!isOffline) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      background: 'linear-gradient(90deg, #FF6B00, #FF3500)',
      color: '#fff',
      padding: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      fontSize: 13,
      fontWeight: 600,
      boxShadow: '0 2px 12px rgba(255,53,0,0.4)',
    }}>
      <span style={{ fontSize: 16 }}>📡</span>
      <span>
        Mode hors ligne — vos données sont sauvegardées localement
        {pendingCount > 0 && ` (${pendingCount} en attente de sync)`}
      </span>
    </div>
  );
}
