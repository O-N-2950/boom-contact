// client/src/components/constat/VoiceSketchFlow.tsx
// Le game changer : Vocal → IA → Questions → Croquis pré-dessiné
// Flow : record → transcribe → analyze → clarify? → sketch
// Fallback : saisie manuelle (personnes muettes, micro indisponible)

import { useState, useRef, useEffect, useCallback } from 'react';
import { trpc } from '../../trpc';
import { renderAccidentSketch } from './sketch-engine';
import type { SceneAnalysis } from './sketch-engine';

// ── Types ─────────────────────────────────────────────────────
type FlowState =
  | 'intro'          // Écran d'accueil avec explication
  | 'recording'      // Enregistrement en cours
  | 'transcribing'   // Whisper transcrit
  | 'analyzing'      // Claude analyse
  | 'clarifying'     // Questions de clarification
  | 'sketching'      // Croquis pré-dessiné à valider
  | 'done';

type InputMode = 'voice' | 'text';


interface Props {
  role: 'A' | 'B' | 'C' | 'D' | 'E';
  sessionId: string;
  lang?: string;
  // Mode "sketch seulement" — analyse déjà faite, on connaît tous les véhicules
  preloadedAnalysis?: SceneAnalysis | null;
  vehicleAData?: { color?: string; type?: string; brand?: string; model?: string } | null;
  vehicleBData?: { color?: string; type?: string; brand?: string; model?: string } | null;
  vehicleCData?: { color?: string; type?: string; brand?: string; model?: string } | null;
  vehicleDData?: { color?: string; type?: string; brand?: string; model?: string } | null;
  onComplete: (data: {
    transcript: string;
    analysis: SceneAnalysis;
    sketchBase64: string;
  }) => void;
  onSkip: () => void;
}

const MAX_DURATION = 180;
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// ── Compression audio ─────────────────────────────────────────
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}


