// client/src/components/constat/OCRScanner.tsx
// Scanner multi-documents — 1 seule étape, tous pays, analyse tout en parallèle

import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { trpc } from '../../trpc';
import type { OCRResult } from '../../../../shared/types';

interface Props {
  role: 'A' | 'B' | 'C' | 'D' | 'E';
  onComplete: (result: { registration: OCRResult; greenCard?: OCRResult }) => void;
  onSkip?: () => void; // Passer sans scanner — saisie manuelle dans le formulaire
  sessionId?: string;        // optionnel — absent au step 'ocr' de ConstatFlow (session pas encore créée)
  participantToken?: string; // optionnel — idem
}

interface DocPhoto { id: string; base64: string; preview: string; }

const MAX_DOCS = 4;

async function compressImage(base64: string, maxPx = 1024, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(base64); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1] || base64);
      } catch { resolve(base64); }
    };
    img.onerror = () => resolve(base64);
    img.src = `data:image/jpeg;base64,${base64}`;
  });
}

function mergeResults(scans: OCRResult[]): { registration: OCRResult; greenCard?: OCRResult } {
  if (!scans.length) return { registration: { type: 'unknown', confidence: 0, warnings: [], lowConfidenceFields: [], rawText: '' } };

  const regs = scans.filter(s => s.type === 'vehicle_registration' || (s.vehicle?.licensePlate && !s.insurance?.policyNumber));
  const insDocs = scans.filter(s => ['green_card','insurance_certificate','insurance_id_card'].includes(s.type as string) || s.insurance?.policyNumber || s.insurance?.company);

  regs.sort((a, b) => (b.confidence||0) - (a.confidence||0));
  insDocs.sort((a, b) => (b.confidence||0) - (a.confidence||0));

  const registration = regs[0] || scans[0];
  let greenCard: OCRResult | undefined = insDocs[0];

  // Si le doc assurance n'a que l'assureur (pas de N° police) — cas permis CH seul
  if (greenCard && !greenCard.insurance?.policyNumber && !registration.insurance?.company) {
    registration.insurance = { ...registration.insurance, company: greenCard.insurance?.company };
    greenCard = undefined;
  }

  return { registration, greenCard };
}

