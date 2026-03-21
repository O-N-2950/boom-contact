import { useState, useEffect } from 'react';
import { trpc } from '../../trpc';

interface Props {
  sessionId: string;
  qrUrl: string;
  onPartnerJoined: () => void;
}

export function QRSession({ sessionId, qrUrl, onPartnerJoined }: Props) {
  const [partnerJoined, setPartnerJoined] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // ── tRPC polling — remplace le fetch brut ────────────────────
  const { data: sessionData } = trpc.session.get.useQuery(
    { sessionId },
    {
      refetchInterval: 2000,           // poll toutes les 2s
      enabled: !!sessionId && !partnerJoined, // guard: sessionId must exist
      retry: false,
      staleTime: 0,
    }
  );

  useEffect(() => {
    const status = sessionData?.status;
    if (status === 'active' || status === 'signing' || status === 'completed') {
      setPartnerJoined(true);
      setTimeout(onPartnerJoined, 1200);
    }
  }, [sessionData?.status]);

  // ── Generate QR code ─────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const QRCode = await import('qrcode');
        const url = await QRCode.toDataURL(qrUrl, {
          width: 280, margin: 2,
          color: { dark: '#FF3500', light: '#06060C' },
          errorCorrectionLevel: 'M',
        });
        setQrDataUrl(url);
      } catch { /* fallback text */ }
    })();
  }, [qrUrl]);

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
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Partagez ce QR code</h2>
        <p style={{ fontSize: 13, opacity: 0.5, lineHeight: 1.6 }}>
          L'autre conducteur scanne ce code pour rejoindre le constat.
        </p>
      </div>

      {/* QR Code */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 24, padding: 20, background: '#06060C', borderRadius: 20, border: '2px solid rgba(255,53,0,0.2)', boxShadow: '0 0 40px rgba(255,53,0,0.1)', minHeight: 200 }}>
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="QR Code boom.contact" style={{ width: 220, height: 220, borderRadius: 8 }} />
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>📱</div>
            <div style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: 1, opacity: 0.5, wordBreak: 'break-all', maxWidth: 240 }}>{qrUrl}</div>
          </div>
        )}
      </div>

      {/* Session ID badge */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(255,53,0,0.2)', background: 'rgba(255,53,0,0.06)' }}>
          <span style={{ fontSize: 10, letterSpacing: 2, opacity: 0.4, textTransform: 'uppercase', fontFamily: 'monospace' }}>SESSION</span>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, fontFamily: 'monospace', color: 'var(--boom)' }}>{sessionId}</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button onClick={shareLink} style={{ flex: 2, padding: '14px', borderRadius: 10, border: 'none', background: 'var(--boom)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span>📤</span> Partager le lien
        </button>
        <button onClick={copyLink} style={{ flex: 1, padding: '14px', borderRadius: 10, border: '1.5px solid rgba(240,237,232,0.15)', background: copied ? 'rgba(34,197,94,0.15)' : 'transparent', color: copied ? '#22c55e' : 'var(--text)', cursor: 'pointer', fontSize: 14, fontWeight: 600, transition: 'all 0.2s' }}>
          {copied ? '✅ Copié' : '📋 Copier'}
        </button>
      </div>

      {/* Waiting indicator */}
      <div style={{ padding: '14px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', animation: 'pulse 1.5s ease-in-out infinite', flexShrink: 0 }}/>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>En attente de l'autre conducteur…</div>
          <div style={{ fontSize: 11, opacity: 0.4, marginTop: 2 }}>Actualisation automatique toutes les 2 secondes.</div>
        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
      </div>

      {/* How it works */}
      <div style={{ marginTop: 20, padding: 14, borderRadius: 10, background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ fontSize: 10, letterSpacing: 2, opacity: 0.3, textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 10 }}>Comment ça marche</div>
        {[
          { icon: '📱', text: "L'autre conducteur scanne le QR avec son téléphone" },
          { icon: '📝', text: 'Chacun remplit ses informations sur son propre écran' },
          { icon: '✍️', text: 'Signature digitale des deux côtés' },
          { icon: '📄', text: 'PDF envoyé à chaque assureur' },
        ].map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: i < 3 ? 8 : 0, fontSize: 12, opacity: 0.6, lineHeight: 1.5 }}>
            <span style={{ flexShrink: 0 }}>{s.icon}</span><span>{s.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
