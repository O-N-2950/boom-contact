import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { trpc } from '../trpc';
import { trpcClient } from '../trpc';
import { LocationStep } from '../components/constat/LocationStep';
import { QRSession } from '../components/constat/QRSession';
import { StepIndicator } from '../components/constat/StepIndicator';
import { PDFDownload } from '../components/constat/PDFDownload';
import { EmergencyNumbers } from '../components/EmergencyNumbers';
import { InsuranceAssistance } from '../components/constat/InsuranceAssistance';
import { UnknownCountryLookup } from '../components/EmergencyNumbers';
import { PostConstatCTA } from '../components/constat/PostConstatCTA';
import { PedestrianForm } from '../components/constat/PedestrianForm';
import { PartyUnavailableModal } from '../components/constat/PartyUnavailableModal';
import { CoherenceScore } from '../components/constat/CoherenceScore';
import type { PartyBStatus } from '../components/constat/PartyUnavailableModal';
import type { OCRResult, ParticipantData, AccidentData, VehicleType, ScenePhoto } from '../../../shared/types';
import { ocrCategoryToVehicleType } from '../../../shared/utils/ocrCategoryToVehicleType';

// ── Lazy-loaded heavy components (code-splitting) ──────────────
const OCRScanner = React.lazy(() => import('../components/constat/OCRScanner').then(m => ({ default: m.OCRScanner })));
const VehicleDiagram = React.lazy(() => import('../components/constat/VehicleDiagram').then(m => ({ default: m.VehicleDiagram })));
const MapVehiclePlacer = React.lazy(() => import('../components/constat/MapVehiclePlacer').then(m => ({ default: m.MapVehiclePlacer })));
const SignaturePad = React.lazy(() => import('../components/constat/SignaturePad').then(m => ({ default: m.SignaturePad })));
const VoiceSketchFlow = React.lazy(() => import('../components/constat/VoiceSketchFlow').then(m => ({ default: m.VoiceSketchFlow })));
const PhotoCapture = React.lazy(() => import('../components/constat/PhotoCapture').then(m => ({ default: m.PhotoCapture })));
const ConstatForm = React.lazy(() => import('../components/constat/ConstatForm').then(m => ({ default: m.ConstatForm })));

// ── Loading fallback component ───────────────────────────────────
function LazyLoading() {
  return <div className="flex items-center justify-center p-10"><div className="rounded-full w-6 h-6"  style={{ border: '2px solid rgba(255,255,255,0.25)', borderTopColor: 'var(--boom, #FF3500)', animation: 'spin 0.8s linear infinite' }} /></div>;
}

// ── Zod schema for localStorage validation ─────────────────
const savedStateSchema = z.object({
  step: z.string().optional(),
  sessionId: z.string().nullable().optional(),
  tokenA: z.string().optional(),
  qrUrl: z.string().optional(),
  participantData: z.record(z.unknown()).optional(),
  damagedZones: z.array(z.string()).optional(),
  photos: z.array(z.unknown()).optional(),
  sketchImage: z.string().optional(),
  vehicleCount: z.number().optional(),
  voiceAnalysis: z.unknown().optional(),
  voiceTranscript: z.string().optional(),
  accidentData: z.record(z.unknown()).optional(),
  vehicleType: z.string().nullable().optional(),
  vehicleA: z.record(z.unknown()).nullable().optional(),
  ts: z.number().optional(),
}).passthrough();

type FlowStep = 'ocr' | 'location' | 'photos' | 'voice' | 'qr' | 'pedestrian_form' | 'sketch' | 'form' | 'diagram' | 'sign' | 'done';

