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
import { MapVehiclePlacer } from '../components/constat/MapVehiclePlacer';
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
import { EmergencyNumbers } from '../components/EmergencyNumbers';
import { InsuranceAssistance } from '../components/constat/InsuranceAssistance';
import { UnknownCountryLookup } from '../components/EmergencyNumbers';
import { PostConstatCTA } from '../components/constat/PostConstatCTA';
import { PedestrianForm } from '../components/constat/PedestrianForm';
import { PartyUnavailableModal } from '../components/constat/PartyUnavailableModal';
import type { PartyBStatus } from '../components/constat/PartyUnavailableModal';
import type { OCRResult, ParticipantData, AccidentData, VehicleType, ScenePhoto } from '../../../shared/types';

type FlowStep = 'ocr' | 'location' | 'photos' | 'voice' | 'qr' | 'pedestrian_form' | 'sketch' | 'form' | 'diagram' | 'sign' | 'done';

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

interface ConstatFlowProps {
  initialSessionId?: string;
  authToken?: string;
  authUser?: { id: string; email: string; role: string; credits: number } | null;
  onShowAuth?: () => void;
  onAccount?: () => void;
  onBuyPack?: () => void;
}

export function ConstatFlow({ initialSessionId, authToken, authUser, onShowAuth, onAccount, onBuyPack }: ConstatFlowProps = {}) {
  const { t, i18n } = useTranslation();
  // If WinWin initialSessionId, ignore localStorage (fresh prefilled session)
  const saved = initialSessionId ? null : loadState();

  const [step, setStepRaw] = useState<FlowStep>(() => {
    if (initialSessionId) return 'qr'; // Skip OCR, jump to QR step
    return saved?.step || 'ocr';
  });
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || saved?.sessionId || null);
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
  const [showEmergency, setShowEmergency] = useState(false);
  // ── Piéton ────────────────────────────────────────────────
  const [pedestrianData, setPedestrianData] = useState<Record<string, any> | null>(null);
  const [pedestrianHasPhone, setPedestrianHasPhone] = useState<boolean | null>(null);
  // ── Partie B indisponible ──────────────────────────────────
  const [partyBStatus, setPartyBStatus] = useState<PartyBStatus | null>(null);
  const [showUnavailableModal, setShowUnavailableModal] = useState(false);

  // WinWin: apply lang param from URL on mount
  useEffect(() => {
    if (!initialSessionId) return;
    const params = new URLSearchParams(window.location.search);
    const lang = params.get('lang');
    if (lang) i18n.changeLanguage(lang);
    // Clean URL
    window.history.replaceState({}, '', '/');
  }, []);

  // Saved vehicles (if logged in)
  const vehicleListQ = trpc.vehicle.list.useQuery(undefined, {
    enabled: !!authToken && step === 'ocr',
  });
  const savedVehicles = vehicleListQ.data || [];
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);

  const applyVehicle = (v: any) => {
    setShowVehiclePicker(false);
    const newData: Partial<ParticipantData> = {
      role: 'A',
      vehicle: {
        licensePlate:   v.plate,
        make:           v.make,
        model:          v.model,
        color:          v.color,
        year:           v.year,
        vehicleCategory: v.category,
        ...(v.licenseData || {}),
      },
      insurance: v.insuranceData && Object.keys(v.insuranceData).length > 0
        ? { companyName: v.insuranceData.companyName, policyNumber: v.insuranceData.policyNumber, ...v.insuranceData }
        : undefined,
    };
    setParticipantData(newData);
    setStep('location'); // skip OCR — jump straight to location
  };

  const setStep = (s: FlowStep) => {
    setStepRaw(s);
    if (s === 'done') {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const PREV: Partial<Record<FlowStep, FlowStep>> = {
    location:'ocr', photos:'location', voice:'photos',
    qr:'voice', form:'qr', diagram:'form', sketch:'diagram', sign:'sketch',
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
    { id: 'diagram',  icon: '🚗', label: t('steps.damage') },
    { id: 'sketch',   icon: '🗺️', label: t('steps.sketch') },
    { id: 'sign',     icon: '✍️', label: t('steps.sign') },
  ];

  useEffect(() => {
    if (step === 'qr' && !sessionId) createSession();
    // WinWin: session already exists, just build the QR URL
    if (step === 'qr' && sessionId && !qrUrl) {
      setQrUrl(`${window.location.origin}/?session=${sessionId}`);
    }
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
    // Croquis obligatoire — placement véhicule sur carte avant signature
    setStep('sketch');
  };

  const updateMutation = trpc.session.updateParticipant.useMutation({
    onError: (err) => console.error('updateParticipant failed:', err.message),
  });

  // ── Cas où aucune signature de la partie adverse n'est requise ──
  // Véhicules non-conducteurs (ne signent jamais)
  const NON_SIGNING_TYPES = ['pedestrian', 'bicycle', 'escooter', 'cargo_bike', 'moped'];
  // Accident solo = vehicleCount à 1 OU vehicleType absent ET vehicleCount=1
  const isSoloAccident = vehicleCount === 1;
  const otherPartyNoSignRequired =
    isSoloAccident ||                                    // Accident seul
    NON_SIGNING_TYPES.includes(vehicleType || '') ||     // Piéton, vélo, trottinette, vélomoteur
    !!partyBStatus;                                      // Blessé grave, décédé, fuite, refus, sans smartphone

  const signMutation = trpc.session.sign.useMutation({
    onSuccess: (data) => {
      if (data.bothSigned || otherPartyNoSignRequired) {
        setOtherSigned(true);
        setTimeout(() => setStep('done'), 1200);
      }
    },
    onError: (err) => console.error('session.sign failed:', err.message),
  });

  const handleSign = (signatureBase64: string) => {
    if (sessionId) signMutation.mutate({ sessionId, role: 'A', signatureBase64 });
  };

  const currentStepIdx = STEPS.findIndex(s => s.id === step);

  // Emergency overlay
  if (showEmergency) {
    return <EmergencyNumbers mode="full" onClose={() => setShowEmergency(false)} />;
  }

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
        {step === 'ocr' && savedVehicles.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {!showVehiclePicker ? (
              <button
                onClick={() => setShowVehiclePicker(true)}
                style={{
                  width: '100%', background: '#0d2a0d', border: '1px solid #1a5c1a',
                  borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}
              >
                <span style={{ fontSize: 24 }}>🚗</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ color: '#4ade80', fontWeight: 700, fontSize: 14 }}>Utiliser un véhicule enregistré</div>
                  <div style={{ color: '#666', fontSize: 12 }}>Pré-remplissage automatique — pas besoin de scanner</div>
                </div>
                <span style={{ color: '#4ade80', marginLeft: 'auto' }}>→</span>
              </button>
            ) : (
              <div style={{ background: '#111', border: '1px solid #1a5c1a', borderRadius: 12, padding: 16 }}>
                <div style={{ color: '#4ade80', fontWeight: 700, marginBottom: 12 }}>Choisissez votre véhicule :</div>
                {savedVehicles.map((v: any) => (
                  <button key={v.id} onClick={() => applyVehicle(v)} style={{
                    width: '100%', background: '#1a2a1a', border: '1px solid #2a4a2a',
                    borderRadius: 10, padding: '12px 14px', marginBottom: 8, cursor: 'pointer',
                    textAlign: 'left' as const,
                  }}>
                    <div style={{ color: '#fff', fontWeight: 600 }}>
                      {v.nickname || [v.make, v.model].filter(Boolean).join(' ') || 'Véhicule'}
                    </div>
                    {v.plate && <div style={{ color: '#FF3500', fontFamily: 'monospace', fontSize: 13 }}>{v.plate}</div>}
                    {v.insuranceData?.companyName && <div style={{ color: '#666', fontSize: 12 }}>🛡️ {v.insuranceData.companyName}</div>}
                  </button>
                ))}
                <button onClick={() => setShowVehiclePicker(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 13 }}>
                  Annuler
                </button>
              </div>
            )}
          </div>
        )}

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

        {step === 'qr' && sessionId && vehicleType !== 'pedestrian' && (
          <>
            <QRSession
              sessionId={sessionId}
              qrUrl={qrUrl}
              onVehicleCountChange={(count) => {
                setVehicleCount(count as 2|3|4);
                // Synchroniser vehicleCount vers la DB — critique pour solo
                if (sessionId) {
                  updateAccidentMutation.mutate({
                    sessionId,
                    data: { vehicleCount: count } as any,
                  });
                }
              }}
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
            {/* Bouton partie B indisponible — toujours visible */}
            <div style={{ padding: '0 20px 24px', maxWidth: 480, margin: '0 auto' }}>
              <button
                onClick={() => setShowUnavailableModal(true)}
                style={{
                  width: '100%', padding: '14px', borderRadius: 12,
                  border: '1.5px solid rgba(239,68,68,0.3)',
                  background: 'rgba(239,68,68,0.05)',
                  color: 'rgba(239,68,68,0.8)',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                ⚠️ La partie B est indisponible (blessé, fuite, refus…)
              </button>
            </div>
          </>
        )}

        {/* ── CAS PIÉTON : choix téléphone ou pas ── */}
        {step === 'qr' && sessionId && vehicleType === 'pedestrian' && pedestrianHasPhone === null && (
          <div style={{ padding: 24, maxWidth: 480, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>🚶</div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Autre partie : piéton</h2>
              <p style={{ fontSize: 13, opacity: 0.5, marginTop: 8 }}>
                Le piéton a-t-il un téléphone mobile pour scanner le QR code ?
              </p>
            </div>
            <button
              onClick={() => setPedestrianHasPhone(true)}
              style={{
                width: '100%', padding: '18px', borderRadius: 14, border: 'none',
                background: 'var(--boom)', color: '#fff',
                fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 12,
              }}
            >
              📱 Oui — il scanne le QR code
            </button>
            <button
              onClick={() => { setPedestrianHasPhone(false); setStep('pedestrian_form'); }}
              style={{
                width: '100%', padding: '18px', borderRadius: 14,
                border: '1.5px solid rgba(255,255,255,0.15)',
                background: 'transparent', color: 'var(--text)',
                fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 12,
              }}
            >
              📋 Non — je remplis ses coordonnées
            </button>
            <button
              onClick={() => { setPedestrianHasPhone(false); setStep('sketch'); }}
              style={{
                width: '100%', padding: '14px', borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.07)',
                background: 'transparent', color: 'rgba(240,237,232,0.35)',
                fontSize: 13, cursor: 'pointer',
              }}
            >
              Continuer sans coordonnées piéton
            </button>
          </div>
        )}

        {/* ── CAS PIÉTON avec téléphone : afficher QR ── */}
        {step === 'qr' && sessionId && vehicleType === 'pedestrian' && pedestrianHasPhone === true && (
          <QRSession
            sessionId={sessionId}
            qrUrl={qrUrl}
            isPedestrianMode
            onPartnerJoined={async () => {
              try {
                const sessionData = await trpcUtils.session.get.fetch({ sessionId: sessionId! });
                const bParticipant = sessionData?.participants?.find((p: any) => p.role === 'B');
                if (bParticipant) setPedestrianData(bParticipant);
              } catch (e) { /* ignore */ }
              setStep('sketch');
            }}
          />
        )}

        {/* ── FORMULAIRE PIÉTON rempli par conducteur A ── */}
        {step === 'pedestrian_form' && (
          <PedestrianForm
            filledByDriverA
            onComplete={async (ped) => {
              setPedestrianData(ped);
              // Sauvegarder dans la session comme participantB piéton
              if (sessionId) {
                try {
                  await trpcUtils.client.session.updateParticipant.mutate({
                    sessionId,
                    role: 'B',
                    data: {
                      vehicle: { vehicleType: 'pedestrian' },
                      driver: {
                        firstName: ped.firstName || '',
                        lastName: ped.lastName || '',
                        address: ped.address || '',
                        city: ped.city || '',
                        postalCode: ped.postalCode || '',
                        country: ped.country || '',
                        phone: ped.phone || '',
                        email: ped.email || '',
                      },
                      isPedestrian: true,
                    } as any,
                  });
                } catch (e) { /* ignore — on continue quand même */ }
              }
              setStep('sketch');
            }}
            onSkip={() => setStep('sketch')}
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
          />
        )}

        {step === 'sketch' && (
          <MapVehiclePlacer
            required={true}
            role="A"
            accidentLat={accidentData.location?.lat}
            accidentLng={accidentData.location?.lng}
            accidentAddress={accidentData.location?.address}
            accidentCity={accidentData.location?.city}
            vehicleColor={participantData.vehicle?.color}
            vehicleType={participantData.vehicle?.vehicleType}
            brand={participantData.vehicle?.brand}
            onComplete={(vehiclePos, mapImageB64) => {
              setSketchImage(mapImageB64);
              // Envoyer la carte au serveur pour le PDF
              if (sessionId && mapImageB64) {
                updateAccidentMutation.mutate({ sessionId, data: { sketchImage: mapImageB64 } });
              }
              setParticipantData(prev => ({
                ...prev,
                vehicle: { ...prev.vehicle, mapPosition: vehiclePos } as any,
              }));
              setStep('sign');
            }}
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
          <>
            {!sketchImage && (
              <div style={{
                margin: '0 20px 16px',
                padding: '12px 16px',
                background: 'rgba(255,160,0,0.12)',
                border: '1px solid rgba(255,160,0,0.4)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}>
                <span style={{ fontSize: 20 }}>🗺️</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#F59E0B' }}>
                    {t('sketch.requiredTitle', 'Croquis requis')}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {t('sketch.requiredMsg', 'Placez votre véhicule sur la carte pour continuer')}
                  </div>
                  <button
                    onClick={() => setStep('sketch')}
                    style={{
                      marginTop: 8, padding: '6px 14px',
                      background: '#F59E0B', color: '#fff',
                      border: 'none', borderRadius: 6,
                      fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    {t('sketch.openMap', 'Ouvrir la carte')} →
                  </button>
                </div>
              </div>
            )}
            <SignaturePad
              role="A"
              onSign={handleSign}
              otherSigned={otherSigned}
              isOtherPedestrian={otherPartyNoSignRequired}
              disabled={!sketchImage}
            />
          </>
        )}

        {step !== 'done' && step !== 'ocr' && (
          <button
            onClick={() => setShowEmergency(true)}
            title="Numéros d'urgence"
            style={{
              position: 'fixed', bottom: 20, right: 16, zIndex: 500,
              background: '#c00', border: 'none', borderRadius: '50%',
              width: 48, height: 48, fontSize: 20, cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(200,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            🆘
          </button>
        )}

        {step === 'done' && (
          <>
            <PDFDownload
              sessionId={sessionId!}
              role="A"
              driverEmail={participantData.driver?.email}
              insurerName={participantData.insurance?.company}
              driverName={[participantData.driver?.firstName, participantData.driver?.lastName].filter(Boolean).join(' ')}
            />
            <InsuranceAssistance
              insurerA={participantData.insurance?.companyName || (participantData.insurance as any)?.company}
              insurerB={(accidentData as any)?.insurerB}
              countryCode={(accidentData as any)?.location?.country}
            />
            {/* If country detected from accident location, show live lookup */}
            {(accidentData as any)?.location?.country &&
             !['CH','FR','BE','LU','DE','IT','ES','GB','NL','AT','US','CA','AU','JP','CN','IN','KR','SG','RU','AE','ZA','BR','NZ','MA','TR'].includes((accidentData as any)?.location?.country) && (
              <UnknownCountryLookup
                countryCode={(accidentData as any).location.country}
                countryName={(accidentData as any).location.countryName}
              />
            )}
            <EmergencyNumbers mode="compact" />
            <PostConstatCTA
              sessionId={sessionId!}
              authToken={authToken}
              authUser={authUser}
              onLogin={onShowAuth || (() => {})}
              onAccount={onAccount || (() => {})}
              onBuyPack={onBuyPack || (() => {})}
            />
          </>
        )}
      </div>

      {/* ── Modal Partie B indisponible ── */}
      {showUnavailableModal && (
        <PartyUnavailableModal
          onConfirm={async (status) => {
            setPartyBStatus(status);
            setShowUnavailableModal(false);
            // Stocker dans la session (accident JSONB)
            if (sessionId) {
              try {
                await updateAccidentMutation.mutateAsync({
                  sessionId,
                  data: { ...accidentData, partyBStatus: status } as any,
                });
              } catch { /* ignore */ }
            }
            setAccidentData(prev => ({ ...prev, partyBStatus: status } as any));
            // Passer directement au croquis — pas besoin que B rejoigne
            setStep('sketch');
          }}
          onCancel={() => setShowUnavailableModal(false)}
        />
      )}
    </div>
  );
}












