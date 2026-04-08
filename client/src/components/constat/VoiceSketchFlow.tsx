// client/src/components/constat/VoiceSketchFlow.tsx
// v3 — Description vocale uniquement → transcript sauvegardé dans le constat
// Suppression du croquis IA automatique (remplacé par la carte MapVehiclePlacer)

import React, { useState, useRef, useEffect } from 'react';
import { trpc } from '../../trpc';

type FlowState = 'intro' | 'recording' | 'transcribing' | 'done';
type InputMode = 'voice' | 'text';

interface Props {
  role: 'A' | 'B' | 'C' | 'D' | 'E';
  sessionId: string;
  lang?: string;
  initialTranscript?: string;  // restored from localStorage on back navigation
  preloadedAnalysis?: Record<string, unknown>;
  vehicleAData?: Record<string, unknown>;
  vehicleBData?: Record<string, unknown>;
  vehicleCData?: Record<string, unknown>;
  vehicleDData?: Record<string, unknown>;
  onComplete: (data: {
    transcript: string;
    analysis: Record<string, unknown>;
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

export const VoiceSketchFlow = React.memo(function VoiceSketchFlow({ role, sessionId, lang, initialTranscript = '', onComplete, onSkip }: Props) {
  const [flowState, setFlowState] = useState<FlowState>(initialTranscript ? 'done' : 'intro');
  const [inputMode, setInputMode] = useState<InputMode>('voice');
  const [manualText, setManualText] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState(initialTranscript);
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
      analysis: { circumstances, confidence: 1 },  // vehicleCount NOT set here — managed by QR step
      sketchBase64: '',
    });
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const roleColor = { A: '#3B82F6', B: '#FF6B00', C: '#22C55E', D: '#A855F7', E: '#EC4899' }[role] || '#fff';

  const btnPrimary: React.CSSProperties = {
    width: '100%', padding: '16px', borderRadius: 12, border: 'none',
    background: `linear-gradient(135deg, ${roleColor}dd, ${roleColor})`,
    color: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 700,
    touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as string,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  };

  // ── INTRO ──────────────────────────────────────────────────────
  if (flowState === 'intro') return (
    <div className="p-6">
      <div className="text-center mb-6">
        <div className="mb-2.5" style={{ fontSize: 52 }}>🎙️</div>
        <h2 className="text-xl font-extrabold mb-2">
          Décrivez l&apos;accident
        </h2>
        <p className="text-[13px] mx-auto" style={{ opacity: 0.75, lineHeight: 1.65, maxWidth: 320 }}>
          Optionnel — décrivez ce qui s&apos;est passé avec vos propres mots.
          Votre déclaration sera enregistrée dans le constat.
        </p>
      </div>

      {/* Mode selector */}
      <div className="flex mb-5 rounded-[10px] overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.25)' }}>
        <button onClick={() => setInputMode('voice')} style={{
          flex: 1, padding: '10px 0', background: inputMode === 'voice' ? `${roleColor}22` : 'transparent',
          border: 'none', cursor: 'pointer', color: inputMode === 'voice' ? roleColor : 'rgba(255,255,255,0.4)',
          fontSize: 13, fontWeight: 700, borderRight: '1px solid rgba(255,255,255,0.25)',
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
            <div className="rounded-[10px] p-3 mb-4 text-[13px] text-red-500" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
              {error}
            </div>
          )}
          <button onClick={startRecording} style={btnPrimary}>
            <span className="text-[22px]">🎙️</span>
            Commencer l&apos;enregistrement
          </button>
        </>
      ) : (
        <>
          <textarea
            aria-label="Description de l'accident"
            value={manualText}
            onChange={e => setManualText(e.target.value)}
            placeholder="Décrivez l'accident en quelques phrases…"
            rows={5}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 12, color: '#fff', fontSize: 14, padding: 14,
              boxSizing: 'border-box' as const, resize: 'vertical', lineHeight: 1.6,
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
        border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 13,
      }}>
        Passer cette étape →
      </button>
    </div>
  );

