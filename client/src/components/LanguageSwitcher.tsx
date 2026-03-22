// boom.contact — LanguageSwitcher
// 4 boutons drapeaux toujours visibles — pas de dropdown, pas de bug iOS
// La solution la plus simple est la meilleure

import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGS, LANG_META, applyDir } from '../i18n';

interface Props {
  style?: React.CSSProperties;
  compact?: boolean;
}

export function LanguageSwitcher({ style, compact = false }: Props) {
  const { i18n } = useTranslation();

  const currentLang = (SUPPORTED_LANGS.includes(i18n.language as any)
    ? i18n.language
    : 'fr') as keyof typeof LANG_META;

  const handleChange = (lang: string) => {
    i18n.changeLanguage(lang);
    applyDir(lang);
    // Persister dans localStorage
    localStorage.setItem('boom_lang', lang);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      ...style,
    }}>
      {SUPPORTED_LANGS.map(lang => {
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
              // iOS: supprime délai 300ms et highlight bleu au tap
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
