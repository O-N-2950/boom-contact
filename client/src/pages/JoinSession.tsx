import { useState, useEffect } from 'react';
import { OCRScanner } from '../components/constat/OCRScanner';
import { ConstatForm } from '../components/constat/ConstatForm';
import { CarDiagram } from '../components/constat/CarDiagram';
import { SignaturePad } from '../components/constat/SignaturePad';
import { StepIndicator } from '../components/constat/StepIndicator';
import type { OCRResult, ParticipantData } from '../../../shared/types';

type FlowStep = 'landing' | 'ocr' | 'form' | 'diagram' | 'sign' | 'done';

export function JoinSession() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session') || '';
  const [step, setStep] = useState<FlowStep>('landing');
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participantData, setParticipantData] = useState<Partial<ParticipantData>>({ role: 'B', language: navigator.language?.split('-')[0] || 'fr' });
  const [damagedZones, setDamagedZones] = useState<string[]>([]);
  const [otherSigned, setOtherSigned] = useState(false);

  const STEPS: { id: FlowStep; icon: string; label: string }[] = [
    { id: 'ocr',     icon: '📄', label: 'Scan' },
    { id: 'form',    icon: '📋', label: 'Infos' },
    { id: 'diagram', icon: '🚗', label: 'Choc' },
    { id: 'sign',    icon: '✍️', label: 'Sign' },
  ];
  const currentStepIdx = STEPS.findIndex(s => s.id === step);

  const join = async () => {
    if (!sessionId) { setError('Lien invalide'); return; }
    setJoining(true); setError(null);
    try {
      const resp = await fetch('/trpc/session.join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: { sessionId, language: participantData.language } }),
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error.message || 'Erreur de connexion');
      setJoined(true);
      setTimeout(() => setStep('ocr'), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setJoining(false);
    }
  };

  const handleOCRComplete = (result: { registration: OCRResult; greenCard: OCRResult }) => {
    setParticipantData(prev => ({
      ...prev,
      vehicle:   result.registration.vehicle   ?? {},
      driver:    result.registration.driver    ?? {},
      insurance: result.greenCard.insurance    ?? {},
    }));
    setStep('form');
  };

  const handleFormSave = async (data: Partial<ParticipantData>) => {
    setParticipantData({ ...data, damagedZones });
    if (sessionId) {
      await fetch('/trpc/session.updateParticipant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: { sessionId, role: 'B', data } }),
      });
    }
    setStep('diagram');
  };

  const handleDiagramDone = async () => {
    if (sessionId) {
      await fetch('/trpc/session.updateParticipant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: { sessionId, role: 'B', data: { damagedZones } } }),
      });
    }
    setStep('sign');
  };

  const handleSign = async (signatureBase64: string) => {
    if (sessionId) {
      const resp = await fetch('/trpc/session.sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: { sessionId, role: 'B', signatureBase64 } }),
      });
      const data = await resp.json();
      if (data?.result?.data?.json?.bothSigned) {
        setOtherSigned(true);
        setTimeout(() => setStep('done'), 1500);
      } else {
        setStep('done');
      }
    }
  };

  // ── LANDING ──────────────────────────────────────────────
  if (step === 'landing') return (
    <div style={{ maxWidth: 420, margin: '0 auto', minHeight: '100svh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px 24px' }}>

      {/* Animated header */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ fontSize: 72, marginBottom: 16, display: 'inline-block', animation: joined ? 'bounceIn 0.5s ease' : 'explosion 0.7s cubic-bezier(0.175,0.885,0.32,1.275) forwards' }}>💥</div>
        <h1 style={{ fontFamily: 'Oswald, sans-serif', fontSize: 32, letterSpacing: '-0.5px', marginBottom: 8 }}>
          <span style={{ color: 'var(--boom)' }}>boom</span>
          <span style={{ opacity: 0.3 }}>.</span>
          <span>contact</span>
        </h1>
        <p style={{ fontSize: 14, opacity: 0.55, lineHeight: 1.65 }}>
          Vous avez été invité à rejoindre un constat d'accident partagé.
        </p>
      </div>

      {/* Session badge */}
      {sessionId && (
        <div style={{ padding: '16px 20px', borderRadius: 12, background: 'rgba(255,53,0,0.08)', border: '1px solid rgba(255,53,0,0.2)', textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, opacity: 0.4, fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', marginBottom: 6 }}>Session</div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 2, fontFamily: 'DM Mono, monospace', color: 'var(--boom)' }}>{sessionId}</div>
        </div>
      )}

      {!sessionId && (
        <div style={{ padding: 16, borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
          ⚠️ Lien invalide. Scannez à nouveau le QR code.
        </div>
      )}

      {/* What to expect */}
      <div style={{ marginBottom: 24 }}>
        {[
          { icon: '📄', text: 'Vous scannez vos documents (2 photos)' },
          { icon: '📋', text: 'Vous remplissez vos infos sur votre téléphone' },
          { icon: '🚗', text: 'Vous indiquez les dégâts sur votre véhicule' },
          { icon: '✍️', text: 'Vous signez — PDF envoyé à votre assureur' },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
            <span style={{ fontSize: 13, opacity: 0.7 }}>{item.text}</span>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ marginBottom: 14, padding: 12, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 13, color: '#ef4444' }}>
          ⚠️ {error}
        </div>
      )}

      <button onClick={join} disabled={joining || !sessionId} style={{
        width: '100%', padding: '18px', borderRadius: 12, border: 'none',
        background: joining || !sessionId ? 'rgba(255,53,0,0.4)' : 'var(--boom)',
        color: '#fff', cursor: joining || !sessionId ? 'not-allowed' : 'pointer',
        fontSize: 16, fontWeight: 700, transition: 'all 0.2s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        boxShadow: '0 8px 32px rgba(255,53,0,0.35)',
      }}>
        {joining ? (
          <><span style={{ fontSize: 20, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span> Connexion…</>
        ) : joined ? (
          <><span>🤝</span> Connecté ! Démarrage…</>
        ) : (
          <><span style={{ fontSize: 20 }}>🤝</span> Rejoindre le constat</>
        )}
      </button>

      <p style={{ textAlign: 'center', marginTop: 10, fontSize: 11, opacity: 0.3, letterSpacing: 1, fontFamily: 'DM Mono, monospace' }}>
        GRATUIT · SANS INSCRIPTION · CHIFFRÉ
      </p>
    </div>
  );

  // ── OCR → FORM → DIAGRAM → SIGN → DONE ─────────────────
  return (
    <div style={{ maxWidth: 420, margin: '0 auto', minHeight: '100svh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(240,237,232,0.06)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--boom)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💥</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>boom.contact</div>
          <div style={{ fontSize: 10, opacity: 0.35, fontFamily: 'DM Mono, monospace', letterSpacing: 1 }}>
            CONDUCTEUR B · SESSION {sessionId}
          </div>
        </div>
      </div>

      {step !== 'done' && <StepIndicator steps={STEPS} currentIndex={currentStepIdx} />}

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {step === 'ocr' && (
          <OCRScanner role="B" onComplete={handleOCRComplete} />
        )}

        {step === 'form' && (
          <ConstatForm role="B" prefilled={participantData} onSave={handleFormSave} />
        )}

        {step === 'diagram' && (
          <div>
            <CarDiagram role="B" selected={damagedZones} onChange={setDamagedZones} />
            <div style={{ padding: '0 20px 20px' }}>
              <button onClick={handleDiagramDone} style={{ width: '100%', padding: '16px', borderRadius: 10, border: 'none', background: 'var(--boom)', color: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>
                Continuer → Signature
              </button>
            </div>
          </div>
        )}

        {step === 'sign' && (
          <SignaturePad role="B" onSign={handleSign} otherSigned={otherSigned} />
        )}

        {step === 'done' && (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 72, marginBottom: 20 }}>📄</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#22c55e', marginBottom: 10 }}>
              Constat finalisé !
            </h2>
            <p style={{ fontSize: 14, opacity: 0.55, lineHeight: 1.7, marginBottom: 28 }}>
              Le PDF a été généré et envoyé. Vous pouvez le transmettre directement à votre assureur.
            </p>
            <button style={{ padding: '16px 36px', borderRadius: 10, border: 'none', background: 'var(--boom)', color: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, margin: '0 auto 12px' }}>
              📩 Envoyer à mon assureur
            </button>
            <button style={{ padding: '14px 28px', borderRadius: 10, border: '1.5px solid rgba(240,237,232,0.15)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 13, display: 'block', margin: '0 auto' }}>
              ⬇️ Télécharger le PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