const STORAGE_KEY = 'boom_flow_a';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const result = savedStateSchema.safeParse(parsed);
    if (!result.success) {
      console.warn('ConstatFlow: invalid localStorage data, clearing', result.error.issues);
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const data = result.data;
    if (data.ts && Date.now() - data.ts > 2 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

interface ConstatFlowProps {
  initialSessionId?: string;
  authToken?: string;
  authUser?: { id: string; email: string; role: string; credits: number; firstName?: string; lastName?: string; phone?: string; address?: string } | null;
  onShowAuth?: () => void;
  onAccount?: () => void;
  onBuyPack?: () => void;
}

export function ConstatFlow({ initialSessionId, authToken, authUser, onShowAuth, onAccount, onBuyPack }: ConstatFlowProps = {}) {
  const { t, i18n } = useTranslation();
  const [showExpiryWarning, setShowExpiryWarning] = useState(false);
  const [expiryTime, setExpiryTime] = useState<string>('');

  // Detect post-payment return: ?session=XXX&paid=1
  const isPaidReturn = (() => {
    const p = new URLSearchParams(window.location.search);
    return p.get('paid') === '1' && !!initialSessionId;
  })();

  // Load saved state: when returning after payment, still load localStorage to get tokenA + participant data
  const saved = (initialSessionId && !isPaidReturn) ? null : loadState();

  const [step, setStepRaw] = useState<FlowStep>(() => {
    if (isPaidReturn) return 'done'; // Post-payment: go directly to done
    if (initialSessionId) return 'qr'; // Skip OCR, jump to QR step
    return (saved?.step as FlowStep) || 'ocr';
  });
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || saved?.sessionId || null);
  const [qrUrl, setQrUrl] = useState<string>(saved?.qrUrl || '');
  const [accidentData, setAccidentData] = useState<Partial<AccidentData>>(saved?.accidentData || {});
  const [vehicleType, setVehicleType] = useState<VehicleType | null>((saved?.vehicleType as VehicleType | null) || null);
  const [participantData, setParticipantData] = useState<Partial<ParticipantData>>(() => {
    const base = (saved?.participantData || { role: 'A' }) as any;
    // Pré-remplir les infos conducteur depuis le profil connecté
    if (authUser && !base.driver?.firstName) {
      const [addrStreet, ...addrRest] = (authUser.address || '').split(',').map((s: string) => s.trim());
      return {
        ...base,
        driver: {
          ...(base.driver || {}),
          email:     authUser.email     || base.driver?.email     || '',
          firstName: authUser.firstName || base.driver?.firstName || '',
          lastName:  authUser.lastName  || base.driver?.lastName  || '',
          phone:     authUser.phone     || base.driver?.phone     || '',
          address:   addrStreet         || base.driver?.address   || '',
        },
      };
    }
    return base;
  });
  const [damagedZones, setDamagedZones] = useState<string[]>(saved?.damagedZones || []);
  const [photos, setPhotos] = useState<ScenePhoto[]>((saved?.photos as ScenePhoto[]) || []);
  const [sketchImage, setSketchImage] = useState<string>(saved?.sketchImage || '');
  const [voiceAnalysis, setVoiceAnalysis] = useState<any>(saved?.voiceAnalysis || null);
  const [voiceTranscript, setVoiceTranscript] = useState<string>(saved?.voiceTranscript || '');
  const [vehicleCount, setVehicleCount] = useState<2|3|4>((saved?.vehicleCount as 2|3|4) || 2);
  // Données de tous les véhicules (enrichies au fur et à mesure des scans)
  const [allVehicles, setAllVehicles] = useState<Record<string, unknown>>({
    A: saved?.vehicleA || null,
  });
  // participantToken for driver A — required by all secure endpoints
  const [tokenA, setTokenA] = useState<string>(saved?.tokenA || '');
  const [otherSigned, setOtherSigned] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  // ── Piéton ────────────────────────────────────────────────
  const [pedestrianData, setPedestrianData] = useState<Record<string, unknown> | null>(null);
  const [pedestrianHasPhone, setPedestrianHasPhone] = useState<boolean | null>(null);
  // ── Partie B indisponible ──────────────────────────────────
  const [partyBStatus, setPartyBStatus] = useState<PartyBStatus | null>(null);
  const [showUnavailableModal, setShowUnavailableModal] = useState(false);
  // ── Données B pour score cohérence ────────────────────────
  const [sessionBParticipant, setSessionBParticipant] = useState<any>(null);

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

  const applyVehicle = (v: Record<string, unknown>) => {
    setShowVehiclePicker(false);
    const va = v as any;
    const newData: Partial<ParticipantData> = {
      role: 'A',
      vehicle: {
        licensePlate:   va.plate,
        make:           va.make,
        model:          va.model,
        color:          va.color,
        year:           va.year,
        vehicleCategory: va.category,
        ...(va.licenseData || {}),
      },
      insurance: va.insuranceData && Object.keys(va.insuranceData).length > 0
        ? {
            ...va.insuranceData,
            // Normaliser : 'company' est le champ utilisé par ConstatForm
            company:      va.insuranceData.company || va.insuranceData.companyName || '',
            companyName:  va.insuranceData.company || va.insuranceData.companyName || '',
            policyNumber: va.insuranceData.policyNumber || '',
          }
        : undefined,
    };
    setParticipantData(newData);
    setStep('location'); // skip OCR — jump straight to location
  };

  const setStep = (s: FlowStep) => {
    setStepRaw(s);
    setErrorMsg('');
    if (s === 'done') {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const PREV: Partial<Record<FlowStep, FlowStep>> = {
    location:'ocr', photos:'location', qr:'photos', voice:'qr',
    form:'voice', sketch:'form', diagram:'sketch', sign:'diagram',
    pedestrian_form: 'qr',
  };
  const goBack = () => { const p = PREV[step]; if (p) setStep(p); };
  const canGoBack = !!PREV[step] && step !== 'done';

  useEffect(() => {
    if (step === 'done') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      step, sessionId, tokenA, qrUrl, participantData, damagedZones, photos, sketchImage,
      vehicleCount, voiceAnalysis, voiceTranscript, ts: Date.now(),
    }));
  }, [step, sessionId, qrUrl, participantData, damagedZones, photos, vehicleCount, voiceAnalysis, voiceTranscript]);

  // ── Session expiry warning (15 min before 2h TTL) ──────────
  useEffect(() => {
    if (step === 'done') return;
    const WARNING_THRESHOLD = 105 * 60 * 1000; // 1h45m
    const TTL = 2 * 60 * 60 * 1000; // 2h
    const check = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!parsed.ts) return;
        const elapsed = Date.now() - parsed.ts;
        if (elapsed > WARNING_THRESHOLD) {
          setShowExpiryWarning(true);
          const remainingMs = Math.max(0, TTL - elapsed);
          const mins = Math.ceil(remainingMs / 60000);
          setExpiryTime(`${mins} min`);
        } else {
          setShowExpiryWarning(false);
        }
      } catch { /* ignore */ }
    };
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [step]);

  // Steps with translated labels — memoized to avoid recreating on every render
  const STEPS = useMemo<{ id: FlowStep; icon: string; label: string }[]>(() => [
    { id: 'ocr',      icon: '📄', label: t('steps.scan') },
    { id: 'location', icon: '📍', label: t('steps.location') },
    { id: 'photos',   icon: '📸', label: t('steps.photos') },
    { id: 'qr',       icon: '📱', label: t('steps.qr') },
    { id: 'voice',    icon: '🎙️', label: 'Vocal' },
    { id: 'form',     icon: '📋', label: t('steps.form') },
    { id: 'sketch',   icon: '🗺️', label: t('steps.sketch') },
    { id: 'diagram',  icon: '🚗', label: t('steps.damage') },
    { id: 'sign',     icon: '✍️', label: t('steps.sign') },
  ], [t]);

  useEffect(() => {
    if (step === 'qr' && !sessionId) createSession();
    // Ne PAS écraser qrUrl avec une URL sans tokenB !
    // Si qrUrl est vide après refresh, recréer la session (le QR sans token est inutilisable)
    if (step === 'qr' && sessionId && !qrUrl) {
      createSession();
    }
  }, [step]);

  const createSessionMutation = trpc.session.create.useMutation({
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setQrUrl(data.qrUrl);
      if (data.tokenA) setTokenA(data.tokenA);
      if (Object.keys(accidentData).length > 0) {
        updateAccidentMutation.mutate({
          sessionId: data.sessionId,
          participantToken: data.tokenA || '',
          data: { ...accidentData, photos } as any,
        });
      }
    },
    onError: (err) => { setErrorMsg(err.message || 'Une erreur est survenue lors de la création de session'); console.error('session.create failed:', err.message); },
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

  function ocrCategoryToType(cat?: string): string | null {
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
    const vehData = result.registration?.vehicle as Record<string, unknown> | undefined;
    window.__boomVehicleA = {
      color: vehData?.color as string | undefined,
      type:  (vehData?.vehicleType as string | undefined) || guessVehicleType(vehData?.category as string | undefined),
      brand: vehData?.brand as string | undefined,
      model: vehData?.model as string | undefined,
    };
  };

  const updateAccidentMutation = trpc.session.updateAccident.useMutation({
    onError: (err) => { setErrorMsg(err.message || 'Erreur lors de la sauvegarde des données accident'); console.error('updateAccident failed:', err.message); },
  });

  const handleLocationComplete = (data: Partial<AccidentData> & { vehicleType: VehicleType }) => {
    const { vehicleType: vt, ...accident } = data;
    setVehicleType(vt);
    setAccidentData(accident);
    setParticipantData(prev => ({ ...prev, vehicle: { ...prev.vehicle, vehicleType: vt } }));
    if (sessionId) {
      updateAccidentMutation.mutate({ sessionId, participantToken: tokenA, data: accident as any });
    }
    setStep('photos');
  };

  const handlePhotosContinue = useCallback(() => {
    const updatedAccident = { ...accidentData, photos };
    setAccidentData(updatedAccident as any);
    if (sessionId && photos.length > 0) {
      updateAccidentMutation.mutate({ sessionId, participantToken: tokenA, data: { photos } as any });
    }
    setStep('qr'); // QR d'abord, puis vocal après que B rejoint
  }, [accidentData, photos, sessionId]);

  const handleFormSave = async (data: Partial<ParticipantData>, accident?: Partial<AccidentData>) => {
    setParticipantData({ ...data, damagedZones });
    if (sessionId) {
      updateMutation.mutate({ sessionId, role: 'A', participantToken: tokenA, data: data as any });
      if (accident && Object.keys(accident).length > 0) {
        updateAccidentMutation.mutate({ sessionId, participantToken: tokenA, data: accident as any });
        setAccidentData(prev => ({ ...prev, ...accident }));
      }
    }
    setStep('sketch'); // croquis AVANT choc
  };

  const handleSketchDone = (base64: string) => {
    setSketchImage(base64);
    if (sessionId && base64) {
      updateAccidentMutation.mutate({ sessionId, participantToken: tokenA, data: { sketchImage: base64 } });
    }
    setStep('diagram');
  };

  const handleDiagramDone = async () => {
    if (sessionId) {
      updateMutation.mutate({ sessionId, role: 'A', participantToken: tokenA, data: { damagedZones } });
    }
    setStep('sign'); // diagram est la dernière étape avant signature
  };

  const updateMutation = trpc.session.updateParticipant.useMutation({
    onError: (err) => { setErrorMsg(err.message || 'Erreur lors de la sauvegarde de vos informations'); console.error('updateParticipant failed:', err.message); },
  });

  // ── Cas où aucune signature de la partie adverse n'est requise ──
  // Véhicules non-conducteurs (ne signent jamais)
  const NON_SIGNING_TYPES = ['pedestrian', 'bicycle', 'escooter', 'cargo_bike', 'moped'];
  // Accident solo = vehicleCount à 1 OU vehicleType absent ET vehicleCount=1
  const isSoloAccident = (vehicleCount as number) === 1;
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
    onError: (err) => { setErrorMsg(err.message || 'Erreur lors de la signature — veuillez réessayer'); console.error('session.sign failed:', err.message); },
  });

  const handleSign = useCallback((signatureBase64: string) => {
    if (sessionId) signMutation.mutate({ sessionId, role: 'A', participantToken: tokenA, signatureBase64 });
  }, [sessionId]);

  const currentStepIdx = STEPS.findIndex(s => s.id === step);

  // Emergency overlay
  if (showEmergency) {
    return <EmergencyNumbers mode="full" onClose={() => setShowEmergency(false)} />;
  }

  return (
    <div className="max-w-[420px] mx-auto my-0 min-h-screen flex flex-col">

      {/* Header */}
      <h1 className="absolute p-0 overflow-hidden w-px h-px m-[-1px] border-0"  style={{ clip: 'rect(0,0,0,0)' }}>Constat amiable boom.contact</h1>
      <div className="flex items-center gap-3 shrink-0 px-5 py-4" style={{ borderBottom: '1px solid rgba(240,237,232,0.06)' }}>
        <div className="shrink-0 w-9 h-9" >
          <img src="/logo.webp" alt="boom.contact" loading="lazy" className="w-full h-full object-contain" />
        </div>
        <div>
          <div className="font-bold text-sm">boom.contact</div>
          <div className="text-[10px] opacity-70 tracking-[1px]" style={{ fontFamily: 'monospace' }}>
            {t('flow.header.role_a')}
          </div>
        </div>
        {/* Indicateur sauvegarde automatique */}
        {step !== 'ocr' && step !== 'done' && sessionId && (
          <div className="text-[9px] flex items-center gap-[3px] opacity-70"  style={{ fontFamily: 'monospace' }}>
            <span className="text-green-500">●</span> AUTO
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          {canGoBack && (
            <button onClick={goBack} className="flex items-center gap-1 rounded-lg cursor-pointer text-[13px] font-semibold px-3 py-1.5 touch-manipulation" style={{ border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', WebkitTapHighlightColor: 'transparent' }}>← Retour</button>
          )}
          {step !== 'ocr' && step !== 'done' && (
            <button onClick={() => { localStorage.removeItem(STORAGE_KEY); window.location.reload(); }}
              className="text-[11px] bg-transparent border-0 cursor-pointer opacity-75" style={{ color: 'inherit' }}
              aria-label="Réinitialiser le constat"
            >↺</button>
          )}
        </div>
      </div>

      {/* Session expiry warning */}
      {showExpiryWarning && step !== 'done' && (
        <div role="alert" className="shrink-0 flex items-center gap-2 text-[12px] font-semibold px-4 py-2.5" style={{ background: 'rgba(234,179,8,0.15)', borderBottom: '1px solid rgba(234,179,8,0.3)', color: '#eab308' }}>
          <span aria-hidden="true">⚠️</span>
          <span>Votre session expire bientôt. Sauvegardez vos données.</span>
          <span className="ml-auto text-[11px] opacity-80" style={{ fontFamily: 'monospace' }}>~{expiryTime}</span>
        </div>
      )}

      {/* Step indicator */}
      {step !== 'done' && (
        <StepIndicator
          steps={STEPS}
          currentIndex={currentStepIdx}
          onStepClick={(stepId) => {
            // Autoriser navigation vers étapes passées uniquement
            const targetIdx = STEPS.findIndex(s => s.id === stepId);
            if (targetIdx < currentStepIdx) setStep(stepId as FlowStep);
          }}
        />
      )}

      {/* Error banner */}
      {errorMsg && (
        <div role="alert" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', color: '#ef4444', fontSize: 13, margin: '0 16px 12px' }}>
          {errorMsg}
          <button onClick={() => setErrorMsg('')} aria-label="Fermer l'erreur" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', float: 'right', fontSize: 14 }}>✕</button>
        </div>
      )}

      {/* Main content */}
      <div role="tabpanel" id={`tabpanel-${step}`} aria-labelledby={`tab-${step}`} className="flex-1 overflow-y-auto">
        {step === 'ocr' && savedVehicles.length > 0 && (
          <div className="mb-4">
            {!showVehiclePicker ? (
              <button
                onClick={() => setShowVehiclePicker(true)}
                className="w-full rounded-xl cursor-pointer flex items-center gap-3 px-4 py-3.5 bg-[#0d2a0d]" style={{ border: '1px solid #1a5c1a' }}
              >
                <span className="text-2xl">🚗</span>
                <div className="text-left">
                  <div className="text-green-400 font-bold text-sm">Utiliser un véhicule enregistré</div>
                  <div className="text-[#d0d0d0] text-xs">Pré-remplissage automatique — pas besoin de scanner</div>
                </div>
                <span className="text-green-400 ml-auto">→</span>
              </button>
            ) : (
              <div className="bg-[#111] rounded-xl p-4" style={{ border: '1px solid #1a5c1a' }}>
                <div className="text-green-400 font-bold mb-3">Choisissez votre véhicule :</div>
                {savedVehicles.map((v: any) => (
                  <button key={v.id} onClick={() => applyVehicle(v)} className="w-full rounded-[10px] mb-2 cursor-pointer px-3.5 py-3 bg-[#1a2a1a] text-left" style={{ border: '1px solid #2a4a2a' }}>
                    <div className="text-white font-semibold">
                      {v.nickname || [v.make, v.model].filter(Boolean).join(' ') || 'Véhicule'}
                    </div>
                    {v.plate && <div className="text-[13px] text-[#FF5533]"  style={{ fontFamily: 'monospace' }}>{v.plate}</div>}
                    {v.insuranceData?.companyName && <div className="text-[#d0d0d0] text-xs">🛡️ {v.insuranceData.companyName}</div>}
                  </button>
                ))}
                <button onClick={() => setShowVehiclePicker(false)} className="bg-transparent border-0 text-[#d0d0d0] cursor-pointer text-[13px]">
                  Annuler
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'ocr' && (
          <Suspense fallback={<LazyLoading />}>
            <OCRScanner role="A" onComplete={handleOCRComplete as any} onSkip={() => setStep('location')} sessionId={sessionId || undefined} participantToken={tokenA || undefined} />
          </Suspense>
        )}

        {step === 'location' && (
          <LocationStep onComplete={handleLocationComplete} initialVehicleType={vehicleType} />
        )}

        {step === 'photos' && (
          <Suspense fallback={<LazyLoading />}>
            <PhotoCapture
              photos={photos}
              onChange={setPhotos}
              onContinue={handlePhotosContinue}
            />
          </Suspense>
        )}

        {step === 'qr' && sessionId && vehicleType !== 'pedestrian' && (
          <>
            <QRSession
              sessionId={sessionId}
              qrUrl={qrUrl}
              tokenA={tokenA}
              onVehicleCountChange={(count) => {
                setVehicleCount(count as 2|3|4);
                // Synchroniser vehicleCount vers la DB — critique pour solo
                if (sessionId) {
                  updateAccidentMutation.mutate({
                    sessionId,
                    participantToken: tokenA,
                    data: { vehicleCount: count },
                  });
                }
              }}
              onPartnerJoined={async () => {
                // Charger les données véhicule B depuis la session
                try {
                  const sessionData = await trpcClient.session.get.query({ sessionId: sessionId!, participantToken: tokenA });
                  const bParticipant = (sessionData as any)?.participantB;
                  if (bParticipant?.vehicle?.vehicleData) {
                    setAllVehicles(prev => ({ ...prev, B: bParticipant.vehicle.vehicleData }));
                    window.__boomVehicleB = bParticipant.vehicle.vehicleData;
                  }
                  if (bParticipant) setSessionBParticipant(bParticipant);
                } catch (e) { /* ignore */ }
                setStep('voice'); // QR → Vocal → Formulaire → Croquis → Choc → Signature
              }}
            />
            {/* Bouton partie B indisponible — toujours visible */}
            <div className="mx-auto max-w-[480px]"  style={{ padding: '0 20px 24px' }}>
              <button
                onClick={() => setShowUnavailableModal(true)}
                className="w-full p-3.5 rounded-xl cursor-pointer text-[13px] font-semibold flex items-center justify-center gap-2" style={{ border: '1.5px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', color: 'rgba(239,68,68,0.8)' }}
              >
                ⚠️ La partie B est indisponible (blessé, fuite, refus…)
              </button>
            </div>
          </>
        )}

        {/* ── CAS PIÉTON : choix téléphone ou pas ── */}
        {step === 'qr' && sessionId && vehicleType === 'pedestrian' && pedestrianHasPhone === null && (
          <div className="p-6 mx-auto max-w-[480px]">
            <div className="text-center mb-7">
              <div className="text-5xl mb-2.5">🚶</div>
              <h2 className="text-lg font-extrabold m-0">Autre partie : piéton</h2>
              <p className="text-[13px] mt-2 opacity-75">
                Le piéton a-t-il un téléphone mobile pour scanner le QR code ?
              </p>
            </div>
            <button
              onClick={() => setPedestrianHasPhone(true)}
              className="w-full p-[18px] rounded-[14px] border-0 text-white font-bold cursor-pointer mb-3 text-[15px]" style={{ background: 'var(--boom)' }}
            >
              📱 Oui — il scanne le QR code
            </button>
            <button
              onClick={() => { setPedestrianHasPhone(false); setStep('pedestrian_form'); }}
              className="w-full p-[18px] rounded-[14px] bg-transparent font-bold cursor-pointer mb-3 text-[15px]" style={{ border: '1.5px solid rgba(255,255,255,0.15)', color: 'var(--text)' }}
            >
              📋 Non — je remplis ses coordonnées
            </button>
            <button
              onClick={() => { setPedestrianHasPhone(false); setStep('voice'); }}
              className="w-full p-3.5 rounded-[14px] bg-transparent text-[13px] cursor-pointer" style={{ border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(240,237,232,0.55)' }}
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
            tokenA={tokenA}
            isPedestrianMode
            onPartnerJoined={async () => {
              try {
                const sessionData = await trpcClient.session.get.query({ sessionId: sessionId!, participantToken: tokenA });
                const bParticipant = (sessionData as any)?.participantB;
                if (bParticipant) setPedestrianData(bParticipant);
              } catch (e) { /* ignore */ }
              setStep('voice'); // piéton rejoint → vocal → formulaire → croquis → choc
            }}
          />
        )}

        {/* ── FORMULAIRE PIÉTON rempli par conducteur A ── */}
        {step === 'pedestrian_form' && (
          <PedestrianForm
            filledByDriverA
            onComplete={async (ped) => {
              setPedestrianData(ped as any);
              // Sauvegarder le piéton (partie adverse sans téléphone) côté serveur
              if (sessionId) {
                try {
                  await trpcClient.session.fillAbsentPedestrian.mutate({
                    sessionId,
                    participantToken: tokenA,
                    data: {
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
                    },
                  });
                } catch (e) { /* ignore — on continue quand même */ }
              }
              setStep('voice'); // piéton saisi → vocal → formulaire → croquis
            }}
            onSkip={() => setStep('voice')}
          />
        )}

        {step === 'form' && (
          <Suspense fallback={<LazyLoading />}>
            <ConstatForm key={`form-${participantData.vehicle?.licensePlate || 'empty'}`} role="A" prefilled={participantData as any} accidentData={accidentData as any} onSave={handleFormSave} sessionId={sessionId || ''} participantToken={tokenA} language={participantData.language} />
          </Suspense>
        )}

        {step === 'voice' && sessionId && (
          <Suspense fallback={<LazyLoading />}>
            <VoiceSketchFlow
              role="A"
              sessionId={sessionId}
              participantToken={tokenA}
              lang={participantData.language}
              initialTranscript={voiceTranscript}
              onComplete={(data) => {
                setVoiceAnalysis(data.analysis);
                setVoiceTranscript(data.transcript || '');
                const count = data.analysis?.vehicleCount || vehicleCount;
                setVehicleCount(count as 2|3|4);
                if ((data.analysis?.circumstances as any)?.length > 0) {
                  setParticipantData(prev => ({
                    ...prev,
                    circumstances: data.analysis.circumstances,
                  } as any));
                }
                setStep('form');
              }}
              onSkip={() => setStep('form')}
            />
          </Suspense>
        )}

        {step === 'sketch' && (
          <Suspense fallback={<LazyLoading />}>
            <MapVehiclePlacer
              required={false}
              role="A"
              sessionId={sessionId || undefined}
              accidentLat={accidentData.location?.lat}
              accidentLng={accidentData.location?.lng}
              accidentAddress={accidentData.location?.address}
              accidentCity={accidentData.location?.city}
              vehicleColor={participantData.vehicle?.color}
              vehicleType={participantData.vehicle?.vehicleType}
              brand={participantData.vehicle?.brand}
              onComplete={(vehiclePos, mapImageB64) => {
                setSketchImage(mapImageB64);
                // Stocker la position de A pour que B la voie sur sa carte
                window.__boomVehicleAPos = vehiclePos;
                if (sessionId && mapImageB64) {
                  updateAccidentMutation.mutate({ sessionId, participantToken: tokenA, data: { sketchImage: mapImageB64, vehicleAPos: vehiclePos } });
                }
                setParticipantData(prev => ({
                  ...prev,
                  vehicle: { ...prev.vehicle, mapPosition: vehiclePos },
                }));
                setStep('diagram');
              }}
              onSkip={() => setStep('diagram')}
            />
          </Suspense>
        )}

        {step === 'diagram' && (
          <div>
            <Suspense fallback={<LazyLoading />}>
              <VehicleDiagram
                    role="A"
                    vehicleType={participantData.vehicle?.vehicleType}
                    brand={participantData.vehicle?.brand}
                    model={participantData.vehicle?.model}
                    color={participantData.vehicle?.color}
                    selected={damagedZones}
                    onChange={setDamagedZones}
                  />
            </Suspense>
            <div style={{ padding: '0 20px 20px' }}>
              <button onClick={handleDiagramDone} className="w-full p-4 rounded-[10px] border-0 text-white cursor-pointer font-bold text-[15px]" style={{ background: 'var(--boom)' }}>
                {t('common.continue')}
              </button>
            </div>
          </div>
        )}

        {step === 'sign' && (
          <>
            {/* ── Résumé de relecture avant signature ── */}
            <div style={{ padding: '16px 20px 0' }}>
              <div className="text-[11px] font-bold uppercase mb-3 opacity-70 tracking-[2px]" style={{ fontFamily: 'monospace' }}>
                Vérifiez avant de signer
              </div>

              {/* Véhicule A */}
              <div className="mb-2.5 rounded-[10px] px-3.5 py-3" style={{ background: 'rgba(255,53,0,0.06)', border: '1px solid rgba(255,53,0,0.15)' }}>
                <div className="text-[11px] mb-1.5 font-semibold opacity-75">🚗 Votre véhicule</div>
                <div className="text-[13px] font-bold">
                  {[participantData.vehicle?.brand, participantData.vehicle?.model].filter(Boolean).join(' ') || '—'}
                  {participantData.vehicle?.licensePlate && <span className="ml-2" style={{ fontFamily: 'monospace', color: 'var(--boom)' }}>{participantData.vehicle.licensePlate}</span>}
                </div>
                {participantData.insurance?.company && (
                  <div className="text-xs mt-[3px] opacity-75">🛡️ {participantData.insurance.company || participantData.insurance.companyName}</div>
                )}
                {participantData.driver?.firstName && (
                  <div className="text-xs mt-0.5 opacity-75">👤 {[participantData.driver.firstName, participantData.driver.lastName].filter(Boolean).join(' ')}</div>
                )}
                {damagedZones.length > 0 && (
                  <div className="text-[11px] mt-1 opacity-70" >💥 {damagedZones.length} zone{damagedZones.length > 1 ? 's' : ''} endommagée{damagedZones.length > 1 ? 's' : ''}</div>
                )}
              </div>

              {/* Accident */}
              <div className="mb-2.5 rounded-[10px] px-3.5 py-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.25)' }}>
                <div className="text-[11px] mb-1 font-semibold opacity-75">📍 Accident</div>
                <div className="text-xs opacity-70" >
                  {accidentData.date && accidentData.time
                    ? `${new Date(accidentData.date + 'T00:00').toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' })} à ${accidentData.time}`
                    : '—'}
                </div>
                {accidentData.location?.city && (
                  <div className="text-xs opacity-75">{accidentData.location.city}, {accidentData.location.country || ''}</div>
                )}
              </div>

              {/* Bouton corriger */}
              <button
                onClick={() => setStep('form')}
                className="w-full rounded-lg bg-transparent cursor-pointer text-xs mb-2 p-2.5"  style={{ border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.4)' }}
              >
                ✏️ Corriger mes informations
              </button>
            </div>

            {/* Score de cohérence — visible seulement si B a des données */}
            {sessionBParticipant && !otherPartyNoSignRequired && (
              <CoherenceScore
                sessionId={sessionId || ''}
                participantA={participantData}
                participantB={sessionBParticipant}
                accidentData={accidentData}
              />
            )}
            <Suspense fallback={<LazyLoading />}>
              <SignaturePad
                role="A"
                onSign={handleSign}
                otherSigned={otherSigned}
                isOtherPedestrian={otherPartyNoSignRequired}
                disabled={false}
              />
            </Suspense>
          </>
        )}

        {step !== 'done' && step !== 'ocr' && (
          <button
            onClick={() => setShowEmergency(true)}
            title="Numéros d'urgence"
            className="fixed bottom-5 right-4 border-0 rounded-full w-12 h-12 text-xl cursor-pointer flex items-center justify-center bg-[#c00]" style={{ zIndex: 500, boxShadow: '0 4px 16px rgba(200,0,0,0.5)' }}
          >
            🆘
          </button>
        )}

        {step === 'done' && (
          <>
            <PDFDownload
              sessionId={sessionId!}
              role="A"
              participantToken={tokenA}
              driverEmail={participantData.driver?.email}
              insurerName={participantData.insurance?.company || participantData.insurance?.companyName}
              driverName={[participantData.driver?.firstName, participantData.driver?.lastName].filter(Boolean).join(' ')}
              authUser={authUser}
              authToken={authToken}
              onLogin={onShowAuth || (() => {})}
              onBuyPack={onBuyPack || (() => {})}
            />
            <InsuranceAssistance
              insurerA={participantData.insurance?.companyName || participantData.insurance?.company}
              insurerB={accidentData?.insurerB}
              countryCode={accidentData?.location?.country}
            />
            {accidentData?.location?.country &&
             !['CH','FR','BE','LU','DE','IT','ES','GB','NL','AT','US','CA','AU','JP','CN','IN','KR','SG','RU','AE','ZA','BR','NZ','MA','TR'].includes(accidentData?.location?.country) && (
              <UnknownCountryLookup
                countryCode={accidentData.location.country}
                countryName={accidentData.location.countryName}
              />
            )}
            <EmergencyNumbers mode="compact" />
          </>
        )}
      </div>

      {/* ── Modal Partie B indisponible ── */}
      {showUnavailableModal && (
        <PartyUnavailableModal
          onConfirm={async (status) => {
            setPartyBStatus(status);
            setShowUnavailableModal(false);
            if (sessionId) {
              try {
                await updateAccidentMutation.mutateAsync({
                  sessionId,
                  participantToken: tokenA,
                  data: { ...accidentData, partyBStatus: status } as any,
                });
              } catch { /* ignore */ }
            }
            setAccidentData(prev => ({ ...prev, partyBStatus: status }) as any);
            // B indisponible → A continue seul : vocal puis formulaire puis croquis
            setStep('voice');
          }}
          onCancel={() => setShowUnavailableModal(false)}
        />
      )}
    </div>
  );
}













