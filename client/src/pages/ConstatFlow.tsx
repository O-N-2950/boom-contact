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
import { VoiceSketchFlow } from '../components/constat/VoiceSketchFlow';
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

type FlowStep = 'ocr' | 'location' | 'photos' | 'voice' | 'qr' | 'sketch' | 'form' | 'diagram' | 'sign' | 'done';

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
  const [voiceAnalysis, setVoiceAnalysis] = useState<any>(null);
  const [vehicleCount, setVehicleCount] = useState<2|3|4>(2);
  // Données de tous les véhicules (enrichies au fur et à mesure des scans)
  const [allVehicles, setAllVehicles] = useState<Record<string, any>>({
    A: saved?.vehicleA || null,
  });
  const [otherSigned, setOtherSigned] = useState(false);

  const setStep = (s: FlowStep) => {
    setStepRaw(s);
    if (s === 'done') {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const PREV: Partial<Record<FlowStep, FlowStep>> = {
    location:'ocr', photos:'location', voice:'photos',
    qr:'voice', sketch:'qr', form:'sketch', diagram:'form', sign:'diagram',
  };
  const goBack = () => { const p = PREV[step]; if (p) setStep(p); };
  const canGoBack = !!PREV[step] && step !== 'done';

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
    { id: 'voice',    icon: '🎙️', label: 'Vocal' },
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


  function guessVehicleType(cat?: string): string {
    if (!cat) return 'car';
    const c = cat.toLowerCase();
    if (c.includes('tourisme') || c.includes('break') || c.includes('berline')) return 'car';
    if (c.includes('suv') || c.includes('4x4') || c.includes('tout-terrain')) return 'suv';
    if (c.includes('fourgon') || c.includes('utilitaire') || c.includes('van')) return 'van';
    if (c.includes('camion') || c.includes('poids lourd')) return 'truck';
    if (c.includes('moto') || c.includes('motorcycle')) return 'motorcycle';
    if (c.includes('scooter')) return 'scooter';
    if (c.includes('trottinette')) return 'escooter';
    return 'car';
  }

  function ocrCategoryToType(cat?: string): any {
    if (!cat) return null;
    const c = cat.toLowerCase();
    if (c.includes('tourisme') || c.includes('automobile') || c.includes('personenwagen') ||
        c.includes('voiture') || c.includes('car') || c.includes('pkw') || c.includes('break') ||
        c.includes('berline') || c.includes('suv') || c === 'a' || c === '1') return 'car';
    if (c.includes('moto') || c.includes('motorcycle') || c.includes('motorrad')) return 'motorcycle';
    if (c.includes('scooter') || c.includes('cyclom')) return 'scooter';
    if (c.includes('velom') || c.includes('mofa')) return 'moped';
    if (c.includes('camion') || c.includes('truck') || c.includes('lkw')) return 'truck';
    if (c.includes('fourgon') || c.includes('van') || c.includes('transporter')) return 'van';
    if (c.includes('bus') || c.includes('autocar')) return 'bus';
    if (c.includes('quad') || c.includes('buggy')) return 'quad';
    if (c.includes('trottinette') || c.includes('edpm')) return 'escooter';
    return null;
  }

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

    // Exposer les données véhicule pour le moteur de dessin
    // (couleur, type, marque extraites par OCR)
    const vehData = result.registration?.vehicle as any;
    (window as any).__boomVehicleA = {
      color: vehData?.color,
      type:  vehData?.vehicleType || guessVehicleType(vehData?.category),
      brand: vehData?.brand,
      model: vehData?.model,
    };
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
    setStep('diagram');
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
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {canGoBack && (
            <button onClick={goBack} style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px',
              borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.05)', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, color: 'var(--text)',
              touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
            }}>← Retour</button>
          )}
          {step !== 'ocr' && step !== 'done' && (
            <button onClick={() => { localStorage.removeItem(STORAGE_KEY); window.location.reload(); }}
              style={{ fontSize: 11, opacity: 0.2, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            >↺</button>
          )}
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
            onPartnerJoined={async () => {
              // Charger les données véhicule B depuis la session avant le sketch
              try {
                const sessionData = await trpcUtils.session.get.fetch({ sessionId: sessionId! });
                const bParticipant = sessionData?.participants?.find((p: any) => p.role === 'B');
                if (bParticipant?.vehicle?.vehicleData) {
                  setAllVehicles(prev => ({ ...prev, B: bParticipant.vehicle.vehicleData }));
                  (window as any).__boomVehicleB = bParticipant.vehicle.vehicleData;
                }
              } catch (e) { /* ignore */ }
              setStep('sketch');
            }}
          />
        )}

        {step === 'form' && (
          <ConstatForm role="A" prefilled={participantData} accidentData={accidentData} onSave={handleFormSave} sessionId={sessionId || ''} language={participantData.language} />
        )}

        {step === 'voice' && sessionId && (
          <VoiceSketchFlow
            role="A"
            sessionId={sessionId}
            lang={participantData.language}
            onComplete={(data) => {
              setVoiceAnalysis(data.analysis);
              // Stocker le nombre de véhicules détecté par l'IA
              const count = data.analysis?.vehicleCount || 2;
              setVehicleCount(count as 2|3|4);
              // Pré-remplir circonstances
              if (data.analysis?.circumstances?.length > 0) {
                setParticipantData(prev => ({
                  ...prev,
                  circumstances: data.analysis.circumstances,
                }));
              }
              // Aller vers QR — attendre les autres conducteurs
              setStep('qr');
            }}
            onSkip={() => setStep('qr')}
          />
        )}

        {step === 'sketch' && (
          voiceAnalysis ? (
            // Sketch IA — toutes les données véhicules sont maintenant connues
            <VoiceSketchFlow
              role="A"
              sessionId={sessionId || ''}
              lang={participantData.language}
              preloadedAnalysis={voiceAnalysis}
              vehicleAData={allVehicles.A}
              vehicleBData={allVehicles.B}
              onComplete={(data) => {
                setSketchImage(data.sketchBase64);
                setStep('form');
              }}
              onSkip={() => setStep('form')}
            />
          ) : (
            // Fallback sketch manuel si pas d'analyse vocale
            <AccidentSketch
              vehicleTypeA={participantData.vehicle?.vehicleType}
              vehicleTypeB={undefined}
              sketchImage={sketchImage}
              onChange={setSketchImage}
              onContinue={() => { handleSketchDone(sketchImage); setStep('form'); }}
            />
          )
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
