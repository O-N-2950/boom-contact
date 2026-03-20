import { useState } from 'react';
import { LandingPage } from './pages/LandingPage';
import { ConstatFlow } from './pages/ConstatFlow';
import { JoinSession } from './pages/JoinSession';

type AppView = 'landing' | 'constat' | 'join';

function getInitialView(): AppView {
  // Check if URL has a session QR token → join flow
  const params = new URLSearchParams(window.location.search);
  if (params.get('session')) return 'join';
  return 'landing';
}

export default function App() {
  const [view, setView] = useState<AppView>(getInitialView);

  return (
    <div className="min-h-screen bg-[var(--black)] text-[var(--text)]">
      {view === 'landing' && <LandingPage onStart={() => setView('constat')} />}
      {view === 'constat' && <ConstatFlow />}
      {view === 'join' && <JoinSession />}
    </div>
  );
}
