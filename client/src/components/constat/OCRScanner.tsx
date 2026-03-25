// client/src/components/constat/OCRScanner.tsx
// Scanner multi-documents — 1 seule étape, tous pays, analyse tout en parallèle

import { useState, useRef, useCallback } from 'react';
import { trpc } from '../../trpc';
import type { OCRResult } from '../../../../shared/types';

interface Props {
  role: 'A' | 'B' | 'C' | 'D' | 'E';
  onComplete: (result: { registration: OCRResult; greenCard?: OCRResult }) => void;
  onSkip?: () => void; // Passer sans scanner — saisie manuelle dans le formulaire
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

export function OCRScanner({ role, onComplete, onSkip }: Props) {
  const [docs, setDocs]           = useState<DocPhoto[]>([]);
  const [scanning, setScanning]   = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [result, setResult]       = useState<{ registration: OCRResult; greenCard?: OCRResult } | null>(null);
  const [manualIns, setManualIns] = useState({ company: '', policyNumber: '' });
  const fileRef   = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const batchMut = trpc.ocr.batchScan.useMutation({
    onSuccess: (data: OCRResult[]) => {
      if (!data?.length) { setError('Aucun document reconnu. Vérifiez la qualité des photos.'); setScanning(false); return; }
      const merged = mergeResults(data);
      setResult(merged);
      const company = merged.greenCard?.insurance?.company ?? merged.registration?.insurance?.company ?? '';
      const policyNumber = merged.greenCard?.insurance?.policyNumber ?? '';
      setManualIns({ company, policyNumber });
      setScanning(false);
    },
    onError: (err) => { setError(err.message || 'Erreur d\'analyse.'); setScanning(false); },
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
          r.onerror = () => rej(new Error('Lecture échouée'));
          r.readAsDataURL(file);
        });
        const b64 = await compressImage(raw);
        newDocs.push({ id: `d${Date.now()}${Math.random().toString(36).slice(2,5)}`, base64: b64, preview: `data:image/jpeg;base64,${b64}` });
      } catch { /* skip */ }
    }
    setDocs(p => [...p, ...newDocs]);
    setError(null);
    // Pas d'auto-scan — c'est l'utilisateur qui décide quand lancer l'analyse
  }, [docs.length]);

  const inputStyle: React.CSSProperties = {
    width:'100%', padding:'10px 12px', borderRadius:8,
    border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.05)',
    color:'var(--text)', fontSize:14, boxSizing:'border-box', fontFamily:'inherit', outline:'none',
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
      <div style={{ padding:24 }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <div style={{ width:44, height:44, borderRadius:10, background:'rgba(34,197,94,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>✅</div>
          <div>
            <div style={{ fontWeight:700, fontSize:16 }}>{docs.length} document{docs.length>1?'s':''} analysé{docs.length>1?'s':''}</div>
            <div style={{ fontSize:12, opacity:0.5 }}>Confiance : {Math.round((reg.confidence||0)*100)}%</div>
          </div>
          <button onClick={() => { setResult(null); setDocs([]); setManualIns({company:'',policyNumber:''}); }}
            style={{ marginLeft:'auto', padding:'6px 10px', borderRadius:6, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:12 }}>
            Rescanner
          </button>
        </div>

        {/* Véhicule */}
        {reg.vehicle && Object.values(reg.vehicle).some(Boolean) && (
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:10, letterSpacing:2, opacity:0.4, textTransform:'uppercase', marginBottom:7, fontFamily:'monospace' }}>🚗 Véhicule</div>
            <div style={{ borderRadius:10, border:'1px solid rgba(240,237,232,0.08)', overflow:'hidden' }}>
              {Object.entries(reg.vehicle).filter(([k,v]) => v && k!=='vehicleType' && k!=='category').map(([key,value],i,arr) => (
                <div key={key} style={{ padding:'9px 14px', display:'flex', justifyContent:'space-between', borderBottom:i<arr.length-1?'1px solid rgba(240,237,232,0.05)':'none', background:i%2===0?'rgba(255,255,255,0.02)':'transparent' }}>
                  <span style={{ fontSize:12, opacity:0.5 }}>{key==='licensePlate'?'Plaque':key==='vin'?'VIN':key}</span>
                  <span style={{ fontSize:13, fontWeight:600 }}>{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conducteur */}
        {reg.driver && Object.values(reg.driver).some(Boolean) && (
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:10, letterSpacing:2, opacity:0.4, textTransform:'uppercase', marginBottom:7, fontFamily:'monospace' }}>👤 Conducteur</div>
            <div style={{ borderRadius:10, border:'1px solid rgba(240,237,232,0.08)', overflow:'hidden' }}>
              {Object.entries(reg.driver).filter(([,v])=>v).map(([key,value],i,arr) => (
                <div key={key} style={{ padding:'9px 14px', display:'flex', justifyContent:'space-between', borderBottom:i<arr.length-1?'1px solid rgba(240,237,232,0.05)':'none', background:i%2===0?'rgba(255,255,255,0.02)':'transparent' }}>
                  <span style={{ fontSize:12, opacity:0.5 }}>{key==='firstName'?'Prénom':key==='lastName'?'Nom':key}</span>
                  <span style={{ fontSize:13, fontWeight:600, maxWidth:'55%', textAlign:'right' }}>{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assurance */}
        <div style={{ marginBottom:20, padding:14, borderRadius:10, background:hasIns?'rgba(34,197,94,0.06)':'rgba(255,165,0,0.06)', border:`1px solid ${hasIns?'rgba(34,197,94,0.2)':'rgba(255,165,0,0.2)'}` }}>
          <div style={{ fontSize:12, fontWeight:700, color:hasIns?'#22c55e':'#f59e0b', marginBottom:12 }}>
            {hasIns ? '✅ Assurance' : '⚠️ Assurance — compléter manuellement'}
          </div>
          <div style={{ marginBottom:8 }}>
            <label style={{ fontSize:11, opacity:0.5, letterSpacing:1, textTransform:'uppercase', display:'block', marginBottom:4 }}>Compagnie</label>
            <input type="text" value={company} onChange={e=>setManualIns(p=>({...p,company:e.target.value}))} placeholder="AXA, Zurich, Allianz, emmental…" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize:11, opacity:0.5, letterSpacing:1, textTransform:'uppercase', display:'block', marginBottom:4 }}>
              N° de police{!policyNumber&&<span style={{color:'#f59e0b',marginLeft:8}}>(saisie manuelle)</span>}
            </label>
            <input type="text" value={policyNumber} onChange={e=>setManualIns(p=>({...p,policyNumber:e.target.value}))} placeholder="50194120 / FR-2026-XXXXX…" style={inputStyle} />
          </div>
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={()=>{setResult(null);setDocs([]);}} style={btnStyle()}>Rescanner</button>
          <button onClick={confirm} style={btnStyle(true)}>Confirmer →</button>
        </div>
      </div>
    );
  }

  // ── SCANNING ────────────────────────────────────────────────
  if (scanning) return (
    <div style={{ padding:40, textAlign:'center' }}>
      <div style={{ fontSize:52, marginBottom:20, display:'inline-block', animation:'spin 1.2s linear infinite' }}>🔍</div>
      <div style={{ fontWeight:700, fontSize:17, marginBottom:8 }}>Analyse en cours…</div>
      <div style={{ fontSize:13, opacity:0.5 }}>{docs.length} document{docs.length>1?'s':''} · identification automatique</div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── MAIN ─────────────────────────────────────────────────────
  return (
    <div style={{ padding:24 }}>
      {/* input galerie (sans capture) */}
      <input ref={fileRef} type="file" accept="image/*" multiple
        style={{display:'none'}} onChange={handleFile} />
      {/* input caméra uniquement (avec capture) */}
      <input ref={cameraRef} type="file" accept="image/*"
        capture="environment"
        style={{display:'none'}} onChange={handleFile} />

      <div style={{ textAlign:'center', marginBottom:24 }}>
        <div style={{ fontSize:52, marginBottom:10 }}>📄</div>
        <h2 style={{ fontSize:20, fontWeight:700, marginBottom:8 }}>Photographiez vos documents</h2>
        <p style={{ fontSize:13, opacity:0.55, lineHeight:1.65 }}>
          Permis de circulation + carte verte en une seule analyse.<br/>
          L&apos;application identifie et extrait tout automatiquement.
        </p>
      </div>

      {/* Miniatures */}
      {docs.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:`repeat(${Math.min(docs.length,2)},1fr)`, gap:8, marginBottom:16 }}>
          {docs.map((doc,i) => (
            <div key={doc.id} style={{ position:'relative', borderRadius:10, overflow:'hidden', border:'1.5px solid rgba(34,197,94,0.3)', aspectRatio:'4/3' }}>
              <img src={doc.preview} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              <div style={{ position:'absolute', top:0, left:0, right:0, padding:'4px 8px', background:'rgba(0,0,0,0.55)', fontSize:11, color:'#fff' }}>Document {i+1}</div>
              <button onClick={()=>setDocs(p=>p.filter(d=>d.id!==doc.id))}
                style={{ position:'absolute', top:4, right:4, width:24, height:24, borderRadius:'50%', background:'rgba(239,68,68,0.85)', border:'none', color:'#fff', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', touchAction:'manipulation' }}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Boutons ajouter — caméra + galerie séparés */}
      {docs.length < MAX_DOCS && (
        <div style={{ display:'flex', gap:10, marginBottom:12 }}>
          <button onClick={()=>cameraRef.current?.click()}
            style={{ flex:2, padding:'16px', borderRadius:12,
              border:`2px solid ${docs.length===0?'rgba(255,53,0,0.5)':'rgba(255,255,255,0.15)'}`,
              background:docs.length===0?'rgba(255,53,0,0.06)':'rgba(255,255,255,0.03)',
              cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10,
              touchAction:'manipulation', WebkitTapHighlightColor:'transparent' }}>
            <span style={{ fontSize:26 }}>📸</span>
            <div style={{ textAlign:'left' }}>
              <div style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>Photographier</div>
              <div style={{ fontSize:11, opacity:0.45 }}>Caméra arrière</div>
            </div>
          </button>
          <button onClick={()=>fileRef.current?.click()}
            style={{ flex:1, padding:'16px', borderRadius:12,
              border:'1.5px solid rgba(255,255,255,0.12)',
              background:'rgba(255,255,255,0.03)',
              cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              touchAction:'manipulation', WebkitTapHighlightColor:'transparent' }}>
            <span style={{ fontSize:22 }}>🖼</span>
            <div style={{ textAlign:'left' }}>
              <div style={{ fontWeight:600, fontSize:13, color:'var(--text)' }}>Galerie</div>
              <div style={{ fontSize:10, opacity:0.4 }}>{docs.length}/{MAX_DOCS}</div>
            </div>
          </button>
        </div>
      )}

      {/* Guide pays */}
      {docs.length === 0 && (
        <div style={{ padding:'12px 14px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', fontSize:12, opacity:0.6, lineHeight:1.8, marginBottom:12 }}>
          <div style={{ fontWeight:600, marginBottom:4, opacity:0.8 }}>Quels documents scanner ?</div>
          🇨🇭 Permis de circulation + carte verte<br/>
          🇫🇷 Carte grise + carte verte / attestation<br/>
          🇩🇪 Zulassung + Grüne Karte<br/>
          🇬🇧 V5C + Certificate of Motor Insurance<br/>
          🇺🇸 🇨🇦 Registration + Insurance ID card<br/>
          🌍 Immatriculation + preuve d&apos;assurance
        </div>
      )}

      {error && (
        <div style={{ marginBottom:12, padding:12, borderRadius:8, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', fontSize:13, color:'#ef4444', display:'flex', alignItems:'center', gap:8 }}>
          ⚠️ {error}<button onClick={()=>setError(null)} style={{ marginLeft:'auto', background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:14 }}>✕</button>
        </div>
      )}

      {docs.length > 0 && (
        <button onClick={()=>{setScanning(true);setError(null);batchMut.mutate({images:docs.map(d=>d.base64)});}}
          style={{ width:'100%', padding:'16px', borderRadius:12, border:'none',
            background:'var(--boom)', color:'#fff', cursor:'pointer',
            fontSize:15, fontWeight:700, marginTop:4,
            touchAction:'manipulation', WebkitTapHighlightColor:'transparent' }}>
          🔍 Analyser {docs.length} document{docs.length>1?'s':''}
        </button>
      )}

      {/* Passer sans scanner — saisie manuelle dans le formulaire */}
      {onSkip && (
        <button onClick={onSkip}
          style={{ width:'100%', padding:'13px', borderRadius:10, marginTop:10,
            border:'1px solid rgba(255,255,255,0.08)', background:'transparent',
            cursor:'pointer', fontSize:13, color:'rgba(255,255,255,0.3)',
            touchAction:'manipulation', WebkitTapHighlightColor:'transparent' }}>
          Passer — saisie manuelle →
        </button>
      )}
    </div>
  );
}
