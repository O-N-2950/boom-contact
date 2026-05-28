// Design tokens — directions comparables (preview interne uniquement).
// N'altère PAS le thème de production. Sert à /design-preview pour décision.
// Direction V1 retenue : Hybrid Trust Premium (recommended:true).

export type ThemeTokens = {
  id: 'hybrid' | 'trust' | 'swiss' | 'boom';
  name: string;
  recommended?: boolean;
  score: number;
  scheme: 'light' | 'dark';
  background: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textMuted: string;
  primary: string;       // CTA principal
  primaryHover: string;
  secondary: string;     // trust blue (CTA sérieux)
  accent: string;        // cyan
  success: string;
  warning: string;
  danger: string;
  border: string;
  shadow: string;
  radius: string;
  display: string;
  body: string;
  persona: string;
};

export const THEMES: ThemeTokens[] = [
  {
    id: 'hybrid', name: 'Hybrid Trust Premium', recommended: true, score: 95, scheme: 'light',
    background: '#F5F8FC', surface: '#FFFFFF', surfaceElevated: '#EEF4FA',
    text: '#102033', textMuted: '#5D6B7C',
    primary: '#FF6B1A', primaryHover: '#F05A0A', secondary: '#123A5A', accent: '#18B8E8',
    success: '#16A34A', warning: '#F59E0B', danger: '#DC2626',
    border: '#DDE7F0', shadow: '0 10px 30px rgba(16,32,51,.10)', radius: '18px',
    display: "'Sora',system-ui,sans-serif", body: "'Hanken Grotesk',system-ui,sans-serif",
    persona: "Direction V1. Fond clair, cartes blanches, texte bleu nuit, CTA orange boom, CTA sérieux bleu nuit. Calme, clair, rassurant, premium — esprit Apple/Stripe/Revolut/Alan avec signature boom.",
  },
  {
    id: 'trust', name: 'Trust Light Premium', score: 91, scheme: 'light',
    background: '#eef3f9', surface: '#ffffff', surfaceElevated: '#f4f7fb',
    text: '#0d1b2a', textMuted: '#5a6b80',
    primary: '#1b3a5b', primaryHover: '#264f7a', secondary: '#0ea5e9', accent: '#ff6b1a',
    success: '#16a34a', warning: '#d97706', danger: '#dc2626',
    border: '#d8e1ec', shadow: '0 10px 30px rgba(13,27,42,.10)', radius: '14px',
    display: "'Fraunces',Georgia,serif", body: "'Hanken Grotesk',system-ui,sans-serif",
    persona: "Rassurant, fintech/assurance. Bleu nuit dominant. Base de Hybrid.",
  },
  {
    id: 'swiss', name: 'Swiss Calm', score: 88, scheme: 'light',
    background: '#faf9f7', surface: '#ffffff', surfaceElevated: '#f3f1ed',
    text: '#1f2227', textMuted: '#6b7178',
    primary: '#d6452a', primaryHover: '#b83a22', secondary: '#8a9099', accent: '#d6452a',
    success: '#3f8a4f', warning: '#c08418', danger: '#c0392b',
    border: '#e7e4df', shadow: '0 6px 24px rgba(31,34,39,.08)', radius: '10px',
    display: "'Archivo',system-ui,sans-serif", body: "'IBM Plex Sans',system-ui,sans-serif",
    persona: "Institutionnel, suisse, élégant. B2B / assureurs / juristes / admin / police.",
  },
  {
    id: 'boom', name: 'Boom Dark Signature', score: 82, scheme: 'dark',
    background: '#0a0a14', surface: '#14141f', surfaceElevated: '#1c1c2b',
    text: '#f5f5f0', textMuted: '#9a9ab0',
    primary: '#ff6b1a', primaryHover: '#ff8340', secondary: '#00d4ff', accent: '#00d4ff',
    success: '#22c55e', warning: '#f59e0b', danger: '#ef4444',
    border: '#2a2a3a', shadow: '0 8px 32px rgba(0,0,0,.5)', radius: '16px',
    display: "'Sora',system-ui,sans-serif", body: "'Manrope',system-ui,sans-serif",
    persona: "Signature de marque (adoucie). Réservé landing marketing / viral / accent — pas le flow accident.",
  },
];

export const RECOMMENDED = THEMES.find((t) => t.recommended)!;
