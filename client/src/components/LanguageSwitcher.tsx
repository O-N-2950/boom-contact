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

export function LanguageSwitcher({ style, compact = false }: Props) {
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
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      ...style,
    }}>
      {orderedLangs.map(lang => {
        const isActive = lang === currentLang;
        return (
          <button
            key={lang}
            onClick={() => handleChange(lang)}
            title={LANG_META[lang].label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: compact ? 32 : 36,
              height: compact ? 32 : 36,
              borderRadius: 8,
              border: isActive
                ? '2px solid var(--boom)'
                : '1.5px solid rgba(255,255,255,0.12)',
              background: isActive
                ? 'rgba(255,53,0,0.12)'
                : 'rgba(255,255,255,0.04)',
              cursor: 'pointer',
              fontSize: compact ? 16 : 18,
              transition: 'all 0.15s',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              padding: 0,
              flexShrink: 0,
            }}
          >
            {LANG_META[lang].flag}
          </button>
        );
      })}
    </div>
  );
}
