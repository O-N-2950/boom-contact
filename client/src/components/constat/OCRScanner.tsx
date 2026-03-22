import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { trpc } from '../../trpc';
import type { OCRResult } from '../../../../shared/types';

interface Props {
  role: 'A' | 'B';
  onComplete: (result: { registration: OCRResult; greenCard?: OCRResult }) => void;
}

type Step = 'idle' | 'greencard' | 'scanning' | 'review' | 'done';

// ── Compression image ─────────────────────────────────────────
// Robuste iOS : try/catch + fallback si canvas échoue
async function compressImage(base64: string, maxPx = 1024, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Canvas context null (iOS memory limit) — retourner original sans compression
          resolve(base64);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const result = canvas.toDataURL('image/jpeg', quality).split(',')[1];
        resolve(result || base64);
      } catch {
        // Toute erreur → retourner base64 original
        resolve(base64);
      }
    };
    img.onerror = () => resolve(base64);
    img.src = `data:image/jpeg;base64,${base64}`;
  });
}

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export function OCRScanner({ role, onComplete }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('idle');
  const [regImage, setRegImage] = useState<string | null>(null);
  const [result, setResult] = useState<{ registration: OCRResult; greenCard?: OCRResult } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [skipGreenCard, setSkipGreenCard] = useState(false);
  const [manualInsurance, setManualInsurance] = useState({ company: '', policyNumber: '' });

  // Un seul input file — toujours monté, jamais retiré du DOM
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Quelle étape attend la photo
  const pendingStep = useRef<'registration' | 'greencard'>('registration');

  const openCamera = (forStep: 'registration' | 'greencard') => {
    pendingStep.current = forStep;
    fileInputRef.current?.click();
  };

  const scanMutation = trpc.ocr.scanPair.useMutation({
    onSuccess: (data) => { setResult(data); setProcessing(false); setStep('review'); },
    onError: (err) => { setError(err.message || t('common.error')); setProcessing(false); setStep('idle'); },
  });

  const scanRegistrationOnly = trpc.ocr.scan.useMutation({
    onSuccess: (data) => {
      setResult({ registration: data as OCRResult });
      setProcessing(false);
      setStep('review');
    },
    onError: (err) => { setError(err.message || t('common.error')); setProcessing(false); setStep('idle'); },
  });

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input pour permettre re-sélection du même fichier
    e.target.value = '';

    setProcessing(true);
    setError(null);

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const raw = (reader.result as string).split(',')[1];
          resolve(raw);
        };
        reader.onerror = () => reject(new Error('Lecture fichier échouée'));
        reader.readAsDataURL(file);
      });

      // Compression avec fallback iOS
      const compressed = await compressImage(base64);

      if (pendingStep.current === 'registration') {
        setRegImage(compressed);
        setProcessing(false);
        setStep('greencard');
      } else if (pendingStep.current === 'greencard') {
        setStep('scanning');
        scanMutation.mutate({ registrationBase64: regImage!, greenCardBase64: compressed });
      }
    } catch (err) {
      setError('Erreur lors de la lecture de l\'image. Réessayez.');
      setProcessing(false);
    }
  }, [regImage]);

  const handleSkipGreenCard = () => {
    setSkipGreenCard(true);
    setStep('scanning');
    scanRegistrationOnly.mutate({
      imageBase64: regImage!,
      mediaType: 'image/jpeg',
      documentType: 'vehicle_registration',
    });
  };

  // Input unique — toujours dans le DOM
  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      capture={isMobile ? 'environment' : undefined}
      style={{ display: 'none' }}
      onChange={handleFile}
    />
  );

  // ── IDLE ─────────────────────────────────────────────────────
  if (step === 'idle') return (
    <div style={{ padding: 24 }}>
      {fileInput}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>📄</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{t('ocr.idle.title')}</h2>
        <p style={{ fontSize: 14, opacity: 0.55, lineHeight: 1.6 }}
          dangerouslySetInnerHTML={{ __html: t('ocr.idle.subtitle').replace('\n', '<br/>') }} />
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 13, color: '#ef4444' }}>
          ⚠️ {error} <button onClick={() => setError(null)} style={{ marginLeft: 8, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11 }}>✕</button>
        </div>
      )}

      <button
        onClick={() => openCamera('registration')}
        disabled={processing}
        style={{
          width: '100%', padding: '18px 24px', borderRadius: 12,
          border: '2px solid rgba(255,53,0,0.4)',
          background: processing ? 'rgba(255,53,0,0.12)' : 'rgba(255,53,0,0.06)',
          cursor: processing ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 32 }}>🪪</span>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
            {processing ? 'Traitement en cours…' : t('ocr.idle.reg_label')}
          </div>
          <div style={{ fontSize: 12, opacity: 0.5, marginTop: 2 }}
            dangerouslySetInnerHTML={{ __html: t('ocr.idle.reg_sub') }} />
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 20 }}>
          {processing ? '⏳' : (isMobile ? '📸' : '📁')}
        </span>
      </button>

      <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', fontSize: 12, color: 'rgba(240,237,232,0.5)', lineHeight: 1.6 }}
        dangerouslySetInnerHTML={{ __html: t('ocr.idle.tip') }} />
    </div>
  );

  // ── GREENCARD ─────────────────────────────────────────────────
  if (step === 'greencard') return (
    <div style={{ padding: 24 }}>
      {fileInput}
      <div style={{ marginBottom: 20, padding: '10px 14px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 13, color: '#22c55e' }}>
        ✅ {t('ocr.greencard.scanned')}
      </div>

      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>{t('ocr.greencard.title')}</h3>
      <p style={{ fontSize: 13, opacity: 0.55, lineHeight: 1.65, textAlign: 'center', marginBottom: 28 }}
        dangerouslySetInnerHTML={{ __html: t('ocr.greencard.subtitle') }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={() => openCamera('greencard')}
          disabled={processing}
          style={{ padding: '16px', borderRadius: 10, border: '1.5px solid rgba(255,53,0,0.4)', background: 'rgba(255,53,0,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}
        >
          <span style={{ fontSize: 24 }}>🟢</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700 }}>{t('ocr.greencard.scan_btn')}</div>
            <div style={{ fontSize: 11, opacity: 0.5 }}>{t('ocr.greencard.scan_sub')}</div>
          </div>
          <span style={{ marginLeft: 'auto' }}>{isMobile ? '📸' : '📁'}</span>
        </button>

        <button
          onClick={handleSkipGreenCard}
          style={{ padding: '16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', cursor: 'pointer', fontSize: 14, color: 'rgba(240,237,232,0.6)' }}
        >
          {t('ocr.greencard.skip_btn')}
        </button>
      </div>
    </div>
  );

  // ── SCANNING ─────────────────────────────────────────────────
  if (step === 'scanning') return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      {fileInput}
      <div style={{ fontSize: 56, marginBottom: 20, display: 'inline-block', animation: 'spin 1s linear infinite' }}>🔍</div>
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{t('ocr.scanning.title')}</h3>
      <p style={{ fontSize: 14, opacity: 0.5 }}>{t('ocr.scanning.subtitle')}</p>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── REVIEW ────────────────────────────────────────────────────
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
        {fileInput}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>✅</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              {skipGreenCard ? t('ocr.review.title_single') : t('ocr.review.title_pair')}
            </div>
            <div style={{ fontSize: 12, opacity: 0.5 }}>
              {t('ocr.review.confidence', { pct: Math.round(conf * 100) })}
              {skipGreenCard && <span style={{ marginLeft: 8, color: '#f59e0b' }}>{t('ocr.review.skipped')}</span>}
            </div>
          </div>
        </div>

        {lowConf.length > 0 && (
          <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 6 }}>
              ⚠️ {lowConf.length === 1 ? t('ocr.review.warnings', { count: lowConf.length }) : t('ocr.review.warnings_plural', { count: lowConf.length })}
            </div>
            {lowConf.map((f, i) => (
              <div key={i} style={{ fontSize: 12, opacity: 0.8, marginTop: 3 }}>
                • <strong>{f.field}</strong> : "{f.value}" ({Math.round(f.confidence * 100)}%)
              </div>
            ))}
          </div>
        )}

        {skipGreenCard && (
          <div style={{ marginBottom: 16, padding: 14, borderRadius: 10, background: 'rgba(255,165,0,0.07)', border: '1px solid rgba(255,165,0,0.25)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 10 }}>{t('ocr.review.insurance_title')}</div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 11, opacity: 0.5, letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>{t('ocr.review.company_label')}</label>
              <input
                type="text"
                placeholder={t('ocr.review.company_placeholder')}
                value={manualInsurance.company}
                onChange={e => setManualInsurance(p => ({ ...p, company: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, opacity: 0.5, letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>{t('ocr.review.policy_label')}</label>
              <input
                type="text"
                placeholder={t('ocr.review.policy_placeholder')}
                value={manualInsurance.policyNumber}
                onChange={e => setManualInsurance(p => ({ ...p, policyNumber: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
          </div>
        )}

        {[
          { title: t('ocr.review.section_vehicle'), data: result.registration.vehicle },
          { title: t('ocr.review.section_driver'), data: result.registration.driver },
          ...(result.greenCard?.insurance ? [{ title: t('ocr.review.section_greencard'), data: result.greenCard.insurance }] : []),
        ].map(({ title, data }) => data && Object.values(data as object).some(Boolean) && (
          <div key={title} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.4, textTransform: 'uppercase', marginBottom: 7, fontFamily: 'monospace' }}>{title}</div>
            <div style={{ borderRadius: 10, border: '1px solid rgba(240,237,232,0.08)', overflow: 'hidden' }}>
              {Object.entries(data as object).filter(([, v]) => v).map(([key, value], i, arr) => (
                <div key={key} style={{ padding: '9px 14px', display: 'flex', justifyContent: 'space-between', borderBottom: i < arr.length - 1 ? '1px solid rgba(240,237,232,0.05)' : 'none', background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                  <span style={{ fontSize: 12, opacity: 0.5, textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, maxWidth: '55%', textAlign: 'right' }}>{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button
            onClick={() => { setStep('idle'); setRegImage(null); setSkipGreenCard(false); setResult(null); }}
            style={{ flex: 1, padding: '14px', borderRadius: 10, border: '1.5px solid rgba(240,237,232,0.15)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 14 }}
          >
            {t('ocr.review.rescan')}
          </button>
          <button
            onClick={() => {
              const finalResult = skipGreenCard && (manualInsurance.company || manualInsurance.policyNumber)
                ? { ...result, greenCard: { ...result.greenCard, insurance: { company: manualInsurance.company, policyNumber: manualInsurance.policyNumber } } as OCRResult }
                : result;
              setStep('done');
              onComplete(finalResult);
            }}
            style={{ flex: 2, padding: '14px', borderRadius: 10, border: 'none', background: 'var(--boom)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}
          >
            {t('ocr.review.confirm')}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
