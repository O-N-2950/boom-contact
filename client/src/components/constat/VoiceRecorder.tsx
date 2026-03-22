// client/src/components/constat/VoiceRecorder.tsx
// Enregistrement vocal réel + transcription Whisper (99 langues)
// Utilisé par conducteur A, B, C, D — chacun déclare sa version des faits

import { useState, useRef, useEffect } from 'react';
import { trpc } from '../../trpc';

interface Props {
  role: 'A' | 'B' | 'C' | 'D' | 'E';
  sessionId: string;
  lang?: string; // langue détectée (hint pour Whisper)
  onComplete?: (transcript: string, audioBase64: string) => void;
}

type RecordState = 'idle' | 'recording' | 'recorded' | 'transcribing' | 'done' | 'error';

const MAX_DURATION_SEC = 180; // 3 minutes max

export function VoiceRecorder({ role, sessionId, lang, onComplete }: Props) {
  const [state, setState]           = useState<RecordState>('idle');
  const [elapsed, setElapsed]       = useState(0);
  const [transcript, setTranscript] = useState('');
  const [audioBase64, setAudioBase64] = useState('');
  const [error, setError]           = useState('');
  const [isEditing, setIsEditing]   = useState(false);

  const mediaRecorderRef  = useRef<MediaRecorder | null>(null);
  const chunksRef          = useRef<Blob[]>([]);
  const timerRef           = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef          = useRef<MediaStream | null>(null);

  // Nettoyage à la fin
  useEffect(() => {
    return () => {
      if (timerRef.current)  clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const transcribeMutation = trpc.voice.transcribe.useMutation({
    onSuccess: (data) => {
      setTranscript(data.text);
      setState('done');
      onComplete?.(data.text, audioBase64);
    },
    onError: (err) => {
      setError(err.message || 'Transcription échouée');
      setState('error');
    },
  });

  const startRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Choisir le meilleur format supporté
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          const b64 = (reader.result as string).split(',')[1];
          setAudioBase64(b64);
          setState('recorded');
        };
        reader.readAsDataURL(blob);
      };

      recorder.start(1000); // Chunks d'1 seconde
      setState('recording');
      setElapsed(0);

      // Timer
      timerRef.current = setInterval(() => {
        setElapsed(prev => {
          if (prev >= MAX_DURATION_SEC - 1) {
            stopRecording();
            return MAX_DURATION_SEC;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Micro non accessible';
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        setError('Accès au microphone refusé. Autorisez-le dans les réglages de votre navigateur.');
      } else {
        setError(`Microphone indisponible : ${msg}`);
      }
      setState('error');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const transcribe = () => {
    setState('transcribing');
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';
    transcribeMutation.mutate({
      audioBase64,
      mimeType,
      lang,
      sessionId,
      role,
    });
  };

  const reset = () => {
    setState('idle');
    setElapsed(0);
    setTranscript('');
    setAudioBase64('');
    setError('');
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const formatTime = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  const progress = (elapsed / MAX_DURATION_SEC) * 100;

  const roleLabel = { A: 'Conducteur A', B: 'Conducteur B', C: 'Conducteur C', D: 'Conducteur D', E: 'Conducteur E' }[role];
  const roleColor = { A: '#3B82F6', B: '#FF6B00', C: '#22C55E', D: '#A855F7', E: '#EC4899' }[role];

  return (
    <div style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${roleColor}20`, border: `2px solid ${roleColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: roleColor }}>
          {role}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{roleLabel} — Déclaration</div>
          <div style={{ fontSize: 11, opacity: 0.4 }}>Version des faits selon {roleLabel.toLowerCase()}</div>
        </div>
        {state === 'done' && (
          <button onClick={reset} style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', cursor: 'pointer', fontSize: 11, color: 'rgba(255,255,255,0.4)', touchAction: 'manipulation' }}>
            Refaire
          </button>
        )}
      </div>

      <div style={{ padding: 16 }}>

        {/* IDLE */}
        {state === 'idle' && (
          <>
            <p style={{ fontSize: 13, opacity: 0.55, marginBottom: 16, lineHeight: 1.6 }}>
              Expliquez brièvement comment s&apos;est produit l&apos;accident selon vous. Parlez naturellement dans votre langue — l&apos;application transcrit automatiquement.
            </p>
            <button onClick={startRecording}
              style={{ width: '100%', padding: '16px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${roleColor}cc, ${roleColor})`, color: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}>
              <span style={{ fontSize: 22 }}>🎙️</span> Enregistrer ma déclaration
            </button>
            <div style={{ marginTop: 10, fontSize: 11, opacity: 0.3, textAlign: 'center' }}>
              Max 3 minutes · 99 langues · Consentement: l&apos;enregistrement sera transcrit et intégré au PDF
            </div>
          </>
        )}

        {/* RECORDING */}
        {state === 'recording' && (
          <>
            {/* Visualisation */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: '3px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, animation: 'pulse 1s ease infinite' }}>
                  🎙️
                </div>
                <div style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', background: '#ef4444', animation: 'blink 1s ease infinite' }} />
              </div>
              <div style={{ marginTop: 12, fontSize: 16, fontWeight: 700, color: '#ef4444' }}>{formatTime(elapsed)}</div>
              <div style={{ fontSize: 12, opacity: 0.5 }}>Enregistrement en cours…</div>
            </div>

            {/* Barre de progression */}
            <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', marginBottom: 16, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 2, background: '#ef4444', width: `${progress}%`, transition: 'width 1s linear' }} />
            </div>
            {elapsed > MAX_DURATION_SEC - 30 && (
              <div style={{ textAlign: 'center', fontSize: 12, color: '#f59e0b', marginBottom: 10 }}>
                ⚠️ {MAX_DURATION_SEC - elapsed}s restantes
              </div>
            )}

            <button onClick={stopRecording}
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: '2px solid #ef4444', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', fontSize: 15, fontWeight: 700, touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}>
              ⏹ Arrêter l&apos;enregistrement
            </button>
            <style>{`
              @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
              @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
            `}</style>
          </>
        )}

        {/* RECORDED — prêt à transcrire */}
        {state === 'recorded' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Enregistrement terminé</div>
              <div style={{ fontSize: 13, opacity: 0.5 }}>{formatTime(elapsed)} enregistré</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={reset}
                style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 14, touchAction: 'manipulation' }}>
                Recommencer
              </button>
              <button onClick={transcribe}
                style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: roleColor, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700, touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}>
                🔤 Transcrire →
              </button>
            </div>
          </>
        )}

        {/* TRANSCRIBING */}
        {state === 'transcribing' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12, display: 'inline-block', animation: 'spin 1.5s linear infinite' }}>🔄</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Transcription en cours…</div>
            <div style={{ fontSize: 12, opacity: 0.4 }}>OpenAI Whisper · Détection automatique de la langue</div>
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* DONE */}
        {state === 'done' && transcript && (
          <>
            <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', fontSize: 12, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 8 }}>
              ✅ Transcription automatique — vérifiez et corrigez si nécessaire
            </div>
            {isEditing ? (
              <textarea
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                onBlur={() => { setIsEditing(false); onComplete?.(transcript, audioBase64); }}
                autoFocus
                rows={5}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${roleColor}66`, background: 'rgba(255,255,255,0.05)', color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
              />
            ) : (
              <div
                onClick={() => setIsEditing(true)}
                style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 14, lineHeight: 1.7, cursor: 'text', minHeight: 80, color: 'var(--text)' }}
              >
                {transcript}
              </div>
            )}
            <div style={{ fontSize: 11, opacity: 0.3, marginTop: 6, textAlign: 'right' }}>
              Tapez pour modifier · Intégré au PDF du constat
            </div>
          </>
        )}

        {/* ERROR */}
        {state === 'error' && (
          <>
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13, marginBottom: 14 }}>
              ⚠️ {error}
            </div>
            <button onClick={reset}
              style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 14, touchAction: 'manipulation' }}>
              Réessayer
            </button>
          </>
        )}
      </div>
    </div>
  );
}
