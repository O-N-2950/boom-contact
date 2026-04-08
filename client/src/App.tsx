import { ErrorBoundary } from './components/ErrorBoundary';
import OfflineBanner from './components/OfflineBanner';
import { RouteAnnouncer } from './components/RouteAnnouncer';
import React, { useState, useEffect, useReducer, useCallback, Suspense } from 'react';
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
const AdminDashboard       = React.lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const PoliceIntervention   = React.lazy(() => import('./pages/PoliceIntervention').then(m => ({ default: m.PoliceIntervention })));
const PrivacyPage          = React.lazy(() => import('./pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const EmergencyNumbers = React.lazy(() => import('./components/EmergencyNumbers').then(m => ({ default: m.EmergencyNumbers })));
const AuthModal       = React.lazy(() => import('./components/AuthModal').then(m => ({ default: m.AuthModal })));
const CGUModal        = React.lazy(() => import('./components/CGUModal').then(m => ({ default: m.CGUModal })));
const CookieBanner    = React.lazy(() => import('./components/CookieBanner').then(m => ({ default: m.CookieBanner })));
const BugReport       = React.lazy(() => import('./components/BugReport').then(m => ({ default: m.BugReport })));

function LoadingSpinner() {
  return (
    <div role="status" aria-label="Chargement en cours" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--black, #06060C)' }}>
      <div aria-hidden="true" style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.25)', borderTopColor: 'var(--boom, #FF3500)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

type AppView = 'landing' | 'cgu' | 'pricing' | 'constat' | 'join' | 'account' | 'admin' | 'emergency' | 'privacy' | 'police_login' | 'police_dashboard' | 'police_flow' | 'police_intervention';

const EMAIL_KEY = 'boom_user_email';
const USER_TOKEN_KEY = 'boom_user_token';
const USER_DATA_KEY  = 'boom_user';
const CGU_KEY   = 'boom_cgu_accepted';



function getInitialView(): AppView {
  const params = new URLSearchParams(window.location.search);
  const pathname = window.location.pathname;
  if (params.get('admin') === 'true') return 'admin';
  if (params.get('urgences') === 'true') return 'emergency';
  if (params.get('privacy') === 'true') return 'privacy';
  // Magic link / gift link handled inline after mount

  // Police intervention route: /police/intervention/:sessionId
  const interventionMatch = pathname.match(/^\/police\/intervention\/([A-Za-z0-9_-]+)/);
  if (interventionMatch) {
    const token = localStorage.getItem('boom_police_token');
    if (token) return 'police_intervention';
    return 'police_login';
  }

  // Police flow MUST be checked before generic session check
  if (params.get('session') && params.get('role') === 'police') {
    const token = params.get('token') || localStorage.getItem('boom_police_token');
    if (token) return 'police_flow';
  }

  // QR scan detection: if police is authenticated and ?session= is present, go to intervention
  if (params.get('session')) {
    const policeToken = localStorage.getItem('boom_police_token');
    if (policeToken) return 'police_intervention';
    return 'join';
  }

  if (params.get('pricing') === 'true') return 'pricing';
  if (params.get('police') === 'true' || pathname.startsWith('/police')) {
    const token = localStorage.getItem('boom_police_token');
    return token ? 'police_dashboard' : 'police_login';
  }
  if (params.get('payment') === 'success') return 'landing';
  return 'landing';
}

// ── App state reducer — single source of truth ──────────────
interface AppState {
  view: AppView;
  routeAnnouncement: string;
  accountInitialTab: 'garage' | 'history' | 'profile';
  userEmail: string;
  authUser: any;
  authToken: string;
  showAuthModal: boolean;
  showCGU: boolean;
  pendingAction: 'constat' | 'pricing' | 'garage' | null;
  policeToken: string;
  policeUser: unknown;
  policeSessionId: string;
  policeFlowToken: string;
}

type AppAction =
  | { type: 'SET_VIEW'; view: AppView }
  | { type: 'SET_ROUTE_ANNOUNCEMENT'; message: string }
  | { type: 'SET_ACCOUNT_TAB'; tab: 'garage' | 'history' | 'profile' }
  | { type: 'SET_AUTH'; token: string; user: any }
  | { type: 'SET_USER_EMAIL'; email: string }
  | { type: 'SHOW_AUTH_MODAL'; show: boolean }
  | { type: 'SHOW_CGU'; show: boolean }
  | { type: 'SET_PENDING_ACTION'; action: 'constat' | 'pricing' | 'garage' | null }
  | { type: 'LOGOUT' }
  | { type: 'POLICE_LOGIN'; token: string; user: unknown }
  | { type: 'POLICE_VIEW_SESSION'; sessionId: string; token: string }
  | { type: 'POLICE_INTERVENTION'; sessionId: string }
  | { type: 'CGU_ACCEPT'; email: string };

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, view: action.view };
    case 'SET_ROUTE_ANNOUNCEMENT':
      return { ...state, routeAnnouncement: action.message };
    case 'SET_ACCOUNT_TAB':
      return { ...state, accountInitialTab: action.tab };
    case 'SET_AUTH':
      return { ...state, authToken: action.token, authUser: action.user, showAuthModal: false };
    case 'SET_USER_EMAIL':
      return { ...state, userEmail: action.email };
    case 'SHOW_AUTH_MODAL':
      return { ...state, showAuthModal: action.show };
    case 'SHOW_CGU':
      return { ...state, showCGU: action.show };
    case 'SET_PENDING_ACTION':
      return { ...state, pendingAction: action.action };
    case 'LOGOUT':
      return { ...state, authToken: '', authUser: null, view: 'landing' };
    case 'POLICE_LOGIN':
      return { ...state, policeToken: action.token, policeUser: action.user, view: 'police_dashboard' };
    case 'POLICE_VIEW_SESSION':
      return { ...state, policeSessionId: action.sessionId, policeFlowToken: action.token, view: 'police_flow' };
    case 'POLICE_INTERVENTION':
      return { ...state, policeSessionId: action.sessionId, view: 'police_intervention' };
    case 'CGU_ACCEPT':
      return { ...state, userEmail: action.email, showCGU: false };
    default:
      return state;
  }
}

function getInitialAppState(): AppState {
  const params = new URLSearchParams(window.location.search);
  const pathname = window.location.pathname;
  // Extract sessionId from /police/intervention/:sessionId or ?session= param
  const interventionMatch = pathname.match(/^\/police\/intervention\/([A-Za-z0-9_-]+)/);
  const sessionId = interventionMatch?.[1] || params.get('session') || '';
  return {
    view: getInitialView(),
    routeAnnouncement: '',
    accountInitialTab: 'garage',
    userEmail: localStorage.getItem(EMAIL_KEY) || '',
    authUser: (() => { try { return JSON.parse(localStorage.getItem(USER_DATA_KEY) || 'null'); } catch { return null; } })(),
    authToken: localStorage.getItem(USER_TOKEN_KEY) || '',
    showAuthModal: false,
    showCGU: false,
    pendingAction: null,
    policeToken: localStorage.getItem('boom_police_token') || '',
    policeUser: (() => { try { return JSON.parse(localStorage.getItem('boom_police_user') || 'null'); } catch { return null; } })(),
    policeSessionId: sessionId,
    policeFlowToken: params.get('token') || localStorage.getItem('boom_police_token') || '',
  };
}

export default function App() {
  const { i18n } = useTranslation();
  const [state, dispatch] = useReducer(appReducer, undefined, getInitialAppState);
  const { view, routeAnnouncement, accountInitialTab, userEmail, authUser, authToken, showAuthModal, showCGU, pendingAction, policeToken, policeUser, policeSessionId, policeFlowToken } = state;

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
          dispatch({ type: 'SET_AUTH', token: res.token, user: res.user });
          dispatch({ type: 'SET_VIEW', view: 'account' });
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
        localStorage.setItem('boom_pending_gift', giftToken);
        dispatch({ type: 'SHOW_AUTH_MODAL', show: true });
      }
    }
  }, []);

  const handleAuth = useCallback((token: string, user: any) => {
    localStorage.setItem(USER_TOKEN_KEY, token);
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
    dispatch({ type: 'SET_AUTH', token, user });
  }, []);

  // Handle post-login redirect based on pendingAction (runs after authUser is set)
  useEffect(() => {
    if (!authUser) return;
    const pendingGift = localStorage.getItem('boom_pending_gift');
    if (pendingGift) {
      localStorage.removeItem('boom_pending_gift');
      claimGiftMut.mutate({ token: pendingGift, email: authUser.email }, {
        onSuccess: (res) => alert(`🎁 ${res.credits} crédit(s) ajouté(s) à votre compte !`),
      });
    }
    if (pendingAction === 'garage') {
      dispatch({ type: 'SET_ACCOUNT_TAB', tab: 'garage' });
      dispatch({ type: 'SET_VIEW', view: 'account' });
      dispatch({ type: 'SET_PENDING_ACTION', action: null });
    } else if (pendingAction === 'constat') {
      dispatch({ type: 'SET_VIEW', view: 'constat' });
      dispatch({ type: 'SET_PENDING_ACTION', action: null });
    } else if (pendingAction === 'pricing') {
      dispatch({ type: 'SET_VIEW', view: 'pricing' });
      dispatch({ type: 'SET_PENDING_ACTION', action: null });
    }
  }, [authUser]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem(USER_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    dispatch({ type: 'LOGOUT' });
  }, []);

  // Apply RTL direction and lang attribute whenever language changes
  useEffect(() => {
    applyDir(i18n.language);
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  // Announce view changes to screen readers
  useEffect(() => {
    const viewLabels: Record<AppView, string> = {
      landing: 'Page d\'accueil',
      cgu: 'Conditions d\'utilisation',
      pricing: 'Tarification',
      constat: 'Création de constat',
      join: 'Rejoindre une session',
      account: 'Compte utilisateur',
      admin: 'Tableau de bord administrateur',
      emergency: 'Numéros d\'urgence',
      privacy: 'Politique de confidentialité',
      police_login: 'Connexion police',
      police_dashboard: 'Tableau de bord police',
      police_flow: 'Flux police',
      police_intervention: 'Intervention police',
    };
    dispatch({ type: 'SET_ROUTE_ANNOUNCEMENT', message: `Navigation vers ${viewLabels[view]}` });
  }, [view]);

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
              dispatch({ type: 'SET_AUTH', token: localStorage.getItem(USER_TOKEN_KEY) || '', user });
            }
          })
          .catch((e) => { console.debug('auth.me silent refresh failed', e); });
      }
    }
  }, []);

  const hasAcceptedCGU = () => !!localStorage.getItem(CGU_KEY);

  const handleCGUAccept = useCallback((email: string, _consentMarketing: boolean) => {
    localStorage.setItem(EMAIL_KEY, email);
    localStorage.setItem(CGU_KEY, 'true');
    dispatch({ type: 'CGU_ACCEPT', email });
    if (pendingAction === 'constat') dispatch({ type: 'SET_VIEW', view: 'constat' });
    if (pendingAction === 'pricing') dispatch({ type: 'SET_VIEW', view: 'pricing' });
    dispatch({ type: 'SET_PENDING_ACTION', action: null });
  }, [pendingAction]);

  const startConstat = useCallback(() => {
    if (!hasAcceptedCGU()) {
      dispatch({ type: 'SET_PENDING_ACTION', action: 'constat' });
      dispatch({ type: 'SHOW_CGU', show: true });
    } else {
      dispatch({ type: 'SET_VIEW', view: 'constat' });
    }
  }, []);

  const goToPricing = useCallback(() => {
    if (!hasAcceptedCGU()) {
      dispatch({ type: 'SET_PENDING_ACTION', action: 'pricing' });
      dispatch({ type: 'SHOW_CGU', show: true });
    } else {
      dispatch({ type: 'SET_VIEW', view: 'pricing' });
    }
  }, []);

  const goToGarage = useCallback(() => {
    dispatch({ type: 'SET_ACCOUNT_TAB', tab: 'garage' });
    if (authUser) {
      dispatch({ type: 'SET_VIEW', view: 'account' });
    } else {
      dispatch({ type: 'SET_PENDING_ACTION', action: 'garage' });
      dispatch({ type: 'SHOW_AUTH_MODAL', show: true });
    }
  }, [authUser]);

  return (
    <ErrorBoundary>
    <RouteAnnouncer message={routeAnnouncement} />
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
        onAccount={() => authUser ? dispatch({ type: 'SET_VIEW', view: 'account' }) : dispatch({ type: 'SHOW_AUTH_MODAL', show: true })}
        onLogout={handleLogout}
        authUser={authUser}
      />}
      {view === 'constat' && (
        <ConstatFlow
          initialSessionId={undefined}
          authToken={authToken || undefined}
          authUser={authUser}
          onShowAuth={() => dispatch({ type: 'SHOW_AUTH_MODAL', show: true })}
          onAccount={() => authUser ? dispatch({ type: 'SET_VIEW', view: 'account' }) : dispatch({ type: 'SHOW_AUTH_MODAL', show: true })}
          onBuyPack={() => dispatch({ type: 'SET_VIEW', view: 'pricing' })}
        />
      )}
      {view === 'join' && <JoinSession
        authUser={authUser}
        authToken={authToken || undefined}
        onLogin={() => dispatch({ type: 'SHOW_AUTH_MODAL', show: true })}
        onBuyPack={() => dispatch({ type: 'SET_VIEW', view: 'pricing' })}
      />}
      {view === 'pricing'  && (
        <PricingPage
          userEmail={userEmail}
          onBack={() => dispatch({ type: 'SET_VIEW', view: 'landing' })}
          authUser={authUser}
          onAuthSuccess={() => {
            trpc.auth.me.invalidate?.();
          }}
        />
      )}

      {view === 'police_login' && (
        <PoliceLogin onLogin={(token, user) => dispatch({ type: 'POLICE_LOGIN', token, user })} />
      )}
      {view === 'police_dashboard' && policeUser && (
        <PoliceDashboard
          token={policeToken}
          user={policeUser as any}
          onLogout={() => { localStorage.removeItem('boom_police_token'); localStorage.removeItem('boom_police_user'); dispatch({ type: 'SET_VIEW', view: 'landing' }); }}
          onViewSession={(sessionId) => dispatch({ type: 'POLICE_INTERVENTION', sessionId })}
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
            dispatch({ type: 'SET_VIEW', view: 'landing' });
          }}
        />
      )}

      {view === 'police_intervention' && policeUser && policeSessionId && (
        <PoliceIntervention
          sessionId={policeSessionId}
          token={policeToken}
          agent={policeUser as any}
          onBack={() => dispatch({ type: 'SET_VIEW', view: 'police_dashboard' })}
          onLogout={() => {
            localStorage.removeItem('boom_police_token');
            localStorage.removeItem('boom_police_user');
            dispatch({ type: 'SET_VIEW', view: 'landing' });
          }}
        />
      )}

      {view === 'privacy' && (
        <PrivacyPage onBack={() => dispatch({ type: 'SET_VIEW', view: 'landing' })} />
      )}

      {view === 'emergency' && (
        <EmergencyNumbers mode="full" onClose={() => dispatch({ type: 'SET_VIEW', view: 'landing' })} />
      )}

      {view === 'admin' && authUser?.role === 'admin' && (
        <AdminDashboard
          token={authToken}
          onBack={() => dispatch({ type: 'SET_VIEW', view: 'landing' })}
        />
      )}

      {view === 'account' && authUser && (
        <AccountPage
          user={authUser}
          token={authToken}
          onBack={() => dispatch({ type: 'SET_VIEW', view: 'landing' })}
          onLogout={handleLogout}
          initialTab={accountInitialTab}
        />
      )}

      {showAuthModal && (
        <AuthModal
          onAuth={handleAuth}
          onSkip={() => dispatch({ type: 'SHOW_AUTH_MODAL', show: false })}
        />
      )}

      {showCGU && (
        <CGUModal
          onAccept={handleCGUAccept}
          onClose={() => { dispatch({ type: 'SHOW_CGU', show: false }); dispatch({ type: 'SET_PENDING_ACTION', action: null }); }}
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









