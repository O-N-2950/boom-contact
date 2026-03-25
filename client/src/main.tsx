import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import App from './App';
import { trpc } from './trpc';
import './i18n'; // ← i18next init (must be before App)
import './index.css';
import { initTheme } from './components/ThemeToggle';

// Appliquer le thème sauvegardé AVANT le premier render — évite le flash
initTheme();
import { detectBestLanguage, applyLang } from './i18n';

function Root() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries:   { retry: 1, staleTime: 30_000 },
      mutations: { retry: 0 },
    },
  }));

  const [trpcClientInstance] = useState(() =>
    trpc.createClient({
      links: [httpBatchLink({
        url: '/trpc',
        headers: () => {
          const token = localStorage.getItem('boom_user_token');
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      })],
    })
  );

  return (
    <trpc.Provider client={trpcClientInstance} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);

// ── Détection langue intelligente (async, non-bloquante) ──────
detectBestLanguage().then(({ lang, source, country }) => {
  if (source !== 'localStorage') {
    applyLang(lang);
    if (country) {
      sessionStorage.setItem('boom_detected_country', country);
    }
  }
});

// ── PWA Service Worker — avec force-update iOS ────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      // Force la mise à jour immédiate du SW (critique pour iOS PWA raccourci)
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nouveau SW prêt — forcer activation sans attendre fermeture onglets
              newWorker.postMessage('SKIP_WAITING');
              // Recharger la page pour charger la nouvelle version
              window.location.reload();
            }
          });
        }
      });
      
      // Vérifier si une mise à jour est disponible au démarrage
      registration.update().catch(() => {});
      
    } catch (e) {
      console.warn('SW registration failed:', e);
    }
  });
}
