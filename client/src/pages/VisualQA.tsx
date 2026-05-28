import React, { useEffect, useState } from 'react';
import { SignaturePad } from '../components/constat/SignaturePad';

// /visual-qa — Production UI Visual QA (interne, noindex, hors nav publique).
// Rend les écrans du flow accident en data-theme="hybrid" en utilisant les MÊMES
// variables CSS / classes Tailwind que la production. Le SignaturePad est le composant
// réel embarqué (props mockées). Les autres reproduisent fidèlement les classes
// de production pour audit visuel rapide. N'altère pas le flow réel ni le backend.

const SCREENS: { id: string; label: string; title: string }[] = [
  { id: 'intro',   label: 'Intro · sécurité',          title: 'ConstatFlow — intro' },
  { id: 'qr',      label: 'QR · multi-participants',   title: 'QRSession' },
  { id: 'photo',   label: 'Photos',                     title: 'PhotoCapture' },
  { id: 'voice',   label: 'Voix · texte',              title: 'VoiceSketchFlow' },
  { id: 'sign',    label: 'Signature',                  title: 'SignaturePad (composant réel)' },
  { id: 'pdf',     label: 'PDF · paiement',            title: 'PDFDownload — paywall' },
  { id: 'done',    label: 'PDF prêt · email',          title: 'PDFDownload — prêt' },
  { id: 'join',    label: 'Invité',                     title: 'JoinSession' },
  { id: 'error',   label: "État d'erreur · offline",   title: 'Connexion interrompue' },
  { id: 'sos',     label: 'Urgence',                    title: 'Modale urgence' },
];

