import React, { useState, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGS, LANG_META, applyLang, getLangOrder } from '../i18n';
import type { SupportedLang } from '../i18n';
import { trpc } from '../trpc';
import { z } from 'zod';
import { StepIndicator } from '../components/constat/StepIndicator';
import { PDFDownload } from '../components/constat/PDFDownload';
import { ocrCategoryToVehicleType } from '../../../shared/utils/ocrCategoryToVehicleType';
import type { OCRResult, ParticipantData, ScenePhoto, AccidentData, ParticipantRole } from '../../../shared/types';

// ── Lazy-loaded heavy components (code-splitting) ──────────────
const LocationStep = React.lazy(() => import('../components/constat/LocationStep').then(m => ({ default: m.LocationStep })));
const PhotoCapture = React.lazy(() => import('../components/constat/PhotoCapture').then(m => ({ default: m.PhotoCapture })));
const MapVehiclePlacer = React.lazy(() => import('../components/constat/MapVehiclePlacer').then(m => ({ default: m.MapVehiclePlacer })));
const VoiceSketchFlow = React.lazy(() => import('../components/constat/VoiceSketchFlow').then(m => ({ default: m.VoiceSketchFlow })));
const OCRScanner = React.lazy(() => import('../components/constat/OCRScanner').then(m => ({ default: m.OCRScanner })));
const ConstatForm = React.lazy(() => import('../components/constat/ConstatForm').then(m => ({ default: m.ConstatForm })));
const VehicleDiagram = React.lazy(() => import('../components/constat/VehicleDiagram').then(m => ({ default: m.VehicleDiagram })));
const SignaturePad = React.lazy(() => import('../components/constat/SignaturePad').then(m => ({ default: m.SignaturePad })));

// ── Loading fallback component ───────────────────────────────────
function LazyLoading() {
  return <div className="flex items-center justify-center p-10"><div className="rounded-full w-6 h-6"  style={{ border: '2px solid rgba(255,255,255,0.25)', borderTopColor: 'var(--boom, #FF3500)', animation: 'spin 0.8s linear infinite' }} /></div>;
}

type FlowStep = 'landing' | 'ocr' | 'location' | 'photos' | 'form' | 'voice' | 'sketch' | 'diagram' | 'sign' | 'done';

const STORAGE_KEY = 'boom_flow_b';

const savedStateBSchema = z.object({
  sessionId: z.string().optional(),
  tokenB: z.string().optional(),
  step: z.string().optional(),
  joined: z.boolean().optional(),
  participantData: z.record(z.unknown()).optional(),
  damagedZones: z.array(z.string()).optional(),
  photos: z.array(z.unknown()).optional(),
  lang: z.string().optional(),
  ts: z.number().optional(),
}).passthrough();

