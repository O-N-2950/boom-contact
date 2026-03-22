import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import App from './App';
import { trpc } from './trpc';
import './i18n'; // ← i18next init (must be before App)
import './index.css';
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
      links: [httpBatchLink({ url: '/trpc' })],
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
// Lance la détection IP après le render initial
// Ne change la langue QUE si l'utilisateur n'a pas déjà fait un choix
detectBestLanguage().then(({ lang, source, country }) => {
  // Si source = localStorage → l'utilisateur a déjà choisi, on ne touche à rien
  if (source !== 'localStorage') {
    applyLang(lang);
    // Stocker le pays détecté pour l'ordre du sélecteur de langue
    if (country) {
      sessionStorage.setItem('boom_detected_country', country);
    }
  }
});

// PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
