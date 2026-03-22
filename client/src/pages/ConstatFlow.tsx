import { LocationStep } from '../components/constat/LocationStep';

// Mapping catégorie OCR → VehicleType
// Le permis CH dit "Voiture de tourisme", "Motocycle", "Camion", etc.
function ocrCategoryToVehicleType(category?: string): VehicleType | null {
  if (!category) return null;
  const c = category.toLowerCase();
  if (c.includes('tourisme') || c.includes('automobile') || c.includes('personenwagen') ||
      c.includes('car') || c.includes('break') || c.includes('suv') || c.includes('berline') ||
      c.includes('voiture') || c.includes('pkw') || c.includes('1') || c === 'a') return 'car';
  if (c.includes('moto') || c.includes('motorcycle') || c.includes('motorrad') ||
      c.includes('motocycle')) return 'motorcycle';
  if (c.includes('scooter') || c.includes('cyclom')) return 'scooter';
  if (c.includes('velom') || c.includes('vélom') || c.includes('mofa')) return 'moped';
  if (c.includes('camion') || c.includes('truck') || c.includes('lkw') ||
      c.includes('poids lourd')) return 'truck';
  if (c.includes('fourgon') || c.includes('van') || c.includes('utilitaire') ||
      c.includes('transporter')) return 'van';
  if (c.includes('bus') || c.includes('autocar') || c.includes('reisebus')) return 'bus';
  if (c.includes('quad') || c.includes('buggy')) return 'quad';
  if (c.includes('trottinette') || c.includes('edpm') || c.includes('e-scooter')) return 'escooter';
  return null;
}


import { PhotoCapture } from '../components/constat/PhotoCapture';
import { AccidentSketch } from '../components/constat/AccidentSketch';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { trpc } from '../trpc';
import { OCRScanner } from '../components/constat/OCRScanner';
import { QRSession } from '../components/constat/QRSession';
import { ConstatForm } from '../components/constat/ConstatForm';
import { VehicleDiagram } from '../components/constat/VehicleDiagram';
import { SignaturePad } from '../components/constat/SignaturePad';
import { StepIndicator } from '../components/constat/StepIndicator';
import { PDFDownload } from '../components/constat/PDFDownload';
import type { OCRResult, ParticipantData, AccidentData, VehicleType, ScenePhoto } from '../../../shared/types';

type FlowStep = 'ocr' | 'location' | 'photos' | 'qr' | 'form' | 'sketch' | 'diagram' | 'sign' | 'done';

