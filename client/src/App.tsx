import { ErrorBoundary } from './components/ErrorBoundary';
import OfflineBanner from './components/OfflineBanner';
import { RouteAnnouncer } from './components/RouteAnnouncer';
import React, { useState, useEffect, useReducer, useCallback, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { applyDir } from './i18n';
import { trpc } from './trpc';

type PoliceAgent = {
  id: string;
  firstName: string;
  lastName: string;
  badgeNumber?: string;
  role: string;
  station: { id: string; name: string; canton?: string; country?: string } | null;
};

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
const B2BPage              = React.lazy(() => import('./pages/B2BPage').then(m => ({ default: m.B2BPage })));
const DesignPreview        = React.lazy(() => import('./pages/DesignPreview'));
const VisualQA             = React.lazy(() => import('./pages/VisualQA'));
const EmergencyNumbers = React.lazy(() => import('./components/EmergencyNumbers').then(m => ({ default: m.EmergencyNumbers })));
const AuthModal       = React.lazy(() => import('./components/AuthModal').then(m => ({ default: m.AuthModal })));
const CGUModal        = React.lazy(() => import('./components/CGUModal').then(m => ({ default: m.CGUModal })));
const CookieBanner    = React.lazy(() => import('./components/CookieBanner').then(m => ({ default: m.CookieBanner })));
const BugReport       = React.lazy(() => import('./components/BugReport').then(m => ({ default: m.BugReport })));

function LoadingSpinner() {
  return (
    <div role="status" aria-label="Loading" className="flex items-center justify-center min-h-screen" style={{ background: 'var(--black, #06060C)' }}>
      <div aria-hidden="true" className="rounded-full w-8 h-8"  style={{ border: '3px solid rgba(255,255,255,0.25)', borderTopColor: 'var(--boom, #FF3500)', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

type AppView = 'landing' | 'cgu' | 'pricing' | 'constat' | 'join' | 'account' | 'admin' | 'emergency' | 'privacy' | 'police_login' | 'police_dashboard' | 'police_flow' | 'police_intervention' | 'b2b' | 'design_preview' | 'visual_qa';

const EMAIL_KEY = 'boom_user_email';
const USER_TOKEN_KEY = 'boom_user_token';
const USER_DATA_KEY  = 'boom_user';
const CGU_KEY   = 'boom_cgu_accepted';



function getInitialView(): AppView {
  const params = new URLSearchParams(window.location.search);
  const pathname = window.location.pathname;
  // Route interne cachée (preview design) — non liée, noindex
  if (pathname === '/visual-qa' || params.get('qa') === 'visual') return 'visual_qa';
  if (pathname === '/design-preview' || params.get('design') === 'preview') return 'design_preview';
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

  // Post-payment redirect: ?session=XXX&paid=1 → go directly to constat (not join)
  if (params.get('session') && params.get('paid') === '1') {
    return 'constat';
  }

  // QR scan detection: if police is authenticated and ?session= is present, go to intervention
  if (params.get('session')) {
    const policeToken = localStorage.getItem('boom_police_token');
    if (policeToken) return 'police_intervention';
    return 'join';
  }

  if (pathname === '/b2b' || pathname === '/partners' || params.get('b2b') === 'true') return 'b2b';
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  authUser: any;
  authToken: string;
  showAuthModal: boolean;
  showCGU: boolean;
  pendingAction: 'constat' | 'pricing' | 'garage' | null;
  policeToken: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  policeUser: any;
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
  | { type: 'POLICE_LOGIN'; token: string; user: any }
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
  const { t, i18n } = useTranslation();
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
        onSuccess: (res: any) => {
          localStorage.setItem(USER_TOKEN_KEY, res.token);
          localStorage.setItem(USER_DATA_KEY, JSON.stringify(res.user));
          dispatch({ type: 'SET_AUTH', token: res.token, user: res.user });
          dispatch({ type: 'SET_VIEW', view: 'account' });
        },
        onError: () => alert(t('app.magic_link_error')),
      });
    }

    if (giftToken) {
      window.history.replaceState({}, '', '/');
      if (authUser?.email) {
        claimGiftMut.mutate({ token: giftToken, email: authUser.email }, {
          onSuccess: (res) => alert(t('app.gift_credits_added', { credits: res.credits })),
        });
      } else {
        localStorage.setItem('boom_pending_gift', giftToken);
        dispatch({ type: 'SHOW_AUTH_MODAL', show: true });
      }
    }
  }, []);

  const handleAuth = useCallback((token: string, user: Record<string, unknown>) => {
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

  // Announce view changes to screen readers + update document.title
  useEffect(() => {
    const viewLabelKeys: Record<AppView, string> = {
      landing: 'app.nav_landing',
      cgu: 'app.nav_cgu',
      pricing: 'app.nav_pricing',
      constat: 'app.nav_constat',
      join: 'app.nav_join',
      account: 'app.nav_account',
      admin: 'app.nav_admin',
      emergency: 'app.nav_emergency',
      privacy: 'app.nav_privacy',
      police_login: 'app.nav_police_login',
      police_dashboard: 'app.nav_police_dashboard',
      police_flow: 'app.nav_police_flow',
      police_intervention: 'app.nav_police_intervention',
      b2b: 'app.nav_b2b',
      design_preview: 'app.nav_landing',
      visual_qa: 'app.nav_landing',
    };
    const label = t(viewLabelKeys[view]);
    dispatch({ type: 'SET_ROUTE_ANNOUNCEMENT', message: t('app.nav_to', { label }) });
    document.title = view === 'landing' ? t('app.title_default') : t('app.title_page', { label });
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

  // ── Deep links natifs (Universal Links iOS / App Links Android) ──
  // Sans ce listener, un lien https://(www.)boom.contact/... ouvre bien l'app
  // mais n'injecte PAS ses query params (ex. retour Stripe ?session=X&paid=1)
  // dans la WebView locale Capacitor. No-op total sur web/PWA.
  useEffect(() => {
    let remove: (() => void) | undefined;
    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;
        const { App: CapApp } = await import('@capacitor/app');
        const handle = await CapApp.addListener('appUrlOpen', ({ url }) => {
          try {
            const u = new URL(url);
            const slug = (u.pathname || '/') + (u.search || '');
            // Rejoue le lien dans la WebView locale -> getInitialView relit les params
            window.location.href = slug || '/';
          } catch (e) {
            console.debug('appUrlOpen parse failed', e);
          }
        });
        remove = () => handle.remove();
      } catch (e) {
        console.debug('deep link listener init skipped', e);
      }
    })();
    return () => { if (remove) remove(); };
  }, []);

  // ── Thème Hybrid Trust Premium scoped au flow accident (constat/join) ──
  // Applique data-theme="hybrid" sur <html> pendant le flow, restaure en sortie.
  // Landing / B2B / admin / police conservent leur thème.
  useEffect(() => {
    const flowViews = ['constat', 'join'];
    const html = document.documentElement;
    if (flowViews.includes(view)) {
      const prev = html.getAttribute('data-theme');
      html.setAttribute('data-theme', 'hybrid');
      return () => { if (prev) html.setAttribute('data-theme', prev); else html.removeAttribute('data-theme'); };
    }
  }, [view]);

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
          initialSessionId={new URLSearchParams(window.location.search).get('session') || undefined}
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
            (trpc.auth.me as any).invalidate?.();
          }}
        />
      )}

      {view === 'police_login' && (
        <PoliceLogin onLogin={(token, user) => dispatch({ type: 'POLICE_LOGIN', token, user })} />
      )}
      {view === 'police_dashboard' && policeUser && (
        <PoliceDashboard
          token={policeToken}
          user={policeUser as PoliceAgent}
          onLogout={() => { localStorage.removeItem('boom_police_token'); localStorage.removeItem('boom_police_user'); dispatch({ type: 'SET_VIEW', view: 'landing' }); }}
          onViewSession={(sessionId) => dispatch({ type: 'POLICE_INTERVENTION', sessionId })}
        />
      )}

      {view === 'police_flow' && policeUser && policeSessionId && (
        <PoliceFlow
          sessionId={policeSessionId}
          token={policeFlowToken || policeToken}
          agent={policeUser as PoliceAgent}
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
          agent={policeUser as PoliceAgent}
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

      {view === 'design_preview' && <DesignPreview />}
      {view === 'visual_qa' && <VisualQA />}
      {view === 'b2b' && (
        <B2BPage onBack={() => dispatch({ type: 'SET_VIEW', view: 'landing' })} />
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









