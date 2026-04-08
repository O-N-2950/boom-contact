import { useState, useEffect, useRef } from 'react';

const COOKIE_KEY = 'boom_cookie_consent';

type ConsentChoice = 'all' | 'essential' | null;

function getStoredConsent(): ConsentChoice {
  try {
    const v = localStorage.getItem(COOKIE_KEY);
    if (v === 'all' || v === 'essential') return v;
    return null;
  } catch { return null; }
}

export function useCookieConsent() {
  const [consent, setConsent] = useState<ConsentChoice>(getStoredConsent);
  return { hasConsent: consent !== null, consentAll: consent === 'all' };
}

export function CookieBanner() {
  const [visible, setVisible]   = useState(false);
  const [expanded, setExpanded] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Show after 1.5s if no consent yet
    if (getStoredConsent() === null) {
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    if (!visible || !bannerRef.current) return;

    const getFocusableElements = () => {
      const selector = 'button, a, [tabindex]:not([tabindex="-1"])';
      return Array.from(bannerRef.current?.querySelectorAll(selector) || []) as HTMLElement[];
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const activeElement = document.activeElement as HTMLElement;
      const currentIndex = focusableElements.indexOf(activeElement);

      if (e.shiftKey) {
        // Shift+Tab: wrap from first to last
        if (currentIndex === 0 || currentIndex === -1) {
          e.preventDefault();
          focusableElements[focusableElements.length - 1].focus();
        }
      } else {
        // Tab: wrap from last to first
        if (currentIndex === focusableElements.length - 1) {
          e.preventDefault();
          focusableElements[0].focus();
        }
      }
    };

    bannerRef.current.addEventListener('keydown', handleKeyDown);

    // Focus first element on mount
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    return () => bannerRef.current?.removeEventListener('keydown', handleKeyDown);
  }, [visible]);

  if (!visible) return null;

  const accept = (choice: 'all' | 'essential') => {
    localStorage.setItem(COOKIE_KEY, choice);
    setVisible(false);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 9000,
      padding: '0 0 env(safe-area-inset-bottom)',
      pointerEvents: 'none',
    }}>
      <div
        ref={bannerRef}
        role="dialog"
        aria-label="Paramètres cookies"
        aria-modal="true"
        style={{
        maxWidth: 480,
        margin: '0 auto',
        background: '#0E0E18',
        border: '1px solid rgba(255,255,255,0.25)',
        borderBottom: 'none',
        borderRadius: '16px 16px 0 0',
        padding: '18px 20px 20px',
        pointerEvents: 'all',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.6)',
        animation: 'slideUp 0.4s ease',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <div style={{ width: 36, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 20 }} aria-hidden="true">🍪</span>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Cookies & confidentialité</div>
            <div style={{ color: '#d0d0d0', fontSize: 11 }}>RGPD · nLPD · PEP's Swiss SA</div>
          </div>
        </div>

        <div style={{ color: '#d0d0d0', fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>
          boom.contact utilise uniquement des cookies <strong style={{ color: '#ccc' }}>strictement nécessaires</strong> au fonctionnement du service (session, préférences langue). Aucun cookie publicitaire ou de tracking.
        </div>

        {/* Expandable detail */}
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ background: 'none', border: 'none', color: '#d0d0d0', fontSize: 12, cursor: 'pointer', padding: 0, marginBottom: 12, textDecoration: 'underline' }}
        >
          {expanded ? '▲ Moins de détails' : '▼ En savoir plus'}
        </button>

        {expanded && (
          <div style={{ background: '#111', border: '1px solid #3a3a3a', borderRadius: 10, padding: 14, marginBottom: 14 }}>
            <CookieRow
              name="boom_cgu_accepted"
              purpose="Session constat — obligatoire"
              duration="2h"
              type="Essentiel"
            />
            <CookieRow
              name="boom_flow_a"
              purpose="Sauvegarde du constat en cours"
              duration="2h"
              type="Essentiel"
            />
            <CookieRow
              name="boom_user_token"
              purpose="Authentification compte utilisateur"
              duration="30 jours"
              type="Essentiel"
            />
            <CookieRow
              name="boom_cookie_consent"
              purpose="Mémorisation de votre choix"
              duration="1 an"
              type="Essentiel"
            />
            <CookieRow
              name="i18nextLng"
              purpose="Préférence de langue"
              duration="1 an"
              type="Essentiel"
            />
            <div style={{ marginTop: 10, color: '#c0c0c0', fontSize: 11, lineHeight: 1.5 }}>
              Aucun cookie Google Analytics, Facebook Pixel, ou publicitaire n'est utilisé.<br/>
              Stripe.com dépose ses propres cookies lors du paiement (nécessaires à la sécurité PCI-DSS).
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => accept('essential')}
            style={{
              flex: 1,
              background: 'none',
              border: '1px solid #555',
              borderRadius: 10,
              color: '#d0d0d0',
              padding: '11px 12px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Essentiels uniquement
          </button>
          <button
            onClick={() => accept('all')}
            style={{
              flex: 1,
              background: '#FF3500',
              border: 'none',
              borderRadius: 10,
              color: '#fff',
              padding: '11px 12px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Accepter ✓
          </button>
        </div>

        <div style={{ marginTop: 10, textAlign: 'center' as const, color: '#b0b0b0', fontSize: 10 }}>
          En continuant sans choisir, seuls les cookies essentiels sont utilisés. ·{' '}
          <a
            href="/?privacy=true"
            style={{ color: '#c0c0c0', textDecoration: 'underline' }}
            onClick={e => { e.preventDefault(); accept('essential'); window.location.search = '?privacy=true'; }}
          >
            Politique de confidentialité
          </a>
        </div>
      </div>
    </div>
  );
}

function CookieRow({ name, purpose, duration, type }: { name: string; purpose: string; duration: string; type: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 0', borderBottom: '1px solid #3a3a3a' }}>
      <div>
        <div style={{ color: '#ccc', fontSize: 12, fontFamily: 'monospace' }}>{name}</div>
        <div style={{ color: '#d0d0d0', fontSize: 11 }}>{purpose}</div>
      </div>
      <div style={{ textAlign: 'right' as const, flexShrink: 0, marginLeft: 10 }}>
        <div style={{ color: '#4ade80', fontSize: 10, fontWeight: 700 }}>{type}</div>
        <div style={{ color: '#c0c0c0', fontSize: 10 }}>{duration}</div>
      </div>
    </div>
  );
}