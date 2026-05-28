import React, { useEffect, useState } from 'react';
import { SignaturePad } from '../components/constat/SignaturePad';

// /visual-qa — Production UI Visual QA + Mode screenshot marketing.
// - sans ?screenshot= : page QA interne (10 écrans en grille).
// - ?screenshot=<key>  : layout marketing plein écran pour capture stores.
//   keys: intro | qr | voice | photo | signature | pdf | done | emergency | store
// noindex partout. Hors nav publique. N'altère ni le flow ni le backend.

const DEMO = {
  driverA: 'Camille Martin',
  driverB: 'Luca Rossi',
  driverC: 'Sofia Keller',
  vehicleA: 'Exemple Auto · berline',
  vehicleB: 'Exemple Auto · SUV',
  plateA: 'VD 000 000',
  plateB: 'VD 000 001',
  insurer: 'Assurance Démo',
  email: 'demo@boom.contact',
  place: 'Lausanne, Suisse',
};

type ScreenKey = 'intro' | 'qr' | 'voice' | 'photo' | 'signature' | 'pdf' | 'done' | 'emergency' | 'store';

const MARKETING_TITLES: Record<Exclude<ScreenKey, 'store'>, string> = {
  intro:     'Documentez un accident\nen quelques minutes',
  qr:        'Invitez les participants\npar QR',
  voice:     'Ajoutez photos, voix\net informations utiles',
  photo:     'Ajoutez photos, voix\net informations utiles',
  signature: 'Signez votre déclaration\nen toute clarté',
  pdf:       'Générez un dossier PDF\nhorodaté',
  done:      'À transmettre\nà votre assureur',
  emergency: 'Conçu pour les situations\nstressantes',
};

const SCREEN_LABELS: Record<string, string> = {
  intro:     'Intro · sécurité',
  qr:        'QR · multi-participants',
  voice:     'Voix · texte',
  photo:     'Photos',
  signature: 'Signature',
  pdf:       'PDF · paiement',
  done:      'PDF prêt · email',
  join:      'Invité',
  error:     "État d'erreur · offline",
  emergency: 'Urgence',
};

function useHybridScope() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots'; meta.content = 'noindex,nofollow';
    document.head.appendChild(meta);
    const html = document.documentElement;
    const prev = html.getAttribute('data-theme');
    html.setAttribute('data-theme', 'hybrid');
    return () => {
      document.head.removeChild(meta);
      if (prev) html.setAttribute('data-theme', prev); else html.removeAttribute('data-theme');
    };
  }, []);
}

export default function VisualQA() {
  useHybridScope();
  // Détection du mode screenshot via query param (au mount uniquement)
  const [screenshotKey] = useState<ScreenKey | null>(() => {
    try {
      const k = new URLSearchParams(window.location.search).get('screenshot');
      if (!k) return null;
      const valid: ScreenKey[] = ['intro', 'qr', 'voice', 'photo', 'signature', 'pdf', 'done', 'emergency', 'store'];
      return (valid as string[]).includes(k) ? (k as ScreenKey) : null;
    } catch { return null; }
  });

  if (screenshotKey) return <ScreenshotMarketing screenKey={screenshotKey} />;
  return <QAPage />;
}

// ────────────────────────── MODE MARKETING (CAPTURE STORES) ──────────────────────────

function ScreenshotMarketing({ screenKey }: { screenKey: ScreenKey }) {
  if (screenKey === 'store') {
    // Vue d'ensemble : 7 phones dans une grille marketing
    const all: Exclude<ScreenKey, 'store'>[] = ['intro', 'qr', 'voice', 'photo', 'signature', 'pdf', 'done'];
    return (
      <div style={fullPageGradient}>
        <div style={{ padding: '60px 40px 30px', textAlign: 'center' }}>
          <h1 style={titleStyle}>boom.contact<span style={{ color: 'var(--boom)' }}> — </span>le flow accident</h1>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 22, padding: '0 40px 40px', maxWidth: 1600, margin: '0 auto' }}>
          {all.map((k) => <PhoneMarketingMini key={k} screenKey={k} />)}
        </div>
        <BrandMark />
      </div>
    );
  }

  const title = MARKETING_TITLES[screenKey];
  return (
    <div style={fullPageGradient}>
      <div style={{ flex: '0 0 auto', padding: '7vh 8vw 3vh', textAlign: 'center' }}>
        <h1 style={titleStyle}>{title.split('\n').map((l, i) => <span key={i} style={{ display: 'block' }}>{l}</span>)}</h1>
      </div>
      <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '0 8vw', minHeight: 0 }}>
        <PhoneMarketing screenKey={screenKey} />
      </div>
      <BrandMark />
    </div>
  );
}

