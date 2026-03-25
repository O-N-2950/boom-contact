import { useState } from 'react';
import { trpc } from '../../trpc';

interface Props {
  sessionId: string;
  role: string;
  driverEmail?: string;
  insurerName?: string;
  driverName?: string;
  authUser?: { id: string; email: string; role: string; credits: number } | null;
  authToken?: string;
  onLogin?: () => void;
  onBuyPack?: () => void;
}

export function PDFDownload({ sessionId, role, driverEmail, insurerName, driverName, authUser, authToken, onLogin, onBuyPack }: Props) {
  const [loading, setLoading]         = useState(false);
  const [pdfBase64, setPdfBase64]     = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [email, setEmail]             = useState(driverEmail || '');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent]     = useState(false);
  const [emailError, setEmailError]   = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(!!driverEmail);
  // Credit gate state
  const [creditUsed, setCreditUsed]   = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const pdfMutation    = trpc.pdf.generate.useMutation({
    onSuccess: (data) => { setPdfBase64(data.pdfBase64); setLoading(false); },
    onError:   (err)  => { setError(err.message); setLoading(false); },
  });
  const creditMutation = trpc.payment.useCredit.useMutation({
    onError: (err) => { setError(err.message); setLoading(false); },
  });
  const emailMutation  = trpc.email.sendToDriver.useMutation({
    onSuccess: () => { setEmailSent(true); setSendingEmail(false); },
    onError:   (err) => { setEmailError(err.message); setSendingEmail(false); },
  });

  // Consume 1 credit then generate PDF
  const generateWithCredit = async (): Promise<string | null> => {
    if (pdfBase64) return pdfBase64; // already generated
    setLoading(true);
    setError(null);

    // Consume credit (idempotent — server ignores if already consumed for this session)
    if (!creditUsed && authUser && authUser.role !== 'admin') {
      try {
        await creditMutation.mutateAsync({ email: authUser.email, sessionId });
        setCreditUsed(true);
      } catch {
        setLoading(false);
        return null;
      }
    }

    return new Promise((resolve) => {
      pdfMutation.mutate({ sessionId }, {
        onSuccess: (data) => { resolve(data.pdfBase64); },
        onError:   ()     => { resolve(null); },
      });
    });
  };

  // Gate: check auth + credits before generating
  const handleAction = async (action: 'download' | 'email') => {
    // 1. Not logged in → login first
    if (!authUser) {
      onLogin?.();
      return;
    }
    // 2. No credits (admin always passes) → paywall
    if (authUser.role !== 'admin' && authUser.credits <= 0 && !creditUsed) {
      setShowPaywall(true);
      return;
    }
    // 3. Generate
    const b64 = await generateWithCredit();
    if (!b64) return;

    if (action === 'download') {
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const blob  = new Blob([bytes], { type: 'application/pdf' });
      const url   = URL.createObjectURL(blob);
      const a     = document.createElement('a');
      a.href     = url;
      a.download = `constat-${sessionId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      setShowEmailForm(true);
    }
  };

  const sendEmail = async () => {
    if (!email.includes('@')) return;
    const b64 = pdfBase64 || await generateWithCredit();
    if (!b64) return;
    setSendingEmail(true);
    setEmailError(null);
    emailMutation.mutate({ sessionId, role, driverEmail: email, pdfBase64: b64 });
  };

  const isAdmin   = authUser?.role === 'admin';
  const hasCredit = isAdmin || (authUser && authUser.credits > 0) || creditUsed;
  const credits   = authUser?.credits ?? 0;

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 60, marginBottom: 10 }}>🎉</div>
        <h2 style={{ fontSize: 21, fontWeight: 700, color: '#22c55e', marginBottom: 8 }}>
          Constat finalisé !
        </h2>
        <p style={{ fontSize: 13, opacity: 0.5, lineHeight: 1.7 }}>
          Les deux parties ont signé. Le document numérique certifié est prêt.
        </p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 8,
          padding: '5px 14px', borderRadius: 20,
          background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}>
          <span style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: 1, color: '#22c55e' }}>
            SESSION {sessionId}
          </span>
        </div>
      </div>

      {/* PDF card */}
      <div style={{ marginBottom: 16, padding: 14, borderRadius: 12,
        border: '1px solid rgba(255,53,0,0.2)', background: 'rgba(255,53,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--boom)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📄</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Constat numérique — boom.contact</div>
            <div style={{ fontSize: 11, opacity: 0.45 }}>Document certifié · 150+ pays</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
          {['✅ Véhicules A & B','✅ Conducteurs','✅ Assurances','✅ Circonstances','✅ Zones de choc','✅ 2 signatures'].map((item, i) => (
            <div key={i} style={{ fontSize: 11, opacity: 0.6 }}>{item}</div>
          ))}
        </div>
      </div>

      {/* Insurer info */}
      {insurerName && (
        <div style={{ marginBottom: 16, padding: 14, borderRadius: 10,
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, opacity: 0.5, textTransform: 'uppercase',
            fontFamily: 'monospace', marginBottom: 4 }}>Votre assureur</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>🟢 {insurerName}</div>
          <div style={{ fontSize: 12, opacity: 0.55, lineHeight: 1.5 }}>
            Contactez votre assureur pour déclarer le sinistre.
          </div>
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 12, padding: 12, borderRadius: 8,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          fontSize: 13, color: '#ef4444' }}>⚠️ {error}</div>
      )}

      {/* ── PAYWALL — pas connecté ── */}
      {!authUser && (
        <div style={{ marginBottom: 16, padding: 16, borderRadius: 12,
          background: 'rgba(255,53,0,0.06)', border: '1px solid rgba(255,53,0,0.2)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
            📥 Récupérez votre constat
          </div>
          <div style={{ fontSize: 13, opacity: 0.65, lineHeight: 1.65, marginBottom: 14 }}>
            Créez un compte gratuit (ou connectez-vous) pour télécharger votre PDF.<br/>
            1 constat = 1 crédit · à partir de CHF 4.90
          </div>
          <button onClick={() => onLogin?.()} style={{
            width: '100%', padding: '14px', borderRadius: 10, border: 'none',
            background: 'var(--boom)', color: '#fff', cursor: 'pointer',
            fontSize: 15, fontWeight: 700,
          }}>
            Se connecter / Créer un compte →
          </button>
        </div>
      )}

      {/* ── PAYWALL — connecté mais 0 crédit ── */}
      {authUser && !isAdmin && credits <= 0 && !creditUsed && showPaywall && (
        <div style={{ marginBottom: 16, padding: 16, borderRadius: 12,
          background: 'rgba(255,53,0,0.06)', border: '1px solid rgba(255,53,0,0.2)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
            🔒 1 crédit requis pour télécharger
          </div>
          <div style={{ fontSize: 13, opacity: 0.65, lineHeight: 1.65, marginBottom: 14 }}>
            Vous n'avez plus de crédit. Achetez un pack pour récupérer votre constat.
          </div>
          <button onClick={() => onBuyPack?.()} style={{
            width: '100%', padding: '14px', borderRadius: 10, border: 'none',
            background: 'var(--boom)', color: '#fff', cursor: 'pointer',
            fontSize: 15, fontWeight: 700, marginBottom: 8,
          }}>
            Acheter un pack →
          </button>
          <div style={{ fontSize: 11, opacity: 0.4, textAlign: 'center' }}>
            1 constat CHF 4.90 · 3 constats CHF 12.90 · 10 constats CHF 34.90
          </div>
        </div>
      )}

      {/* ── ACTIONS — connecté avec crédit ── */}
      {authUser && (hasCredit || creditUsed) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>

          {/* Credit info */}
          {!isAdmin && !creditUsed && (
            <div style={{ fontSize: 12, opacity: 0.5, textAlign: 'center', marginBottom: 2 }}>
              💳 {credits} crédit{credits > 1 ? 's' : ''} disponible{credits > 1 ? 's' : ''} · 1 sera utilisé
            </div>
          )}
          {creditUsed && (
            <div style={{ fontSize: 12, color: '#22c55e', textAlign: 'center', marginBottom: 2 }}>
              ✅ Crédit consommé
            </div>
          )}

          {/* Download */}
          <button onClick={() => handleAction('download')} disabled={loading} style={{
            padding: '16px', borderRadius: 10, border: 'none',
            background: loading ? 'rgba(255,53,0,0.5)' : 'var(--boom)',
            color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: 15, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            {loading ? '⏳ Génération…' : '⬇️ Télécharger le PDF'}
          </button>

          {/* Email */}
          {!emailSent ? (
            <div>
              <button onClick={() => handleAction('email')} style={{
                width: '100%', padding: '14px', borderRadius: 10,
                border: '1.5px solid rgba(240,237,232,0.15)',
                background: showEmailForm ? 'rgba(255,255,255,0.06)' : 'transparent',
                color: 'var(--text)', cursor: 'pointer', fontSize: 14, fontWeight: 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}>
                📧 Recevoir le PDF par email
              </button>

              {showEmailForm && (
                <div style={{ marginTop: 8, padding: '14px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 8, lineHeight: 1.5 }}>
                    Entrez votre email pour recevoir le PDF en pièce jointe.
                  </div>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    style={{ width: '100%', padding: '11px 13px', borderRadius: 8,
                      border: '1.5px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.05)',
                      color: 'var(--text)', fontSize: 14, outline: 'none',
                      marginBottom: 8, boxSizing: 'border-box' as const }}
                    onKeyDown={e => e.key === 'Enter' && sendEmail()}
                  />
                  {emailError && (
                    <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 8 }}>⚠️ {emailError}</div>
                  )}
                  <button onClick={sendEmail} disabled={sendingEmail || !email.includes('@')} style={{
                    width: '100%', padding: '11px', borderRadius: 8, border: 'none',
                    background: !email.includes('@') ? 'rgba(255,255,255,0.1)' : 'rgba(34,197,94,0.8)',
                    color: '#fff', cursor: !email.includes('@') ? 'not-allowed' : 'pointer',
                    fontSize: 14, fontWeight: 600,
                  }}>
                    {sendingEmail ? '⏳ Envoi…' : '✉️ Envoyer'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '14px', borderRadius: 10,
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
              textAlign: 'center', fontSize: 14, color: '#22c55e', fontWeight: 600 }}>
              ✅ PDF envoyé à {email}
            </div>
          )}
        </div>
      )}

      {/* ── Si connecté mais paywall pas encore affiché ── */}
      {authUser && !isAdmin && credits <= 0 && !creditUsed && !showPaywall && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <button onClick={() => handleAction('download')} style={{
            padding: '16px', borderRadius: 10, border: 'none',
            background: 'var(--boom)', color: '#fff', cursor: 'pointer',
            fontSize: 15, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            ⬇️ Télécharger le PDF
          </button>
          <button onClick={() => handleAction('email')} style={{
            width: '100%', padding: '14px', borderRadius: 10,
            border: '1.5px solid rgba(240,237,232,0.15)',
            background: 'transparent', color: 'var(--text)', cursor: 'pointer',
            fontSize: 14, fontWeight: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            📧 Recevoir le PDF par email
          </button>
        </div>
      )}

      {/* Legal */}
      <div style={{ padding: 14, borderRadius: 10,
        background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)',
        marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700, marginBottom: 5 }}>
          ⏰ À transmettre à votre assureur
        </div>
        <div style={{ fontSize: 12, opacity: 0.65, lineHeight: 1.65 }}>
          Délai habituel : 5 jours en France, 8 jours en Suisse.<br/>
          Transmettez le PDF à <strong>votre propre assureur</strong>.
        </div>
      </div>

      <button onClick={() => window.location.href = '/'} style={{
        width: '100%', padding: '11px', borderRadius: 10,
        border: '1px solid rgba(240,237,232,0.08)',
        background: 'transparent', color: 'var(--text)', cursor: 'pointer',
        fontSize: 13, opacity: 0.45,
      }}>
        Nouveau constat →
      </button>

      {/* QR persistant */}
      <div style={{ marginTop: 20, padding: '16px', borderRadius: 12,
        background: 'rgba(240,237,232,0.03)', border: '1px solid rgba(240,237,232,0.08)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.35, letterSpacing: 1,
          textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' }}>
          QR du constat — valable 7 jours
        </div>
        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`${window.location.origin}/?session=${sessionId}`)}&bgcolor=0E0E18&color=F0EDE8&margin=2`}
            alt="QR du constat"
            style={{ width: 140, height: 140, borderRadius: 8, display: 'inline-block' }}
          />
        </div>
        <div style={{ fontSize: 12, opacity: 0.4, textAlign: 'center', lineHeight: 1.6 }}>
          Si la police intervient, elle peut scanner ce QR<br/>pour accéder au constat.
        </div>
      </div>
    </div>
  );
}
