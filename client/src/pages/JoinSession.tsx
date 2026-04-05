import { LocationStep } from '../components/constat/LocationStep';
import { PhotoCapture } from '../components/constat/PhotoCapture';
import { MapVehiclePlacer } from '../components/constat/MapVehiclePlacer';
import { VoiceSketchFlow } from '../components/constat/VoiceSketchFlow';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGS, LANG_META, applyLang, getLangOrder } from '../i18n';
import type { SupportedLang } from '../i18n';
import { trpc } from '../trpc';
import { OCRScanner } from '../components/constat/OCRScanner';
import { ConstatForm } from '../components/constat/ConstatForm';
import { VehicleDiagram } from '../components/constat/VehicleDiagram';
import { SignaturePad } from '../components/constat/SignaturePad';
import { StepIndicator } from '../components/constat/StepIndicator';
import { PDFDownload } from '../components/constat/PDFDownload';
import type { OCRResult, ParticipantData, ScenePhoto, AccidentData, ParticipantRole } from '../../../shared/types';

type FlowStep = 'landing' | 'ocr' | 'location' | 'photos' | 'form' | 'voice' | 'sketch' | 'diagram' | 'sign' | 'done';

const STORAGE_KEY = 'boom_flow_b';

function loadState(sessionId: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Only restore if same session and less than 2h old
    if (data.sessionId !== sessionId) { localStorage.removeItem(STORAGE_KEY); return null; }
    if (data.ts && Date.now() - data.ts > 2 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}


function ocrCategoryToVehicleType(category?: string): any {
  if (!category) return null;
  const c = category.toLowerCase();
  if (c.includes('tourisme') || c.includes('automobile') || c.includes('personenwagen') ||
      c.includes('car') || c.includes('break') || c.includes('suv') || c.includes('voiture') ||
      c.includes('pkw') || c === 'a') return 'car';
  if (c.includes('moto') || c.includes('motorcycle') || c.includes('motorrad')) return 'motorcycle';
  if (c.includes('scooter') || c.includes('cyclom')) return 'scooter';
  if (c.includes('velom') || c.includes('mofa')) return 'moped';
  if (c.includes('camion') || c.includes('truck') || c.includes('lkw')) return 'truck';
  if (c.includes('fourgon') || c.includes('van') || c.includes('transporter')) return 'van';
  if (c.includes('bus') || c.includes('autocar')) return 'bus';
  return null;
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
  const saved = loadState(sessionId);

  const { i18n } = useTranslation();
  const [selectedLang, setSelectedLang] = useState<string>(() => {
    return saved?.lang || localStorage.getItem('boom_lang') || navigator.language?.split('-')[0] || 'fr';
  });
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
      step, sessionId, joined, participantData, damagedZones, photos, sketchImage, ts: Date.now(),
    }));
  }, [step, joined, participantData, damagedZones, photos]);

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
    { sessionId },
    {
      enabled: joined && !!sessionId,
      onSuccess: (data: any) => {
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
    joinMutation.mutate({ sessionId, language: selectedLang });
  };


  function ocrCategoryToType(cat?: string): any {
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
    (window as any).__boomVehicleB = bData;

    // Sauvegarder dans la session
    if (sessionId) {
      updateMutation.mutate({
        sessionId,
        role: urlRole,
        data: { vehicle: { ...vB, vehicleType: detectedType, vehicleData: bData } } as any,
      });
    }
  };

  const handleLocationComplete = (data: any) => {
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
      updateMutation.mutate({ sessionId, role: urlRole, data });
      if (accident && Object.keys(accident).length > 0) {
        updateAccidentMutationB.mutate({ sessionId, data: accident });
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
      updateMutation.mutate({ sessionId, role: urlRole, data: { damagedZones } });
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
    if (sessionId) signMutation.mutate({ sessionId, role: urlRole, signatureBase64 });
  };

  // ── LANDING ──────────────────────────────────────────────
  if (step === 'landing') return (
    <div style={{ maxWidth: 420, margin: '0 auto', minHeight: '100svh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px 24px' }}>

      {/* Animated header */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <img src="/logo.png" alt="boom.contact" style={{ width: 100, height: 100, objectFit: 'contain', marginBottom: 16, display: 'inline-block', animation: joined ? 'bounceIn 0.5s ease' : 'explosion 0.7s cubic-bezier(0.175,0.885,0.32,1.275) forwards' }} />
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
        <div style={{ marginBottom: 14, padding: 16, borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', fontSize: 13, color: '#ef4444' }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>⚠️ {error}</div>
          {(error.includes('introuvable') || error.includes('expir') || error.includes('not found')) && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
              Le lien QR n'est valable que 7 jours. Demandez au Conducteur A de vous envoyer un nouveau QR code.
            </div>
          )}
        </div>
      )}

      {/* Sélecteur de langue — chaque conducteur choisit sa propre langue */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, opacity: 0.4, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'DM Mono, monospace', marginBottom: 10, textAlign: 'center' }}>
          Votre langue / Your language / Ihre Sprache / La tua lingua
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          {getLangOrder(sessionStorage.getItem('boom_detected_country')).map(lang => {
            const isActive = lang === selectedLang;
            return (
              <button
                key={lang}
                onClick={() => handleLangChange(lang)}
                title={LANG_META[lang].label}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  padding: '10px 12px', borderRadius: 10,
                  border: isActive ? '2px solid var(--boom)' : '1.5px solid rgba(255,255,255,0.12)',
                  background: isActive ? 'rgba(255,53,0,0.1)' : 'rgba(255,255,255,0.04)',
                  cursor: 'pointer', fontSize: 24,
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  minWidth: 60, minHeight: 60,
                  transition: 'all 0.15s',
                }}
              >
                <span>{LANG_META[lang].flag}</span>
                <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 400, color: isActive ? 'var(--boom)' : 'rgba(255,255,255,0.5)' }}>
                  {LANG_META[lang].label.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Email conducteur B */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, opacity: 0.7, display: 'flex', alignItems: 'center', gap: 6 }}>
          📧 Votre email
          <span style={{ opacity: 0.45, fontWeight: 400 }}>(pour recevoir le PDF)</span>
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
          style={{
            width: '100%', padding: '13px 14px', borderRadius: 10,
            border: '1.5px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.05)', color: 'var(--text)',
            fontSize: 15, outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit',
          }}
        />
        <div style={{ fontSize: 11, opacity: 0.35, marginTop: 6 }}>
          Optionnel — le PDF vous sera envoyé automatiquement après signature
        </div>
      </div>

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
        <div style={{ width: 36, height: 36, flexShrink: 0 }}>
          <img src="/logo.png" alt="boom.contact" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>boom.contact</div>
          <div style={{ fontSize: 10, opacity: 0.35, fontFamily: 'DM Mono, monospace', letterSpacing: 1 }}>
            CONDUCTEUR {urlRole} · SESSION {sessionId}
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

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Location supprimée pour B — utilise automatiquement celle de A */}

        {step === 'photos' && (
          <PhotoCapture
            photos={photos}
            onChange={setPhotos}
            onContinue={handlePhotosContinue}
          />
        )}

        {step === 'ocr' && (
          <OCRScanner role="B" onComplete={handleOCRComplete} onSkip={() => setStep('photos')} />
        )}

        {step === 'form' && (
          <ConstatForm role="B" prefilled={participantData} accidentData={{}} onSave={handleFormSave} sessionId={sessionId} language={participantData.language} />
        )}

        {step === 'voice' && sessionId && (
          <VoiceSketchFlow
            role={urlRole as 'A' | 'B' | 'C' | 'D' | 'E'}
            sessionId={sessionId}
            lang={participantData.language}
            onComplete={(data) => {
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
              (window as any).__boomVehicleAPos
                ? [{ role: 'A', pos: (window as any).__boomVehicleAPos }]
                : sessionAccidentData?.vehicleAPos
                  ? [{ role: 'A', pos: sessionAccidentData.vehicleAPos }]
                  : []
            }
            onComplete={(vehiclePos, mapImageB64) => {
              setSketchImage(mapImageB64);
              if (sessionId) {
                updateMutation.mutate({
                  sessionId, role: urlRole,
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
              <button onClick={handleDiagramDone} style={{ width: '100%', padding: '16px', borderRadius: 10, border: 'none', background: 'var(--boom)', color: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>
                Continuer → Signature
              </button>
            </div>
          </div>
        )}

        {step === 'sign' && (
          <>
            {/* Résumé avant signature B */}
            <div style={{ padding: '16px 20px 0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.35, fontFamily: 'monospace', marginBottom: 12 }}>
                Vérifiez avant de signer
              </div>
              <div style={{ marginBottom: 10, padding: '12px 14px', borderRadius: 10, background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.12)' }}>
                <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 6, fontWeight: 600 }}>🚗 Votre véhicule</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  {[participantData.vehicle?.brand, participantData.vehicle?.model].filter(Boolean).join(' ') || '—'}
                  {participantData.vehicle?.licensePlate && <span style={{ fontFamily: 'monospace', color: '#00E5FF', marginLeft: 8 }}>{(participantData.vehicle as any).licensePlate}</span>}
                </div>
                {(participantData.insurance as any)?.company && (
                  <div style={{ fontSize: 12, opacity: 0.55, marginTop: 3 }}>🛡️ {(participantData.insurance as any).company}</div>
                )}
                {participantData.driver?.firstName && (
                  <div style={{ fontSize: 12, opacity: 0.55, marginTop: 2 }}>👤 {[participantData.driver.firstName, participantData.driver.lastName].filter(Boolean).join(' ')}</div>
                )}
              </div>
              <button
                onClick={() => setStep('form')}
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 12, marginBottom: 8 }}
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
            driverEmail={participantData.driver?.email}
            insurerName={(participantData.insurance as any)?.company || (participantData.insurance as any)?.companyName}
            driverName={[participantData.driver?.firstName, participantData.driver?.lastName].filter(Boolean).join(' ')}
            authUser={authUser}
            authToken={authToken}
            onLogin={onLogin || (() => {})}
            onBuyPack={onBuyPack || (() => {})}
          />
        )}
      </div>
    </div>
  );
}
