import { LocationStep } from '../components/constat/LocationStep';
import { useState, useEffect } from 'react';
import { trpc } from '../trpc';
import { OCRScanner } from '../components/constat/OCRScanner';
import { QRSession } from '../components/constat/QRSession';
import { ConstatForm } from '../components/constat/ConstatForm';
import { VehicleDiagram } from '../components/constat/VehicleDiagram';
import { SignaturePad } from '../components/constat/SignaturePad';
import { StepIndicator } from '../components/constat/StepIndicator';
import { PDFDownload } from '../components/constat/PDFDownload';
import type { OCRResult, ParticipantData } from '../../../shared/types';

type FlowStep = 'ocr' | 'location' | 'qr' | 'form' | 'diagram' | 'sign' | 'done';

const STORAGE_KEY = 'boom_flow_a';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Expire sessions older than 2h
    if (data.ts && Date.now() - data.ts > 2 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function ConstatFlow() {
  const saved = loadState();

  const [step, setStepRaw] = useState<FlowStep>(saved?.step || 'ocr');
  const [sessionId, setSessionId] = useState<string | null>(saved?.sessionId || null);
  const [qrUrl, setQrUrl] = useState<string>(saved?.qrUrl || '');
  const [accidentData, setAccidentData] = useState<Partial<AccidentData>>(saved?.accidentData || {});
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(saved?.vehicleType || null);
  const [participantData, setParticipantData] = useState<Partial<ParticipantData>>(saved?.participantData || { role: 'A' });
  const [damagedZones, setDamagedZones] = useState<string[]>(saved?.damagedZones || []);
  const [otherSigned, setOtherSigned] = useState(false);

  // Persist state to localStorage on every change
  const setStep = (s: FlowStep) => {
    setStepRaw(s);
    if (s === 'done') {
      localStorage.removeItem(STORAGE_KEY); // clean up when done
    }
  };

  useEffect(() => {
    if (step === 'done') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      step, sessionId, qrUrl, participantData, damagedZones, ts: Date.now(),
    }));
  }, [step, sessionId, qrUrl, participantData, damagedZones]);

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

  const createSessionMutation = trpc.session.create.useMutation({
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setQrUrl(data.qrUrl);
    },
    onError: (err) => console.error('session.create failed:', err.message),
  });

  const createSession = () => createSessionMutation.mutate();

  const handleOCRComplete = (result: { registration: OCRResult; greenCard: OCRResult }) => {
    setParticipantData(prev => ({
      ...prev,
      vehicle:   result.registration.vehicle   ?? {},
      driver:    result.registration.driver    ?? {},
      insurance: result.greenCard.insurance    ?? {},
    }));
    setStep('qr');
  };

  const handleLocationComplete = (data: Partial<AccidentData> & { vehicleType: VehicleType }) => {
    const { vehicleType: vt, ...accident } = data;
    setVehicleType(vt);
    setAccidentData(accident);
    // Save vehicle type in participant data
    setParticipantData(prev => ({ ...prev, vehicle: { ...prev.vehicle, vehicleType: vt } }));
    // Update session with accident data
    if (sessionId) {
      fetch('/trpc/session.updateAccident', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, accident }),
      }).catch(console.error);
    }
    setStep('qr');
  };

  const handleFormSave = async (data: Partial<ParticipantData>) => {
    setParticipantData({ ...data, damagedZones });
    if (sessionId) {
      updateMutation.mutate({ sessionId, role: 'A', data });
    }
    setStep('diagram');
  };

  const handleDiagramDone = async () => {
    if (sessionId) {
      updateMutation.mutate({ sessionId, role: 'A', data: { damagedZones } });
    }
    setStep('sign');
  };

  const updateMutation = trpc.session.updateParticipant.useMutation({
    onError: (err) => console.error('updateParticipant failed:', err.message),
  });

  const signMutation = trpc.session.sign.useMutation({
    onSuccess: (data) => {
      if (data.bothSigned) {
        setOtherSigned(true);
        setTimeout(() => setStep('done'), 1500);
      }
    },
    onError: (err) => console.error('session.sign failed:', err.message),
  });

  const handleSign = (signatureBase64: string) => {
    if (sessionId) signMutation.mutate({ sessionId, role: 'A', signatureBase64 });
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
        {/* Reset button in case session is stuck */}
        {step !== 'ocr' && step !== 'done' && (
          <button
            onClick={() => { localStorage.removeItem(STORAGE_KEY); window.location.reload(); }}
            style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.3, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            title="Recommencer"
          >
            ↺
          </button>
        )}
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
            <VehicleDiagram
                  role="A"
                  vehicleType={participantData.vehicle?.vehicleType}
                  brand={participantData.vehicle?.brand}
                  model={participantData.vehicle?.model}
                  color={participantData.vehicle?.color}
                  selected={damagedZones}
                  onChange={setDamagedZones}
                />
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
          <PDFDownload
            sessionId={sessionId!}
            role="A"
            driverEmail={participantData.driver?.email}
            insurerName={participantData.insurance?.company}
            driverName={[participantData.driver?.firstName, participantData.driver?.lastName].filter(Boolean).join(' ')}
          />
        )}
      </div>
    </div>
  );
}
