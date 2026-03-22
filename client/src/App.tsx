import { ErrorBoundary } from './components/ErrorBoundary';
import OfflineBanner from './components/OfflineBanner';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LandingPage } from './pages/LandingPage';
import { ConstatFlow } from './pages/ConstatFlow';
import { JoinSession } from './pages/JoinSession';
import { AgentDashboard } from './pages/AgentDashboard';
import { PricingPage } from './pages/PricingPage';
import { CGUModal } from './components/CGUModal';
import { PoliceLogin } from './pages/PoliceLogin';
import { PoliceDashboard } from './pages/PoliceDashboard';
import { PoliceFlow } from './pages/PoliceFlow';
import { applyDir } from './i18n';

type AppView = 'landing' | 'cgu' | 'pricing' | 'constat' | 'join' | 'agents' | 'police_login' | 'police_dashboard' | 'police_flow';

const EMAIL_KEY = 'boom_user_email';
const CGU_KEY   = 'boom_cgu_accepted';

function getInitialView(): AppView {
  const params = new URLSearchParams(window.location.search);
  if (params.get('session'))         return 'join';
  if (params.get('agents') === 'true' || window.location.hash === '#agents') return 'agents';
  if (params.get('pricing') === 'true') return 'pricing';
  if (params.get('session') && params.get('role') === 'police') {
    const token = params.get('token') || localStorage.getItem('boom_police_token');
    if (token) return 'police_flow';
  }
  if (params.get('police') === 'true' || window.location.pathname.startsWith('/police')) {
    const token = localStorage.getItem('boom_police_token');
    return token ? 'police_dashboard' : 'police_login';
  }
  if (params.get('payment') === 'success') return 'landing';
  return 'landing';
}

export default function App() {
  const { i18n } = useTranslation();
  const [view, setView] = useState<AppView>(getInitialView);
  const [userEmail, setUserEmail] = useState<string>(() => localStorage.getItem(EMAIL_KEY) || '');
  const [showCGU, setShowCGU] = useState(false);
  const [policeToken, setPoliceToken] = useState<string>(() => localStorage.getItem('boom_police_token') || '');
  const [policeUser, setPoliceUser]   = useState<unknown>(() => {
    try { return JSON.parse(localStorage.getItem('boom_police_user') || 'null'); } catch { return null; }
  });
  const [pendingAction, setPendingAction] = useState<'constat' | 'pricing' | null>(null);
  const [policeSessionId, setPoliceSessionId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('session') || '';
  });
  const [policeFlowToken, setPoliceFlowToken] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('token') || localStorage.getItem('boom_police_token') || '';
  });

  // Apply RTL direction whenever language changes
  useEffect(() => {
    applyDir(i18n.language);
  }, [i18n.language]);

  // Check post-payment success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const hasAcceptedCGU = () => !!localStorage.getItem(CGU_KEY);

  const handleCGUAccept = (email: string, _consentMarketing: boolean) => {
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
    <ErrorBoundary>
    <OfflineBanner />
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

      {view === 'police_login' && (
        <PoliceLogin onLogin={(token, user) => { setPoliceToken(token); setPoliceUser(user); setView('police_dashboard'); }} />
      )}
      {view === 'police_dashboard' && policeUser && (
        <PoliceDashboard
          token={policeToken}
          user={policeUser as any}
          onLogout={() => { localStorage.removeItem('boom_police_token'); localStorage.removeItem('boom_police_user'); setView('landing'); }}
          onViewSession={(sessionId) => {
            setPoliceSessionId(sessionId);
            setPoliceFlowToken(policeToken);
            setView('police_flow');
          }}
        />
      )}

      {view === 'police_flow' && policeUser && policeSessionId && (
        <PoliceFlow
          sessionId={policeSessionId}
          token={policeFlowToken || policeToken}
          agent={policeUser as any}
          onLogout={() => {
            localStorage.removeItem('boom_police_token');
            localStorage.removeItem('boom_police_user');
            setView('landing');
          }}
        />
      )}

      {showCGU && (
        <CGUModal
          onAccept={handleCGUAccept}
          onClose={() => { setShowCGU(false); setPendingAction(null); }}
        />
      )}
    </div>
    </ErrorBoundary>
  );
}

