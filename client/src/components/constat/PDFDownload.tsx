import { useState } from 'react';
import { trpc } from '../../trpc';

interface Props {
  sessionId: string;
  role: 'A' | 'B';
  driverEmail?: string;   // Extrait du formulaire ou OCR
  insurerName?: string;   // Extrait de la carte verte OCR
  driverName?: string;
}

export function PDFDownload({ sessionId, role, driverEmail, insurerName, driverName }: Props) {
  const [loading, setLoading] = useState(false);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Email flow
  const [email, setEmail] = useState(driverEmail || '');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(!!driverEmail);

  const pdfMutation = trpc.pdf.generate.useMutation({
    onSuccess: (data) => { setPdfBase64(data.pdfBase64); },
    onError: (err) => { setError(err.message); setLoading(false); },
  });

  const generatePDF = async (): Promise<string | null> => {
    if (pdfBase64) return pdfBase64;
    setLoading(true);
    setError(null);
    return new Promise((resolve) => {
      pdfMutation.mutate({ sessionId }, {
        onSuccess: (data) => { setLoading(false); resolve(data.pdfBase64); },
        onError:   ()     => { setLoading(false); resolve(null); },
      });
    });
  };

  const download = async () => {
    const b64 = await generatePDF();
    if (!b64) return;
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `constat-${sessionId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const emailMutation = trpc.email.sendToDriver.useMutation({
    onSuccess: () => { setEmailSent(true); setSendingEmail(false); },
    onError:   (err) => { setEmailError(err.message); setSendingEmail(false); },
  });

  const sendEmail = async () => {
    if (!email.includes('@')) return;
    const b64 = await generatePDF();
    if (!b64) return;
    setSendingEmail(true);
    setEmailError(null);
    emailMutation.mutate({ sessionId, role, driverEmail: email, pdfBase64: b64 });
  };

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🎉</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#22c55e', marginBottom: 8 }}>
          Constat finalisé !
        </h2>
        <p style={{ fontSize: 13, opacity: 0.5, lineHeight: 1.7 }}>
          Les deux parties ont signé. Le document numérique certifié est prêt.
        </p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 10,
          padding: '5px 14px', borderRadius: 20,
          background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}>
          <span style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: 1, color: '#22c55e' }}>
            SESSION {sessionId}
          </span>
        </div>
      </div>

      {/* PDF card */}
      <div style={{ marginBottom: 16, padding: 16, borderRadius: 12,
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
          {['✅ Données véhicules A & B','✅ Conducteurs','✅ Assurances','✅ Circonstances','✅ Zones de choc','✅ 2 signatures'].map((item, i) => (
            <div key={i} style={{ fontSize: 11, opacity: 0.6 }}>{item}</div>
          ))}
        </div>
      </div>

      {/* Insurer info — from OCR */}
      {insurerName && (
        <div style={{ marginBottom: 16, padding: 14, borderRadius: 10,
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, opacity: 0.5, textTransform: 'uppercase',
            fontFamily: 'monospace', marginBottom: 4 }}>Votre assureur (carte verte)</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>🟢 {insurerName}</div>
          <div style={{ fontSize: 12, opacity: 0.55, lineHeight: 1.5 }}>
            Contactez directement votre assureur pour déclarer le sinistre.
            Ses coordonnées sinistres se trouvent sur votre police ou son site web.
          </div>
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 12, padding: 12, borderRadius: 8,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          fontSize: 13, color: '#ef4444' }}>⚠️ {error}</div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>

        {/* Download */}
        <button onClick={download} disabled={loading} style={{
          padding: '16px', borderRadius: 10, border: 'none',
          background: loading ? 'rgba(255,53,0,0.5)' : 'var(--boom)',
          color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: 15, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          {loading ? '⏳ Génération…' : '⬇️ Télécharger le PDF'}
        </button>

        {/* Email — send to yourself */}
        {!emailSent ? (
          <div>
            <button onClick={() => setShowEmailForm(!showEmailForm)} style={{
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
                  Entrez votre email. Vous recevrez le PDF en pièce jointe, que vous pourrez transmettre à votre assureur.
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  style={{
                    width: '100%', padding: '11px 13px', borderRadius: 8,
                    border: '1.5px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'var(--text)', fontSize: 14, outline: 'none',
                    marginBottom: 8, boxSizing: 'border-box',
                  }}
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

      {/* Legal reminder */}
      <div style={{ padding: 14, borderRadius: 10,
        background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)',
        marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700, marginBottom: 5 }}>
          ⏰ À transmettre à votre assureur
        </div>
        <div style={{ fontSize: 12, opacity: 0.65, lineHeight: 1.65 }}>
          Les deux conducteurs ont l'obligation de déclarer le sinistre à <strong>leur propre assureur</strong>.
          Délai habituel : 5 jours en France, 8 jours en Suisse.
          Vérifiez les conditions de votre police d'assurance.
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
    </div>
  );
}
