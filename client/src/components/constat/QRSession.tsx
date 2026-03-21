import { useState, useEffect, useRef } from 'react';

interface Props {
  sessionId: string;
  qrUrl: string;
  onPartnerJoined: () => void;
}

export function QRSession({ sessionId, qrUrl, onPartnerJoined }: Props) {
  const [partnerJoined, setPartnerJoined] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Generate QR code via API
  useEffect(() => {
    generateQR();
    startPolling();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const generateQR = async () => {
    try {
      const QRCode = await import('qrcode');
      const url = await QRCode.toDataURL(qrUrl, {
        width: 280,
        margin: 2,
        color: { dark: '#FF3500', light: '#06060C' },
        errorCorrectionLevel: 'M',
      });
      setQrDataUrl(url);
    } catch { /* QR lib not available, show text fallback */ }
  };

  // Poll for partner joining
  const startPolling = () => {
    pollRef.current = setInterval(async () => {
      try {
        const resp = await fetch(`/trpc/session.get?input=${encodeURIComponent(JSON.stringify({ sessionId }))}`);
        const data = await resp.json();
        const status = data?.result?.data?.status;
        if (status === 'active' || status === 'signing' || status === 'completed') {
          setPartnerJoined(true);
          if (pollRef.current) clearInterval(pollRef.current);
          setTimeout(onPartnerJoined, 1200);
        }
      } catch { /* ignore polling errors */ }
    }, 2000);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'boom.contact — Constat', url: qrUrl });
    } else {
      copyLink();
    }
  };

  if (partnerJoined) return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 16, animation: 'bounceIn 0.5s ease' }}>🤝</div>
      <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--boom)', marginBottom: 8 }}>
        L'autre conducteur a rejoint !
      </h3>
      <p style={{ fontSize: 14, opacity: 0.5 }}>Connexion établie. Passage au formulaire…</p>
      <style>{`@keyframes bounceIn{0%{transform:scale(0)}60%{transform:scale(1.2)}100%{transform:scale(1)}}`}</style>
    </div>
  );

  return (
    <div style={{ padding: 24 }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
          Partagez ce QR code
        </h2>
        <p style={{ fontSize: 13, opacity: 0.5, lineHeight: 1.6 }}>
          L'autre conducteur scanne ce code pour rejoindre le constat.
          Vous remplirez chacun vos informations sur votre propre téléphone.
        </p>
      </div>

      {/* QR Code */}
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        marginBottom: 24, padding: 20,
        background: '#06060C', borderRadius: 20,
        border: '2px solid rgba(255,53,0,0.2)',
        boxShadow: '0 0 40px rgba(255,53,0,0.1)',
        minHeight: 200,
      }}>
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="QR Code boom.contact" style={{ width: 220, height: 220, borderRadius: 8 }} />
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>📱</div>
            <div style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: 1, opacity: 0.5, wordBreak: 'break-all', maxWidth: 240 }}>
              {qrUrl}
            </div>
          </div>
        )}
      </div>

      {/* Session ID badge */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 14px', borderRadius: 20,
          border: '1px solid rgba(255,53,0,0.2)',
          background: 'rgba(255,53,0,0.06)' }}>
          <span style={{ fontSize: 10, letterSpacing: 2, opacity: 0.4, textTransform: 'uppercase', fontFamily: 'monospace' }}>
            SESSION
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, fontFamily: 'monospace', color: 'var(--boom)' }}>
            {sessionId}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button onClick={shareLink} style={{
          flex: 2, padding: '14px', borderRadius: 10, border: 'none',
          background: 'var(--boom)', color: '#fff', cursor: 'pointer',
          fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <span>📤</span> Partager le lien
        </button>
        <button onClick={copyLink} style={{
          flex: 1, padding: '14px', borderRadius: 10,
          border: '1.5px solid rgba(240,237,232,0.15)',
          background: copied ? 'rgba(34,197,94,0.15)' : 'transparent',
          color: copied ? '#22c55e' : 'var(--text)',
          cursor: 'pointer', fontSize: 14, fontWeight: 600,
          transition: 'all 0.2s',
        }}>
          {copied ? '✅ Copié' : '📋 Copier'}
        </button>
      </div>

      {/* Waiting indicator */}
      <div style={{ padding: '14px 18px', borderRadius: 10,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b',
          animation: 'pulse 1.5s ease-in-out infinite', flexShrink: 0 }}/>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>En attente de l'autre conducteur…</div>
          <div style={{ fontSize: 11, opacity: 0.4, marginTop: 2 }}>
            La page s'actualisera automatiquement dès qu'il rejoint.
          </div>
        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
      </div>

      {/* How it works mini */}
      <div style={{ marginTop: 20, padding: 14, borderRadius: 10, background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ fontSize: 10, letterSpacing: 2, opacity: 0.3, textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 10 }}>
          Comment ça marche
        </div>
        {[
          { icon: '📱', text: 'L\'autre conducteur scanne le QR avec son téléphone' },
          { icon: '📝', text: 'Chacun remplit ses informations sur son propre écran' },
          { icon: '✍️', text: 'Signature digitale des deux côtés' },
          { icon: '📄', text: 'PDF envoyé à chaque assureur' },
        ].map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10,
            marginBottom: i < 3 ? 8 : 0, fontSize: 12, opacity: 0.6, lineHeight: 1.5 }}>
            <span style={{ flexShrink: 0 }}>{step.icon}</span>
            <span>{step.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// JoinSession — Driver B landing page (scanned QR)
// ─────────────────────────────────────────────────────────────
interface JoinProps {
  sessionId: string;
  language?: string;
  onJoined: () => void;
}

export function JoinSessionView({ sessionId, language = 'fr', onJoined }: JoinProps) {
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    setJoining(true);
    setError(null);
    try {
      const resp = await fetch('/trpc/session.join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, language }),
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error.message);
      onJoined();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
      setJoining(false);
    }
  };

  return (
    <div style={{ padding: 32, textAlign: 'center', maxWidth: 380, margin: '0 auto' }}>
      <div style={{ fontSize: 64, marginBottom: 20 }}>💥</div>

      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, marginBottom: 4 }}>
        <span style={{ color: 'var(--boom)' }}>boom</span>
        <span style={{ opacity: 0.3 }}>.</span>contact
      </h1>

      <p style={{ fontSize: 14, opacity: 0.5, marginBottom: 32, lineHeight: 1.6 }}>
        Un accident vient d'avoir lieu. Rejoignez le constat partagé pour remplir vos informations.
      </p>

      <div style={{ padding: '16px 20px', borderRadius: 12,
        background: 'rgba(255,53,0,0.08)', border: '1px solid rgba(255,53,0,0.2)',
        marginBottom: 28 }}>
        <div style={{ fontSize: 10, letterSpacing: 2, opacity: 0.4, textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 6 }}>
          Session
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 2, fontFamily: 'monospace', color: 'var(--boom)' }}>
          {sessionId}
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 8,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          fontSize: 13, color: '#ef4444' }}>
          ⚠️ {error}
        </div>
      )}

      <button onClick={join} disabled={joining} style={{
        width: '100%', padding: '18px', borderRadius: 12, border: 'none',
        background: joining ? 'rgba(255,53,0,0.5)' : 'var(--boom)',
        color: '#fff', cursor: joining ? 'not-allowed' : 'pointer',
        fontSize: 16, fontWeight: 700, transition: 'all 0.2s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      }}>
        {joining ? '⏳ Connexion…' : '🤝 Rejoindre le constat'}
      </button>

      <p style={{ marginTop: 20, fontSize: 11, opacity: 0.3, lineHeight: 1.6 }}>
        Gratuit · Sans inscription · Données chiffrées
      </p>
    </div>
  );
}
