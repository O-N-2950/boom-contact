import React, { useEffect, useMemo, useState } from 'react';
import { THEMES, type ThemeTokens } from '../design/themeTokens';

// Page de comparaison visuelle INTERNE — route cachée /design-preview.
// noindex, hors navigation publique, n'altère pas le flow ni le thème de prod.

const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Manrope:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Hanken+Grotesk:wght@400;500;600;700&family=Archivo:wght@400;500;600;700;800&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap';

function useNoIndexAndFonts() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex,nofollow';
    document.head.appendChild(meta);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONTS_HREF;
    document.head.appendChild(link);
    return () => { document.head.removeChild(meta); document.head.removeChild(link); };
  }, []);
}

const SCREEN_LABELS: Record<string, string> = {
  intro: 'Intro · sécurité', qr: 'QR · multi-véhicules', voice: 'Déclaration vocale',
  sign: 'Signature', pay: 'Paiement · PDF', hero: 'Landing · hero',
  error: "État d'erreur", sos: 'Bouton urgence',
};

export default function DesignPreview() {
  useNoIndexAndFonts();
  const [active, setActive] = useState<ThemeTokens>(THEMES[0]);
  const t = active;

  const S = useMemo(() => makeStyles(t), [t]);
  const screens = ['intro', 'qr', 'voice', 'sign', 'pay', 'hero', 'error', 'sos'];

  return (
    <div style={{ background: '#06060c', minHeight: '100vh', paddingBottom: 80, color: '#e8e8ee', fontFamily: "'Manrope',system-ui,sans-serif" }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(6,6,12,.86)', backdropFilter: 'blur(14px)', borderBottom: '1px solid #1a1a26', padding: '18px 24px' }}>
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 800, letterSpacing: '-.02em' }}>💥 boom.contact — système visuel (preview interne)</h1>
        <div style={{ color: '#7a7a90', fontSize: 12.5, marginTop: 3 }}>3 directions · maquettes représentatives · wording prudent · noindex · hors nav publique</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          {THEMES.map((th) => (
            <button key={th.id} onClick={() => setActive(th)} style={{
              cursor: 'pointer', border: '1px solid #26263a', borderRadius: 999, padding: '9px 16px', fontSize: 13, fontWeight: 600,
              background: active.id === th.id ? th.primary : '#10101a', color: active.id === th.id ? '#fff' : '#c8c8d4',
              fontFamily: "'Manrope',sans-serif",
            }}>{th.name}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '26px auto 0', padding: '0 24px' }}>
        <div style={{ fontFamily: t.display, fontSize: 26, fontWeight: 800, color: t.primary, letterSpacing: '-.02em' }}>{t.name}</div>
        <div style={{ color: '#8a8aa0', fontSize: 13.5, marginTop: 4, maxWidth: 520 }}>{t.persona}</div>
        <div style={{ display: 'flex', gap: 7, marginTop: 12 }}>
          {[t.background, t.primary, t.secondary, t.accent, t.text].map((c, i) => (
            <div key={i} style={{ width: 34, height: 34, borderRadius: 9, background: c, border: '1px solid rgba(255,255,255,.12)' }} />
          ))}
        </div>
        <div style={{ color: '#666', fontSize: 11.5, marginTop: 14 }}>
          Titre : {t.display.replace(/'/g, '').split(',')[0]} · Texte : {t.body.replace(/'/g, '').split(',')[0]} · Rayon : {t.radius}
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '34px auto 0', padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 22 }}>
        {screens.map((s) => (
          <div key={s} style={S.phone}>
            <div style={S.label}>{SCREEN_LABELS[s]}</div>
            <div style={S.screen}>{renderScreen(s, t, S)}</div>
          </div>
        ))}
      </div>

      <div style={{ maxWidth: 1280, margin: '40px auto 0', padding: '0 24px', color: '#55556a', fontSize: 12, lineHeight: 1.6 }}>
        Wording verrouillé : « Dossier PDF horodaté », « à transmettre à votre assureur », bouton urgence visible.
        Wording prudent vérifié sur tous les écrans (cf. legal/LEGAL_CLAIMS_REVIEW.md) — uniquement « Dossier PDF horodaté » et « à transmettre à votre assureur ».
      </div>
    </div>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function makeStyles(t: ThemeTokens) {
  return {
    phone: { background: t.background, border: `1px solid ${t.border}`, borderRadius: 26, overflow: 'hidden', boxShadow: t.shadow, fontFamily: t.body, color: t.text } as React.CSSProperties,
    label: { fontFamily: t.display, fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: t.textMuted, padding: '12px 16px 0' } as React.CSSProperties,
    screen: { padding: 16, minHeight: 300, display: 'flex', flexDirection: 'column', gap: 12 } as React.CSSProperties,
    h1: { fontFamily: t.display, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.1, fontSize: 21 } as React.CSSProperties,
    h2: { fontFamily: t.display, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.1, fontSize: 17 } as React.CSSProperties,
    mut: { color: t.textMuted, fontSize: 12.5, lineHeight: 1.5 } as React.CSSProperties,
    btn: { border: 'none', borderRadius: `calc(${t.radius} - 4px)`, padding: '12px 16px', fontFamily: t.display, fontWeight: 700, fontSize: 13.5, background: t.primary, color: '#fff', textAlign: 'center' } as React.CSSProperties,
    sec: { background: 'transparent', border: `1px solid ${t.border}`, color: t.text } as React.CSSProperties,
    ghost: { background: t.surfaceElevated, color: t.text } as React.CSSProperties,
    chip: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, background: t.surfaceElevated, color: t.text, border: `1px solid ${t.border}` } as React.CSSProperties,
    card: { background: t.surface, border: `1px solid ${t.border}`, borderRadius: t.radius, padding: 14 } as React.CSSProperties,
    sos: { background: t.danger, color: '#fff', borderRadius: 999, padding: '11px 16px', fontWeight: 800, fontFamily: t.display, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 } as React.CSSProperties,
    qr: { aspectRatio: '1', maxWidth: 130, margin: '0 auto', borderRadius: 12, border: `1px solid ${t.border}`, background: `repeating-conic-gradient(${t.text} 0 25%, ${t.surface} 0 50%) 50%/14px 14px` } as React.CSSProperties,
    role: (on: boolean) => ({ width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: t.display, fontWeight: 800, fontSize: 13, background: on ? t.primary : t.surfaceElevated, color: on ? '#fff' : t.textMuted, border: `1px solid ${on ? 'transparent' : t.border}` } as React.CSSProperties),
    mic: { width: 64, height: 64, borderRadius: '50%', background: t.primary, margin: '4px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 } as React.CSSProperties,
    sign: { height: 90, border: `1.5px dashed ${t.border}`, borderRadius: 12, background: t.surface, position: 'relative' } as React.CSSProperties,
    box: { width: 17, height: 17, borderRadius: 5, border: `1.5px solid ${t.primary}`, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.primary, fontSize: 11 } as React.CSSProperties,
    price: (best: boolean) => ({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: t.surface, border: `1px solid ${best ? t.primary : t.border}`, borderRadius: 12, padding: 12, boxShadow: best ? `0 0 0 1px ${t.primary}` : 'none' } as React.CSSProperties),
    hero: { padding: '22px 16px', display: 'flex', flexDirection: 'column', gap: 12, background: `radial-gradient(120% 120% at 80% -10%, ${t.primary}28, transparent 60%), ${t.background}` } as React.CSSProperties,
    badge: { display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 11, fontWeight: 600, color: t.textMuted, background: t.surfaceElevated, padding: '5px 10px', borderRadius: 999, border: `1px solid ${t.border}`, width: 'fit-content' } as React.CSSProperties,
  };
}

