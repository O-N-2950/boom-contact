/**
 * boom.contact — Formulaire Piéton v2
 * UX progressive : essentiel d'abord, détails en accordéon
 * Gère : piéton blessé, mineur, sans téléphone
 */
import { useState, useRef, useEffect } from 'react';

export interface PedestrianData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  dateOfBirth?: string;
  nationality?: string;
  idNumber?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  parentRelation?: string;
  isMinor?: boolean;
  isInjured?: boolean;
}

interface Props {
  filledByDriverA?: boolean;
  hasInjuries?: boolean;
  onComplete: (data: PedestrianData) => void;
  onSkip?: () => void;
}

function isMinorFromDOB(dob: string): boolean {
  if (!dob) return false;
  const birth = new Date(dob);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear()
    - (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
  return age < 18;
}

export function PedestrianForm({ filledByDriverA = false, hasInjuries = false, onComplete, onSkip }: Props) {
  const [data, setData] = useState<PedestrianData>({ isInjured: hasInjuries });
  const [showAddress, setShowAddress]   = useState(false);
  const [showParents, setShowParents]   = useState(false);
  const [showIdentity, setShowIdentity] = useState(false);
  const [ocrLoading, setOcrLoading]     = useState(false);
  const [ocrDone, setOcrDone]           = useState(false);
  const [ocrError, setOcrError]         = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof PedestrianData, v: string | boolean) =>
    setData(prev => ({ ...prev, [k]: v }));

  useEffect(() => {
    if (data.dateOfBirth && isMinorFromDOB(data.dateOfBirth)) {
      set('isMinor', true);
      setShowParents(true);
    } else if (data.dateOfBirth) {
      set('isMinor', false);
    }
  }, [data.dateOfBirth]);

  const hasMinimum = !!(
    (data.firstName?.trim() && data.lastName?.trim()) ||
    data.phone?.trim() ||
    data.email?.trim()
  );

  const handleOCR = async (file: File) => {
    setOcrLoading(true);
    setOcrError(null);
    try {
      const b64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res((r.result as string).split(',')[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });

      const resp = await fetch('/api/ocr-identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: b64, mediaType: file.type }),
      });

      if (!resp.ok) throw new Error('OCR failed');
      const parsed = await resp.json();

      setData(prev => ({
        ...prev,
        firstName:   prev.firstName   || parsed.firstName   || '',
        lastName:    prev.lastName    || parsed.lastName    || '',
        dateOfBirth: prev.dateOfBirth || parsed.dateOfBirth || '',
        address:     prev.address     || parsed.address     || '',
        city:        prev.city        || parsed.city        || '',
        postalCode:  prev.postalCode  || parsed.postalCode  || '',
        country:     prev.country     || parsed.country     || '',
        nationality: prev.nationality || parsed.nationality || '',
        idNumber:    prev.idNumber    || parsed.idNumber    || '',
      }));

      if (parsed.address || parsed.city) setShowAddress(true);
      if (parsed.idNumber || parsed.nationality || parsed.dateOfBirth) setShowIdentity(true);
      setOcrDone(true);
    } catch {
      setOcrError('Lecture impossible — saisissez manuellement');
    } finally {
      setOcrLoading(false);
    }
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '13px 14px', borderRadius: 10,
    border: '1.5px solid rgba(240,237,232,0.12)',
    background: 'rgba(255,255,255,0.04)',
    color: 'var(--text)', fontSize: 15,
    boxSizing: 'border-box',
    colorScheme: 'dark',
  };
  const lbl: React.CSSProperties = {
    fontSize: 11, opacity: 0.7, marginBottom: 5,
    letterSpacing: 0.5, display: 'block', fontFamily: 'DM Mono, monospace',
  };

  const Field = ({ label, k, type = 'text', placeholder = '' }: {
    label: string; k: keyof PedestrianData; type?: string; placeholder?: string;
  }) => {
    const fieldId = `ped-${k}`;
    return (
      <div className="mb-3">
        <label htmlFor={fieldId} style={lbl}>{label}</label>
        <input
          id={fieldId}
          aria-label={label}
          type={type} value={(data[k] as string) || ''}
          onChange={e => set(k, e.target.value)}
          placeholder={placeholder} style={inp}
        />
      </div>
    );
  };

  const isMinor = data.dateOfBirth ? isMinorFromDOB(data.dateOfBirth) : false;

  const AccordionHeader = ({
    icon, title, open, onToggle, badge, done,
  }: {
    icon: string; title: string; open: boolean;
    onToggle: () => void; badge?: React.ReactNode; done?: boolean;
  }) => (
    <div
      onClick={onToggle}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
      role="button"
      tabIndex={0}
      className="flex items-center justify-between cursor-pointer select-none px-4 py-[13px]" style={{ background: open ? 'rgba(255,255,255,0.04)' : 'transparent' }}
    >
      <div className="flex items-center gap-[9px]" >
        <span className="text-[17px]">{icon}</span>
        <span className="text-[13px] font-semibold">{title}</span>
        {badge}
        {done && !open && <span className="text-[11px] text-green-500">✓</span>}
      </div>
      <span className="text-lg opacity-70 inline-block" style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
    </div>
  );

  return (
    <div className="mx-auto max-w-[480px] px-5 pt-5 pb-12">

      {/* Header */}
      <div className="text-center mb-[22px]" >
        <div className="mb-2 text-[42px]">{hasInjuries ? '🚑' : '🚶'}</div>
        <h2 className="text-lg font-extrabold m-0">
          {filledByDriverA ? 'Coordonnées du piéton' : 'Vos coordonnées'}
        </h2>

        {hasInjuries ? (
          <div className="mt-2.5 rounded-[10px] text-[13px] px-4 py-2.5 leading-[1.4] text-[#ef4444]" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)' }}>
            {filledByDriverA
              ? '🚑 Piéton blessé — seuls le nom et un numéro de contact sont indispensables'
              : '🚑 Prenez le temps qu\'il faut — seuls votre nom et un contact suffisent'}
          </div>
        ) : (
          <p className="text-[13px] opacity-70 mt-1.5" >
            {filledByDriverA
              ? 'Saisissez les infos du piéton ou scannez sa pièce d\'identité'
              : 'Pour recevoir votre copie PDF du constat'}
          </p>
        )}
      </div>

      {/* OCR */}
      <div className="rounded-xl mb-5 flex items-center gap-[11px] px-3.5 py-[11px]" style={{ background: ocrDone ? 'rgba(34,197,94,0.07)' : 'rgba(255,53,0,0.05)', border: `1px solid ${ocrDone ? 'rgba(34,197,94,0.25)' : 'rgba(255,53,0,0.15)'}` }}>
        <span className="text-[22px] shrink-0">{ocrDone ? '✅' : '📄'}</span>
        <div className="flex-1">
          <div className="text-[13px] font-bold">
            {ocrDone ? 'Document lu' : 'Scanner un document d\'identité'}
          </div>
          <div className="text-[11px] opacity-70 mt-px" >
            {ocrDone ? 'Vérifiez les champs' : 'CI · Passeport · Permis — toutes nationalités'}
          </div>
          {ocrError && <div className="text-[11px] text-red-500 mt-1">⚠️ {ocrError}</div>}
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={ocrLoading}
          className="rounded-lg border-0 shrink-0 text-xs font-bold cursor-pointer px-[13px] py-2" style={{ background: ocrDone ? 'rgba(255,255,255,0.08)' : 'var(--boom)', color: ocrDone ? 'rgba(240,237,232,0.45)' : '#fff' }}
        >
          {ocrLoading ? '⏳' : ocrDone ? 'Rescan' : '📷 Photo'}
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment"
        aria-label="Télécharger une pièce d'identité"
        className="hidden"
        onChange={e => { if (e.target.files?.[0]) handleOCR(e.target.files[0]); }} />

      {/* === NIVEAU 1 — Essentiel === */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
        <Field label="PRÉNOM" k="firstName" placeholder="Jean" />
        <Field label="NOM" k="lastName" placeholder="Dupont" />
      </div>

      <Field label="TÉLÉPHONE" k="phone" type="tel" placeholder="+41 79 000 00 00" />

      <div className="mb-[18px]">
        <label htmlFor="ped-email" style={lbl}>
          EMAIL <span className="opacity-70">{filledByDriverA ? '' : '(pour recevoir le PDF)'}</span>
        </label>
        <input
          id="ped-email"
          type="email" value={data.email || ''}
          onChange={e => set('email', e.target.value)}
          placeholder={filledByDriverA ? 'pieton@email.com' : 'votre@email.com'}
          aria-label="Adresse email"
          style={{
            ...inp,
            borderColor: data.email?.includes('@') ? 'rgba(34,197,94,0.45)' : 'rgba(240,237,232,0.12)',
          }}
        />
        {!data.email && (
          <div className="text-[11px] mt-1 opacity-70" >
            Optionnel — sans email, le PDF ne sera pas envoyé automatiquement
          </div>
        )}
      </div>

      {/* === NIVEAU 2 — Adresse === */}
      <div className="rounded-xl mb-2.5 overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.25)' }}>
        <AccordionHeader
          icon="🏠" title="Adresse"
          open={showAddress} onToggle={() => setShowAddress(v => !v)}
          done={!!(data.address || data.city)}
        />
        {showAddress && (
          <div className="px-4 pt-1 pb-3.5">
            <Field label="RUE ET N°" k="address" placeholder="Rue de la Paix 12" />
            <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '0 10px' }}>
              <Field label="VILLE" k="city" placeholder="Genève" />
              <Field label="CODE POSTAL" k="postalCode" placeholder="1200" />
            </div>
            <Field label="PAYS" k="country" placeholder="Suisse" />
          </div>
        )}
      </div>

      {/* === NIVEAU 3 — Parents / Tuteur === */}
      <div className="rounded-xl mb-2.5 overflow-hidden" style={{ border: `1px solid ${isMinor ? 'rgba(245,158,11,0.35)' : 'rgba(255,255,255,0.25)'}` }}>
        <AccordionHeader
          icon="👨‍👩‍👧" title="Parent / Tuteur"
          open={showParents} onToggle={() => setShowParents(v => !v)}
          done={!!(data.parentName || data.parentPhone)}
          badge={isMinor ? (
            <span className="text-[10px] font-bold rounded-[20px] px-2 py-0.5 text-[#f59e0b]" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)' }}>MINEUR</span>
          ) : undefined}
        />
        {showParents && (
          <div className="px-4 pt-1 pb-3.5">
            {isMinor && (
              <div className="rounded-lg mb-3.5 text-xs px-3 py-2 text-[#f59e0b]" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
                ⚠️ Le piéton est mineur — les coordonnées d'un parent ou tuteur sont importantes pour le dossier
              </div>
            )}
            <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '0 10px' }}>
              <Field label="NOM DU PARENT / TUTEUR" k="parentName" placeholder="Marie Dupont" />
              <div className="mb-3">
                <label htmlFor="ped-parentRelation" style={lbl}>LIEN</label>
                <select
                  id="ped-parentRelation"
                  value={data.parentRelation || ''}
                  onChange={e => set('parentRelation', e.target.value)}
                  aria-label="Lien de parenté"
                  className="cursor-pointer"
                >
                  <option value="">—</option>
                  <option value="père">Père</option>
                  <option value="mère">Mère</option>
                  <option value="tuteur">Tuteur légal</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
            </div>
            <Field label="TÉLÉPHONE PARENT" k="parentPhone" type="tel" placeholder="+41 79 000 00 00" />
            <Field label="EMAIL PARENT" k="parentEmail" type="email" placeholder="parent@email.com" />
          </div>
        )}
      </div>

      {/* === Pièce d'identité === */}
      <div className="rounded-xl mb-5 overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.25)' }}>
        <AccordionHeader
          icon="🪪" title="Pièce d'identité"
          open={showIdentity} onToggle={() => setShowIdentity(v => !v)}
          done={!!(data.idNumber || data.dateOfBirth)}
        />
        {showIdentity && (
          <div className="px-4 pt-1 pb-3.5">
            <Field label="DATE DE NAISSANCE" k="dateOfBirth" type="date" />
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0 10px' }}>
              <Field label="N° DOCUMENT" k="idNumber" placeholder="X 000000" />
              <Field label="NATIONALITÉ" k="nationality" placeholder="Suisse" />
            </div>
          </div>
        )}
      </div>

      {/* Validation minimale */}
      {!hasMinimum && (
        <div className="rounded-lg mb-3.5 text-xs px-3.5 py-2.5 text-[#f59e0b]" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)' }}>
          Minimum requis : <strong>prénom + nom</strong>, <strong>téléphone</strong>, ou <strong>email</strong>
        </div>
      )}

      {/* Boutons */}
      <button
        onClick={() => onComplete(data)}
        disabled={!hasMinimum}
        className="w-full p-4 rounded-xl border-0 font-bold mb-2.5 transition-all duration-200 text-[15px]" style={{ background: hasMinimum ? 'var(--boom)' : 'rgba(255,255,255,0.07)', color: hasMinimum ? '#fff' : 'rgba(255,255,255,0.6)', cursor: hasMinimum ? 'pointer' : 'not-allowed' }}
      >
        ✅ Valider
      </button>

      {onSkip && (
        <button
          onClick={onSkip}
          className="w-full p-[13px] rounded-xl bg-transparent cursor-pointer text-[13px]" style={{ border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(240,237,232,0.55)' }}
        >
          Continuer sans informations piéton
        </button>
      )}
    </div>
  );
}