const fullPageGradient: React.CSSProperties = {
  minHeight: '100vh',
  width: '100%',
  background: 'linear-gradient(180deg, #F5F8FC 0%, #EEF4FA 100%)',
  color: 'var(--text)',
  fontFamily: 'Manrope, system-ui, sans-serif',
  display: 'flex',
  flexDirection: 'column',
};

const titleStyle: React.CSSProperties = {
  fontFamily: 'Manrope, system-ui, sans-serif',
  fontWeight: 800,
  fontSize: 'clamp(28px, 5.4vw, 80px)',
  letterSpacing: '-0.025em',
  lineHeight: 1.04,
  color: 'var(--text)',
  margin: 0,
};

function BrandMark() {
  return (
    <div style={{ flex: '0 0 auto', padding: '24px 0 36px', textAlign: 'center' }}>
      <div style={{ fontWeight: 800, fontSize: 'clamp(14px,1.8vw,22px)', letterSpacing: '-.02em', color: 'var(--text)' }}>
        boom<span style={{ color: 'var(--boom)' }}>.contact</span>
      </div>
    </div>
  );
}

function PhoneMarketing({ screenKey }: { screenKey: Exclude<ScreenKey, 'store'> }) {
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 36, overflow: 'hidden',
      boxShadow: '0 20px 60px rgba(16,32,51,0.10), 0 8px 24px rgba(16,32,51,0.06)',
      border: '1px solid var(--border)',
      width: 'min(420px, 78vw)', flex: '0 0 auto',
    }}>
      <PhoneHeader />
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {renderScreen(screenKey)}
      </div>
    </div>
  );
}

function PhoneMarketingMini({ screenKey }: { screenKey: Exclude<ScreenKey, 'store'> }) {
  return (
    <div style={{ background: '#FFFFFF', borderRadius: 26, overflow: 'hidden', boxShadow: '0 8px 24px rgba(16,32,51,0.06)', border: '1px solid var(--border)' }}>
      <PhoneHeader />
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {renderScreen(screenKey)}
      </div>
    </div>
  );
}

function PhoneHeader() {
  return (
    <div style={{ padding: '14px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-.02em', color: 'var(--text)' }}>
        boom<span style={{ color: 'var(--boom)' }}>.contact</span>
      </div>
      <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.04em' }}>9:41</span>
    </div>
  );
}

// ────────────────────────── PAGE QA INTERNE (sans ?screenshot=) ──────────────────────────

const QA_SCREENS = ['intro', 'qr', 'photo', 'voice', 'signature', 'pdf', 'done', 'join', 'error', 'emergency'];

