import React, { useEffect, useMemo, useState } from 'react';
import { THEMES, RECOMMENDED, type ThemeTokens } from '../design/themeTokens';

// Page de comparaison visuelle INTERNE — route cachée /design-preview.
// noindex, hors navigation publique, n'altère pas le flow ni le thème de prod.
// Direction recommandée V1 : Hybrid Trust Premium.

const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Manrope:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Archivo:wght@400;500;600;700;800&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap';

function useNoIndexAndFonts() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots'; meta.content = 'noindex,nofollow';
    document.head.appendChild(meta);
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = FONTS_HREF;
    document.head.appendChild(link);
    return () => { document.head.removeChild(meta); document.head.removeChild(link); };
  }, []);
}

const SCREEN_LABELS: Record<string, string> = {
  intro: 'Intro · sécurité', qr: 'QR · multi-participants', voice: 'Voix · texte',
  sign: 'Signature', pay: 'PDF · paiement', error: "État d'erreur", sos: 'Urgence',
};
const HYBRID_SCREENS = ['intro', 'qr', 'voice', 'sign', 'pay', 'error', 'sos'];

export default function DesignPreview() {
  useNoIndexAndFonts();
  const hybrid = RECOMMENDED;
  const [alt, setAlt] = useState<ThemeTokens>(THEMES.find((t) => t.id === 'trust')!);

  const HS = useMemo(() => makeStyles(hybrid), [hybrid]);
  const AS = useMemo(() => makeStyles(alt), [alt]);

  return (
    <div style={{ background: hybrid.background, minHeight: '100vh', paddingBottom: 90, color: hybrid.text, fontFamily: hybrid.body }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(245,248,252,.88)', backdropFilter: 'blur(14px)', borderBottom: `1px solid ${hybrid.border}`, padding: '20px 24px' }}>
        <Logo t={hybrid} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
          <span style={{ background: hybrid.primary, color: '#fff', fontFamily: hybrid.display, fontWeight: 800, fontSize: 12, padding: '6px 12px', borderRadius: 999 }}>★ Direction recommandée V1</span>
          <span style={{ fontFamily: hybrid.display, fontSize: 19, fontWeight: 800, color: hybrid.text, letterSpacing: '-.02em' }}>Hybrid Trust Premium</span>
          <span style={{ color: hybrid.textMuted, fontSize: 13 }}>· 95/100</span>
        </div>
        <div style={{ color: hybrid.textMuted, fontSize: 12.5, marginTop: 6 }}>Preview interne · noindex · hors nav publique · n'altère pas la production</div>
      </div>

      {/* Intention + palette */}
      <div style={{ maxWidth: 1280, margin: '26px auto 0', padding: '0 24px', display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 360px' }}>
          <div style={{ fontFamily: hybrid.display, fontSize: 15, fontWeight: 700, color: hybrid.secondary }}>« Je suis guidé, c'est clair, sérieux, calme et professionnel. »</div>
          <div style={{ color: hybrid.textMuted, fontSize: 13.5, marginTop: 8, lineHeight: 1.55, maxWidth: 520 }}>{hybrid.persona}</div>
        </div>
        <div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {([['Fond', hybrid.background], ['Carte', hybrid.surface], ['Texte', hybrid.text], ['CTA', hybrid.primary], ['Trust blue', hybrid.secondary], ['Cyan', hybrid.accent], ['Danger', hybrid.danger], ['Success', hybrid.success]] as [string, string][]).map(([n, c]) => (
              <div key={n} style={{ textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: c, border: `1px solid ${hybrid.border}` }} />
                <div style={{ fontSize: 9.5, color: hybrid.textMuted, marginTop: 4 }}>{n}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mockups Hybrid réalistes */}
      <div style={{ maxWidth: 1280, margin: '30px auto 0', padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 24 }}>
        {HYBRID_SCREENS.map((s) => (
          <Phone key={s} t={hybrid} S={HS} label={SCREEN_LABELS[s]}>{renderScreen(s, hybrid, HS)}</Phone>
        ))}
      </div>

      {/* Comparaison directions */}
      <div style={{ maxWidth: 1280, margin: '54px auto 0', padding: '0 24px' }}>
        <div style={{ fontFamily: hybrid.display, fontSize: 20, fontWeight: 800, letterSpacing: '-.02em' }}>Autres directions explorées</div>
        <div style={{ color: hybrid.textMuted, fontSize: 13, marginTop: 4 }}>Chaque direction est rendue sur son vrai fond. Sélectionne pour comparer.</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          {THEMES.map((th) => (
            <button key={th.id} onClick={() => th.id !== 'hybrid' && setAlt(th)} style={{
              cursor: th.id === 'hybrid' ? 'default' : 'pointer', border: `1px solid ${hybrid.border}`, borderRadius: 999, padding: '9px 15px', fontSize: 13, fontWeight: 700,
              fontFamily: hybrid.body, background: alt.id === th.id ? hybrid.secondary : (th.id === 'hybrid' ? hybrid.surfaceElevated : hybrid.surface),
              color: alt.id === th.id ? '#fff' : hybrid.text, opacity: th.id === 'hybrid' ? .6 : 1,
            }}>{th.name} · {th.score}{th.recommended ? ' ★' : ''}</button>
          ))}
        </div>

        {/* Mini preview de l'alternative sélectionnée, sur SON fond */}
        <div style={{ marginTop: 18, background: alt.background, border: `1px solid ${alt.border}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontFamily: alt.display, fontSize: 17, fontWeight: 800, color: alt.text }}>{alt.name} <span style={{ fontSize: 12, color: alt.textMuted, fontWeight: 600 }}>· {alt.scheme === 'dark' ? 'fond sombre' : 'fond clair'} · {alt.score}/100</span></div>
          <div style={{ color: alt.textMuted, fontSize: 12.5, marginTop: 4, maxWidth: 640 }}>{alt.persona}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: 18, marginTop: 16 }}>
            {['intro', 'pay', 'sos'].map((s) => (
              <Phone key={s} t={alt} S={AS} label={SCREEN_LABELS[s]}>{renderScreen(s, alt, AS)}</Phone>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '40px auto 0', padding: '0 24px', color: hybrid.textMuted, fontSize: 12, lineHeight: 1.6 }}>
        Wording prudent vérifié sur tous les écrans (cf. legal/LEGAL_CLAIMS_REVIEW.md) — uniquement « Dossier PDF horodaté » et « à transmettre à votre assureur ». Production inchangée tant que la direction n'est pas appliquée.
      </div>
    </div>
  );
}

function Logo({ t }: { t: ThemeTokens }) {
  return (
    <div style={{ fontFamily: t.display, fontWeight: 800, fontSize: 22, letterSpacing: '-.02em', color: t.text }}>
      boom<span style={{ color: t.primary }}>.contact</span>
    </div>
  );
}

function Phone({ t, S, label, children }: { t: ThemeTokens; S: Styles; label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: t.background, border: `1px solid ${t.border}`, borderRadius: 28, overflow: 'hidden', boxShadow: t.shadow }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 0' }}>
        <Logo t={t} />
        <span style={{ fontFamily: t.display, fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: t.textMuted }}>{label}</span>
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14, fontFamily: t.body, color: t.text }}>{children}</div>
    </div>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function makeStyles(t: ThemeTokens) {
  return {
    t,
    card: { background: t.surface, border: `1px solid ${t.border}`, borderRadius: t.radius, padding: 18, boxShadow: t.scheme === 'light' ? '0 1px 2px rgba(16,32,51,.04)' : 'none' } as React.CSSProperties,
    label: { fontFamily: t.display, fontSize: 10.5, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: t.textMuted } as React.CSSProperties,
    h1: { fontFamily: t.display, fontWeight: 800, letterSpacing: '-.025em', lineHeight: 1.08, fontSize: 24, color: t.text, margin: '8px 0 0' } as React.CSSProperties,
    h2: { fontFamily: t.display, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.1, fontSize: 19, color: t.text, margin: '8px 0 0' } as React.CSSProperties,
    mut: { color: t.textMuted, fontSize: 13, lineHeight: 1.5 } as React.CSSProperties,
    cta: { border: 'none', borderRadius: 14, padding: '14px 18px', fontFamily: t.display, fontWeight: 800, fontSize: 14.5, background: t.primary, color: '#fff', textAlign: 'center', width: '100%', boxShadow: `0 6px 16px ${t.primary}33` } as React.CSSProperties,
    ctaNavy: { border: 'none', borderRadius: 14, padding: '14px 18px', fontFamily: t.display, fontWeight: 800, fontSize: 14.5, background: t.secondary, color: '#fff', textAlign: 'center', width: '100%' } as React.CSSProperties,
    ghost: { border: `1.5px solid ${t.border}`, borderRadius: 14, padding: '13px 18px', fontFamily: t.display, fontWeight: 700, fontSize: 13.5, background: t.surface, color: t.text, textAlign: 'center', width: '100%' } as React.CSSProperties,
    chip: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: t.surfaceElevated, color: t.text, border: `1px solid ${t.border}` } as React.CSSProperties,
    sos: { background: t.danger, color: '#fff', borderRadius: 14, padding: '13px 18px', fontWeight: 800, fontFamily: t.display, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 } as React.CSSProperties,
    qr: { aspectRatio: '1', maxWidth: 124, margin: '4px auto', borderRadius: 14, border: `1px solid ${t.border}`, background: `repeating-conic-gradient(${t.text} 0 25%, ${t.surface} 0 50%) 50%/13px 13px` } as React.CSSProperties,
    role: (kind: 'a' | 'b' | 'off') => ({ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: t.display, fontWeight: 800, fontSize: 14, ...(kind === 'a' ? { background: t.primary, color: '#fff' } : kind === 'b' ? { background: t.secondary, color: '#fff' } : { background: t.surfaceElevated, color: t.textMuted, border: `1px solid ${t.border}` }) } as React.CSSProperties),
    mic: { width: 68, height: 68, borderRadius: '50%', background: t.primary, margin: '6px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, boxShadow: `0 0 0 10px ${t.primary}1f` } as React.CSSProperties,
    sign: { height: 96, border: `1.5px dashed ${t.border}`, borderRadius: 14, background: t.surfaceElevated, position: 'relative' } as React.CSSProperties,
    box: { width: 18, height: 18, borderRadius: 5, border: `1.6px solid ${t.primary}`, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.primary, fontSize: 12 } as React.CSSProperties,
    price: (best: boolean) => ({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: best ? t.surfaceElevated : t.surface, border: `1.5px solid ${best ? t.primary : t.border}`, borderRadius: 14, padding: 13 } as React.CSSProperties),
  };
}

function renderScreen(s: string, t: ThemeTokens, S: Styles) {
  switch (s) {
    case 'intro': return (
      <div style={S.card}>
        <div style={S.label}>Intro · sécurité</div>
        <div style={S.h1}>Votre constat,<br />en quelques minutes.</div>
        <div style={{ ...S.mut, margin: '10px 0 16px' }}>Documentez l'accident étape par étape. En cas de blessés ou de danger, contactez d'abord les secours.</div>
        <button style={S.cta}>Commencer le constat</button>
        <div style={{ height: 10 }} />
        <button style={S.ghost}>Lire la confidentialité (CGU)</button>
      </div>
    );
    case 'qr': return (
      <div style={S.card}>
        <div style={S.label}>QR · multi-participants</div>
        <div style={S.h2}>Inviter les participants</div>
        <div style={{ ...S.mut, margin: '8px 0 12px' }}>Jusqu'à 5 véhicules. Chaque participant scanne son QR.</div>
        <div style={S.qr} />
        <div style={{ display: 'flex', gap: 9, justifyContent: 'center', marginTop: 14 }}>
          <div style={S.role('a')}>A</div><div style={S.role('b')}>B</div>
          <div style={S.role('off')}>C</div><div style={S.role('off')}>D</div><div style={S.role('off')}>E</div>
        </div>
      </div>
    );
    case 'voice': return (
      <div style={{ ...S.card, textAlign: 'center' }}>
        <div style={{ ...S.label, textAlign: 'left' }}>Voix · texte</div>
        <div style={S.h2}>Décrivez l'accident</div>
        <div style={{ ...S.mut, margin: '8px 0 6px' }}>À l'oral — ou en texte si vous préférez.</div>
        <div style={S.mic}>🎙️</div>
        <div style={{ display: 'flex', gap: 3, height: 42, alignItems: 'center', justifyContent: 'center', margin: '6px 0' }}>
          {Array.from({ length: 15 }).map((_, i) => <span key={i} style={{ width: 4, borderRadius: 3, background: t.accent, height: 10 + Math.abs(Math.sin(i)) * 28 }} />)}
        </div>
        <button style={S.ghost}>✍️ Saisir en texte</button>
      </div>
    );
    case 'sign': return (
      <div style={S.card}>
        <div style={S.label}>Signature</div>
        <div style={S.h2}>Signature — conducteur A</div>
        <div style={{ ...S.sign, marginTop: 12 }}>
          <svg viewBox="0 0 200 96" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <path d="M15 64 q20 -42 38 -8 t40 -2 q18 -30 34 4 t44 -10" fill="none" stroke={t.secondary} strokeWidth={2.6} strokeLinecap="round" />
          </svg>
        </div>
        <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 12, color: t.textMuted, lineHeight: 1.45, margin: '12px 0' }}>
          <span style={S.box}>✓</span><span>Je confirme que les informations que j'ai fournies sont exactes à ma connaissance.</span>
        </div>
        <button style={S.cta}>Signer</button>
      </div>
    );
    case 'pay': return (
      <div style={S.card}>
        <div style={S.label}>PDF · paiement</div>
        <div style={S.h2}>Votre dossier est prêt</div>
        <div style={{ ...S.mut, margin: '8px 0 12px' }}>Les signatures requises sont enregistrées. Générez le dossier PDF horodaté.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          <div style={S.price(false)}><div><b>1 constat</b></div><b>4.90</b></div>
          <div style={S.price(true)}><div><span style={{ fontSize: 9.5, fontWeight: 800, color: t.primary, textTransform: 'uppercase', letterSpacing: '.05em' }}>★ populaire</span><br /><b>3 constats</b></div><b>12.90</b></div>
        </div>
        <button style={S.ctaNavy}>Payer et générer le PDF</button>
        <div style={{ ...S.mut, fontSize: 11, marginTop: 10 }}>Vous comprenez que ce dossier sera généré et qu'il vous appartient de le transmettre à votre assureur.</div>
      </div>
    );
    case 'error': return (
      <div style={{ ...S.card, borderColor: t.danger }}>
        <div style={S.label}>État d'erreur</div>
        <div style={S.h2}>Connexion interrompue</div>
        <div style={{ ...S.mut, margin: '8px 0 14px' }}>Vos données sont enregistrées localement. Reconnectez-vous pour synchroniser — rien n'est perdu.</div>
        <button style={S.cta}>Réessayer</button>
        <div style={{ height: 10 }} />
        <button style={S.ghost}>Continuer hors ligne</button>
      </div>
    );
    case 'sos': return (
      <div style={S.card}>
        <div style={S.label}>Urgence</div>
        <div style={{ ...S.sos, marginTop: 10 }}>🆘 Urgence — appeler les secours</div>
        <div style={{ ...S.mut, margin: '12px 0', textAlign: 'center' }}>Blessés ou danger ? Appelez immédiatement.<br />Ce bouton reste visible pendant tout le constat.</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {['112', '144', '117'].map((n) => <span key={n} style={S.chip}>{n}</span>)}
        </div>
      </div>
    );
    default: return null;
  }
}
