import { useState } from 'react';

interface Props {
  sessionId: string;
  role: 'A' | 'B';
}

export function PDFDownload({ sessionId, role }: Props) {
  const [loading, setLoading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadPDF = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/trpc/pdf.generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const data = await resp.json();
      const { pdfBase64, filename } = data?.result?.data ?? {};
      if (!pdfBase64) throw new Error('PDF non disponible');

      // Decode and download
      const bytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename ?? `constat-${sessionId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du téléchargement');
    } finally {
      setLoading(false);
    }
  };

  const shareByEmail = async () => {
    const subject = encodeURIComponent('Constat amiable — boom.contact');
    const body = encodeURIComponent(
      `Bonjour,\n\nVeuillez trouver ci-joint le constat amiable numérique établi via boom.contact.\n\nRéférence session : ${sessionId}\n\nCordialement`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div style={{ padding: 24 }}>
      {/* Success header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🎉</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#22c55e', marginBottom: 8 }}>
          Constat finalisé !
        </h2>
        <p style={{ fontSize: 13, opacity: 0.5, lineHeight: 1.7 }}>
          Les deux parties ont signé. Le PDF conforme CEA est prêt.
        </p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 12,
          padding: '5px 14px', borderRadius: 20,
          background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}>
          <span style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: 1, color: '#22c55e' }}>
            SESSION {sessionId}
          </span>
        </div>
      </div>

      {/* PDF Preview card */}
      <div style={{ marginBottom: 20, padding: 16, borderRadius: 12,
        border: '1px solid rgba(255,53,0,0.2)', background: 'rgba(255,53,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--boom)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>📄</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Constat CEA — boom.contact</div>
            <div style={{ fontSize: 11, opacity: 0.45, marginTop: 2 }}>
              Standard européen · Valable dans 50+ pays
            </div>
          </div>
        </div>
        {/* What's in it */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {[
            '✅ Données véhicules A & B',
            '✅ Coordonnées conducteurs',
            '✅ Informations assurances',
            '✅ Circonstances cochées',
            '✅ Zones de choc',
            '✅ 2 signatures digitales',
            '✅ Géolocalisation GPS',
            '✅ Horodatage légal',
          ].map((item, i) => (
            <div key={i} style={{ fontSize: 11, opacity: 0.65 }}>{item}</div>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 14, padding: 12, borderRadius: 8,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          fontSize: 13, color: '#ef4444' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={downloadPDF} disabled={loading} style={{
          padding: '16px', borderRadius: 10, border: 'none',
          background: loading ? 'rgba(255,53,0,0.5)' : 'var(--boom)',
          color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: 15, fontWeight: 700, transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          {loading ? '⏳ Génération du PDF…' : downloaded ? '✅ Téléchargé — Retélécharger' : '⬇️ Télécharger le PDF'}
        </button>

        <button onClick={shareByEmail} style={{
          padding: '14px', borderRadius: 10,
          border: '1.5px solid rgba(240,237,232,0.15)',
          background: 'transparent', color: 'var(--text)', cursor: 'pointer',
          fontSize: 14, fontWeight: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          📧 Envoyer par email à mon assureur
        </button>
      </div>

      {/* Insurance reminder */}
      <div style={{ marginTop: 20, padding: 14, borderRadius: 10,
        background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
        <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700, marginBottom: 6 }}>
          ⏰ À faire dans les 5 jours ouvrables
        </div>
        <div style={{ fontSize: 12, opacity: 0.6, lineHeight: 1.6 }}>
          Envoyez ce constat à votre compagnie d'assurance dans les meilleurs délais.
          Le délai légal varie selon les pays — vérifiez auprès de votre assureur.
        </div>
      </div>

      {/* New constat button */}
      <button onClick={() => window.location.href = '/'} style={{
        marginTop: 14, width: '100%', padding: '12px', borderRadius: 10,
        border: '1px solid rgba(240,237,232,0.08)',
        background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 13, opacity: 0.5,
      }}>
        Nouveau constat →
      </button>
    </div>
  );
}
