/**
 * boom.contact — ThemeToggle
 * Bascule dark/light mode via data-theme sur <html>
 * Technique Horlogis — localStorage persistence
 */
import { useState, useEffect } from 'react';

const THEME_KEY = 'boom-theme';

export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem(THEME_KEY) as 'dark' | 'light') || 'dark';
  });

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return { theme, toggle };
}

interface Props {
  style?: React.CSSProperties;
}

export function ThemeToggle({ style }: Props) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
      style={{
        background: 'none',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: '5px 10px',
        cursor: 'pointer',
        fontSize: 16,
        color: 'var(--text)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        ...style,
      }}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
