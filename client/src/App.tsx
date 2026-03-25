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
import { AuthModal } from './components/AuthModal';
import { AccountPage } from './pages/AccountPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { EmergencyNumbers } from './components/EmergencyNumbers';
import { CookieBanner } from './components/CookieBanner';
import { PrivacyPage } from './pages/PrivacyPage';
import { applyDir } from './i18n';
import { trpc } from './trpc';

type AppView = 'landing' | 'cgu' | 'pricing' | 'constat' | 'join' | 'agents' | 'account' | 'admin' | 'emergency' | 'privacy' | 'police_login' | 'police_dashboard' | 'police_flow';

const EMAIL_KEY = 'boom_user_email';
const USER_TOKEN_KEY = 'boom_user_token';
const USER_DATA_KEY  = 'boom_user';
const CGU_KEY   = 'boom_cgu_accepted';

function getWinWinSessionId(): string | null {
  // Detect /constat/:id path (WinWin directUrl pattern)
  const match = window.location.pathname.match(/^\/constat\/([a-zA-Z0-9_-]+)$/);
  return match ? match[1] : null;
}

function getInitialView(): AppView {
  const params = new URLSearchParams(window.location.search);
  // WinWin directUrl: /constat/:sessionId?lang=fr&prefilled=true
  if (getWinWinSessionId()) return 'constat';
  if (params.get('admin') === 'true') return 'admin';
  if (params.get('urgences') === 'true') return 'emergency';
  if (params.get('privacy') === 'true') return 'privacy';
  // Magic link / gift link handled inline after mount
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
  const [accountInitialTab, setAccountInitialTab] = useState<'garage'|'history'|'profile'>('garage');
  const [userEmail, setUserEmail] = useState<string>(() => localStorage.getItem(EMAIL_KEY) || '');
  const [authUser, setAuthUser] = useState<any>(() => {
    try { return JSON.parse(localStorage.getItem(USER_DATA_KEY) || 'null'); } catch { return null; }
  });
  const [authToken, setAuthToken] = useState<string>(() => localStorage.getItem(USER_TOKEN_KEY) || '');
  const [showAuthModal, setShowAuthModal] = useState(false);

  const magicVerifyMut  = trpc.auth.magicLinkVerify.useMutation();
  const claimGiftMut    = trpc.auth.claimGift.useMutation();

  // Handle ?magic= and ?gift= on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const magicToken = params.get('magic');
    const giftToken  = params.get('gift');
    if (magicToken) {
      window.history.replaceState({}, '', '/');
      magicVerifyMut.mutate({ token: magicToken }, {
        onSuccess: (res) => {
          localStorage.setItem(USER_TOKEN_KEY, res.token);
          localStorage.setItem(USER_DATA_KEY, JSON.stringify(res.user));
          setAuthUser(res.user);
          setAuthToken(res.token);
          setView('account');
        },
        onError: () => alert('Lien de connexion invalide ou expiré.'),
      });
    }
    if (giftToken && authUser?.email) {
      window.history.replaceState({}, '', '/');
      claimGiftMut.mutate({ token: giftToken, email: authUser.email }, {
        onSuccess: (res) => alert(`🎁 ${res.credits} crédit(s) ajouté(s) à votre compte !`),
      });
    }
  }, []);

  const handleAuth = (token: string, user: any) => {
    localStorage.setItem(USER_TOKEN_KEY, token);
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
    setAuthToken(token);
    setAuthUser(user);
    setShowAuthModal(false);
    // Redirection post-login selon pendingAction
    if (pendingAction === 'garage') {
      setAccountInitialTab('garage');
      setView('account');
      setPendingAction(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(USER_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    setAuthToken('');
    setAuthUser(null);
    setView('landing');
  };
  const [showCGU, setShowCGU] = useState(false);
  const [policeToken, setPoliceToken] = useState<string>(() => localStorage.getItem('boom_police_token') || '');
  const [policeUser, setPoliceUser]   = useState<unknown>(() => {
    try { return JSON.parse(localStorage.getItem('boom_police_user') || 'null'); } catch { return null; }
  });
  const [pendingAction, setPendingAction] = useState<'constat' | 'pricing' | 'garage' | null>(null);
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
      // Refresh credits if user is logged in
      if (localStorage.getItem('boom_refresh_credits')) {
        localStorage.removeItem('boom_refresh_credits');
        // Re-fetch authUser from server to get updated credits
        const token = localStorage.getItem('boom_user_token');
        if (token) {
          fetch('/trpc/auth.me', { headers: { 'Authorization': 'Bearer ' + token } })
            .then(r => r.json())
            .then(d => {
              const user = d?.result?.data;
              if (user) {
                localStorage.setItem('boom_user', JSON.stringify(user));
                setAuthUser(user);
              }
            })
            .catch(() => {});
        }
      }
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

  const goToGarage = () => {
    setAccountInitialTab('garage');
    if (authUser) {
      setView('account');
    } else {
      // Pas encore connecté → ouvrir AuthModal, puis rediriger vers garage
      setPendingAction('garage' as any);
      setShowAuthModal(true);
    }
  };

  return (
    <ErrorBoundary>
    <OfflineBanner />
    <div className="min-h-screen bg-[var(--black)] text-[var(--text)]">
      {view === 'landing'  && <LandingPage
        onStart={startConstat}
        onPricing={goToPricing}
        onGarage={goToGarage}
        onAccount={() => authUser ? setView('account') : setShowAuthModal(true)}
        onLogout={handleLogout}
        authUser={authUser}
      />}
      {view === 'constat' && (
        <ConstatFlow
          initialSessionId={getWinWinSessionId() || undefined}
          authToken={authToken || undefined}
          authUser={authUser}
          onShowAuth={() => setShowAuthModal(true)}
          onAccount={() => authUser ? setView('account') : setShowAuthModal(true)}
          onBuyPack={() => setView('pricing')}
        />
      )}
      {view === 'join' && <JoinSession
        authUser={authUser}
        authToken={authToken || undefined}
        onLogin={() => setShowAuthModal(true)}
        onBuyPack={() => setView('pricing')}
      />}
      {view === 'agents'   && <AgentDashboard />}
      {view === 'pricing'  && (
        <PricingPage
          userEmail={userEmail}
          onBack={() => setView('landing')}
          authUser={authUser}
          onAuthSuccess={() => {
            // Refresh authUser credits after Stripe purchase
            trpc.auth.me.invalidate?.();
          }}
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

      {view === 'privacy' && (
        <PrivacyPage onBack={() => setView('landing')} />
      )}

      {view === 'emergency' && (
        <EmergencyNumbers mode="full" onClose={() => setView('landing')} />
      )}

      {view === 'admin' && authUser?.role === 'admin' && (
        <AdminDashboard
          token={authToken}
          onBack={() => setView('landing')}
        />
      )}

      {view === 'account' && authUser && (
        <AccountPage
          user={authUser}
          token={authToken}
          onBack={() => setView('landing')}
          onLogout={handleLogout}
          initialTab={accountInitialTab}
        />
      )}

      {showAuthModal && (
        <AuthModal
          onAuth={handleAuth}
          onSkip={() => setShowAuthModal(false)}
        />
      )}

      {showCGU && (
        <CGUModal
          onAccept={handleCGUAccept}
          onClose={() => { setShowCGU(false); setPendingAction(null); }}
        />
      )}
      <CookieBanner />
    </div>
    </ErrorBoundary>
  );
}