const STORAGE_KEY = 'boom_flow_a';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
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
  const { t } = useTranslation();
  const saved = loadState();

  const [step, setStepRaw] = useState<FlowStep>(saved?.step || 'ocr');
  const [sessionId, setSessionId] = useState<string | null>(saved?.sessionId || null);
  const [qrUrl, setQrUrl] = useState<string>(saved?.qrUrl || '');
  const [accidentData, setAccidentData] = useState<Partial<AccidentData>>(saved?.accidentData || {});
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(saved?.vehicleType || null);
  const [participantData, setParticipantData] = useState<Partial<ParticipantData>>(saved?.participantData || { role: 'A' });
  const [damagedZones, setDamagedZones] = useState<string[]>(saved?.damagedZones || []);
  const [photos, setPhotos] = useState<ScenePhoto[]>(saved?.photos || []);
  const [sketchImage, setSketchImage] = useState<string>(saved?.sketchImage || '');
  const [otherSigned, setOtherSigned] = useState(false);

  const setStep = (s: FlowStep) => {
    setStepRaw(s);
    if (s === 'done') {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  useEffect(() => {
    if (step === 'done') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      step, sessionId, qrUrl, participantData, damagedZones, photos, sketchImage, ts: Date.now(),
    }));
  }, [step, sessionId, qrUrl, participantData, damagedZones, photos]);

  // Steps with translated labels
  const STEPS: { id: FlowStep; icon: string; label: string }[] = [
    { id: 'ocr',      icon: '📄', label: t('steps.scan') },
    { id: 'location', icon: '📍', label: t('steps.location') },
    { id: 'photos',   icon: '📸', label: t('steps.photos') },
    { id: 'qr',       icon: '📱', label: t('steps.qr') },
    { id: 'form',     icon: '📋', label: t('steps.form') },
    { id: 'sketch',   icon: '✏️', label: t('steps.sketch') },
    { id: 'diagram',  icon: '🚗', label: t('steps.damage') },
    { id: 'sign',     icon: '✍️', label: t('steps.sign') },
  ];

  useEffect(() => {
    if (step === 'qr' && !sessionId) createSession();
  }, [step]);

  const createSessionMutation = trpc.session.create.useMutation({
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setQrUrl(data.qrUrl);
      if (Object.keys(accidentData).length > 0) {
        updateAccidentMutation.mutate({
          sessionId: data.sessionId,
          data: { ...accidentData, photos } as any,
        });
      }
    },
    onError: (err) => console.error('session.create failed:', err.message),
  });

  const createSession = () => createSessionMutation.mutate();

  const handleOCRComplete = (result: { registration: OCRResult; greenCard: OCRResult }) => {
    // Déduire le type de véhicule depuis la catégorie OCR
    const ocrCategory = result.registration.vehicle?.category as string | undefined;
    const detectedType = ocrCategoryToVehicleType(ocrCategory);
    if (detectedType) setVehicleType(detectedType);

    setParticipantData(prev => ({
      ...prev,
      vehicle: {
        ...(result.registration.vehicle ?? {}),
        vehicleType: detectedType ?? prev.vehicle?.vehicleType,
      },
      driver:    result.registration.driver    ?? {},
      insurance: result.greenCard?.insurance   ?? result.registration.insurance ?? {},
    }));
    setStep('location');
  };

  const updateAccidentMutation = trpc.session.updateAccident.useMutation({
    onError: (err) => console.error('updateAccident failed:', err.message),
  });

  const handleLocationComplete = (data: Partial<AccidentData> & { vehicleType: VehicleType }) => {
    const { vehicleType: vt, ...accident } = data;
    setVehicleType(vt);
    setAccidentData(accident);
    setParticipantData(prev => ({ ...prev, vehicle: { ...prev.vehicle, vehicleType: vt } }));
    if (sessionId) {
      updateAccidentMutation.mutate({ sessionId, data: accident });
    }
    setStep('photos');
  };

  const handlePhotosContinue = () => {
    const updatedAccident = { ...accidentData, photos };
    setAccidentData(updatedAccident);
    if (sessionId && photos.length > 0) {
      updateAccidentMutation.mutate({ sessionId, data: { photos } });
    }
    setStep('qr');
  };

  const handleFormSave = async (data: Partial<ParticipantData>, accident?: Partial<AccidentData>) => {
    setParticipantData({ ...data, damagedZones });
    if (sessionId) {
      updateMutation.mutate({ sessionId, role: 'A', data });
      if (accident && Object.keys(accident).length > 0) {
        updateAccidentMutation.mutate({ sessionId, data: accident });
        setAccidentData(prev => ({ ...prev, ...accident }));
      }
    }
    setStep('sketch');
  };

  const handleSketchDone = (base64: string) => {
    setSketchImage(base64);
    if (sessionId && base64) {
      updateAccidentMutation.mutate({ sessionId, data: { sketchImage: base64 } });
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
        <div style={{ width: 36, height: 36, flexShrink: 0 }}>
          <img src="/logo.png" alt="boom.contact" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>boom.contact</div>
          <div style={{ fontSize: 10, opacity: 0.35, fontFamily: 'monospace', letterSpacing: 1 }}>
            {t('flow.header.role_a')}
          </div>
        </div>
        {step !== 'ocr' && step !== 'done' && (
          <button
            onClick={() => { localStorage.removeItem(STORAGE_KEY); window.location.reload(); }}
            style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.3, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            title={t('flow.header.reset_title')}
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

        {step === 'location' && (
          <LocationStep onComplete={handleLocationComplete} initialVehicleType={vehicleType} />
        )}

        {step === 'photos' && (
          <PhotoCapture
            photos={photos}
            onChange={setPhotos}
            onContinue={handlePhotosContinue}
          />
        )}

        {step === 'qr' && sessionId && (
          <QRSession
            sessionId={sessionId}
            qrUrl={qrUrl}
            onPartnerJoined={() => setStep('form')}
          />
        )}

        {step === 'form' && (
          <ConstatForm role="A" prefilled={participantData} accidentData={accidentData} onSave={handleFormSave} />
        )}

        {step === 'sketch' && (
          <AccidentSketch
            vehicleTypeA={participantData.vehicle?.vehicleType}
            vehicleTypeB={undefined}
            sketchImage={sketchImage}
            onChange={setSketchImage}
            onContinue={() => handleSketchDone(sketchImage)}
          />
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
                {t('common.continue')}
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