function renderScreen(s: string, t: ThemeTokens, S: Styles) {
  switch (s) {
    case 'intro': return (<>
      <div style={S.h1}>Votre constat,<br />en quelques minutes.</div>
      <div style={S.mut}>En cas de blessés ou de danger, contactez d'abord les secours. boom.contact ne remplace ni la police ni votre assurance.</div>
      <button style={S.btn}>Démarrer le constat</button>
      <button style={{ ...S.btn, ...S.sec }}>Lire la confidentialité (CGU)</button>
      <div style={S.sos}>🆘 Urgence — appeler les secours</div>
    </>);
    case 'qr': return (<>
      <div style={S.h2}>Inviter les participants</div>
      <div style={S.mut}>Jusqu'à 5 véhicules. Chaque participant scanne <b>son</b> QR.</div>
      <div style={S.qr} />
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        {['A', 'B', 'C', 'D', 'E'].map((r, i) => <div key={r} style={S.role(i < 2)}>{r}</div>)}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={{ ...S.btn, ...S.ghost, flex: 1 }}>−</button>
        <span style={{ ...S.chip, flex: 1, justifyContent: 'center' }}>2 véhicules</span>
        <button style={{ ...S.btn, ...S.ghost, flex: 1 }}>+</button>
      </div>
    </>);
    case 'voice': return (<div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', textAlign: 'center' }}>
      <div style={S.h2}>Décrivez l'accident</div>
      <div style={S.mut}>À l'oral — ou en texte si vous préférez.</div>
      <div style={S.mic}>🎙️</div>
      <div style={{ display: 'flex', gap: 3, height: 46, alignItems: 'center' }}>
        {Array.from({ length: 13 }).map((_, i) => <span key={i} style={{ width: 4, borderRadius: 3, background: t.secondary, height: 12 + Math.abs(Math.sin(i)) * 30 }} />)}
      </div>
      <div style={{ ...S.mut, fontSize: 11 }}>Le micro n'est utilisé que pendant l'enregistrement.</div>
      <button style={{ ...S.btn, ...S.sec, width: '100%' }}>✍️ Saisir en texte</button>
    </div>);
    case 'sign': return (<>
      <div style={S.h2}>Signature — conducteur A</div>
      <div style={S.sign}>
        <svg viewBox="0 0 200 90" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <path d="M15 60 q20 -40 38 -8 t40 -2 q18 -28 34 4 t44 -10" fill="none" stroke={t.primary} strokeWidth={2.4} strokeLinecap="round" />
        </svg>
      </div>
      <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 11.5, color: t.textMuted, lineHeight: 1.45 }}>
        <span style={S.box}>✓</span><span>Je confirme que les informations que j'ai fournies sont exactes à ma connaissance.</span>
      </div>
      <button style={S.btn}>Signer</button>
    </>);
    case 'pay': return (<>
      <div style={S.h2}>Générer le dossier PDF horodaté</div>
      <div style={S.price(false)}><div><b>1 constat</b><div style={S.mut}>Accident ponctuel</div></div><b>4.90</b></div>
      <div style={S.price(true)}><div><span style={{ fontSize: 9.5, fontWeight: 700, color: t.primary, textTransform: 'uppercase', letterSpacing: '.05em' }}>★ populaire</span><br /><b>3 constats</b></div><b>12.90</b></div>
      <div style={S.price(false)}><div><b>10 constats</b><div style={S.mut}>Courtiers, flottes</div></div><b>34.90</b></div>
      <div style={{ ...S.mut, fontSize: 11 }}>Paiement sécurisé. Vous comprenez que ce dossier sera généré et qu'il vous appartient de le transmettre.</div>
    </>);
    case 'hero': return (<div style={S.hero}>
      <span style={S.badge}>⚡ Constat numérique</span>
      <div style={S.h1}>L'accident, géré<br />simplement.</div>
      <div style={S.mut}>Documentez, signez et obtenez un dossier PDF horodaté à transmettre à votre assureur.</div>
      <button style={S.btn}>Commencer maintenant</button>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <span style={S.badge}>🔒 Chiffré</span><span style={S.badge}>⏱️ Horodaté</span><span style={S.badge}>📄 PDF</span>
      </div>
    </div>);
    case 'error': return (<>
      <div style={S.h2}>Connexion interrompue</div>
      <div style={{ ...S.card, borderColor: t.danger }}><div style={S.mut}>Vos données sont enregistrées localement. Reconnectez-vous pour synchroniser — rien n'est perdu.</div></div>
      <button style={S.btn}>Réessayer</button>
      <button style={{ ...S.btn, ...S.sec }}>Continuer hors ligne</button>
    </>);
    case 'sos': return (<div style={{ display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ ...S.sos, fontSize: 16, padding: 16 }}>🆘 URGENCE</div>
      <div style={S.mut}>Blessés ou danger ? Appelez immédiatement les secours.<br />Ce bouton reste visible pendant tout le constat.</div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        {['112', '144', '117'].map((n) => <span key={n} style={S.chip}>{n}</span>)}
      </div>
    </div>);
    default: return null;
  }
}
