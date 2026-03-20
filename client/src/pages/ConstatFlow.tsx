import { useState, useEffect } from 'react';
import { OCRScanner } from '../components/constat/OCRScanner';
import { QRSession } from '../components/constat/QRSession';
import { ConstatForm } from '../components/constat/ConstatForm';
import { CarDiagram } from '../components/constat/CarDiagram';
import { SignaturePad } from '../components/constat/SignaturePad';
import { StepIndicator } from '../components/constat/StepIndicator';
import type { OCRResult, ParticipantData } from '../../../shared/types';

type FlowStep = 'ocr' | 'qr' | 'form' | 'diagram' | 'sign' | 'done';

export function ConstatFlow() {
  const [step, setStep] = useState<FlowStep>('ocr');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [participantData, setParticipantData] = useState<Partial<ParticipantData>>({ role: 'A' });
  const [damagedZones, setDamagedZones] = useState<string[]>([]);
  const [otherSigned, setOtherSigned] = useState(false);

  const STEPS: { id: FlowStep; icon: string; label: string }[] = [
    { id: 'ocr',     icon: '📄', label: 'Scan' },
    { id: 'qr',      icon: '📱', label: 'QR' },
    { id: 'form',    icon: '📋', label: 'Infos' },
    { id: 'diagram', icon: '🚗', label: 'Choc' },
    { id: 'sign',    icon: '✍️', label: 'Sign' },
  ];

  // Create session when entering QR step
  useEffect(() => {
    if (step === 'qr' && !sessionId) createSession();
  }, [step]);

  const createSession = async () => {
    try {
      const resp = await fetch('/trpc/session.create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: {} }),
      });
      const data = await resp.json();
      const session = data?.result?.data?.json;
      if (session) {
        setSessionId(session.sessionId);
        setQrUrl(session.qrUrl);
      }
    } catch { /* handle error */ }
  };

  const handleOCRComplete = (result: { registration: OCRResult; greenCard: OCRResult }) => {
    // Pre-fill participant data from OCR
    setParticipantData(prev => ({
      ...prev,
      vehicle:   result.registration.vehicle   ?? {},
      driver:    result.registration.driver    ?? {},
      insurance: result.greenCard.insurance    ?? {},
    }));
    setStep('qr');
  };

  const handleFormSave = async (data: Partial<ParticipantData>) => {
    setParticipantData({ ...data, damagedZones });
    if (sessionId) {
      await fetch('/trpc/session.updateParticipant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: { sessionId, role: 'A', data } }),
      });
    }
    setStep('diagram');
  };

  const handleDiagramDone = async () => {
    if (sessionId) {
      await fetch('/trpc/session.updateParticipant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: { sessionId, role: 'A', data: { damagedZones } } }),
      });
    }
    setStep('sign');
  };

  const handleSign = async (signatureBase64: string) => {
    if (sessionId) {
      const resp = await fetch('/trpc/session.sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: { sessionId, role: 'A', signatureBase64 } }),
      });
      const data = await resp.json();
      if (data?.result?.data?.json?.bothSigned) {
        setOtherSigned(true);
        setTimeout(() => setStep('done'), 1500);
      }
    }
  };

  const currentStepIdx = STEPS.findIndex(s => s.id === step);

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', minHeight: '100vh',
      display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(240,237,232,0.06)',
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--boom)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💥</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>boom.contact</div>
          <div style={{ fontSize: 10, opacity: 0.35, fontFamily: 'monospace', letterSpacing: 1 }}>
            CONDUCTEUR A — NOUVEAU CONSTAT
          </div>
        </div>
      </div>

      {/* Step indicator */}
      {step !== 'done' && (
        <StepIndicator steps={STEPS} currentIndex={currentStepIdx} />
      )}

      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {step === 'ocr' && (
          <OCRScanner role="A" onComplete={handleOCRComplete} />
        )}

        {step === 'qr' && sessionId && (
          <QRSession
            sessionId={sessionId}
            qrUrl={qrUrl}
            onPartnerJoined={() => setStep('form')}
          />
        )}

        {step === 'form' && (
          <ConstatForm role="A" prefilled={participantData} onSave={handleFormSave} />
        )}

        {step === 'diagram' && (
          <div>
            <CarDiagram role="A" selected={damagedZones} onChange={setDamagedZones} />
            <div style={{ padding: '0 20px 20px' }}>
              <button onClick={handleDiagramDone} style={{
                width: '100%', padding: '16px', borderRadius: 10, border: 'none',
                background: 'var(--boom)', color: '#fff', cursor: 'pointer',
                fontSize: 15, fontWeight: 700,
              }}>
                Continuer → Signature
              </button>
            </div>
          </div>
        )}

        {step === 'sign' && (
          <SignaturePad role="A" onSign={handleSign} otherSigned={otherSigned} />
        )}

        {step === 'done' && (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 72, marginBottom: 20 }}>📄</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#22c55e', marginBottom: 10 }}>
              Constat finalisé !
            </h2>
            <p style={{ fontSize: 14, opacity: 0.55, lineHeight: 1.7, marginBottom: 28 }}>
              Le PDF a été généré. Envoyez-le à votre assureur.
              Votre constat a été archivé.
            </p>
            <button style={{
              padding: '16px 36px', borderRadius: 10, border: 'none',
              background: 'var(--boom)', color: '#fff', cursor: 'pointer',
              fontSize: 15, fontWeight: 700, marginBottom: 12,
              display: 'flex', alignItems: 'center', gap: 10, margin: '0 auto 12px',
            }}>
              📩 Envoyer à mon assureur
            </button>
            <button style={{
              padding: '14px 28px', borderRadius: 10,
              border: '1.5px solid rgba(240,237,232,0.15)',
              background: 'transparent', color: 'var(--text)', cursor: 'pointer',
              fontSize: 13, display: 'block', margin: '0 auto',
            }}>
              ⬇️ Télécharger le PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
