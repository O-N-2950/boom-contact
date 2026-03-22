// boom.contact — LanguageSwitcher
// Fix iOS Safari : useRef + document click outside (pas de backdrop)

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGS, LANG_META, applyDir } from '../i18n';

interface Props {
  style?: React.CSSProperties;
  compact?: boolean;
}

export function LanguageSwitcher({ style, compact = false }: Props) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLang = (SUPPORTED_LANGS.includes(i18n.language as any)
    ? i18n.language
    : 'fr') as keyof typeof LANG_META;

  // Fermeture au clic extérieur — fonctionne sur iOS Safari sans backdrop
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    // Délai 0 pour éviter que le clic d'ouverture déclenche la fermeture
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handler);
      document.addEventListener('touchstart', handler as EventListener);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler as EventListener);
    };
  }, [open]);

  const handleChange = (lang: string) => {
    i18n.changeLanguage(lang);
    applyDir(lang);
    setOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', ...style }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        title={LANG_META[currentLang].label}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: compact ? '4px 8px' : '5px 10px',
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.12)',
          background: open ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
          cursor: 'pointer',
          color: 'var(--text)',
          fontSize: 12,
          fontWeight: 600,
          transition: 'all 0.15s',
          whiteSpace: 'nowrap',
          // iOS : évite le délai 300ms sur les boutons
          touchAction: 'manipulation',
        }}
      >
        <span style={{ fontSize: 16 }}>{LANG_META[currentLang].flag}</span>
        {!compact && (
          <span style={{ opacity: 0.8 }}>{currentLang.toUpperCase()}</span>
        )}
        <span style={{ opacity: 0.4, fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      </button>

      {/* Dropdown — pas de backdrop, fermeture par click outside */}
      {open && (
        <div style={{
          position: 'absolute',
          top: '110%',
          right: 0,
          zIndex: 1000,
          background: '#111120',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          overflow: 'hidden',
          minWidth: 140,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          animation: 'fadeIn 0.12s ease',
        }}>
          {SUPPORTED_LANGS.map(lang => {
            const meta = LANG_META[lang];
            const isActive = lang === currentLang;
            return (
              <button
                key={lang}
                onClick={() => handleChange(lang)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  background: isActive ? 'rgba(255,53,0,0.1)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: isActive ? 'var(--boom)' : 'var(--text)',
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 400,
                  textAlign: 'left',
                  transition: 'background 0.1s',
                  borderLeft: isActive ? '2px solid var(--boom)' : '2px solid transparent',
                  // iOS : évite le délai 300ms
                  touchAction: 'manipulation',
                  // Taille touch cible plus grande sur mobile
                  minHeight: 44,
                }}
              >
                <span style={{ fontSize: 20 }}>{meta.flag}</span>
                <span>{meta.label}</span>
                {isActive && <span style={{ marginLeft: 'auto', fontSize: 10 }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}
