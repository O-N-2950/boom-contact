// client/src/components/constat/VoiceRecorder.tsx
// Enregistrement vocal réel + transcription Whisper (99 langues)
// Utilisé par conducteur A, B, C, D — chacun déclare sa version des faits

import React, { useState, useRef, useEffect } from 'react';
import { trpc } from '../../trpc';

interface Props {
  role: 'A' | 'B' | 'C' | 'D' | 'E';
  sessionId: string;
  lang?: string; // langue détectée (hint pour Whisper)
  onComplete?: (transcript: string, audioBase64: string) => void;
}

type RecordState = 'idle' | 'recording' | 'recorded' | 'transcribing' | 'done' | 'error';

const MAX_DURATION_SEC = 180; // 3 minutes max

export const VoiceRecorder = React.memo(function VoiceRecorder({ role, sessionId, lang, onComplete }: Props) {
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
      if (msg.includes('Permission') || msg.includes('NotAllowed') || msg.includes('not allowed')) {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        setError(isIOS
          ? 'Microphone bloqué. Allez dans Réglages > Safari > boom.contact > Microphone > Autoriser, puis rechargez la page.'
          : 'Microphone bloqué. Cliquez sur l\'icône 🔒 dans la barre d\'adresse > Autoriser le microphone.');
      } else {
        setError('Microphone non disponible sur cet appareil. Vous pouvez décrire l\'accident par écrit.');
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
    } as any);
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
    <div className="rounded-[14px] overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.02)' }}>

      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="rounded-full flex items-center justify-center text-[13px] font-bold w-8 h-8"  style={{ background: `${roleColor}20`, border: `2px solid ${roleColor}`, color: roleColor }}>
          {role}
        </div>
        <div>
          <div className="font-bold text-sm">{roleLabel} — Déclaration</div>
          <div className="text-[11px] opacity-70" >Version des faits selon {roleLabel.toLowerCase()}</div>
        </div>
        {state === 'done' && (
          <button onClick={reset} className="ml-auto rounded-md bg-transparent cursor-pointer text-[11px] touch-manipulation min-h-[44px] min-w-[44px] px-2.5 py-1" style={{ border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.4)' }}>
            Refaire
          </button>
        )}
      </div>

      <div className="p-4">

        {/* IDLE */}
        {state === 'idle' && (
          <>
            <p className="text-[13px] mb-4 leading-relaxed opacity-75">
              Expliquez brièvement comment s&apos;est produit l&apos;accident selon vous. Parlez naturellement dans votre langue — l&apos;application transcrit automatiquement.
            </p>
            <button onClick={startRecording}
              className="w-full rounded-xl border-0 text-white cursor-pointer text-[15px] font-bold flex items-center justify-center gap-2.5 touch-manipulation p-4"  style={{ background: `linear-gradient(135deg, ${roleColor}cc, ${roleColor})`, WebkitTapHighlightColor: 'transparent' as string }}>
              <span className="text-[22px]">🎙️</span> Enregistrer ma déclaration
            </button>
            <div className="mt-2.5 text-[11px] text-center opacity-70" >
              Max 3 minutes · 99 langues · Consentement: l&apos;enregistrement sera transcrit et intégré au PDF
            </div>
          </>
        )}

        {/* RECORDING */}
        {state === 'recording' && (
          <>
            {/* Visualisation */}
            <div className="text-center mb-5">
              <div className="relative inline-block" >
                <div className="rounded-full flex items-center justify-center text-[32px] w-20 h-20"  style={{ background: 'rgba(239,68,68,0.15)', border: '3px solid #ef4444', animation: 'pulse 1s ease infinite' }}>
                  🎙️
                </div>
                <div className="absolute rounded-full bg-red-500 top-[-4px] right-[-4px] w-4 h-4"  style={{ animation: 'blink 1s ease infinite' }} />
              </div>
              <div className="mt-3 text-base font-bold text-red-500">{formatTime(elapsed)}</div>
              <div className="text-xs opacity-75">Enregistrement en cours…</div>
            </div>

            {/* Barre de progression */}
            <div className="mb-4 overflow-hidden h-1 rounded-sm"  style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-full bg-red-500 rounded-sm"  style={{ width: `${progress}%`, transition: 'width 1s linear' }} />
            </div>
            {elapsed > MAX_DURATION_SEC - 30 && (
              <div className="text-center text-xs mb-2.5 text-[#f59e0b]">
                ⚠️ {MAX_DURATION_SEC - elapsed}s restantes
              </div>
            )}

            <button onClick={stopRecording}
              className="w-full rounded-xl text-red-500 cursor-pointer text-[15px] font-bold touch-manipulation p-3.5"  style={{ border: '2px solid #ef4444', background: 'rgba(239,68,68,0.1)', WebkitTapHighlightColor: 'transparent' as string }}>
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
            <div className="text-center mb-4">
              <div className="text-5xl mb-2">✅</div>
              <div className="font-bold text-base mb-1">Enregistrement terminé</div>
              <div className="text-[13px] opacity-75">{formatTime(elapsed)} enregistré</div>
            </div>
            <div className="flex gap-2.5">
              <button onClick={reset}
                className="flex-1 rounded-[10px] bg-transparent cursor-pointer text-sm touch-manipulation p-3"  style={{ border: '1.5px solid rgba(255,255,255,0.25)', color: 'var(--text)' }}>
                Recommencer
              </button>
              <button onClick={transcribe}
                className="rounded-[10px] border-0 text-white cursor-pointer text-sm font-bold touch-manipulation p-3"  style={{ flex: 2, background: roleColor, WebkitTapHighlightColor: 'transparent' as string }}>
                🔤 Transcrire →
              </button>
            </div>
          </>
        )}

        {/* TRANSCRIBING */}
        {state === 'transcribing' && (
          <div role="status" aria-label="Transcription en cours" className="text-center" style={{ padding: '20px 0' }}>
            <div className="text-[40px] mb-3 inline-block"  style={{ animation: 'spin 1.5s linear infinite' }} aria-hidden="true">🔄</div>
            <div className="font-bold text-[15px] mb-1.5">Transcription en cours…</div>
            <div className="text-xs opacity-70" >OpenAI Whisper · Détection automatique de la langue</div>
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* DONE */}
        {state === 'done' && transcript && (
          <>
            <div className="mb-3 rounded-lg text-xs text-green-500 flex items-center gap-2 px-3 py-2.5" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
              ✅ Transcription automatique — vérifiez et corrigez si nécessaire
            </div>
            {isEditing ? (
              <textarea
                aria-label="Transcription du message vocal"
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                onBlur={() => { setIsEditing(false); onComplete?.(transcript, audioBase64); }}
                autoFocus
                rows={5}
                className="w-full rounded-lg text-sm box-border leading-relaxed resize-y px-3 py-2.5" style={{ border: `1px solid ${roleColor}66`, background: 'rgba(255,255,255,0.05)', color: 'var(--text)', fontFamily: 'inherit' }}
              />
            ) : (
              <div
                onClick={() => setIsEditing(true)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsEditing(true); } }}
                role="button"
                tabIndex={0}
                className="rounded-[10px] text-sm cursor-text min-h-[80px] px-3.5 py-3 leading-[1.7]" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.25)', color: 'var(--text)' }}
              >
                {transcript}
              </div>
            )}
            <div className="text-[11px] text-right mt-1.5 opacity-75">
              Tapez pour modifier · Intégré au PDF du constat
            </div>
          </>
        )}

        {/* ERROR */}
        {state === 'error' && (
          <>
            <div className="rounded-[10px] text-red-500 text-[13px] mb-3.5 px-3.5 py-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
              ⚠️ {error}
            </div>
            <button onClick={reset}
              className="w-full rounded-[10px] bg-transparent cursor-pointer text-sm touch-manipulation p-3"  style={{ border: '1px solid rgba(255,255,255,0.25)', color: 'var(--text)' }}>
              Réessayer
            </button>
          </>
        )}
      </div>
    </div>
  );
});
