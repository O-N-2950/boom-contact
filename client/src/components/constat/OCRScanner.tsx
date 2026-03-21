import { useState, useRef, useCallback } from 'react';
import { trpc } from '../../trpc';
import type { OCRResult } from '../../../../shared/types';

interface Props {
  role: 'A' | 'B';
  onComplete: (result: { registration: OCRResult; greenCard?: OCRResult }) => void;
}

type Step = 'idle' | 'registration' | 'greencard' | 'scanning' | 'review' | 'done';

// ── Image compression ─────────────────────────────────────────
async function compressImage(base64: string, maxPx = 1024, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1]);
    };
    img.onerror = () => resolve(base64);
    img.src = `data:image/jpeg;base64,${base64}`;
  });
}

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export function OCRScanner({ role, onComplete }: Props) {
  const [step, setStep] = useState<Step>('idle');
  const [regImage, setRegImage] = useState<string | null>(null);
  const [gcImage, setGcImage]   = useState<string | null>(null);
  const [result, setResult]     = useState<{ registration: OCRResult; greenCard?: OCRResult } | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [skipGreenCard, setSkipGreenCard] = useState(false);
  const cameraRef  = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const currentStep = useRef<Step>('idle');

  const openPicker = () => isMobile ? cameraRef.current?.click() : galleryRef.current?.click();

  const captureFor = (s: Step) => {
    currentStep.current = s;
    setStep(s);
    openPicker();
  };

  const scanMutation = trpc.ocr.scanPair.useMutation({
    onSuccess: (data) => { setResult(data); setStep('review'); },
    onError:   (err)  => { setError(err.message || 'Erreur OCR'); setStep('idle'); },
  });

  const scanRegistrationOnly = trpc.ocr.scan.useMutation({
    onSuccess: (data) => {
      setResult({ registration: data as OCRResult });
      setStep('review');
    },
    onError: (err) => { setError(err.message || 'Erreur OCR'); setStep('idle'); },
  });

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setCompressing(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const compressed = await compressImage((reader.result as string).split(',')[1]);
      setCompressing(false);
      const s = currentStep.current;

      if (s === 'registration') {
        setRegImage(compressed);
        // Propose green card or skip
        setStep('greencard');
      } else if (s === 'greencard') {
        setGcImage(compressed);
        setStep('scanning');
        scanMutation.mutate({ registrationBase64: regImage!, greenCardBase64: compressed });
      }
    };
    reader.readAsDataURL(file);
  }, [regImage]);

  const handleSkipGreenCard = () => {
    setSkipGreenCard(true);
    setStep('scanning');
    // Scan registration only
    scanRegistrationOnly.mutate({ imageBase64: regImage!, mediaType: 'image/jpeg', documentType: 'vehicle_registration' });
  };

  const hiddenInputs = (
    <>
      <input ref={cameraRef}  type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={handleFile} />
      <input ref={galleryRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFile} />
    </>
  );

  // ── IDLE ─────────────────────────────────────────────────
  if (step === 'idle') return (
    <div style={{ padding: 24 }}>
      {hiddenInputs}
      <div style={{ textAlign:'center', marginBottom: 32 }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>📄</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Scannez vos documents</h2>
        <p style={{ fontSize: 14, opacity: 0.55, lineHeight: 1.6 }}>
          Commencez par votre permis de circulation.<br/>La carte verte est <strong>optionnelle</strong>.
        </p>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', fontSize: 13, color:'#ef4444' }}>
          ⚠️ {error} <button onClick={() => setError(null)} style={{ marginLeft:8, background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:11 }}>✕</button>
        </div>
      )}

      <button onClick={() => captureFor('registration')} style={{
        width:'100%', padding:'18px 24px', borderRadius: 12, border:'2px solid rgba(255,53,0,0.4)',
        background:'rgba(255,53,0,0.06)', cursor:'pointer', display:'flex', alignItems:'center', gap: 16, marginBottom: 12,
      }}>
        <span style={{ fontSize: 32 }}>🪪</span>
        <div style={{ textAlign:'left' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color:'var(--text)' }}>Permis de circulation</div>
          <div style={{ fontSize: 12, opacity: 0.5, marginTop: 2 }}>Carte grise, RC Book, Zulassung — <strong>obligatoire</strong></div>
        </div>
        <span style={{ marginLeft:'auto', fontSize: 20 }}>{isMobile ? '📸' : '📁'}</span>
      </button>

      <div style={{ padding:'12px 16px', borderRadius: 10, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', fontSize: 12, color:'rgba(240,237,232,0.5)', lineHeight: 1.6 }}>
        💡 <strong style={{ color:'rgba(240,237,232,0.7)' }}>Carte verte optionnelle.</strong> Si vous l'avez, scannez-la pour compléter automatiquement les données d'assurance. Sinon, saisissez-les manuellement dans le formulaire.
      </div>
    </div>
  );

  // ── GREENCARD STEP — propose ou skip ────────────────────
  if (step === 'greencard') return (
    <div style={{ padding: 24 }}>
      {hiddenInputs}
      <div style={{ marginBottom: 20, padding:'10px 14px', borderRadius: 8, background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', fontSize: 13, color:'#22c55e' }}>
        ✅ Permis de circulation scanné {compressing ? '· Compression…' : ''}
      </div>

      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, textAlign:'center' }}>Carte verte ?</h3>
      <p style={{ fontSize: 13, opacity: 0.55, lineHeight: 1.65, textAlign:'center', marginBottom: 28 }}>
        Le certificat international d'assurance (carte verte) permet de compléter automatiquement vos données d'assurance. Il est <strong>facultatif</strong> — vous pouvez saisir ces infos manuellement.
      </p>

      <div style={{ display:'flex', flexDirection:'column', gap: 10 }}>
        <button onClick={() => captureFor('greencard')} style={{
          padding:'16px', borderRadius: 10, border:'1.5px solid rgba(255,53,0,0.4)',
          background:'rgba(255,53,0,0.06)', cursor:'pointer', display:'flex', alignItems:'center', gap: 12, fontSize: 14, fontWeight: 600, color:'var(--text)',
        }}>
          <span style={{ fontSize: 24 }}>🟢</span>
          <div style={{ textAlign:'left' }}>
            <div style={{ fontWeight: 700 }}>Scanner la carte verte</div>
            <div style={{ fontSize: 11, opacity: 0.5 }}>Recommandé — complète les données assurance</div>
          </div>
          <span style={{ marginLeft:'auto' }}>{isMobile ? '📸' : '📁'}</span>
        </button>

        <button onClick={handleSkipGreenCard} style={{
          padding:'16px', borderRadius: 10, border:'1px solid rgba(255,255,255,0.1)',
          background:'transparent', cursor:'pointer', fontSize: 14, color:'rgba(240,237,232,0.6)',
        }}>
          Continuer sans carte verte →
        </button>
      </div>
    </div>
  );

  // ── SCANNING ──────────────────────────────────────────────
  if (step === 'scanning') return (
    <div style={{ padding: 24, textAlign:'center' }}>
      {hiddenInputs}
      <div style={{ fontSize: 56, marginBottom: 20, display:'inline-block', animation:'spin 1s linear infinite' }}>🔍</div>
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Analyse en cours…</h3>
      <p style={{ fontSize: 14, opacity: 0.5 }}>Claude Vision lit vos documents</p>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── REVIEW ────────────────────────────────────────────────
  if (step === 'review' && result) {
    const conf = skipGreenCard
      ? result.registration.confidence
      : (result.registration.confidence + (result.greenCard?.confidence ?? 0.5)) / 2;

    const lowConf = [
      ...(result.registration.lowConfidenceFields ?? []),
      ...(result.greenCard?.lowConfidenceFields ?? []),
    ];

    return (
      <div style={{ padding: 24 }}>
        {hiddenInputs}
        <div style={{ display:'flex', alignItems:'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background:'rgba(34,197,94,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize: 22 }}>✅</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              {skipGreenCard ? 'Permis analysé' : 'Documents analysés'}
            </div>
            <div style={{ fontSize: 12, opacity: 0.5 }}>Confiance : {Math.round(conf * 100)}%
              {skipGreenCard && <span style={{ marginLeft: 8, color:'#f59e0b' }}>· Carte verte ignorée</span>}
            </div>
          </div>
        </div>

        {lowConf.length > 0 && (
          <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color:'#f59e0b', marginBottom: 6 }}>⚠️ {lowConf.length} champ{lowConf.length>1?'s':''} à vérifier</div>
            {lowConf.map((f, i) => (
              <div key={i} style={{ fontSize: 12, opacity: 0.8, marginTop: 3 }}>• <strong>{f.field}</strong> : "{f.value}" ({Math.round(f.confidence*100)}%)</div>
            ))}
          </div>
        )}

        {skipGreenCard && (
          <div style={{ marginBottom: 16, padding:'10px 14px', borderRadius: 8, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', fontSize: 12, opacity: 0.7 }}>
            💡 Pensez à renseigner votre compagnie d'assurance et numéro de police dans le formulaire suivant.
          </div>
        )}

        {[
          { title: '🚗 Véhicule', data: result.registration.vehicle },
          { title: '👤 Conducteur', data: result.registration.driver },
          ...(result.greenCard?.insurance ? [{ title: '🟢 Assurance (carte verte)', data: result.greenCard.insurance }] : []),
        ].map(({ title, data }) => data && Object.values(data as object).some(Boolean) && (
          <div key={title} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.4, textTransform:'uppercase', marginBottom: 7, fontFamily:'monospace' }}>{title}</div>
            <div style={{ borderRadius: 10, border:'1px solid rgba(240,237,232,0.08)', overflow:'hidden' }}>
              {Object.entries(data as object).filter(([,v]) => v).map(([key, value], i, arr) => (
                <div key={key} style={{ padding:'9px 14px', display:'flex', justifyContent:'space-between', borderBottom: i<arr.length-1?'1px solid rgba(240,237,232,0.05)':'none', background: i%2===0?'rgba(255,255,255,0.02)':'transparent' }}>
                  <span style={{ fontSize: 12, opacity: 0.5, textTransform:'capitalize' }}>{key.replace(/([A-Z])/g,' $1').toLowerCase()}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, maxWidth:'55%', textAlign:'right' }}>{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={{ display:'flex', gap: 10, marginTop: 8 }}>
          <button onClick={() => { setStep('idle'); setRegImage(null); setGcImage(null); setSkipGreenCard(false); }} style={{ flex: 1, padding:'14px', borderRadius: 10, border:'1.5px solid rgba(240,237,232,0.15)', background:'transparent', color:'var(--text)', cursor:'pointer', fontSize: 14 }}>
            🔄 Rescanner
          </button>
          <button onClick={() => { setStep('done'); onComplete(result); }} style={{ flex: 2, padding:'14px', borderRadius: 10, border:'none', background:'var(--boom)', color:'#fff', cursor:'pointer', fontSize: 14, fontWeight: 700 }}>
            Confirmer →
          </button>
        </div>
      </div>
    );
  }

  return null;
}