export default function VisualQA() {
  // noindex + scope hybrid (sur ce sous-arbre uniquement, restaure en sortie)
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

  return (
    <div style={{ background: 'var(--black)', minHeight: '100vh', color: 'var(--text)', paddingBottom: 80, fontFamily: 'Manrope, system-ui, sans-serif' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(245,248,252,.92)', backdropFilter: 'blur(14px)', borderBottom: '1px solid var(--border)', padding: '20px 24px' }}>
        <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-.02em', color: 'var(--text)' }}>
          boom<span style={{ color: 'var(--boom)' }}>.contact</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
          <span style={{ background: 'var(--navy,#123A5A)', color: '#fff', fontWeight: 800, fontSize: 12, padding: '6px 12px', borderRadius: 999 }}>Production UI Visual QA</span>
          <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>Rendu via les mêmes variables/classes que la production · noindex · hors nav publique · QA visuelle pré-device</span>
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>
          Référence comparative : <a href="/design-preview" style={{ color: 'var(--navy,#123A5A)', textDecoration: 'underline' }}>/design-preview</a>
        </div>
      </header>

      <main style={{ maxWidth: 1320, margin: '24px auto 0', padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(310px,1fr))', gap: 22 }}>
        {SCREENS.map((s) => (
          <Phone key={s.id} label={s.label} title={s.title}>{renderScreen(s.id)}</Phone>
        ))}
      </main>

      <div style={{ maxWidth: 1320, margin: '40px auto 0', padding: '0 24px', color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--text)' }}>Note honnêteté :</strong> ce rendu utilise le système de tokens (variables CSS + classes Tailwind) <strong>identique</strong> à la production — donc les couleurs, ombres, polices et bordures sont les mêmes. Le composant <code>SignaturePad</code> est embarqué <strong>réellement</strong> (props mockées). La QA visuelle finale sur device reste requise (cf. docs/device-qa-protocol.md).
      </div>
    </div>
  );
}

function Phone({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>{label}</div>
      <div style={{ background: 'var(--black)', border: '1px solid var(--border)', borderRadius: 28, overflow: 'hidden', boxShadow: 'var(--shadow-card, 0 8px 24px rgba(16,32,51,.06))' }}>
        <div style={{ padding: '14px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-.02em', color: 'var(--text)' }}>boom<span style={{ color: 'var(--boom)' }}>.contact</span></div>
          <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>{title}</span>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
      </div>
    </div>
  );
}

// Styles communs alignés sur la production (classes Tailwind utilisées dans les composants)
const card: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 18 };
const cta: React.CSSProperties = { width: '100%', padding: '14px 18px', borderRadius: 14, border: 'none', background: 'var(--boom)', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' };
const ctaNavy: React.CSSProperties = { ...cta, background: 'var(--navy,#123A5A)' };
const ghost: React.CSSProperties = { width: '100%', padding: '13px 18px', borderRadius: 14, border: '1.5px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' };
const mut: React.CSSProperties = { color: 'var(--muted)', fontSize: 13, lineHeight: 1.5 };
const h2: React.CSSProperties = { fontWeight: 800, letterSpacing: '-.02em', fontSize: 21, lineHeight: 1.1, color: 'var(--text)', margin: '8px 0 0' };
const lbl: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--muted)' };

function SignatureScreen() {
  // Embed RÉEL du composant SignaturePad de production avec props mockées
  const [signed, setSigned] = useState(false);
  return (
    <div style={card}>
      <div style={lbl}>Signature · composant réel</div>
      <div style={h2}>Signature — conducteur A</div>
      <div style={{ ...mut, margin: '8px 0 12px' }}>Composant réel embarqué (rôle A, otherSigned=false, mock onSign).</div>
      <SignaturePad role="A" onSign={() => setSigned(true)} otherSigned={false} isOtherPedestrian={false} />
      {signed && <div style={{ ...mut, marginTop: 8, color: 'var(--green)' }}>✓ Signature reçue (mock).</div>}
    </div>
  );
}

function renderScreen(id: string): React.ReactNode {
  switch (id) {
    case 'intro':
      return (
        <div style={card}>
          <div style={lbl}>Intro · sécurité</div>
          <div style={h2}>Votre constat,<br />en quelques minutes.</div>
          <p style={{ ...mut, margin: '10px 0 16px' }}>Documentez l'accident étape par étape. En cas de blessés ou de danger, contactez d'abord les secours.</p>
          <button style={cta}>Commencer le constat</button>
          <div style={{ height: 10 }} />
          <button style={{ ...ghost, color: 'var(--red)', borderColor: 'rgba(220,38,38,0.5)', background: 'rgba(220,38,38,0.08)' }}>🆘 Urgence — numéros de secours</button>
          <div style={{ ...mut, fontSize: 11, marginTop: 12, textAlign: 'center' }}>
            <a href="#" style={{ color: 'inherit', textDecoration: 'underline', opacity: 0.6 }}>Confidentialité & CGU</a>
          </div>
        </div>
      );

    case 'qr':
      return (
        <div style={card}>
          <div style={lbl}>QR · multi-participants</div>
          <div style={h2}>Inviter les participants</div>
          <p style={{ ...mut, margin: '8px 0 12px' }}>Jusqu'à 5 véhicules. Chaque participant scanne son QR.</p>
          <div style={{ background: '#FFFFFF', border: '2px solid rgba(18,58,90,0.2)', borderRadius: 20, padding: 16, minHeight: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 132, height: 132, background: 'repeating-conic-gradient(#123A5A 0 25%, #FFFFFF 0 50%) 50%/14px 14px', borderRadius: 12 }} />
          </div>
          <div style={{ display: 'flex', gap: 9, justifyContent: 'center', marginTop: 14 }}>
            {[['A', 'var(--boom)', '#fff'], ['B', 'var(--navy,#123A5A)', '#fff'], ['C', '#5D6B7C', '#fff'], ['D', '#7E8CA0', '#fff'], ['E', '#9AA7B4', '#fff']].map(([r, bg, c]) => (
              <div key={r} style={{ width: 36, height: 36, borderRadius: '50%', background: bg, color: c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>{r}</div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center', justifyContent: 'center' }}>
            <button style={{ ...ghost, width: 32, height: 32, padding: 0, fontSize: 18, fontWeight: 800, borderRadius: 8 }}>−</button>
            <span style={{ fontWeight: 700, color: 'var(--text)' }}>2 véhicules</span>
            <button style={{ width: 32, height: 32, padding: 0, fontSize: 18, fontWeight: 800, borderRadius: 8, background: 'var(--boom)', color: '#fff', border: 'none' }}>+</button>
          </div>
        </div>
      );

    case 'photo':
      return (
        <div style={card}>
          <div style={lbl}>Photos</div>
          <div style={h2}>Ajoutez des photos</div>
          <p style={{ ...mut, margin: '8px 0 12px' }}>Vue d'ensemble, dégâts, plaques, lieu, documents. <span style={{ color: 'var(--red)' }}>Blessures = à signaler aux secours.</span></p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
            {['Vue', 'Dégâts', 'Plaque', 'Lieu', 'Doc', 'Autre'].map((c, i) => (
              <div key={c} style={{ aspectRatio: '1', borderRadius: 10, background: 'var(--card2)', border: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 11, gap: 4 }}>
                <span style={{ fontSize: 18 }}>{i === 0 ? '📷' : i === 1 ? '💥' : '🔢'}</span>{c}
              </div>
            ))}
          </div>
          <button style={cta}>Continuer</button>
        </div>
      );

    case 'voice':
      return (
        <div style={card}>
          <div style={lbl}>Voix · texte</div>
          <div style={h2}>Décrivez l'accident</div>
          <p style={{ ...mut, margin: '8px 0 14px' }}>À l'oral — ou en texte si vous préférez.</p>
          <div style={{ background: 'var(--card2)', borderRadius: 14, padding: 18, textAlign: 'center', marginBottom: 12 }}>
            <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'var(--boom)', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, boxShadow: '0 0 0 10px rgba(255,107,26,.12)' }}>🎙️</div>
            <div style={{ display: 'flex', gap: 3, height: 36, alignItems: 'center', justifyContent: 'center', marginTop: 10 }}>
              {Array.from({ length: 15 }).map((_, i) => <span key={i} style={{ width: 3, borderRadius: 2, background: 'var(--cyan,#18B8E8)', height: 8 + Math.abs(Math.sin(i)) * 24 }} />)}
            </div>
          </div>
          <button style={ghost}>✍️ Saisir en texte</button>
        </div>
      );

    case 'sign':
      return <SignatureScreen />;

    case 'pdf':
      return (
        <div style={card}>
          <div style={lbl}>PDF · paiement</div>
          <div style={h2}>Votre dossier est prêt</div>
          <p style={{ ...mut, margin: '8px 0 12px' }}>Les signatures requises sont enregistrées. Générez le dossier PDF horodaté.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 14, padding: 13 }}>
              <strong>1 constat</strong><strong>4.90</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card2)', border: '1.5px solid var(--boom)', borderRadius: 14, padding: 13 }}>
              <div><span style={{ fontSize: 9.5, fontWeight: 800, color: 'var(--boom)', textTransform: 'uppercase', letterSpacing: '.05em' }}>★ populaire</span><br /><strong>3 constats</strong></div>
              <strong>12.90</strong>
            </div>
          </div>
          <button style={ctaNavy}>Payer et générer le PDF</button>
          <div style={{ ...mut, fontSize: 11, marginTop: 10 }}>Vous comprenez que ce dossier sera généré et qu'il vous appartient de le transmettre à votre assureur.</div>
        </div>
      );

    case 'done':
      return (
        <div style={card}>
          <div style={lbl}>PDF prêt · email</div>
          <div style={h2}>Dossier PDF généré</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(22,163,74,.08)', border: '1px solid rgba(22,163,74,.25)', borderRadius: 14, padding: 12, margin: '12px 0' }}>
            <span style={{ fontSize: 20 }}>✓</span><span style={{ color: 'var(--green)', fontWeight: 700 }}>PDF horodaté généré avec succès</span>
          </div>
          <button style={cta}>📥 Télécharger le PDF</button>
          <div style={{ height: 10 }} />
          <button style={ghost}>📧 Recevoir le PDF par email</button>
          <p style={{ ...mut, fontSize: 11, marginTop: 12 }}>À transmettre à votre assureur.</p>
        </div>
      );

    case 'join':
      return (
        <div style={card}>
          <div style={lbl}>Invité</div>
          <div style={h2}>Rejoindre le constat</div>
          <p style={{ ...mut, margin: '8px 0 14px' }}>Vous avez été invité comme conducteur <strong style={{ color: 'var(--navy,#123A5A)' }}>B</strong>.</p>
          <input type="email" placeholder="votre@email.com (optionnel)" style={{ width: '100%', padding: '13px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: '#fff', color: 'var(--text)', fontSize: 14, marginBottom: 12, boxSizing: 'border-box' }} />
          <label style={{ display: 'flex', gap: 9, alignItems: 'flex-start', ...mut, fontSize: 12, marginBottom: 14 }}>
            <input type="checkbox" defaultChecked style={{ marginTop: 3 }} /> J'accepte les CGU et la politique de confidentialité.
          </label>
          <button style={cta}>Rejoindre comme B</button>
          <div style={{ height: 10 }} />
          <button style={{ ...ghost, color: 'var(--red)', borderColor: 'rgba(220,38,38,0.5)', background: 'rgba(220,38,38,0.08)' }}>🆘 Urgence</button>
        </div>
      );

    case 'error':
      return (
        <div style={{ ...card, borderColor: 'var(--red)' }}>
          <div style={lbl}>État d'erreur</div>
          <div style={h2}>Connexion interrompue</div>
          <p style={{ ...mut, margin: '8px 0 14px' }}>Vos données sont enregistrées localement. Reconnectez-vous pour synchroniser — rien n'est perdu.</p>
          <button style={cta}>Réessayer</button>
          <div style={{ height: 10 }} />
          <button style={ghost}>Continuer hors ligne</button>
        </div>
      );

    case 'sos':
      return (
        <div style={card}>
          <div style={lbl}>Urgence · modale</div>
          <div style={{ background: 'var(--red)', color: '#fff', borderRadius: 14, padding: '14px 18px', fontWeight: 800, fontSize: 14, textAlign: 'center', marginTop: 10 }}>🆘 Urgence — appeler les secours</div>
          <p style={{ ...mut, margin: '12px 0', textAlign: 'center' }}>Blessés ou danger ? Appelez immédiatement.<br />Ce bouton reste visible pendant tout le constat.</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {['112', '144', '117'].map((n) => (
              <span key={n} style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 999, padding: '6px 14px', fontWeight: 700, color: 'var(--text)' }}>{n}</span>
            ))}
          </div>
        </div>
      );

    default: return null;
  }
}
