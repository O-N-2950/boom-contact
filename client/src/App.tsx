import { useState } from 'react';
import { LandingPage } from './pages/LandingPage';
import { ConstatFlow } from './pages/ConstatFlow';
import { JoinSession } from './pages/JoinSession';
import { AgentDashboard } from './pages/AgentDashboard';

type AppView = 'landing' | 'constat' | 'join' | 'agents';

function getInitialView(): AppView {
  const params = new URLSearchParams(window.location.search);
  if (params.get('session')) return 'join';
  if (params.get('agents') === 'true' || window.location.hash === '#agents') return 'agents';
  return 'landing';
}

export default function App() {
  const [view, setView] = useState<AppView>(getInitialView);

  return (
    <div className="min-h-screen bg-[var(--black)] text-[var(--text)]">
      {view === 'landing' && <LandingPage onStart={() => setView('constat')} />}
      {view === 'constat' && <ConstatFlow />}
      {view === 'join' && <JoinSession />}
      {view === 'agents' && <AgentDashboard />}
    </div>
  );
}