  // ── RECORDING ──────────────────────────────────────────────────
  if (flowState === 'recording') return (
    <div className="p-6 text-center">
      <div className="mb-3" style={{ fontSize: 60, animation: 'pulse-red 1s infinite' }}>🔴</div>
      <div className="text-[22px] font-extrabold mb-1" style={{ color: roleColor }}>
        {fmt(elapsed)}
      </div>
      <div className="text-[13px] mb-8" style={{ opacity: 0.75 }}>Enregistrement en cours…</div>
      <div className="rounded-xl p-4 mb-6 text-[13px] leading-relaxed text-left" style={{ background: 'rgba(255,255,255,0.04)', opacity: 0.75 }}>
        💡 Décrivez : la direction de chaque véhicule, le point d&apos;impact, les circonstances. Parlez calmement.
      </div>
      <button onClick={stopRecording} className="bg-red-500">
        <span className="text-lg">⏹️</span>
        Arrêter l&apos;enregistrement
      </button>
    </div>
  );

  // ── TRANSCRIBING ───────────────────────────────────────────────
  if (flowState === 'transcribing') return (
    <div className="p-6 text-center">
      <div className="text-5xl mb-4">⏳</div>
      <div className="text-base font-bold mb-2">Transcription en cours…</div>
      <div className="text-[13px]" style={{ opacity: 0.75 }}>Votre enregistrement est traité</div>
    </div>
  );

  // ── DONE ───────────────────────────────────────────────────────
  if (flowState === 'done') {
    const currentText = transcript || manualText;
    return (
      <div className="p-6">
        <div className="text-center mb-5">
          <div className="text-[40px] mb-2">✅</div>
          <h2 className="text-lg font-extrabold mb-1">Description enregistrée</h2>
          <p className="text-[13px]" style={{ opacity: 0.75 }}>Votre déclaration sera incluse dans le constat PDF</p>
        </div>

        {/* Transcript — éditable */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs" style={{ opacity: 0.7, letterSpacing: 1, textTransform: 'uppercase' as const }}>Votre déclaration</span>
            <button
              onClick={() => setInputMode(inputMode === 'text' ? 'voice' : 'text')}
              className="bg-transparent rounded-md cursor-pointer text-xs" style={{ border: '1px solid rgba(255,255,255,0.15)', padding: '3px 10px', color: 'rgba(255,255,255,0.5)' }}>
              ✏️ Modifier
            </button>
          </div>
          {inputMode === 'text' ? (
            <textarea
              aria-label="Récit de l'accident"
              value={manualText || transcript}
              onChange={e => { setManualText(e.target.value); setTranscript(e.target.value); }}
              rows={6}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${roleColor}66`, borderRadius: 10,
                color: '#fff', fontSize: 14, padding: 14, lineHeight: 1.65,
                resize: 'vertical' as const, fontFamily: 'inherit',
                boxSizing: 'border-box' as const,
              }}
              placeholder="Corrigez votre déclaration si nécessaire..."
              autoFocus
            />
          ) : (
            <div style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 12, padding: 16, fontSize: 14,
              fontStyle: 'italic', lineHeight: 1.65, color: 'rgba(255,255,255,0.8)',
            }}>
              &ldquo;{currentText}&rdquo;
            </div>
          )}
        </div>

        <div className="flex gap-2.5">
          <button onClick={() => { setTranscript(''); setManualText(''); setFlowState('intro'); setInputMode('voice'); }}
            className="flex-1 rounded-[10px] bg-transparent cursor-pointer text-sm" style={{ padding: '13px', border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.6)' }}>
            Recommencer
          </button>
          <button onClick={handleConfirm} style={{ ...btnPrimary, flex: 2 }}>
            Continuer →
          </button>
        </div>
      </div>
    );
  }

  return null;
});
