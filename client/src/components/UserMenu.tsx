import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const C = {
  card: '#FFFFFF', elevated: '#EEF4FA', bg: '#F5F8FC',
  text: '#102033', sec: '#5D6B7C', orange: '#FF6B1A',
  navy: '#123A5A', border: '#DDE7F0', danger: '#DC2626', success: '#16A34A',
};
const FONT = 'Manrope, ui-sans-serif, system-ui, sans-serif';

export interface UserMenuProps {
  authUser: { email: string; credits: number };
  onAccount: () => void;
  onGarage: () => void;
  onBuyCredits: () => void;
  onLogout: () => void;
  compact?: boolean;
}

export function formatCredits(credits: number): string {
  return credits === 999999 ? '∞' : String(credits);
}

export function UserMenu({ authUser, onAccount, onGarage, onBuyCredits, onLogout, compact = false }: UserMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDocClick); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const credits = formatCredits(authUser.credits);
  const item: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
    background: 'transparent', border: 'none', cursor: 'pointer', padding: '11px 14px',
    fontSize: 14, fontWeight: 600, color: C.navy, fontFamily: FONT, borderRadius: 10,
  };
  const run = (fn: () => void) => () => { setOpen(false); fn(); };

  return (
    <div ref={ref} style={{ position: 'relative', fontFamily: FONT }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu" aria-expanded={open} aria-label={t('account.menu.label', { defaultValue: 'Menu du compte' })}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
          padding: compact ? '7px 10px' : '8px 12px', color: C.text, fontWeight: 700, fontSize: 13, fontFamily: FONT,
        }}>
        <span aria-hidden="true">👤</span>
        {!compact && <span style={{ maxWidth: 140, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{authUser.email}</span>}
        <span style={{ background: C.orange, color: '#fff', borderRadius: 20, fontSize: 11, fontWeight: 800, padding: '2px 8px' }}>{credits}</span>
        <span aria-hidden="true" style={{ color: C.sec, fontSize: 11, transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>

      {open && (
        <div role="menu" style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 1000,
          minWidth: 244, background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 14, boxShadow: '0 16px 40px rgba(16,32,51,0.18)', padding: 8,
        }}>
          <div style={{ padding: '8px 14px 10px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.sec, letterSpacing: 0.5 }}>{t('account.menu.connected', { defaultValue: 'Connecté' })}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{authUser.email}</div>
          </div>
          <div style={{ borderTop: `1px solid ${C.border}`, margin: '2px 0 6px' }} />

          <button role="menuitem" style={item} onClick={run(onAccount)}
            onMouseEnter={e => (e.currentTarget.style.background = C.bg)} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <span aria-hidden="true">⚙️</span> {t('account.menu.account', { defaultValue: 'Mon compte' })}
          </button>
          <button role="menuitem" style={item} onClick={run(onGarage)}
            onMouseEnter={e => (e.currentTarget.style.background = C.bg)} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <span aria-hidden="true">🚗</span> {t('account.menu.garage', { defaultValue: 'Mon garage' })}
          </button>

          <button role="menuitem" style={{ ...item, justifyContent: 'space-between' }} onClick={run(onBuyCredits)}
            onMouseEnter={e => (e.currentTarget.style.background = C.bg)} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span aria-hidden="true">💳</span> {t('account.menu.credits', { defaultValue: 'Mes crédits' })}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 800, color: authUser.credits === 0 ? C.danger : C.success }}>{credits}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.orange }}>{t('account.menu.buy', { defaultValue: 'Acheter' })}</span>
            </span>
          </button>

          <div style={{ borderTop: `1px solid ${C.border}`, margin: '6px 0' }} />
          <button role="menuitem" style={{ ...item, color: C.danger }} onClick={run(onLogout)}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.06)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <span aria-hidden="true">↩</span> {t('account.menu.logout', { defaultValue: 'Déconnexion' })}
          </button>
        </div>
      )}
    </div>
  );
}