function loadState(sessionId: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const result = savedStateBSchema.safeParse(parsed);
    if (!result.success) {
      console.warn('JoinSession: invalid localStorage data, clearing', result.error.issues);
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const data = result.data;
    // Only restore if same session and less than 2h old
    if (data.sessionId !== sessionId) { localStorage.removeItem(STORAGE_KEY); return null; }
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



interface JoinSessionProps {
  authUser?: { id: string; email: string; role: string; credits: number } | null;
  authToken?: string;
  onLogin?: () => void;
  onBuyPack?: () => void;
}

export function JoinSession({ authUser, authToken, onLogin, onBuyPack }: JoinSessionProps = {}) {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session') || '';
  const urlRole = (params.get('role') || 'B').toUpperCase() as ParticipantRole;
  const urlTokenB = params.get('tokenB') || '';
  const saved = loadState(sessionId);

  const { i18n } = useTranslation();
  const [selectedLang, setSelectedLang] = useState<string>(() => {
    return saved?.lang || localStorage.getItem('boom_lang') || navigator.language?.split('-')[0] || 'fr';
  });
  // participantToken for driver B — from QR URL or localStorage
  const [tokenB, setTokenB] = useState<string>(urlTokenB || saved?.tokenB || '');
  const [step, setStepRaw] = useState<FlowStep>(saved?.step || 'landing');
  const [joined, setJoined] = useState(saved?.joined || false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participantData, setParticipantData] = useState<Partial<ParticipantData>>(
    saved?.participantData || { role: urlRole, language: navigator.language?.split('-')[0] || 'fr' }
  );
  // Données accident de driver A — pré-remplissage pour driver B
  const [sessionAccidentData, setSessionAccidentData] = useState<any>(null);
  const [damagedZones, setDamagedZones] = useState<string[]>(saved?.damagedZones || []);
  const [photos, setPhotos] = useState<ScenePhoto[]>(saved?.photos || []);
  const [sketchImage, setSketchImage] = useState<string>(saved?.sketchImage || '');
  const [voiceTranscript, setVoiceTranscript] = useState<string>(saved?.voiceTranscript || '');
  const [otherSigned, setOtherSigned] = useState(false);
  const [vehicleAPosition, setVehicleAPosition] = useState<{ x: number; y: number; angle: number; lat: number; lng: number } | null>(null);



  const setStep = (s: FlowStep) => {
    setStepRaw(s);
    if (s === 'done') localStorage.removeItem(STORAGE_KEY);
  };

  const PREV_B: Partial<Record<FlowStep, FlowStep>> = {
    ocr:'landing', photos:'ocr',
    form:'photos', voice:'form', sketch:'voice', diagram:'sketch', sign:'diagram',
  };
  const goBack = () => { const p = PREV_B[step]; if (p) setStep(p); };
  const canGoBack = !!PREV_B[step] && step !== 'done' && step !== 'landing';

  // Persist state
  useEffect(() => {
    if (step === 'done' || step === 'landing') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      step, sessionId, tokenB, joined, participantData, damagedZones, photos, sketchImage, voiceTranscript, ts: Date.now(),
    }));
  }, [step, joined, participantData, damagedZones, photos, voiceTranscript]);

  const STEPS: { id: FlowStep; icon: string; label: string }[] = [
    { id: 'ocr',     icon: '📄', label: 'Scan' },
    { id: 'photos',  icon: '📸', label: 'Photos' },
    { id: 'form',    icon: '📋', label: 'Infos' },
    { id: 'voice',   icon: '🎙️', label: 'Vocal' },
    { id: 'sketch',  icon: '🗺️', label: 'Croquis' },
    { id: 'diagram', icon: '🚗', label: 'Choc' },
    { id: 'sign',    icon: '✍️', label: 'Sign' },
  ];
  const currentStepIdx = STEPS.findIndex(s => s.id === step);

  // Charger les données de la session (accident data de driver A)
  const sessionQuery = trpc.session.get.useQuery(
    { sessionId, participantToken: tokenB },
    {
      enabled: joined && !!sessionId && !!tokenB,
      onSuccess: (data: Record<string, unknown>) => {
        if (data?.accident) {
          const acc = data.accident;
          const loc = acc.location || {};
          setSessionAccidentData({
            date:       acc.date,
            time:       acc.time,
            address:    loc.address,
            city:       loc.city,
            country:    loc.country,
            lat:        loc.lat,
            lng:        loc.lng,
            vehicleAPos: acc.vehicleAPos || null, // position véhicule A sur la carte
          });
        }
      },
    }
  );

  const joinMutation = trpc.session.join.useMutation({
    onSuccess: () => {
      setJoined(true);
      setJoining(false);
      setTimeout(() => setStep('ocr'), 600);
    },
    onError: (err) => {
      setError(err.message || 'Session introuvable ou expirée.');
      setJoining(false);
    },
  });







  const handleLangChange = (lang: string) => {
    setSelectedLang(lang);
    applyLang(lang as SupportedLang);
  };

  const join = () => {
    if (!sessionId || joining) return;
    setJoining(true);
    setError(null);
    joinMutation.mutate({ sessionId, tokenB, language: selectedLang });
  };


  function ocrCategoryToType(cat?: string): string | null {
    if (!cat) return null;
    const c = cat.toLowerCase();
    if (c.includes('tourisme')||c.includes('automobile')||c.includes('personenwagen')||
        c.includes('voiture')||c.includes('car')||c.includes('pkw')||c.includes('break')||
        c==='a'||c==='1') return 'car';
    if (c.includes('moto')||c.includes('motorcycle')) return 'motorcycle';
    if (c.includes('scooter')||c.includes('cyclom')) return 'scooter';
    if (c.includes('camion')||c.includes('truck')||c.includes('lkw')) return 'truck';
    if (c.includes('fourgon')||c.includes('van')) return 'van';
    return null;
  }

  const handleOCRComplete = (result: { registration: OCRResult; greenCard: OCRResult }) => {
    const cat = (result.registration.vehicle as any)?.category;
    const detectedType = ocrCategoryToType(cat);
    setParticipantData(prev => ({
      ...prev,
      vehicle: {
        ...(result.registration.vehicle ?? {}),
        vehicleType: detectedType ?? prev.vehicle?.vehicleType,
      },
      driver:    result.registration.driver    ?? {},
      insurance: result.greenCard?.insurance   ?? result.registration.insurance ?? {},
    }));
    // Sauter la localisation — B utilise la même que A (déjà dans sessionAccidentData)
    setStep('photos');

    const vB = result.registration?.vehicle as any;
    const bData = {
      color: vB?.color, type: detectedType || 'car',
      brand: vB?.brand, model: vB?.model,
    };
    window.__boomVehicleB = bData;

    // Sauvegarder dans la session
    if (sessionId) {
      updateMutation.mutate({
        sessionId,
        role: urlRole,
        participantToken: tokenB,
        data: { vehicle: { ...vB, vehicleType: detectedType, vehicleData: bData } } as any,
      });
    }
  };

  const handleLocationComplete = (data: Record<string, unknown>) => {
    const { vehicleType: vt } = data;
    setParticipantData(prev => ({ ...prev, vehicle: { ...prev.vehicle, vehicleType: vt } }));
    setStep('photos');
  };

  const handlePhotosContinue = () => {
    setStep('form');
  };

  const updateAccidentMutationB = trpc.session.updateAccident.useMutation({
    onError: (err) => console.error('updateAccident B failed:', err.message),
  });

  const handleFormSave = async (data: Partial<ParticipantData>, accident?: Partial<AccidentData>) => {
    setParticipantData({ ...data, damagedZones });
    if (sessionId) {
      updateMutation.mutate({ sessionId, role: urlRole, participantToken: tokenB, data });
      if (accident && Object.keys(accident).length > 0) {
        updateAccidentMutationB.mutate({ sessionId, participantToken: tokenB, data: accident });
      }
    }
    setStep('voice');
  };

  const handleSketchDoneB = (base64: string) => {
    setSketchImage(base64);
    // B ne réécrit pas le croquis si A l'a déjà fait — on laisse A référent
    setStep('diagram');
  };

  const handleDiagramDone = async () => {
    if (sessionId) {
      updateMutation.mutate({ sessionId, role: urlRole, participantToken: tokenB, data: { damagedZones } });
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
      } else {
        setStep('done');
      }
    },
    onError: (err) => console.error('session.sign failed:', err.message),
  });

  const handleSign = (signatureBase64: string) => {
    if (sessionId) signMutation.mutate({ sessionId, role: urlRole, participantToken: tokenB, signatureBase64 });
  };

  // ── LANDING ──────────────────────────────────────────────
  if (step === 'landing') return (
    <div className="mx-auto min-h-[100svh] flex flex-col justify-center max-w-[420px] px-6 py-8">

      {/* Animated header */}
      <div className="text-center mb-9" >
        <img src="/logo.webp" alt="boom.contact" loading="lazy" className="object-contain mb-4 w-[100px] h-[100px] inline-block"  style={{ animation: joined ? 'bounceIn 0.5s ease' : 'explosion 0.7s cubic-bezier(0.175,0.885,0.32,1.275) forwards' }} />
        <h1 className="text-[32px] mb-2 tracking-[-0.5px]" style={{ fontFamily: 'Oswald, sans-serif' }}>
          <span style={{ color: 'var(--boom)' }}>boom</span>
          <span className="opacity-70">.</span>
          <span>contact</span>
        </h1>
        <p className="text-sm opacity-75 leading-[1.65]">
          Vous avez été invité à rejoindre un constat d'accident partagé.
        </p>
      </div>

      {/* Session badge */}
      {sessionId && (
        <div className="rounded-xl text-center mb-6 px-5 py-4" style={{ background: 'rgba(255,53,0,0.08)', border: '1px solid rgba(255,53,0,0.2)' }}>
          <div className="text-[10px] uppercase mb-1.5 opacity-70 tracking-[2px]" style={{ fontFamily: 'DM Mono, monospace' }}>Session</div>
          <div className="text-xl font-bold tracking-[2px]" style={{ fontFamily: 'DM Mono, monospace', color: 'var(--boom)' }}>{sessionId}</div>
        </div>
      )}

      {!sessionId && (
        <div className="p-4 rounded-xl text-red-500 text-sm text-center mb-6" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
          ⚠️ Lien invalide. Scannez à nouveau le QR code.
        </div>
      )}

      {/* What to expect */}
      <div className="mb-6">
        {[
          { icon: '📄', text: 'Vous scannez vos documents (2 photos)' },
          { icon: '📋', text: 'Vous remplissez vos infos sur votre téléphone' },
          { icon: '🚗', text: 'Vous indiquez les dégâts sur votre véhicule' },
          { icon: '✍️', text: 'Vous signez — PDF envoyé à votre assureur' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3" style={{ padding: '10px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
            <span className="text-xl shrink-0">{item.icon}</span>
            <span className="text-[13px] opacity-70" >{item.text}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-[10px] text-[13px] text-red-500 mb-3.5"  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <div className="font-bold mb-1.5">⚠️ {error}</div>
          {(error.includes('introuvable') || error.includes('expir') || error.includes('not found')) && (
            <div className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Le lien QR n'est valable que 7 jours. Demandez au Conducteur A de vous envoyer un nouveau QR code.
            </div>
          )}
        </div>
      )}

      {/* Sélecteur de langue — chaque conducteur choisit sa propre langue */}
      <div className="mb-5">
        <div className="text-[11px] uppercase mb-2.5 text-center opacity-70 tracking-[1px]" style={{ fontFamily: 'DM Mono, monospace' }}>
          Votre langue / Your language / Ihre Sprache / La tua lingua
        </div>
        <div className="flex justify-center gap-2">
          {getLangOrder(sessionStorage.getItem('boom_detected_country')).map(lang => {
            const isActive = lang === selectedLang;
            return (
              <button
                key={lang}
                onClick={() => handleLangChange(lang)}
                title={LANG_META[lang].label}
                className="flex flex-col items-center gap-1 rounded-[10px] cursor-pointer text-2xl min-w-[60px] min-h-[60px] px-3 py-2.5 touch-manipulation" style={{ border: isActive ? '2px solid var(--boom)' : '1.5px solid rgba(255,255,255,0.12)', background: isActive ? 'rgba(255,53,0,0.1)' : 'rgba(255,255,255,0.04)', WebkitTapHighlightColor: 'transparent', transition: 'all 0.15s' }}
              >
                <span>{LANG_META[lang].flag}</span>
                <span className="text-[10px]" style={{ fontWeight: isActive ? 700 : 400, color: isActive ? 'var(--boom)' : 'rgba(255,255,255,0.5)' }}>
                  {LANG_META[lang].label.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Email conducteur B */}
      <div className="mb-4">
        <div className="text-xs font-semibold mb-2 flex items-center gap-1.5 opacity-70" >
          📧 Votre email
          <span className="font-normal opacity-70" >(pour recevoir le PDF)</span>
        </div>
        <input
          type="email"
          inputMode="email"
          autoCapitalize="none"
          autoComplete="email"
          value={participantData.driver?.email || ''}
          onChange={e => {
            setParticipantData(prev => ({ ...prev, driver: { ...(prev.driver || {}), email: e.target.value } as any }));
          }}
          placeholder="votre@email.com"
          aria-label="Votre adresse email"
          className="w-full rounded-[10px] px-3.5 py-[13px] box-border text-[15px]" style={{ border: '1.5px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', fontFamily: 'inherit' }}
        />
        <div className="text-[11px] opacity-70 mt-1.5" >
          Optionnel — le PDF vous sera envoyé automatiquement après signature
        </div>
      </div>

      <button onClick={join} disabled={joining || !sessionId} className="w-full p-[18px] rounded-xl border-0 text-white text-base font-bold transition-all duration-200 flex items-center justify-center gap-3" style={{ background: joining || !sessionId ? 'rgba(255,53,0,0.4)' : 'var(--boom)', cursor: joining || !sessionId ? 'not-allowed' : 'pointer', boxShadow: '0 8px 32px rgba(255,53,0,0.35)' }}>
        {joining ? (
          <><span className="text-xl inline-block"  style={{ animation: 'spin 1s linear infinite' }}>⏳</span> Connexion…</>
        ) : joined ? (
          <><span>🤝</span> Connecté ! Démarrage…</>
        ) : (
          <><span className="text-xl">🤝</span> Rejoindre le constat</>
        )}
      </button>

      <p className="text-center mt-2.5 text-[11px] opacity-70 tracking-[1px]" style={{ fontFamily: 'DM Mono, monospace' }}>
        GRATUIT · SANS INSCRIPTION · CHIFFRÉ
      </p>
    </div>
  );

  // ── OCR → FORM → DIAGRAM → SIGN → DONE ─────────────────
  return (
    <div className="mx-auto min-h-[100svh] flex flex-col max-w-[420px]">
      {/* Header */}
      <div className="flex items-center gap-3 shrink-0 px-5 py-3.5" style={{ borderBottom: '1px solid rgba(240,237,232,0.06)' }}>
        <div className="shrink-0 w-9 h-9" >
          <img src="/logo.webp" alt="boom.contact" loading="lazy" className="w-full h-full object-contain" />
        </div>
        <div>
          <div className="font-bold text-sm">boom.contact</div>
          <div className="text-[10px] opacity-70 tracking-[1px]" style={{ fontFamily: 'DM Mono, monospace' }}>
            CONDUCTEUR {urlRole} · SESSION {sessionId}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {canGoBack && (
            <button onClick={goBack} className="flex items-center gap-1 rounded-lg cursor-pointer text-[13px] font-semibold px-3 py-1.5 touch-manipulation" style={{ border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', WebkitTapHighlightColor: 'transparent' }}>← Retour</button>
          )}
        </div>
      </div>

      {step !== 'done' && (
        <StepIndicator
          steps={STEPS}
          currentIndex={currentStepIdx}
          onStepClick={(stepId) => {
            const targetIdx = STEPS.findIndex(s => s.id === stepId);
            if (targetIdx < currentStepIdx) setStep(stepId as FlowStep);
          }}
        />
      )}

      <Suspense fallback={<LazyLoading />}>
      <div role="tabpanel" id={`tabpanel-${step}`} aria-labelledby={`tab-${step}`} className="flex-1 overflow-y-auto">
        {/* Location supprimée pour B — utilise automatiquement celle de A */}

        {step === 'photos' && (
          <PhotoCapture
            photos={photos}
            onChange={setPhotos}
            onContinue={handlePhotosContinue}
          />
        )}

        {step === 'ocr' && (
          <OCRScanner role="B" onComplete={handleOCRComplete} onSkip={() => setStep('photos')} sessionId={sessionId} participantToken={tokenB} />
        )}

        {step === 'form' && (
          <ConstatForm role="B" prefilled={participantData} accidentData={{}} onSave={handleFormSave} sessionId={sessionId} language={participantData.language} />
        )}

        {step === 'voice' && sessionId && (
          <VoiceSketchFlow
            role={urlRole as 'A' | 'B' | 'C' | 'D' | 'E'}
            sessionId={sessionId}
            lang={participantData.language}
            initialTranscript={voiceTranscript}
            onComplete={(data) => {
              setVoiceTranscript(data.transcript || '');
              setSketchImage(data.sketchBase64);
              if (data.analysis?.circumstances?.length > 0) {
                setParticipantData(prev => ({
                  ...prev,
                  circumstances: data.analysis.circumstances,
                }));
              }
              setStep('sketch');
            }}
            onSkip={() => setStep('sketch')}
          />
        )}

        {step === 'sketch' && (
          <MapVehiclePlacer
            required={false}
            role="B"
            sessionId={sessionId}
            accidentLat={sessionAccidentData?.lat}
            accidentLng={sessionAccidentData?.lng}
            accidentAddress={sessionAccidentData?.address || sessionAccidentData?.city}
            accidentCity={sessionAccidentData?.city}
            vehicleColor={participantData.vehicle?.color}
            vehicleType={participantData.vehicle?.vehicleType}
            brand={participantData.vehicle?.brand}
            existingVehicles={
              // Position de A : depuis window (si même appareil) ou depuis la session
              window.__boomVehicleAPos
                ? [{ role: 'A', pos: window.__boomVehicleAPos }]
                : sessionAccidentData?.vehicleAPos
                  ? [{ role: 'A', pos: sessionAccidentData.vehicleAPos }]
                  : []
            }
            onComplete={(vehiclePos, mapImageB64) => {
              setSketchImage(mapImageB64);
              if (sessionId) {
                updateMutation.mutate({
                  sessionId, role: urlRole, participantToken: tokenB,
                  data: { vehicle: { ...participantData.vehicle, mapPosition: vehiclePos } } as any,
                });
              }
              handleSketchDoneB(mapImageB64);
            }}
            onSkip={() => handleSketchDoneB('')}
          />
        )}

        {step === 'diagram' && (
          <div>
            <VehicleDiagram
                  role="B"
                  vehicleType={participantData.vehicle?.vehicleType}
                  brand={participantData.vehicle?.brand}
                  model={participantData.vehicle?.model}
                  color={participantData.vehicle?.color}
                  selected={damagedZones}
                  onChange={setDamagedZones}
                />
            <div style={{ padding: '0 20px 20px' }}>
              <button onClick={handleDiagramDone} className="w-full rounded-[10px] border-0 text-white cursor-pointer text-[15px] font-bold p-4"  style={{ background: 'var(--boom)' }}>
                Continuer → Signature
              </button>
            </div>
          </div>
        )}

        {step === 'sign' && (
          <>
            {/* Résumé avant signature B */}
            <div style={{ padding: '16px 20px 0' }}>
              <div className="text-[11px] font-bold uppercase mb-3 opacity-70 tracking-[2px]" style={{ fontFamily: 'monospace' }}>
                Vérifiez avant de signer
              </div>
              <div className="mb-2.5 rounded-[10px] px-3.5 py-3" style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.12)' }}>
                <div className="text-[11px] mb-1.5 font-semibold opacity-75">🚗 Votre véhicule</div>
                <div className="text-[13px] font-bold">
                  {[participantData.vehicle?.brand, participantData.vehicle?.model].filter(Boolean).join(' ') || '—'}
                  {participantData.vehicle?.licensePlate && <span className="ml-2 text-[#00E5FF]" style={{ fontFamily: 'monospace' }}>{(participantData.vehicle as any).licensePlate}</span>}
                </div>
                {participantData.insurance?.company && (
                  <div className="text-xs mt-[3px] opacity-75">🛡️ {participantData.insurance.company}</div>
                )}
                {participantData.driver?.firstName && (
                  <div className="text-xs mt-0.5 opacity-75">👤 {[participantData.driver.firstName, participantData.driver.lastName].filter(Boolean).join(' ')}</div>
                )}
              </div>
              <button
                onClick={() => setStep('form')}
                className="w-full rounded-lg bg-transparent cursor-pointer text-xs mb-2 p-2.5"  style={{ border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.4)' }}
              >
                ✏️ Corriger mes informations
              </button>
            </div>
            <SignaturePad role="B" onSign={handleSign} otherSigned={otherSigned} />
          </>
        )}

        {step === 'done' && (
          <PDFDownload
            sessionId={sessionId}
            role="B"
            participantToken={tokenB}
            driverEmail={participantData.driver?.email}
            insurerName={participantData.insurance?.company || participantData.insurance?.companyName}
            driverName={[participantData.driver?.firstName, participantData.driver?.lastName].filter(Boolean).join(' ')}
            authUser={authUser}
            authToken={authToken}
            onLogin={onLogin || (() => {})}
            onBuyPack={onBuyPack || (() => {})}
          />
        )}
      </div>
      </Suspense>
    </div>
  );
}
