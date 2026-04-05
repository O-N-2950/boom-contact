// client/src/components/constat/VoiceSketchFlow.tsx
// v3 — Description vocale uniquement → transcript sauvegardé dans le constat
// Suppression du croquis IA automatique (remplacé par la carte MapVehiclePlacer)

import { useState, useRef, useEffect } from 'react';
import { trpc } from '../../trpc';

type FlowState = 'intro' | 'recording' | 'transcribing' | 'done';
type InputMode = 'voice' | 'text';

interface Props {
  role: 'A' | 'B' | 'C' | 'D' | 'E';
  sessionId: string;
  lang?: string;
  preloadedAnalysis?: any;
  vehicleAData?: any;
  vehicleBData?: any;
  vehicleCData?: any;
  vehicleDData?: any;
  onComplete: (data: {
    transcript: string;
    analysis: any;
    sketchBase64: string;
  }) => void;
  onSkip: () => void;
}

const MAX_DURATION = 180;

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function VoiceSketchFlow({ role, sessionId, lang, onComplete, onSkip }: Props) {
  const [flowState, setFlowState] = useState<FlowState>('intro');
  const [inputMode, setInputMode] = useState<InputMode>('voice');
  const [manualText, setManualText] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');

  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const transcribeMut = trpc.voice.transcribe.useMutation({
    onSuccess: (data) => {
      setTranscript(data.text);
      setFlowState('done');
    },
    onError: (err) => {
      setError(err.message || 'Erreur de transcription');
      setFlowState('intro');
    },
  });

  const startRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        const b64 = await blobToBase64(blob);
        setFlowState('transcribing');
        transcribeMut.mutate({ audioBase64: b64, mimeType: mimeType || 'audio/webm', lang, sessionId, role });
      };
      recorder.start(1000);
      setFlowState('recording');
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed(p => {
          if (p >= MAX_DURATION - 1) { stopRecording(); return MAX_DURATION; }
          return p + 1;
        });
      }, 1000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(msg.includes('NotAllowed') || msg.includes('Permission')
        ? 'Accès au microphone refusé — utilisez la saisie manuelle.'
        : `Microphone indisponible : ${msg}`);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRecRef.current?.state === 'recording') mediaRecRef.current.stop();
  };

  const handleConfirm = () => {
    const text = transcript || manualText;
    // Extraire les circonstances comme tableau simple pour le constat
    const circumstances = text ? [text] : [];
    onComplete({
      transcript: text,
      analysis: { circumstances, vehicleCount: 2, confidence: 1 },
      sketchBase64: '',
    });
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const roleColor = { A: '#3B82F6', B: '#FF6B00', C: '#22C55E', D: '#A855F7', E: '#EC4899' }[role] || '#fff';

  const btnPrimary: React.CSSProperties = {
    width: '100%', padding: '16px', borderRadius: 12, border: 'none',
    background: `linear-gradient(135deg, ${roleColor}dd, ${roleColor})`,
    color: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 700,
    touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  };

  // ── INTRO ──────────────────────────────────────────────────────
  if (flowState === 'intro') return (
    <div style={{ padding: 24 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 52, marginBottom: 10 }}>🎙️</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
          Décrivez l&apos;accident
        </h2>
        <p style={{ fontSize: 13, opacity: 0.55, lineHeight: 1.65, maxWidth: 320, margin: '0 auto' }}>
          Optionnel — décrivez ce qui s&apos;est passé avec vos propres mots.
          Votre déclaration sera enregistrée dans le constat.
        </p>
      </div>

      {/* Mode selector */}
      <div style={{ display: 'flex', marginBottom: 20, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
        <button onClick={() => setInputMode('voice')} style={{
          flex: 1, padding: '10px 0', background: inputMode === 'voice' ? `${roleColor}22` : 'transparent',
          border: 'none', cursor: 'pointer', color: inputMode === 'voice' ? roleColor : 'rgba(255,255,255,0.4)',
          fontSize: 13, fontWeight: 700, borderRight: '1px solid rgba(255,255,255,0.08)',
        }}>🎙️ Vocal</button>
        <button onClick={() => setInputMode('text')} style={{
          flex: 1, padding: '10px 0', background: inputMode === 'text' ? `${roleColor}22` : 'transparent',
          border: 'none', cursor: 'pointer', color: inputMode === 'text' ? roleColor : 'rgba(255,255,255,0.4)',
          fontSize: 13, fontWeight: 700,
        }}>⌨️ Texte</button>
      </div>

      {inputMode === 'voice' ? (
        <>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, color: '#ef4444' }}>
              {error}
            </div>
          )}
          <button onClick={startRecording} style={btnPrimary}>
            <span style={{ fontSize: 22 }}>🎙️</span>
            Commencer l&apos;enregistrement
          </button>
        </>
      ) : (
        <>
          <textarea
            value={manualText}
            onChange={e => setManualText(e.target.value)}
            placeholder="Décrivez l'accident en quelques phrases…"
            rows={5}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12, color: '#fff', fontSize: 14, padding: 14,
              boxSizing: 'border-box' as const, resize: 'vertical', lineHeight: 1.6, outline: 'none',
              fontFamily: 'inherit', marginBottom: 16,
            }}
          />
          <button onClick={() => {
            setTranscript(manualText);
            setFlowState('done');
          }} disabled={!manualText.trim()} style={{ ...btnPrimary, opacity: manualText.trim() ? 1 : 0.4 }}>
            ✅ Valider ma description
          </button>
        </>
      )}

      <button onClick={onSkip} style={{
        width: '100%', marginTop: 12, padding: '12px', background: 'none',
        border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 13,
      }}>
        Passer cette étape →
      </button>
    </div>
  );

  // ── RECORDING ──────────────────────────────────────────────────
  if (flowState === 'recording') return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 60, marginBottom: 12, animation: 'pulse-red 1s infinite' }}>🔴</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4, color: roleColor }}>
        {fmt(elapsed)}
      </div>
      <div style={{ fontSize: 13, opacity: 0.5, marginBottom: 32 }}>Enregistrement en cours…</div>
      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 16, marginBottom: 24, fontSize: 13, opacity: 0.6, lineHeight: 1.6, textAlign: 'left' }}>
        💡 Décrivez : la direction de chaque véhicule, le point d&apos;impact, les circonstances. Parlez calmement.
      </div>
      <button onClick={stopRecording} style={{ ...btnPrimary, background: '#ef4444' }}>
        <span style={{ fontSize: 18 }}>⏹️</span>
        Arrêter l&apos;enregistrement
      </button>
    </div>
  );

  // ── TRANSCRIBING ───────────────────────────────────────────────
  if (flowState === 'transcribing') return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Transcription en cours…</div>
      <div style={{ fontSize: 13, opacity: 0.5 }}>Votre enregistrement est traité</div>
    </div>
  );

  // ── DONE ───────────────────────────────────────────────────────
  if (flowState === 'done') return (
    <div style={{ padding: 24 }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Description enregistrée</h2>
        <p style={{ fontSize: 13, opacity: 0.5 }}>Votre déclaration sera incluse dans le constat PDF</p>
      </div>

      {/* Transcript display */}
      <div style={{
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12, padding: 16, marginBottom: 20, fontSize: 14,
        fontStyle: 'italic', lineHeight: 1.65, color: 'rgba(255,255,255,0.8)',
      }}>
        &ldquo;{transcript || manualText}&rdquo;
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => { setTranscript(''); setManualText(''); setFlowState('intro'); }}
          style={{ flex: 1, padding: '13px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 14 }}>
          Recommencer
        </button>
        <button onClick={handleConfirm} style={{ ...btnPrimary, flex: 2 }}>
          Continuer →
        </button>
      </div>
    </div>
  );

  return null;
}