export const OCRScanner = React.memo(function OCRScanner({ role, onComplete, onSkip, sessionId, participantToken }: Props) {
  const { t } = useTranslation();
  const [docs, setDocs]           = useState<DocPhoto[]>([]);
  const [scanning, setScanning]   = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [result, setResult]       = useState<{ registration: OCRResult; greenCard?: OCRResult } | null>(null);
  const [manualIns, setManualIns] = useState({ company: '', policyNumber: '' });
  const fileRef   = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const batchMut = trpc.ocr.batchScan.useMutation({
    onSuccess: (data: any) => {
      if (!data?.length) { setError(t('ocrScanner.no_doc_recognized')); setScanning(false); return; }
      const merged = mergeResults(data);
      setResult(merged);
      const company = merged.greenCard?.insurance?.company ?? merged.registration?.insurance?.company ?? '';
      const policyNumber = merged.greenCard?.insurance?.policyNumber ?? '';
      setManualIns({ company, policyNumber });
      setScanning(false);
    },
    onError: (err) => { setError(err.message || t('ocrScanner.analysis_error')); setScanning(false); },
  });

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, MAX_DOCS - docs.length);
    e.target.value = '';
    const newDocs: DocPhoto[] = [];
    for (const file of files) {
      try {
        const raw = await new Promise<string>((res, rej) => {
          const r = new FileReader();
          r.onload = () => res((r.result as string).split(',')[1]);
          r.onerror = () => rej(new Error(t('ocrScanner.read_failed')));
          r.readAsDataURL(file);
        });
        const b64 = await compressImage(raw);
        newDocs.push({ id: `d${Date.now()}${Math.random().toString(36).slice(2,5)}`, base64: b64, preview: `data:image/jpeg;base64,${b64}` });
      } catch { /* skip */ }
    }
    setDocs(p => [...p, ...newDocs]);
    setError(null);
  }, [docs.length, t]);

  const inputStyle: React.CSSProperties = {
    width:'100%', padding:'10px 12px', borderRadius:8,
    border:'1px solid rgba(255,255,255,0.25)', background:'rgba(255,255,255,0.05)',
    color:'var(--text)', fontSize:14, boxSizing:'border-box', fontFamily:'inherit',
  };

  const btnStyle = (primary?: boolean): React.CSSProperties => ({
    flex: primary ? 2 : 1, padding:'14px', borderRadius:10, border: primary ? 'none' : '1.5px solid rgba(240,237,232,0.15)',
    background: primary ? 'var(--boom)' : 'transparent', color: primary ? '#fff' : 'var(--text)',
    cursor:'pointer', fontSize:14, fontWeight: primary ? 700 : 400,
    touchAction:'manipulation', WebkitTapHighlightColor:'transparent',
  });

  // ── RÉSULTAT ────────────────────────────────────────────────
  if (result) {
    const reg = result.registration;
    const ins = result.greenCard?.insurance ?? result.registration?.insurance;
    const company = manualIns.company || ins?.company || '';
    const policyNumber = manualIns.policyNumber || ins?.policyNumber || '';
    const hasIns = !!company;

    const confirm = () => {
      const finalResult = {
        ...result,
        ...(company || policyNumber ? {
          greenCard: {
            ...(result.greenCard || { type:'insurance_certificate' as const, confidence:0, warnings:[], lowConfidenceFields:[], rawText:'' }),
            insurance: { company, policyNumber },
          } as OCRResult,
        } : {}),
      };
      onComplete(finalResult as any);
    };

    return (
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="rounded-[10px] flex items-center justify-center text-[22px] w-11 h-11"  style={{ background: 'rgba(34,197,94,0.15)' }}>✅</div>
          <div>
            <div className="font-bold text-base">{t('ocrScanner.docs_analyzed', { count: docs.length })}</div>
            <div className="text-xs opacity-75">{t('ocrScanner.confidence', { pct: Math.round((reg.confidence||0)*100) })}</div>
          </div>
          <button onClick={() => { setResult(null); setDocs([]); setManualIns({company:'',policyNumber:''}); }}
            className="ml-auto rounded-md bg-transparent cursor-pointer text-xs px-2.5 py-1.5" style={{ border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.4)' }}>
            {t('ocrScanner.rescan')}
          </button>
        </div>

        {/* Véhicule */}
        {reg.vehicle && Object.values(reg.vehicle).some(Boolean) && (
          <div className="mb-3.5">
            <div className="text-[10px] uppercase opacity-70 mb-[7px] tracking-[2px]" style={{ fontFamily: 'monospace' }}>{t('ocrScanner.vehicle_section')}</div>
            <div className="rounded-[10px] overflow-hidden" style={{ border: '1px solid rgba(240,237,232,0.08)' }}>
              {Object.entries(reg.vehicle).filter(([k,v]) => v && k!=='vehicleType' && k!=='category').map(([key,value],i,arr) => (
                <div key={key} className="flex justify-between px-3.5 py-[9px]" style={{ borderBottom: i<arr.length-1?'1px solid rgba(240,237,232,0.05)':'none', background: i%2===0?'rgba(255,255,255,0.02)':'transparent' }}>
                  <span className="text-xs opacity-75">{key==='licensePlate'?t('ocrScanner.plate'):key==='vin'?'VIN':key}</span>
                  <span className="text-[13px] font-semibold">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conducteur */}
        {reg.driver && Object.values(reg.driver).some(Boolean) && (
          <div className="mb-3.5">
            <div className="text-[10px] uppercase opacity-70 mb-[7px] tracking-[2px]" style={{ fontFamily: 'monospace' }}>{t('ocrScanner.driver_section')}</div>
            <div className="rounded-[10px] overflow-hidden" style={{ border: '1px solid rgba(240,237,232,0.08)' }}>
              {Object.entries(reg.driver).filter(([,v])=>v).map(([key,value],i,arr) => (
                <div key={key} className="flex justify-between px-3.5 py-[9px]" style={{ borderBottom: i<arr.length-1?'1px solid rgba(240,237,232,0.05)':'none', background: i%2===0?'rgba(255,255,255,0.02)':'transparent' }}>
                  <span className="text-xs opacity-75">{key==='firstName'?t('ocrScanner.firstName'):key==='lastName'?t('ocrScanner.lastName'):key}</span>
                  <span className="text-[13px] font-semibold text-right" style={{ maxWidth: '55%' }}>{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assurance */}
        <div className="mb-5 p-3.5 rounded-[10px]" style={{ background: hasIns?'rgba(34,197,94,0.06)':'rgba(255,165,0,0.06)', border: `1px solid ${hasIns?'rgba(34,197,94,0.2)':'rgba(255,165,0,0.2)'}` }}>
          <div className="text-xs font-bold mb-3" style={{ color: hasIns?'#22c55e':'#f59e0b' }}>
            {hasIns ? t('ocrScanner.insurance_found') : t('ocrScanner.insurance_manual')}
          </div>
          <div className="mb-2">
            <label className="text-[11px] uppercase block mb-1 opacity-75 tracking-[1px]">{t('ocrScanner.company_label')}</label>
            <input type="text" aria-label={t('ocrScanner.company_aria')} value={company} onChange={e=>setManualIns(p=>({...p,company:e.target.value}))} placeholder={t('ocrScanner.company_placeholder')} style={inputStyle} />
          </div>
          <div>
            <label className="text-[11px] uppercase block mb-1 opacity-75 tracking-[1px]">
              {t('ocrScanner.policy_label')}{!policyNumber&&<span className="ml-2 text-[#f59e0b]">{t('ocrScanner.policy_manual_hint')}</span>}
            </label>
            <input type="text" aria-label={t('ocrScanner.policy_aria')} value={policyNumber} onChange={e=>setManualIns(p=>({...p,policyNumber:e.target.value}))} placeholder={t('ocrScanner.policy_placeholder')} style={inputStyle} />
          </div>
        </div>

        <div className="flex gap-2.5">
          <button onClick={()=>{setResult(null);setDocs([]);}} style={btnStyle()}>{t('ocrScanner.rescan')}</button>
          <button onClick={confirm} style={btnStyle(true)}>{t('ocrScanner.confirm')}</button>
        </div>
      </div>
    );
  }

  // ── SCANNING ────────────────────────────────────────────────
  if (scanning) return (
    <div role="status" aria-label={t('ocrScanner.scanning_title')} className="p-10 text-center">
      <div className="mb-5 inline-block text-[52px]" style={{ animation: 'spin 1.2s linear infinite' }} aria-hidden="true">🔍</div>
      <div className="font-bold mb-2 text-[17px]">{t('ocrScanner.scanning_title')}</div>
      <div className="text-[13px] opacity-75">{t('ocrScanner.scanning_subtitle', { count: docs.length })}</div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── MAIN ─────────────────────────────────────────────────────
  return (
    <div className="p-6">
      {/* input galerie (sans capture) */}
      <input ref={fileRef} type="file" accept="image/*" multiple
        aria-label={t('ocrScanner.upload_gallery_aria')}
        className="hidden" onChange={handleFile} />
      {/* input caméra uniquement (avec capture) */}
      <input ref={cameraRef} type="file" accept="image/*"
        aria-label={t('ocrScanner.take_photo_aria')}
        capture="environment"
        className="hidden" onChange={handleFile} />

      <div className="text-center mb-6">
        <div className="mb-2.5 text-[52px]">📄</div>
        <h2 className="text-xl font-bold mb-2">{t('ocrScanner.photo_title')}</h2>
        <p className="text-[13px] opacity-75 leading-[1.65]">
          {t('ocrScanner.photo_subtitle')}<br/>
          {t('ocrScanner.photo_subtitle2')}
        </p>
      </div>

      {/* Miniatures */}
      {docs.length > 0 && (
        <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `repeat(${Math.min(docs.length,2)},1fr)` }}>
          {docs.map((doc,i) => (
            <div key={doc.id} className="relative rounded-[10px] overflow-hidden" style={{ border: '1.5px solid rgba(34,197,94,0.3)', aspectRatio: '4/3' }}>
              <img src={doc.preview} alt={t('ocrScanner.doc_scanned', { n: i + 1 })} loading="lazy" className="w-full h-full object-cover" />
              <div className="absolute text-[11px] text-white top-0 left-0 right-0 px-2 py-1" style={{ background: 'rgba(0,0,0,0.55)' }}>{t('ocrScanner.doc_label', { n: i+1 })}</div>
              <button onClick={()=>setDocs(p=>p.filter(d=>d.id!==doc.id))}
                className="absolute rounded-full border-0 text-white cursor-pointer text-sm flex items-center justify-center touch-manipulation top-1 right-1 w-6 h-6"  style={{ background: 'rgba(239,68,68,0.85)' }}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Boutons ajouter — caméra + galerie séparés */}
      {docs.length < MAX_DOCS && (
        <div className="flex gap-2.5 mb-3">
          <button onClick={()=>cameraRef.current?.click()}
            className="p-4 rounded-xl gap-2.5" style={{ flex:2, border:`2px solid ${docs.length===0?'rgba(255,53,0,0.5)':'rgba(255,255,255,0.15)'}`, background:docs.length===0?'rgba(255,53,0,0.06)':'rgba(255,255,255,0.03)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', touchAction:'manipulation', WebkitTapHighlightColor:'transparent' }}>
            <span className="text-[26px]">📸</span>
            <div className="text-left">
              <div className="font-bold text-sm" style={{ color: 'var(--text)' }}>{t('ocrScanner.photograph')}</div>
              <div className="text-[11px] opacity-70" >{t('ocrScanner.rear_camera')}</div>
            </div>
          </button>
          <button onClick={()=>fileRef.current?.click()}
            className="p-4 rounded-xl gap-2 cursor-pointer touch-manipulation flex items-center justify-center" style={{ flex:1, border:'1.5px solid rgba(255,255,255,0.25)', background:'rgba(255,255,255,0.03)', WebkitTapHighlightColor:'transparent' }}>
            <span className="text-[22px]">🖼</span>
            <div className="text-left">
              <div className="font-semibold text-[13px]" style={{ color: 'var(--text)' }}>{t('ocrScanner.gallery')}</div>
              <div className="text-[10px] opacity-70" >{docs.length}/{MAX_DOCS}</div>
            </div>
          </button>
        </div>
      )}

      {/* Guide pays */}
      {docs.length === 0 && (
        <div className="rounded-[10px] text-xs mb-3 px-3.5 py-3 opacity-85 leading-[1.8]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="font-semibold mb-1 opacity-80" >{t('ocrScanner.which_docs')}</div>
          {t('ocrScanner.doc_ch')}<br/>
          {t('ocrScanner.doc_fr')}<br/>
          {t('ocrScanner.doc_de')}<br/>
          {t('ocrScanner.doc_gb')}<br/>
          {t('ocrScanner.doc_us')}<br/>
          {t('ocrScanner.doc_world')}
        </div>
      )}

      {error && (
        <div className="mb-3 p-3 rounded-lg text-[13px] text-red-500 flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
          ⚠️ {error}<button onClick={()=>setError(null)} className="ml-auto bg-transparent border-0 text-red-500 cursor-pointer text-sm" aria-label={t('ocrScanner.close_error_aria')}>✕</button>
        </div>
      )}

      {docs.length > 0 && (
        <button onClick={()=>{setScanning(true);setError(null);batchMut.mutate({images:docs.map(d=>d.base64), ...(sessionId ? {sessionId} : {}), ...(participantToken ? {participantToken} : {})});}}
          className="p-4 rounded-xl text-white mt-1 cursor-pointer font-bold touch-manipulation w-full text-[15px]" style={{ border:'none', background:'var(--boom)', WebkitTapHighlightColor:'transparent' }}>
          {t('ocrScanner.analyze_btn', { count: docs.length })}
        </button>
      )}

      {/* Passer sans scanner — saisie manuelle dans le formulaire */}
      {onSkip && (
        <button onClick={onSkip}
          className="p-[13px] rounded-[10px] mt-2.5 cursor-pointer touch-manipulation w-full text-[13px]" style={{ border:'1px solid rgba(255,255,255,0.25)', background:'transparent', color:'rgba(255,255,255,0.6)', WebkitTapHighlightColor:'transparent' }}>
          {t('ocrScanner.skip_manual')}
        </button>
      )}
    </div>
  );
});