// ── Composant principal ───────────────────────────────────────
export function VoiceSketchFlow({ role, sessionId, lang, preloadedAnalysis, vehicleAData, vehicleBData, vehicleCData, vehicleDData, onComplete, onSkip }: Props) {
  // Si analyse déjà disponible (après QR) → aller direct au sketch
  const [flowState, setFlowState] = useState<FlowState>(preloadedAnalysis ? 'sketching' : 'intro');
  const [inputMode, setInputMode] = useState<InputMode>('voice');
  const [manualText, setManualText] = useState('');
  const [elapsed, setElapsed]     = useState(0);
  const [transcript, setTranscript]   = useState('');
  const [analysis, setAnalysis]       = useState<SceneAnalysis | null>(preloadedAnalysis || null);
  const [answers, setAnswers]         = useState<Record<string, string>>({});
  const [error, setError]             = useState('');

  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const sketchB64Ref = useRef('');

  // Dessiner immédiatement si données déjà disponibles
  useEffect(() => {
    if (preloadedAnalysis && flowState === 'sketching') {
      setTimeout(() => renderSketch(preloadedAnalysis), 100);
    }
  }, [preloadedAnalysis]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  // ── tRPC mutations ───────────────────────────────────────────
  const transcribeMut = trpc.voice.transcribe.useMutation({
    onSuccess: (data) => {
      setTranscript(data.text);
      setFlowState('analyzing');
      analyzeMut.mutate({ transcript: data.text, previousAnswers: {} });
    },
    onError: (err) => { setError(err.message); setFlowState('intro'); },
  });

  const analyzeMut = trpc.voice.analyzeAccident.useMutation({
    onSuccess: (data) => {
      setAnalysis(data);
      if ((data.questions?.length ?? 0) > 0 && data.confidence < 0.80) {
        setFlowState('clarifying');
      } else {
        setFlowState('sketching');
        setTimeout(() => renderSketch(data), 100);
      }
    },
    onError: (err) => { setError(err.message); setFlowState('intro'); },
  });

  const renderSketch = useCallback((scene: SceneAnalysis) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Priorité: props directes (après QR) > window (avant QR) > fallback
    const aColor = vehicleAData?.color || (window as any).__boomVehicleA?.color;
    const bColor = vehicleBData?.color || (window as any).__boomVehicleB?.color;
    const aType  = vehicleAData?.type  || (window as any).__boomVehicleA?.type;
    const bType  = vehicleBData?.type  || (window as any).__boomVehicleB?.type;
    renderAccidentSketch(canvas, scene, aColor, bColor, aType, bType);
    sketchB64Ref.current = canvas.toDataURL('image/png').split(',')[1];
  }, [vehicleAData, vehicleBData]);

  // ── Recording ────────────────────────────────────────────────
  const startRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4'
        : '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        const b64 = await blobToBase64(blob);
        setFlowState('transcribing');
        transcribeMut.mutate({
          audioBase64: b64,
          mimeType: mimeType || 'audio/webm',
          lang,
          sessionId,
          role,
        });
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
        ? 'Accès au microphone refusé — autorisez-le dans votre navigateur.'
        : `Microphone indisponible : ${msg}`);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRecRef.current?.state === 'recording') mediaRecRef.current.stop();
  };

  // ── Clarifications ───────────────────────────────────────────
  const submitAnswers = () => {
    if (!analysis) return;
    setFlowState('analyzing');
    analyzeMut.mutate({ transcript, previousAnswers: answers });
  };

  const handleConfirmSketch = () => {
    if (!analysis) return;
    onComplete({
      transcript,
      analysis,
      sketchBase64: sketchB64Ref.current,
    });
  };

  // ── Helpers UI ───────────────────────────────────────────────
  const fmt = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  const roleColor = { A:'#3B82F6', B:'#FF6B00', C:'#22C55E', D:'#A855F7', E:'#EC4899' }[role] || '#fff';

  const btnPrimary: React.CSSProperties = {
    width:'100%', padding:'16px', borderRadius:12, border:'none',
    background:`linear-gradient(135deg, ${roleColor}dd, ${roleColor})`,
    color:'#fff', cursor:'pointer', fontSize:15, fontWeight:700,
    touchAction:'manipulation', WebkitTapHighlightColor:'transparent' as any,
    display:'flex', alignItems:'center', justifyContent:'center', gap:10,
  };

  // ── INTRO ─────────────────────────────────────────────────────
  if (flowState === 'intro') return (
    <div style={{ padding:24 }}>
      <div style={{ textAlign:'center', marginBottom:20 }}>
        <div style={{ fontSize:52, marginBottom:10 }}>🎙️</div>
        <h2 style={{ fontSize:20, fontWeight:800, marginBottom:8 }}>
          Décrivez l&apos;accident
        </h2>
        <p style={{ fontSize:13, opacity:0.55, lineHeight:1.65, maxWidth:320, margin:'0 auto' }}>
          Optionnel — le constat suffit, mais votre description aide à générer le croquis automatiquement.
        </p>
      </div>

      {/* Onglets Vocal / Texte */}
      <div style={{ display:'flex', marginBottom:20, borderRadius:10, overflow:'hidden', border:'1px solid rgba(255,255,255,0.1)' }}>
        <button
          onClick={() => setInputMode('voice')}
          style={{
            flex:1, padding:'12px', border:'none', cursor:'pointer', fontSize:13, fontWeight:600,
            background: inputMode === 'voice' ? `${roleColor}22` : 'transparent',
            color: inputMode === 'voice' ? roleColor : 'rgba(255,255,255,0.4)',
            borderRight:'1px solid rgba(255,255,255,0.1)',
            transition:'all 0.15s',
          }}>
          🎙️ Vocal
        </button>
        <button
          onClick={() => setInputMode('text')}
          style={{
            flex:1, padding:'12px', border:'none', cursor:'pointer', fontSize:13, fontWeight:600,
            background: inputMode === 'text' ? `${roleColor}22` : 'transparent',
            color: inputMode === 'text' ? roleColor : 'rgba(255,255,255,0.4)',
            transition:'all 0.15s',
          }}>
          ⌨️ Saisie manuelle
        </button>
      </div>

      {/* Mode Vocal */}
      {inputMode === 'voice' && (
        <>
          <div style={{ marginBottom:16, padding:'12px 14px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', fontSize:12, opacity:0.55, lineHeight:1.8 }}>
            <div style={{ fontWeight:700, opacity:0.8, marginBottom:6 }}>Exemples :</div>
            {[
              { flag:'🇨🇭', text:'"J\'arrivais sur la route principale, B a grillé le stop."' },
              { flag:'🇩🇪', text:'"Ich fuhr geradeaus, Fahrzeug B missachtete die Vorfahrt."' },
              { flag:'🇬🇧', text:'"I was overtaking when vehicle B changed lanes without signalling."' },
            ].map((ex, i) => (
              <div key={i} style={{ display:'flex', gap:8, marginBottom:4 }}>
                <span>{ex.flag}</span>
                <span style={{ fontStyle:'italic' }}>{ex.text}</span>
              </div>
            ))}
          </div>

          {error && (
            <div style={{ marginBottom:12, padding:'10px 14px', borderRadius:8, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', fontSize:13 }}>
              ⚠️ {error}
            </div>
          )}

          <button onClick={startRecording} style={btnPrimary}>
            <span style={{ fontSize:22 }}>🎙️</span>
            Commencer l&apos;enregistrement
          </button>
        </>
      )}

      {/* Mode Texte — pour personnes muettes ou sans micro */}
      {inputMode === 'text' && (
        <>
          <textarea
            value={manualText}
            onChange={e => setManualText(e.target.value)}
            placeholder="Décrivez l'accident : votre position, ce qui s'est passé, la position de l'autre véhicule...&#10;&#10;Ex: J'arrivais sur la route principale. Le véhicule B venait de la droite et n'a pas marqué le stop."
            rows={7}
            style={{
              width:'100%', padding:'12px 14px', borderRadius:10,
              border:'1.5px solid rgba(255,255,255,0.12)',
              background:'rgba(255,255,255,0.04)', color:'var(--text)',
              fontSize:14, lineHeight:1.6, fontFamily:'inherit', resize:'vertical',
              outline:'none', boxSizing:'border-box',
              marginBottom:12,
            }}
          />
          <button
            onClick={() => {
              if (!manualText.trim()) return;
              setTranscript(manualText.trim());
              setFlowState('analyzing');
              analyzeMut.mutate({ transcript: manualText.trim(), previousAnswers: {} });
            }}
            disabled={!manualText.trim()}
            style={{ ...btnPrimary, opacity: manualText.trim() ? 1 : 0.4, cursor: manualText.trim() ? 'pointer' : 'not-allowed' }}>
            🧠 Analyser et générer le croquis →
          </button>
        </>
      )}

      {/* Skip — non bloquant */}
      <button onClick={onSkip} style={{
        width:'100%', marginTop:10, padding:'13px', borderRadius:10,
        border:'1px solid rgba(255,255,255,0.08)', background:'transparent',
        cursor:'pointer', fontSize:13, color:'rgba(255,255,255,0.3)',
        touchAction:'manipulation',
      }}>
        Passer cette étape →
      </button>
    </div>
  );

  // ── RECORDING ─────────────────────────────────────────────────
  if (flowState === 'recording') return (
    <div style={{ padding:24, textAlign:'center' }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ position:'relative', display:'inline-block' }}>
          <div style={{ width:96, height:96, borderRadius:'50%', background:'rgba(239,68,68,0.12)', border:'3px solid #ef4444', display:'flex', alignItems:'center', justifyContent:'center', fontSize:40, animation:'pulse 1s ease infinite' }}>
            🎙️
          </div>
          <div style={{ position:'absolute', top:0, right:0, width:18, height:18, borderRadius:'50%', background:'#ef4444', animation:'blink 1s ease infinite' }} />
        </div>
        <div style={{ marginTop:14, fontSize:22, fontWeight:800, color:'#ef4444', fontFamily:'monospace' }}>{fmt(elapsed)}</div>
        <div style={{ fontSize:13, opacity:0.5, marginTop:4 }}>Parlez librement dans votre langue…</div>
      </div>

      {/* Barre */}
      <div style={{ height:5, borderRadius:3, background:'rgba(255,255,255,0.06)', marginBottom:20, overflow:'hidden' }}>
        <div style={{ height:'100%', borderRadius:3, background:'#ef4444', width:`${(elapsed/MAX_DURATION)*100}%`, transition:'width 1s linear' }} />
      </div>

      {elapsed > MAX_DURATION - 30 && (
        <div style={{ marginBottom:14, fontSize:12, color:'#f59e0b' }}>⚠️ {MAX_DURATION - elapsed}s restantes</div>
      )}

      <button onClick={stopRecording} style={{ ...btnPrimary, background:'rgba(239,68,68,0.15)', color:'#ef4444', border:'2px solid #ef4444' }}>
        ⏹ Terminer l&apos;enregistrement
      </button>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );

  // ── TRANSCRIBING / ANALYZING ──────────────────────────────────
  if (flowState === 'transcribing' || flowState === 'analyzing') {
    const isAnalyzing = flowState === 'analyzing';
    return (
      <div style={{ padding:40, textAlign:'center' }}>
        <div style={{ fontSize:52, marginBottom:20, display:'inline-block', animation:'spin 1.5s linear infinite' }}>
          {isAnalyzing ? '🧠' : '🔤'}
        </div>
        <div style={{ fontWeight:800, fontSize:18, marginBottom:8 }}>
          {isAnalyzing ? 'Analyse IA en cours…' : 'Transcription en cours…'}
        </div>
        <div style={{ fontSize:13, opacity:0.4, lineHeight:1.7 }}>
          {isAnalyzing
            ? 'Claude analyse votre témoignage et reconstruit la scène de l\'accident'
            : 'Whisper transcrit votre enregistrement (99 langues)'}
        </div>
        {isAnalyzing && transcript && (
          <div style={{ marginTop:20, padding:'12px 16px', borderRadius:10, background:'rgba(255,255,255,0.04)', fontSize:13, opacity:0.6, fontStyle:'italic', maxWidth:340, margin:'20px auto 0', lineHeight:1.6 }}>
            &ldquo;{transcript.slice(0, 120)}{transcript.length > 120 ? '…' : ''}&rdquo;
          </div>
        )}
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ── CLARIFYING ────────────────────────────────────────────────
  if (flowState === 'clarifying' && analysis?.questions?.length) {
    const allAnswered = analysis.questions.every(q => answers[q.id]);
    return (
      <div style={{ padding:24 }}>
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:48, marginBottom:10 }}>❓</div>
          <h2 style={{ fontSize:20, fontWeight:800, marginBottom:8 }}>Quelques précisions</h2>
          <p style={{ fontSize:13, opacity:0.55 }}>
            Pour dessiner le croquis avec précision, répondez à ces questions
          </p>
        </div>

        {/* Transcript affiché */}
        <div style={{ marginBottom:20, padding:'12px 14px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', fontSize:13, opacity:0.6, fontStyle:'italic', lineHeight:1.6 }}>
          &ldquo;{transcript.slice(0, 150)}{transcript.length > 150 ? '…' : ''}&rdquo;
        </div>

        {analysis.questions.map((q, qi) => (
          <div key={q.id} style={{ marginBottom:20 }}>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:12, lineHeight:1.5 }}>
              {qi + 1}. {q.question}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {q.options.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setAnswers(p => ({ ...p, [q.id]: opt.value }))}
                  style={{
                    padding:'14px 16px', borderRadius:10, cursor:'pointer',
                    border: answers[q.id] === opt.value
                      ? `2px solid ${roleColor}`
                      : '1px solid rgba(255,255,255,0.1)',
                    background: answers[q.id] === opt.value
                      ? `${roleColor}15`
                      : 'rgba(255,255,255,0.03)',
                    color:'var(--text)', fontSize:14, fontWeight: answers[q.id] === opt.value ? 700 : 400,
                    textAlign:'left', touchAction:'manipulation',
                  }}
                >
                  {answers[q.id] === opt.value && '✓ '}{opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}

        <button onClick={submitAnswers} disabled={!allAnswered}
          style={{ ...btnPrimary, opacity: allAnswered ? 1 : 0.4, cursor: allAnswered ? 'pointer' : 'not-allowed' }}>
          🧠 Générer le croquis →
        </button>
      </div>
    );
  }

  // ── SKETCHING ─────────────────────────────────────────────────
  if (flowState === 'sketching' && analysis) {
    return (
      <div style={{ padding:'16px 20px' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <div style={{ width:40, height:40, borderRadius:10, background:'rgba(34,197,94,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>✅</div>
          <div>
            <div style={{ fontWeight:800, fontSize:16 }}>Croquis généré par IA</div>
            <div style={{ fontSize:12, opacity:0.45 }}>Confiance : {Math.round(analysis.confidence * 100)}% · {analysis.scenario.replace(/_/g, ' ')}</div>
          </div>
        </div>

        {/* Transcript */}
        <div style={{ marginBottom:14, padding:'10px 13px', borderRadius:8, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', fontSize:12, opacity:0.55, fontStyle:'italic', lineHeight:1.6 }}>
          &ldquo;{transcript.slice(0, 120)}{transcript.length > 120 ? '…' : ''}&rdquo;
        </div>

        {/* Canvas */}
        <div style={{ borderRadius:12, overflow:'hidden', border:`2px solid ${roleColor}44`, marginBottom:16, position:'relative' }}>
          <canvas
            ref={canvasRef}
            width={760} height={480}
            style={{ width:'100%', display:'block' }}
          />
          <div style={{ position:'absolute', top:8, right:8, padding:'4px 10px', borderRadius:20, background:'rgba(0,0,0,0.6)', fontSize:10, color:roleColor, fontWeight:700, letterSpacing:1 }}>
            IA BOOM.CONTACT
          </div>
        </div>

        {/* Circonstances détectées */}
        {analysis.circumstances?.length > 0 && (
          <div style={{ marginBottom:14, display:'flex', flexWrap:'wrap', gap:6 }}>
            {analysis.circumstances.map(c => (
              <span key={c} style={{ padding:'3px 10px', borderRadius:20, background:`${roleColor}15`, border:`1px solid ${roleColor}44`, fontSize:11, color:roleColor }}>
                {c}
              </span>
            ))}
          </div>
        )}

        {/* Description IA */}
        <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:8, background:`${roleColor}08`, border:`1px solid ${roleColor}22`, fontSize:13, lineHeight:1.6 }}>
          🧠 {analysis.description}
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={() => { setFlowState('intro'); setAnalysis(null); setTranscript(''); setAnswers({}); }}
            style={{ flex:1, padding:'13px', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', cursor:'pointer', fontSize:13, color:'rgba(255,255,255,0.4)', touchAction:'manipulation' }}>
            Recommencer
          </button>
          <button onClick={handleConfirmSketch} style={{ ...btnPrimary, flex:2, padding:'13px' }}>
            Valider le croquis →
          </button>
        </div>
      </div>
    );
  }

  return null;
}
