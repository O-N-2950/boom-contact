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
    <div className="fixed bottom-0 left-0 right-0 pointer-events-none" style={{ zIndex: 9000, padding: '0 0 env(safe-area-inset-bottom)' }}>
      <div
        ref={bannerRef}
        role="dialog"
        aria-label="Paramètres cookies"
        aria-modal="true"
        className="max-w-[480px] mx-auto my-0 px-5 pt-[18px] pb-5 bg-[#0E0E18]" style={{ border: '1px solid rgba(255,255,255,0.25)', borderBottom: 'none', borderRadius: '16px 16px 0 0', pointerEvents: 'all', boxShadow: '0 -8px 32px rgba(0,0,0,0.6)', animation: 'slideUp 0.4s ease' }}>
        {/* Handle */}
        <div className="flex justify-center mb-3.5" >
          <div className="w-9 h-[3px] rounded-sm" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-3">
          <span className="text-xl" aria-hidden="true">🍪</span>
          <div>
            <div className="text-white font-bold text-sm">Cookies & confidentialité</div>
            <div className="text-[#d0d0d0] text-[11px]">RGPD · nLPD · PEP's Swiss SA</div>
          </div>
        </div>

        <div className="text-[#d0d0d0] text-[13px] leading-relaxed mb-3.5" >
          boom.contact utilise uniquement des cookies <strong className="text-[#ccc]">strictement nécessaires</strong> au fonctionnement du service (session, préférences langue). Aucun cookie publicitaire ou de tracking.
        </div>

        {/* Expandable detail */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="bg-transparent border-0 text-[#d0d0d0] text-xs cursor-pointer p-0 mb-3 underline"
        >
          {expanded ? '▲ Moins de détails' : '▼ En savoir plus'}
        </button>

        {expanded && (
          <div className="bg-[#111] rounded-[10px] p-3.5 mb-3.5"  style={{ border: '1px solid #3a3a3a' }}>
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
            <div className="mt-2.5 text-[11px] leading-normal text-[#c0c0c0]">
              Aucun cookie Google Analytics, Facebook Pixel, ou publicitaire n'est utilisé.<br/>
              Stripe.com dépose ses propres cookies lors du paiement (nécessaires à la sécurité PCI-DSS).
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => accept('essential')}
            className="flex-1 bg-none rounded-[10px] text-[13px] font-semibold cursor-pointer px-3 py-[11px] text-[#d0d0d0]" style={{ border: '1px solid #555' }}
          >
            Essentiels uniquement
          </button>
          <button
            onClick={() => accept('all')}
            className="flex-1 border-0 rounded-[10px] text-white text-[13px] font-bold cursor-pointer px-3 py-[11px] bg-[#FF3500]"
          >
            Accepter ✓
          </button>
        </div>

        <div className="mt-2.5 text-[10px] text-center text-[#b0b0b0]">
          En continuant sans choisir, seuls les cookies essentiels sont utilisés. ·{' '}
          <a
            href="/?privacy=true"
            className="underline text-[#c0c0c0]"
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
    <div className="flex justify-between items-start" style={{ padding: '6px 0', borderBottom: '1px solid #3a3a3a' }}>
      <div>
        <div className="text-xs text-[#ccc]" style={{ fontFamily: 'monospace' }}>{name}</div>
        <div className="text-[#d0d0d0] text-[11px]">{purpose}</div>
      </div>
      <div className="shrink-0 ml-2.5 text-right">
        <div className="text-green-400 text-[10px] font-bold">{type}</div>
        <div className="text-[10px] text-[#c0c0c0]">{duration}</div>
      </div>
    </div>
  );
}