function QAPage() {
  return (
    <div style={{ background: 'var(--black)', minHeight: '100vh', color: 'var(--text)', paddingBottom: 80, fontFamily: 'Manrope, system-ui, sans-serif' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(245,248,252,.92)', backdropFilter: 'blur(14px)', borderBottom: '1px solid var(--border)', padding: '20px 24px' }}>
        <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-.02em', color: 'var(--text)' }}>
          boom<span style={{ color: 'var(--boom)' }}>.contact</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
          <span style={{ background: 'var(--navy,#123A5A)', color: '#fff', fontWeight: 800, fontSize: 12, padding: '6px 12px', borderRadius: 999 }}>Production UI Visual QA</span>
          <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>Mode screenshot : <code>?screenshot=intro|qr|voice|photo|signature|pdf|done|emergency|store</code></span>
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>
          Référence : <a href="/design-preview" style={{ color: 'var(--navy,#123A5A)', textDecoration: 'underline' }}>/design-preview</a>
        </div>
      </header>
      <main style={{ maxWidth: 1320, margin: '24px auto 0', padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(310px,1fr))', gap: 22 }}>
        {QA_SCREENS.map((s) => (
          <Phone key={s} label={SCREEN_LABELS[s] || s}>
            {s === 'signature' ? <SignatureScreenReal /> : renderScreen(s as Exclude<ScreenKey, 'store'>)}
          </Phone>
        ))}
      </main>
      <div style={{ maxWidth: 1320, margin: '40px auto 0', padding: '0 24px', color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--text)' }}>Note :</strong> rendu via les mêmes variables/classes que la production. SignaturePad est embarqué <strong>réellement</strong> (props mockées). QA visuelle device finale requise (<code>docs/device-qa-protocol.md</code>).
      </div>
    </div>
  );
}

function Phone({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>{label}</div>
      <div style={{ background: 'var(--black)', border: '1px solid var(--border)', borderRadius: 28, overflow: 'hidden', boxShadow: '0 8px 24px rgba(16,32,51,.06)' }}>
        <PhoneHeader />
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
      </div>
    </div>
  );
}

function SignatureScreenReal() {
  const [signed, setSigned] = useState(false);
  return (
    <div style={cardStyle}>
      <div style={lblStyle}>Signature · composant réel</div>
      <div style={h2Style}>Signature — {DEMO.driverA} (A)</div>
      <div style={{ ...mutStyle, margin: '8px 0 12px' }}>Composant SignaturePad de production avec props mockées.</div>
      <SignaturePad role="A" onSign={() => setSigned(true)} otherSigned={false} isOtherPedestrian={false} />
      {signed && <div style={{ ...mutStyle, marginTop: 8, color: 'var(--green)' }}>✓ Signature reçue (mock).</div>}
    </div>
  );
}

// ────────────────────────── ÉCRANS (réutilisés par les deux modes) ──────────────────────────

const cardStyle: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 18 };
const ctaStyle: React.CSSProperties = { width: '100%', padding: '14px 18px', borderRadius: 14, border: 'none', background: 'var(--boom)', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' };
const ctaNavyStyle: React.CSSProperties = { ...ctaStyle, background: 'var(--navy,#123A5A)' };
const ghostStyle: React.CSSProperties = { width: '100%', padding: '13px 18px', borderRadius: 14, border: '1.5px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' };
const mutStyle: React.CSSProperties = { color: 'var(--muted)', fontSize: 13, lineHeight: 1.5 };
const h2Style: React.CSSProperties = { fontWeight: 800, letterSpacing: '-.02em', fontSize: 21, lineHeight: 1.1, color: 'var(--text)', margin: '8px 0 0' };
const lblStyle: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--muted)' };

function renderScreen(key: Exclude<ScreenKey, 'store'> | string): React.ReactNode {
  switch (key) {
    case 'intro':
      return (
        <div style={cardStyle}>
          <div style={lblStyle}>Intro · sécurité</div>
          <div style={{ ...h2Style, fontSize: 24 }}>Votre constat,<br />en quelques minutes.</div>
          <p style={{ ...mutStyle, margin: '10px 0 16px' }}>Documentez l'accident étape par étape. En cas de blessés ou de danger, contactez d'abord les secours.</p>
          <button style={ctaStyle}>Commencer le constat</button>
          <div style={{ height: 10 }} />
          <button style={{ ...ghostStyle, color: 'var(--red)', borderColor: 'rgba(220,38,38,0.5)', background: 'rgba(220,38,38,0.08)' }}>🆘 Urgence — numéros de secours</button>
          <div style={{ ...mutStyle, fontSize: 11, marginTop: 12, textAlign: 'center', opacity: 0.7 }}>Confidentialité &amp; CGU</div>
        </div>
      );

    case 'qr':
      return (
        <div style={cardStyle}>
          <div style={lblStyle}>QR · multi-participants</div>
          <div style={h2Style}>Inviter les participants</div>
          <p style={{ ...mutStyle, margin: '8px 0 12px' }}>Jusqu'à 5 véhicules. Chaque participant scanne son QR.</p>
          <div style={{ background: '#FFFFFF', border: '2px solid rgba(18,58,90,0.2)', borderRadius: 20, padding: 16, minHeight: 168, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FakeQR />
          </div>
          <div style={{ display: 'flex', gap: 9, justifyContent: 'center', marginTop: 14 }}>
            {([['A', 'var(--boom)'], ['B', 'var(--navy,#123A5A)'], ['C', '#5D6B7C'], ['D', '#7E8CA0'], ['E', '#9AA7B4']] as [string, string][]).map(([r, bg]) => (
              <div key={r} style={{ width: 44, height: 44, borderRadius: '50%', background: bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16 }}>{r}</div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 14, alignItems: 'center', justifyContent: 'center' }}>
            <button style={{ width: 44, height: 44, padding: 0, fontSize: 20, fontWeight: 800, borderRadius: 10, background: 'var(--card2)', color: 'var(--muted)', border: '1px solid var(--border)' }}>−</button>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>2 véhicules</span>
            <button style={{ width: 44, height: 44, padding: 0, fontSize: 20, fontWeight: 800, borderRadius: 10, background: 'var(--boom)', color: '#fff', border: 'none' }}>+</button>
          </div>
        </div>
      );

    case 'photo':
      return (
        <div style={cardStyle}>
          <div style={lblStyle}>Photos</div>
          <div style={h2Style}>Ajoutez des photos</div>
          <p style={{ ...mutStyle, margin: '8px 0 12px' }}>Vue d'ensemble, dégâts, plaques, lieu, documents. <span style={{ color: 'var(--red)' }}>Blessures = à signaler aux secours.</span></p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
            {[['📷', 'Vue'], ['💥', 'Dégâts'], ['🔢', 'Plaque'], ['📍', 'Lieu'], ['📄', 'Document'], ['＋', 'Autre']].map(([icon, c]) => (
              <div key={c} style={{ aspectRatio: '1', borderRadius: 10, background: 'var(--card2)', border: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 11, gap: 6 }}>
                <span style={{ fontSize: 22 }}>{icon}</span>{c}
              </div>
            ))}
          </div>
          <button style={ctaStyle}>Continuer</button>
        </div>
      );

    case 'voice':
      return (
        <div style={cardStyle}>
          <div style={lblStyle}>Voix · texte</div>
          <div style={h2Style}>Décrivez l'accident</div>
          <p style={{ ...mutStyle, margin: '8px 0 14px' }}>À l'oral — ou en texte si vous préférez.</p>
          <div style={{ background: 'var(--card2)', borderRadius: 14, padding: 22, textAlign: 'center', marginBottom: 12 }}>
            <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'var(--boom)', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, boxShadow: '0 0 0 12px rgba(255,107,26,.12)' }}>🎙️</div>
            <div style={{ display: 'flex', gap: 3, height: 40, alignItems: 'center', justifyContent: 'center', marginTop: 14 }}>
              {Array.from({ length: 17 }).map((_, i) => <span key={i} style={{ width: 4, borderRadius: 2, background: 'var(--cyan,#18B8E8)', height: 8 + Math.abs(Math.sin(i * 0.8)) * 30 }} />)}
            </div>
            <div style={{ ...mutStyle, marginTop: 10, fontSize: 12 }}>00:24 — enregistrement</div>
          </div>
          <button style={ghostStyle}>✍️ Saisir en texte</button>
        </div>
      );

    case 'signature':
      return (
        <div style={cardStyle}>
          <div style={lblStyle}>Signature</div>
          <div style={h2Style}>Signature — {DEMO.driverA}</div>
          <p style={{ ...mutStyle, margin: '8px 0 12px' }}>Rôle A · {DEMO.vehicleA} · {DEMO.plateA}</p>
          <div style={{ height: 110, border: '1.5px dashed var(--border)', borderRadius: 14, background: '#FFFFFF', position: 'relative', marginBottom: 12 }}>
            <svg viewBox="0 0 240 110" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
              <path d="M14 78 q22 -50 44 -10 t46 -4 q20 -36 38 6 t52 -14" fill="none" stroke="#102033" strokeWidth={3} strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', top: 8, right: 10, fontSize: 9.5, fontWeight: 800, color: 'var(--green)', letterSpacing: '0.08em' }}>✓ SIGNÉ</div>
          </div>
          <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 12, color: 'var(--muted)', lineHeight: 1.45, marginBottom: 12 }}>
            <span style={{ width: 18, height: 18, borderRadius: 5, border: '1.6px solid var(--boom)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--boom)', flex: 'none' }}>✓</span>
            <span>Je confirme que les informations que j'ai fournies sont exactes à ma connaissance.</span>
          </div>
          <button style={{ ...ctaStyle, background: 'var(--green)' }}>✓ Signature confirmée</button>
        </div>
      );

    case 'pdf':
      return (
        <div style={cardStyle}>
          <div style={lblStyle}>PDF · paiement</div>
          <div style={h2Style}>Votre dossier est prêt</div>
          <p style={{ ...mutStyle, margin: '8px 0 12px' }}>Les signatures requises sont enregistrées. Générez le dossier PDF horodaté.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            <div style={priceRow(false)}><strong>1 constat</strong><strong>4.90</strong></div>
            <div style={priceRow(true)}>
              <div><span style={{ fontSize: 9.5, fontWeight: 800, color: 'var(--boom)', textTransform: 'uppercase', letterSpacing: '.05em' }}>★ populaire</span><br /><strong>3 constats</strong></div>
              <strong>12.90</strong>
            </div>
            <div style={priceRow(false)}><strong>10 constats</strong><strong>34.90</strong></div>
          </div>
          <button style={ctaNavyStyle}>Payer et générer le PDF</button>
          <div style={{ ...mutStyle, fontSize: 11, marginTop: 10 }}>Vous comprenez que ce dossier sera généré et qu'il vous appartient de le transmettre à votre assureur.</div>
        </div>
      );

    case 'done':
      return (
        <div style={cardStyle}>
          <div style={lblStyle}>PDF prêt · email</div>
          <div style={h2Style}>Dossier PDF généré</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(22,163,74,.08)', border: '1px solid rgba(22,163,74,.25)', borderRadius: 14, padding: 12, margin: '12px 0' }}>
            <span style={{ fontSize: 22 }}>✓</span>
            <div>
              <div style={{ color: 'var(--green)', fontWeight: 700 }}>PDF horodaté généré</div>
              <div style={{ ...mutStyle, fontSize: 12 }}>constat_2026-05-28_camille-martin.pdf</div>
            </div>
          </div>
          <button style={ctaStyle}>📥 Télécharger le PDF</button>
          <div style={{ height: 10 }} />
          <div style={{ background: 'var(--card2)', borderRadius: 12, padding: 10, marginBottom: 10 }}>
            <div style={{ ...mutStyle, fontSize: 11, marginBottom: 6 }}>Envoyer à</div>
            <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>{DEMO.email}</div>
          </div>
          <button style={ghostStyle}>📧 Recevoir le PDF par email</button>
          <p style={{ ...mutStyle, fontSize: 11, marginTop: 12 }}>À transmettre à votre assureur.</p>
        </div>
      );

    case 'join':
      return (
        <div style={cardStyle}>
          <div style={lblStyle}>Invité</div>
          <div style={h2Style}>Rejoindre le constat</div>
          <p style={{ ...mutStyle, margin: '8px 0 14px' }}>Vous avez été invité comme conducteur <strong style={{ color: 'var(--navy,#123A5A)' }}>B</strong> ({DEMO.driverB}).</p>
          <input type="email" placeholder={DEMO.email} defaultValue={DEMO.email} style={{ width: '100%', padding: '13px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: '#fff', color: 'var(--text)', fontSize: 14, marginBottom: 12, boxSizing: 'border-box' }} />
          <label style={{ display: 'flex', gap: 9, alignItems: 'flex-start', ...mutStyle, fontSize: 12, marginBottom: 14 }}>
            <input type="checkbox" defaultChecked style={{ marginTop: 3 }} /> J'accepte les CGU et la politique de confidentialité.
          </label>
          <button style={ctaStyle}>Rejoindre comme B</button>
          <div style={{ height: 10 }} />
          <button style={{ ...ghostStyle, color: 'var(--red)', borderColor: 'rgba(220,38,38,0.5)', background: 'rgba(220,38,38,0.08)' }}>🆘 Urgence</button>
        </div>
      );

    case 'error':
      return (
        <div style={{ ...cardStyle, borderColor: 'var(--red)' }}>
          <div style={lblStyle}>État d'erreur · offline</div>
          <div style={h2Style}>Connexion interrompue</div>
          <p style={{ ...mutStyle, margin: '8px 0 14px' }}>Vos données sont enregistrées localement. Reconnectez-vous pour synchroniser — rien n'est perdu.</p>
          <button style={ctaStyle}>Réessayer</button>
          <div style={{ height: 10 }} />
          <button style={ghostStyle}>Continuer hors ligne</button>
        </div>
      );

    case 'emergency':
      return (
        <div style={cardStyle}>
          <div style={lblStyle}>Urgence · numéros de secours</div>
          <div style={{ background: 'var(--red)', color: '#fff', borderRadius: 14, padding: '14px 18px', fontWeight: 800, fontSize: 15, textAlign: 'center', marginTop: 10 }}>🆘 Urgence — appeler les secours</div>
          <p style={{ ...mutStyle, margin: '14px 0', textAlign: 'center' }}>Blessés ou danger ? Appelez immédiatement.<br />Ce bouton reste visible pendant tout le constat.</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
            {[['112', 'Europe'], ['144', 'Suisse'], ['117', 'Police']].map(([n, l]) => (
              <div key={n} style={{ flex: 1, background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontWeight: 800, color: 'var(--text)', fontSize: 17 }}>{n}</div>
                <div style={{ ...mutStyle, fontSize: 10.5 }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ ...mutStyle, fontSize: 11, textAlign: 'center', opacity: 0.85 }}>boom.contact ne remplace pas les services de secours.</div>
        </div>
      );

    default: return null;
  }
}

function priceRow(best: boolean): React.CSSProperties {
  return {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: best ? 'var(--card2)' : 'var(--card)',
    border: `1.5px solid ${best ? 'var(--boom)' : 'var(--border)'}`,
    borderRadius: 14, padding: 13,
  };
}

function FakeQR() {
  // Un QR stylisé propre (pas un faux pattern repeating-conic) — pour preview interne uniquement.
  // Pour les screenshots stores définitifs, utiliser un vrai QR ou anonymisé.
  return (
    <svg viewBox="0 0 100 100" style={{ width: 132, height: 132 }} aria-label="QR stylisé démo">
      <rect width="100" height="100" fill="#FFFFFF" />
      {/* 3 coins finder */}
      {[[6, 6], [76, 6], [6, 76]].map(([x, y], i) => (
        <g key={i}>
          <rect x={x} y={y} width="18" height="18" fill="#123A5A" />
          <rect x={x + 3} y={y + 3} width="12" height="12" fill="#FFFFFF" />
          <rect x={x + 6} y={y + 6} width="6" height="6" fill="#123A5A" />
        </g>
      ))}
      {/* Pseudo-data modules */}
      {Array.from({ length: 80 }).map((_, i) => {
        const r = Math.sin(i * 1.7) * 0.5 + 0.5;
        const x = 28 + (i % 10) * 5;
        const y = 28 + Math.floor(i / 10) * 5;
        return r > 0.45 ? <rect key={i} x={x} y={y} width="4" height="4" fill="#123A5A" /> : null;
      })}
    </svg>
  );
}
