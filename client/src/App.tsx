import { ErrorBoundary } from './components/ErrorBoundary';
import OfflineBanner from './components/OfflineBanner';
import React, { useState, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { applyDir } from './i18n';
import { trpc } from './trpc';

// ── Code splitting — lazy-loaded pages & modals ──────────────
const LandingPage     = React.lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const ConstatFlow     = React.lazy(() => import('./pages/ConstatFlow').then(m => ({ default: m.ConstatFlow })));
const JoinSession     = React.lazy(() => import('./pages/JoinSession').then(m => ({ default: m.JoinSession })));
const PricingPage     = React.lazy(() => import('./pages/PricingPage').then(m => ({ default: m.PricingPage })));
const PoliceLogin     = React.lazy(() => import('./pages/PoliceLogin').then(m => ({ default: m.PoliceLogin })));
const PoliceDashboard = React.lazy(() => import('./pages/PoliceDashboard').then(m => ({ default: m.PoliceDashboard })));
const PoliceFlow      = React.lazy(() => import('./pages/PoliceFlow').then(m => ({ default: m.PoliceFlow })));
const AccountPage     = React.lazy(() => import('./pages/AccountPage').then(m => ({ default: m.AccountPage })));
const AdminDashboard  = React.lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const PrivacyPage     = React.lazy(() => import('./pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const EmergencyNumbers = React.lazy(() => import('./components/EmergencyNumbers').then(m => ({ default: m.EmergencyNumbers })));
const AuthModal       = React.lazy(() => import('./components/AuthModal').then(m => ({ default: m.AuthModal })));
const CGUModal        = React.lazy(() => import('./components/CGUModal').then(m => ({ default: m.CGUModal })));
const CookieBanner    = React.lazy(() => import('./components/CookieBanner').then(m => ({ default: m.CookieBanner })));
const BugReport       = React.lazy(() => import('./components/BugReport').then(m => ({ default: m.BugReport })));

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--black, #06060C)' }}>
      <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--boom, #FF3500)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

type AppView = 'landing' | 'cgu' | 'pricing' | 'constat' | 'join' | 'account' | 'admin' | 'emergency' | 'privacy' | 'police_login' | 'police_dashboard' | 'police_flow';

const EMAIL_KEY = 'boom_user_email';
const USER_TOKEN_KEY = 'boom_user_token';
const USER_DATA_KEY  = 'boom_user';
const CGU_KEY   = 'boom_cgu_accepted';



function getInitialView(): AppView {
  const params = new URLSearchParams(window.location.search);
  if (params.get('admin') === 'true') return 'admin';
  if (params.get('urgences') === 'true') return 'emergency';
  if (params.get('privacy') === 'true') return 'privacy';
  // Magic link / gift link handled inline after mount
  // Police flow MUST be checked before generic session check
  if (params.get('session') && params.get('role') === 'police') {
    const token = params.get('token') || localStorage.getItem('boom_police_token');
    if (token) return 'police_flow';
  }
  if (params.get('session'))         return 'join';
  if (params.get('pricing') === 'true') return 'pricing';
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

    if (giftToken) {
      window.history.replaceState({}, '', '/');
      if (authUser?.email) {
        claimGiftMut.mutate({ token: giftToken, email: authUser.email }, {
          onSuccess: (res) => alert(`🎁 ${res.credits} crédit(s) ajouté(s) à votre compte !`),
        });
      } else {
        // Store gift token and open auth modal — claim after login
        localStorage.setItem('boom_pending_gift', giftToken);
        setShowAuthModal(true);
      }
    }
  }, []);

  const handleAuth = (token: string, user: any) => {
    localStorage.setItem(USER_TOKEN_KEY, token);
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
    setAuthToken(token);
    setAuthUser(user);
    setShowAuthModal(false);
  };

  // Handle post-login redirect based on pendingAction (runs after authUser is set)
  useEffect(() => {
    if (!authUser) return;
    // Claim pending gift if any
    const pendingGift = localStorage.getItem('boom_pending_gift');
    if (pendingGift) {
      localStorage.removeItem('boom_pending_gift');
      claimGiftMut.mutate({ token: pendingGift, email: authUser.email }, {
        onSuccess: (res) => alert(`🎁 ${res.credits} crédit(s) ajouté(s) à votre compte !`),
      });
    }
    if (pendingAction === 'garage') {
      setAccountInitialTab('garage');
      setView('account');
      setPendingAction(null);
    } else if (pendingAction === 'constat') {
      setView('constat');
      setPendingAction(null);
    } else if (pendingAction === 'pricing') {
      setView('pricing');
      setPendingAction(null);
    }
  }, [authUser]);

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

  // Apply RTL direction and lang attribute whenever language changes
  useEffect(() => {
    applyDir(i18n.language);
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  // Check post-payment success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      const constatId = params.get('constat');
      window.history.replaceState({}, '', '/');

      // One-shot sans compte : attendre 2s (webhook) puis retour au constat
      if (constatId) {
        setTimeout(() => {
          window.location.href = `/?session=${constatId}&paid=1`;
        }, 2000);
        return;
      }

      // Compte existant : refresh crédits
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
    <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:text-black focus:px-4 focus:py-2 focus:rounded">
      Skip to content
    </a>
    <OfflineBanner />
    <Suspense fallback={<LoadingSpinner />}>
    <div className="min-h-screen bg-[var(--black,#06060C)] text-[var(--text,#ffffff)]">
      <main id="main-content">
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
          initialSessionId={undefined}
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
      </main>
    </div>
    <BugReport />
    </Suspense>
    </ErrorBoundary>
  );
}









