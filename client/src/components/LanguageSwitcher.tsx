import React from 'react';
// boom.contact — LanguageSwitcher
// 4 boutons drapeaux toujours visibles — pas de dropdown, pas de bug iOS
// Ordre des langues : langue du pays détecté en premier

import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGS, LANG_META, applyLang, getLangOrder } from '../i18n';
import type { SupportedLang } from '../i18n';

interface Props {
  style?: React.CSSProperties;
  compact?: boolean;
}

export const LanguageSwitcher = React.memo(function LanguageSwitcher({ style, compact = false }: Props) {
  const { i18n } = useTranslation();

  const currentLang = (SUPPORTED_LANGS.includes(i18n.language as SupportedLang)
    ? i18n.language
    : 'fr') as SupportedLang;

  // Ordre basé sur le pays détecté (stocké en sessionStorage par main.tsx)
  const detectedCountry = sessionStorage.getItem('boom_detected_country');
  const orderedLangs = getLangOrder(detectedCountry);

  const handleChange = (lang: SupportedLang) => {
    applyLang(lang);
  };

  return (
    <div
      aria-label="Select language"
      className="flex items-center gap-1" style={{ ...style }}>
      {orderedLangs.map(lang => {
        const isActive = lang === currentLang;
        return (
          <button
            key={lang}
            onClick={() => handleChange(lang)}
            title={LANG_META[lang].label}
            aria-label={LANG_META[lang].label}
            className="flex items-center justify-center rounded-lg cursor-pointer p-0 shrink-0 touch-manipulation" style={{ width: compact ? 40 : 44, height: compact ? 40 : 44, minWidth: 44, minHeight: 44, border: isActive
                ? '2px solid #FF6B1A'
                : '1.5px solid #DDE7F0', background: isActive
                ? 'rgba(255,107,26,0.10)'
                : '#FFFFFF', fontSize: compact ? 16 : 18, transition: 'all 0.15s', WebkitTapHighlightColor: 'transparent' }}
          >
            {LANG_META[lang].flag}
          </button>
        );
      })}
    </div>
  );
});
