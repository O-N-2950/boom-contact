import { useState, useEffect } from 'react';
import { LandingPage } from './pages/LandingPage';
import { ConstatFlow } from './pages/ConstatFlow';
import { JoinSession } from './pages/JoinSession';
import { AgentDashboard } from './pages/AgentDashboard';
import { PricingPage } from './pages/PricingPage';
import { CGUModal } from './components/CGUModal';

type AppView = 'landing' | 'cgu' | 'pricing' | 'constat' | 'join' | 'agents';

const EMAIL_KEY = 'boom_user_email';
const CGU_KEY   = 'boom_cgu_accepted';

function getInitialView(): AppView {
  const params = new URLSearchParams(window.location.search);
  if (params.get('session'))         return 'join';
  if (params.get('agents') === 'true' || window.location.hash === '#agents') return 'agents';
  if (params.get('pricing') === 'true') return 'pricing';
  if (params.get('payment') === 'success') return 'landing'; // post-Stripe redirect
  return 'landing';
}

export default function App() {
  const [view, setView] = useState<AppView>(getInitialView);
  const [userEmail, setUserEmail] = useState<string>(() => localStorage.getItem(EMAIL_KEY) || '');
  const [showCGU, setShowCGU] = useState(false);
  const [pendingAction, setPendingAction] = useState<'constat' | 'pricing' | null>(null);

  // Check post-payment success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      // Clear URL params
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const hasAcceptedCGU = () => !!localStorage.getItem(CGU_KEY);

  const handleCGUAccept = (email: string, consentMarketing: boolean) => {
    localStorage.setItem(EMAIL_KEY, email);
    localStorage.setItem(CGU_KEY, 'true');
    setUserEmail(email);
    setShowCGU(false);
    if (pendingAction === 'constat') setView('constat');
    if (pendingAction === 'pricing') setView('pricing');
    setPendingAction(null);
  };

  const startConstat = () => {
    if (!hasAcceptedCGU()) {
      setPendingAction('constat');
      setShowCGU(true);
    } else {
      setView('constat');
    }
  };

  const goToPricing = () => {
    if (!hasAcceptedCGU()) {
      setPendingAction('pricing');
      setShowCGU(true);
    } else {
      setView('pricing');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--black)] text-[var(--text)]">
      {view === 'landing'  && <LandingPage onStart={startConstat} onPricing={goToPricing} />}
      {view === 'constat'  && <ConstatFlow />}
      {view === 'join'     && <JoinSession />}
      {view === 'agents'   && <AgentDashboard />}
      {view === 'pricing'  && (
        <PricingPage
          userEmail={userEmail}
          onBack={() => setView('landing')}
        />
      )}

      {showCGU && (
        <CGUModal
          onAccept={handleCGUAccept}
          onClose={() => { setShowCGU(false); setPendingAction(null); }}
        />
      )}
    </div>
  );
}
