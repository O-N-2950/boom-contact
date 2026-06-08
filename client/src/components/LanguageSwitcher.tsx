import React, { useEffect, useRef, useState, useMemo } from 'react';
// boom.contact — LanguageSwitcher
// Menu déroulant MAISON (pas de <select> natif → pas de bug iOS) exposant toutes les langues disponibles.
// Déclencheur compact (drapeau actif + chevron) → panneau avec recherche + langues suggérées en tête.
// Support droite-à-gauche (ar/he/fa/ur) sur chaque libellé.

import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGS, LANG_META, RTL_LANGS, applyLang, getLangOrder } from '../i18n';
import type { SupportedLang } from '../i18n';

interface Props {
  style?: React.CSSProperties;
  compact?: boolean;
}

const ORANGE = '#FF6B1A';
const BORDER = '#DDE7F0';
const TEXT = '#0B1F3A';
const SEC = '#6B7C93';

export const LanguageSwitcher = React.memo(function LanguageSwitcher({ style, compact = false }: Props) {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentLang = (SUPPORTED_LANGS.includes(i18n.language as SupportedLang)
    ? i18n.language
    : 'fr') as SupportedLang;

  // Fermeture au clic extérieur + Échap
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    setTimeout(() => inputRef.current?.focus(), 30);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [open]);

  // Langues suggérées en tête : langue active + langue du pays détecté + FR/EN
  const detectedCountry = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('boom_detected_country') : null;
  const suggested = useMemo(() => {
    const primary = getLangOrder(detectedCountry)[0];
    const top: SupportedLang[] = [];
    for (const l of [currentLang, primary, 'fr', 'en'] as SupportedLang[]) {
      if (l && SUPPORTED_LANGS.includes(l) && !top.includes(l)) top.push(l);
    }
    return top.slice(0, 4);
  }, [currentLang, detectedCountry]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    const list = [...SUPPORTED_LANGS].sort((a, b) => LANG_META[a].label.localeCompare(LANG_META[b].label));
    if (!q) return list;
    return list.filter(l => LANG_META[l].label.toLowerCase().includes(q) || l.toLowerCase().includes(q));
  }, [q]);

  const choose = (lang: SupportedLang) => { applyLang(lang); setOpen(false); setQuery(''); };

  const Row = ({ lang }: { lang: SupportedLang }) => {
    const active = lang === currentLang;
    const rtl = RTL_LANGS.includes(lang);
    return (
      <button
        key={lang}
        role="option"
        aria-selected={active}
        onClick={() => choose(lang)}
        className="touch-manipulation"
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
          padding: '10px 12px', minHeight: 44, border: 'none', cursor: 'pointer',
          background: active ? 'rgba(255,107,26,0.08)' : 'transparent',
          fontSize: 14, color: TEXT, borderRadius: 8, fontWeight: active ? 700 : 500,
        }}
      >
        <span style={{ fontSize: 18, flexShrink: 0 }} aria-hidden="true">{LANG_META[lang].flag}</span>
        <span dir={rtl ? 'rtl' : 'ltr'} style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {LANG_META[lang].label}
        </span>
        {active && <span aria-hidden="true" style={{ color: ORANGE, fontWeight: 800 }}>✓</span>}
      </button>
    );
  };

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('lang.select', { defaultValue: 'Choisir la langue' })}
        title={LANG_META[currentLang].label}
        className="flex items-center touch-manipulation"
        style={{
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          background: '#FFFFFF', border: `1.5px solid ${BORDER}`, borderRadius: 12,
          padding: compact ? '7px 10px' : '8px 12px', minHeight: 40,
        }}
      >
        <span style={{ fontSize: compact ? 18 : 18 }} aria-hidden="true">{LANG_META[currentLang].flag}</span>
        {!compact && <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{LANG_META[currentLang].label}</span>}
        <span aria-hidden="true" style={{ color: SEC, fontSize: 11, transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={t('lang.select', { defaultValue: 'Choisir la langue' })}
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 1000,
            width: 268, maxWidth: 'calc(100vw - 32px)', background: '#FFFFFF',
            border: `1px solid ${BORDER}`, borderRadius: 14, boxShadow: '0 12px 32px rgba(11,31,58,0.16)',
            overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 'min(70vh, 420px)',
          }}
        >
          <div style={{ padding: 10, borderBottom: `1px solid ${BORDER}` }}>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('lang.search', { defaultValue: 'Rechercher une langue…' })}
              aria-label={t('lang.search', { defaultValue: 'Rechercher une langue…' })}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: 14,
                border: `1.5px solid ${BORDER}`, borderRadius: 10, outline: 'none', color: TEXT,
              }}
            />
          </div>
          <div style={{ overflowY: 'auto', padding: 6 }}>
            {!q && suggested.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: SEC, letterSpacing: 0.4, padding: '6px 12px 2px', textTransform: 'uppercase' }}>
                  {t('lang.suggested', { defaultValue: 'Suggérées' })}
                </div>
                {suggested.map(l => <Row key={`s-${l}`} lang={l} />)}
                <div style={{ height: 1, background: BORDER, margin: '6px 8px' }} />
                <div style={{ fontSize: 11, fontWeight: 700, color: SEC, letterSpacing: 0.4, padding: '6px 12px 2px', textTransform: 'uppercase' }}>
                  {t('lang.all', { defaultValue: 'Toutes les langues' })}
                </div>
              </>
            )}
            {filtered.map(l => <Row key={l} lang={l} />)}
            {filtered.length === 0 && (
              <div style={{ padding: '14px 12px', fontSize: 13, color: SEC, textAlign: 'center' }}>
                {t('lang.none', { defaultValue: 'Aucune langue trouvée' })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
