import { useState, useRef } from 'react';
import type { OCRResult } from '../../../../shared/types';

interface Props {
  role: 'A' | 'B';
  onComplete: (result: { registration: OCRResult; greenCard: OCRResult }) => void;
}

type Step = 'idle' | 'registration' | 'greencard' | 'scanning' | 'review' | 'done';

const SCAN_TIPS: Record<string, string> = {
  registration: 'Photographiez votre permis de circulation ou carte grise. Posez-le à plat, bonne luminosité.',
  greencard: 'Photographiez votre carte verte (assurance internationale). Face visible.',
};

export function OCRScanner({ role, onComplete }: Props) {
  const [step, setStep] = useState<Step>('idle');
  const [regImage, setRegImage] = useState<string | null>(null);
  const [gcImage, setGcImage] = useState<string | null>(null);
  const [result, setResult] = useState<{ registration: OCRResult; greenCard: OCRResult } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const captureImage = (type: 'registration' | 'greencard') => {
    setStep(type);
    fileRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      if (step === 'registration') {
        setRegImage(base64);
        setStep('greencard');
      } else if (step === 'greencard') {
        setGcImage(base64);
        setStep('scanning');
        triggerScan(regImage!, base64);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const triggerScan = async (reg: string, gc: string) => {
    setScanning(true);
    setError(null);
    try {
      const resp = await fetch('/trpc/ocr.scanPair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: { registrationBase64: reg, greenCardBase64: gc } }),
      });
      const data = await resp.json();
      const scanResult = data.result?.data?.json;
      if (!scanResult) throw new Error('Réponse invalide du serveur');
      setResult(scanResult);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du scan');
      setStep('idle');
    } finally {
      setScanning(false);
    }
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.85) return '#22c55e';
    if (conf >= 0.75) return '#f59e0b';
    return '#ef4444';
  };

  const getConfidenceBg = (conf: number) => {
    if (conf >= 0.85) return 'rgba(34,197,94,0.1)';
    if (conf >= 0.75) return 'rgba(245,158,11,0.1)';
    return 'rgba(239,68,68,0.1)';
  };

  // ── IDLE ─────────────────────────────────────────────────
  if (step === 'idle') return (
    <div style={{ padding: 24 }}>
      <input ref={fileRef} type="file" accept="image/*" capture="environment"
        style={{ display: 'none' }} onChange={handleFile} />

      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>📄</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
          Scannez vos documents
        </h2>
        <p style={{ fontSize: 14, opacity: 0.55, lineHeight: 1.6 }}>
          Photographiez 2 documents pour remplir automatiquement le formulaire.
          Aucune saisie manuelle.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button onClick={() => captureImage('registration')} style={{
          padding: '18px 24px', borderRadius: 12, border: '2px dashed rgba(255,53,0,0.4)',
          background: 'rgba(255,53,0,0.06)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 16, transition: 'all 0.2s',
        }}>
          <span style={{ fontSize: 32 }}>🚗</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
              Permis de circulation
            </div>
            <div style={{ fontSize: 12, opacity: 0.5, marginTop: 2 }}>
              Carte grise, RC Book, Zulassung, 行驶证...
            </div>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 20 }}>📸</span>
        </button>

        <div style={{ textAlign: 'center', fontSize: 11, opacity: 0.3, letterSpacing: 2 }}>
          + ENSUITE
        </div>

        <button onClick={() => {}} style={{
          padding: '18px 24px', borderRadius: 12, border: '1.5px solid rgba(240,237,232,0.1)',
          background: 'rgba(255,255,255,0.03)', cursor: 'not-allowed', opacity: 0.5,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <span style={{ fontSize: 32 }}>🟢</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
              Carte verte assurance
            </div>
            <div style={{ fontSize: 12, opacity: 0.5, marginTop: 2 }}>
              International Insurance Certificate
            </div>
          </div>
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 8,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          fontSize: 13, color: '#ef4444' }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );

  // ── PHOTO STEPS ───────────────────────────────────────────
  if (step === 'registration' || step === 'greencard') return (
    <div style={{ padding: 24 }}>
      <input ref={fileRef} type="file" accept="image/*" capture="environment"
        style={{ display: 'none' }} onChange={handleFile} />

      {step === 'greencard' && regImage && (
        <div style={{ marginBottom: 20, padding: '10px 14px', borderRadius: 8,
          background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
          fontSize: 13, color: '#22c55e' }}>
          ✅ Permis de circulation capturé
        </div>
      )}

      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>
          {step === 'registration' ? '🚗' : '🟢'}
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
          {step === 'registration' ? 'Étape 1 sur 2' : 'Étape 2 sur 2'}
        </h3>
        <p style={{ fontSize: 14, opacity: 0.55, lineHeight: 1.65, marginBottom: 28, maxWidth: 280, margin: '0 auto 28px' }}>
          {SCAN_TIPS[step]}
        </p>
        <button onClick={() => fileRef.current?.click()} style={{
          padding: '16px 36px', borderRadius: 10, background: 'var(--boom)',
          border: 'none', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 10,
        }}>
          <span>📸</span> Prendre la photo
        </button>
      </div>
    </div>
  );

  // ── SCANNING ─────────────────────────────────────────────
  if (step === 'scanning') return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 56, marginBottom: 20, animation: 'spin 1s linear infinite' }}>🔍</div>
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Analyse en cours...</h3>
      <p style={{ fontSize: 14, opacity: 0.5 }}>Claude Vision analyse vos documents</p>
      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
        {['Lecture du permis de circulation...', 'Lecture de la carte verte...', 'Extraction des données...'].map((t, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.04)',
            fontSize: 13, opacity: scanning ? 1 : 0.4 }}>
            <span style={{ fontSize: 16 }}>⏳</span> {t}
          </div>
        ))}
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );

  // ── REVIEW ───────────────────────────────────────────────
  if (step === 'review' && result) {
    const { merged } = result as any;
    const lowConf = [
      ...(result.registration.lowConfidenceFields || []),
      ...(result.greenCard.lowConfidenceFields || []),
    ];

    return (
      <div style={{ padding: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(34,197,94,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>✅</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Documents analysés</div>
            <div style={{ fontSize: 12, opacity: 0.5 }}>
              Confiance globale : {Math.round((result.registration.confidence + result.greenCard.confidence) / 2 * 100)}%
            </div>
          </div>
        </div>

        {/* Low confidence warnings */}
        {lowConf.length > 0 && (
          <div style={{ marginBottom: 20, padding: 14, borderRadius: 10,
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 8 }}>
              ⚠️ {lowConf.length} champ{lowConf.length > 1 ? 's' : ''} à vérifier
            </div>
            {lowConf.map((f, i) => (
              <div key={i} style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                • <strong>{f.field}</strong> : "{f.value}" ({Math.round(f.confidence * 100)}% confiance)
              </div>
            ))}
          </div>
        )}

        {/* Extracted data sections */}
        {[
          { title: '🚗 Véhicule', data: result.registration.vehicle },
          { title: '👤 Conducteur', data: result.registration.driver },
          { title: '🟢 Assurance', data: result.greenCard.insurance },
        ].map(({ title, data }) => data && Object.keys(data).some(k => data[k as keyof typeof data]) && (
          <div key={title} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, letterSpacing: 2, opacity: 0.4, textTransform: 'uppercase',
              marginBottom: 8, fontFamily: 'monospace' }}>{title}</div>
            <div style={{ borderRadius: 10, border: '1px solid rgba(240,237,232,0.08)',
              overflow: 'hidden' }}>
              {Object.entries(data).filter(([, v]) => v).map(([key, value], i) => (
                <div key={key} style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between',
                  borderBottom: i < Object.keys(data).length - 1 ? '1px solid rgba(240,237,232,0.05)' : 'none',
                  background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                  <span style={{ fontSize: 12, opacity: 0.5, textTransform: 'capitalize' }}>
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, maxWidth: '55%', textAlign: 'right' }}>
                    {String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Warnings */}
        {(result.registration.warnings?.length > 0 || result.greenCard.warnings?.length > 0) && (
          <div style={{ marginBottom: 16, fontSize: 12, opacity: 0.5 }}>
            {[...result.registration.warnings, ...result.greenCard.warnings].map((w, i) => (
              <div key={i}>⚠️ {w}</div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button onClick={() => setStep('idle')} style={{
            flex: 1, padding: '14px', borderRadius: 10, border: '1.5px solid rgba(240,237,232,0.15)',
            background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 14,
          }}>
            🔄 Rescanner
          </button>
          <button onClick={() => { setStep('done'); onComplete(result); }} style={{
            flex: 2, padding: '14px', borderRadius: 10, border: 'none',
            background: 'var(--boom)', color: '#fff', cursor: 'pointer',
            fontSize: 14, fontWeight: 700,
          }}>
            Confirmer →
          </button>
        </div>
      </div>
    );
  }

  return null;
}
