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
    color: 'var(--text)', fontSize: 15, outline: 'none',
    boxSizing: 'border-box',
  };
  const lbl: React.CSSProperties = {
    fontSize: 11, opacity: 0.45, marginBottom: 5,
    letterSpacing: 0.5, display: 'block', fontFamily: 'DM Mono, monospace',
  };

  const Field = ({ label, k, type = 'text', placeholder = '' }: {
    label: string; k: keyof PedestrianData; type?: string; placeholder?: string;
  }) => (
    <div style={{ marginBottom: 12 }}>
      <label style={lbl}>{label}</label>
      <input
        type={type} value={(data[k] as string) || ''}
        onChange={e => set(k, e.target.value)}
        placeholder={placeholder} style={inp}
      />
    </div>
  );

  const isMinor = data.dateOfBirth ? isMinorFromDOB(data.dateOfBirth) : false;

  const AccordionHeader = ({
    icon, title, open, onToggle, badge, done,
  }: {
    icon: string; title: string; open: boolean;
    onToggle: () => void; badge?: React.ReactNode; done?: boolean;
  }) => (
    <div
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '13px 16px', cursor: 'pointer', userSelect: 'none',
        background: open ? 'rgba(255,255,255,0.04)' : 'transparent',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ fontSize: 17 }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{title}</span>
        {badge}
        {done && !open && <span style={{ fontSize: 11, color: '#22c55e' }}>✓</span>}
      </div>
      <span style={{
        fontSize: 18, opacity: 0.35,
        transform: open ? 'rotate(90deg)' : 'none',
        transition: 'transform 0.2s', display: 'inline-block',
      }}>›</span>
    </div>
  );

  return (
    <div style={{ padding: '20px 20px 48px', maxWidth: 480, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <div style={{ fontSize: 42, marginBottom: 8 }}>{hasInjuries ? '🚑' : '🚶'}</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
          {filledByDriverA ? 'Coordonnées du piéton' : 'Vos coordonnées'}
        </h2>

        {hasInjuries ? (
          <div style={{
            marginTop: 10, padding: '10px 16px', borderRadius: 10,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)',
            fontSize: 13, color: '#ef4444', lineHeight: 1.4,
          }}>
            {filledByDriverA
              ? '🚑 Piéton blessé — seuls le nom et un numéro de contact sont indispensables'
              : '🚑 Prenez le temps qu\'il faut — seuls votre nom et un contact suffisent'}
          </div>
        ) : (
          <p style={{ fontSize: 13, opacity: 0.4, marginTop: 6 }}>
            {filledByDriverA
              ? 'Saisissez les infos du piéton ou scannez sa pièce d\'identité'
              : 'Pour recevoir votre copie PDF du constat'}
          </p>
        )}
      </div>

      {/* OCR */}
      <div style={{
        padding: '11px 14px', borderRadius: 12, marginBottom: 20,
        background: ocrDone ? 'rgba(34,197,94,0.07)' : 'rgba(255,53,0,0.05)',
        border: `1px solid ${ocrDone ? 'rgba(34,197,94,0.25)' : 'rgba(255,53,0,0.15)'}`,
        display: 'flex', alignItems: 'center', gap: 11,
      }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>{ocrDone ? '✅' : '📄'}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            {ocrDone ? 'Document lu' : 'Scanner un document d\'identité'}
          </div>
          <div style={{ fontSize: 11, opacity: 0.4, marginTop: 1 }}>
            {ocrDone ? 'Vérifiez les champs' : 'CI · Passeport · Permis — toutes nationalités'}
          </div>
          {ocrError && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>⚠️ {ocrError}</div>}
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={ocrLoading}
          style={{
            padding: '8px 13px', borderRadius: 8, border: 'none', flexShrink: 0,
            background: ocrDone ? 'rgba(255,255,255,0.08)' : 'var(--boom)',
            color: ocrDone ? 'rgba(240,237,232,0.45)' : '#fff',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}
        >
          {ocrLoading ? '⏳' : ocrDone ? 'Rescan' : '📷 Photo'}
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment"
        style={{ display: 'none' }}
        onChange={e => { if (e.target.files?.[0]) handleOCR(e.target.files[0]); }} />

      {/* === NIVEAU 1 — Essentiel === */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
        <Field label="PRÉNOM" k="firstName" placeholder="Jean" />
        <Field label="NOM" k="lastName" placeholder="Dupont" />
      </div>

      <Field label="TÉLÉPHONE" k="phone" type="tel" placeholder="+41 79 000 00 00" />

      <div style={{ marginBottom: 18 }}>
        <label style={lbl}>
          EMAIL <span style={{ opacity: 0.35 }}>{filledByDriverA ? '' : '(pour recevoir le PDF)'}</span>
        </label>
        <input
          type="email" value={data.email || ''}
          onChange={e => set('email', e.target.value)}
          placeholder={filledByDriverA ? 'pieton@email.com' : 'votre@email.com'}
          style={{
            ...inp,
            borderColor: data.email?.includes('@') ? 'rgba(34,197,94,0.45)' : 'rgba(240,237,232,0.12)',
          }}
        />
        {!data.email && (
          <div style={{ fontSize: 11, opacity: 0.3, marginTop: 4 }}>
            Optionnel — sans email, le PDF ne sera pas envoyé automatiquement
          </div>
        )}
      </div>

      {/* === NIVEAU 2 — Adresse === */}
      <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 10, overflow: 'hidden' }}>
        <AccordionHeader
          icon="🏠" title="Adresse"
          open={showAddress} onToggle={() => setShowAddress(v => !v)}
          done={!!(data.address || data.city)}
        />
        {showAddress && (
          <div style={{ padding: '4px 16px 14px' }}>
            <Field label="RUE ET N°" k="address" placeholder="Rue de la Paix 12" />
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0 10px' }}>
              <Field label="VILLE" k="city" placeholder="Genève" />
              <Field label="CODE POSTAL" k="postalCode" placeholder="1200" />
            </div>
            <Field label="PAYS" k="country" placeholder="Suisse" />
          </div>
        )}
      </div>

      {/* === NIVEAU 3 — Parents / Tuteur === */}
      <div style={{
        borderRadius: 12, marginBottom: 10, overflow: 'hidden',
        border: `1px solid ${isMinor ? 'rgba(245,158,11,0.35)' : 'rgba(255,255,255,0.08)'}`,
      }}>
        <AccordionHeader
          icon="👨‍👩‍👧" title="Parent / Tuteur"
          open={showParents} onToggle={() => setShowParents(v => !v)}
          done={!!(data.parentName || data.parentPhone)}
          badge={isMinor ? (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
              border: '1px solid rgba(245,158,11,0.3)',
            }}>MINEUR</span>
          ) : undefined}
        />
        {showParents && (
          <div style={{ padding: '4px 16px 14px' }}>
            {isMinor && (
              <div style={{
                padding: '8px 12px', borderRadius: 8, marginBottom: 14,
                background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)',
                fontSize: 12, color: '#f59e0b',
              }}>
                ⚠️ Le piéton est mineur — les coordonnées d'un parent ou tuteur sont importantes pour le dossier
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0 10px' }}>
              <Field label="NOM DU PARENT / TUTEUR" k="parentName" placeholder="Marie Dupont" />
              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>LIEN</label>
                <select
                  value={data.parentRelation || ''}
                  onChange={e => set('parentRelation', e.target.value)}
                  style={{ ...inp, cursor: 'pointer' }}
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
      <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 20, overflow: 'hidden' }}>
        <AccordionHeader
          icon="🪪" title="Pièce d'identité"
          open={showIdentity} onToggle={() => setShowIdentity(v => !v)}
          done={!!(data.idNumber || data.dateOfBirth)}
        />
        {showIdentity && (
          <div style={{ padding: '4px 16px 14px' }}>
            <Field label="DATE DE NAISSANCE" k="dateOfBirth" type="date" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 10px' }}>
              <Field label="N° DOCUMENT" k="idNumber" placeholder="X 000000" />
              <Field label="NATIONALITÉ" k="nationality" placeholder="Suisse" />
            </div>
          </div>
        )}
      </div>

      {/* Validation minimale */}
      {!hasMinimum && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, marginBottom: 14,
          background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)',
          fontSize: 12, color: '#f59e0b',
        }}>
          Minimum requis : <strong>prénom + nom</strong>, <strong>téléphone</strong>, ou <strong>email</strong>
        </div>
      )}

      {/* Boutons */}
      <button
        onClick={() => onComplete(data)}
        disabled={!hasMinimum}
        style={{
          width: '100%', padding: '16px', borderRadius: 12, border: 'none',
          background: hasMinimum ? 'var(--boom)' : 'rgba(255,255,255,0.07)',
          color: hasMinimum ? '#fff' : 'rgba(255,255,255,0.2)',
          cursor: hasMinimum ? 'pointer' : 'not-allowed',
          fontSize: 15, fontWeight: 700, marginBottom: 10, transition: 'all 0.2s',
        }}
      >
        ✅ Valider
      </button>

      {onSkip && (
        <button
          onClick={onSkip}
          style={{
            width: '100%', padding: '13px', borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.07)',
            background: 'transparent', color: 'rgba(240,237,232,0.28)',
            cursor: 'pointer', fontSize: 13,
          }}
        >
          Continuer sans informations piéton
        </button>
      )}
    </div>
  );
}
