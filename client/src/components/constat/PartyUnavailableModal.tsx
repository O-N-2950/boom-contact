/**
 * boom.contact — PartyUnavailableModal
 * Quand la partie B ne peut pas rejoindre le constat
 * 5 raisons → photo plaque OCR → suggestion police proactive
 * Produit une "Déclaration unilatérale de sinistre" légalement reconnue
 */
import { useState, useRef } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

export type PartyBReason =
  | 'injured_unconscious'  // Blessé grave / inconscient
  | 'deceased'             // Décédé
  | 'fled'                 // Fuite / délit de fuite
  | 'refused'              // Refus de participer
  | 'no_smartphone';       // Sans smartphone

export interface PartyBStatus {
  reason: PartyBReason;
  reasonLabel: string;
  platePhoto?: string;       // base64 JPEG
  plateNumber?: string;      // extrait OCR
  vehicleDescription?: string;
  policeReportRef?: string;
  notes?: string;
  recordedAt: string;        // ISO timestamp
}

interface Props {
  onConfirm: (status: PartyBStatus) => void;
  onCancel: () => void;
}

const REASONS: {
  id: PartyBReason;
  icon: string;
  label: string;
  sub: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  suggestPolice: boolean;
  plateMandatory: boolean;
}[] = [
  {
    id: 'injured_unconscious',
    icon: '🚑',
    label: 'Blessé grave / inconscient',
    sub: 'La partie B ne peut pas interagir',
    urgency: 'critical',
    suggestPolice: true,
    plateMandatory: true,
  },
  {
    id: 'deceased',
    icon: '⚫',
    label: 'Décédé',
    sub: 'Accident mortel — la police est obligatoire',
    urgency: 'critical',
    suggestPolice: true,
    plateMandatory: true,
  },
  {
    id: 'fled',
    icon: '🚗💨',
    label: 'Fuite / délit de fuite',
    sub: 'Le véhicule B a quitté les lieux',
    urgency: 'high',
    suggestPolice: true,
    plateMandatory: true,
  },
  {
    id: 'refused',
    icon: '🚫',
    label: 'Refus de participer',
    sub: 'La partie B refuse de coopérer',
    urgency: 'medium',
    suggestPolice: false,
    plateMandatory: false,
  },
  {
    id: 'no_smartphone',
    icon: '📵',
    label: 'Sans smartphone',
    sub: 'Je vais saisir ses données manuellement',
    urgency: 'low',
    suggestPolice: false,
    plateMandatory: false,
  },
];

const URGENCY_COLORS = {
  critical: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.35)', text: '#ef4444', selected: 'rgba(239,68,68,0.2)' },
  high:     { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)', text: '#f59e0b', selected: 'rgba(245,158,11,0.18)' },
  medium:   { bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.25)', text: '#6366f1', selected: 'rgba(99,102,241,0.18)' },
  low:      { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.25)', text: 'rgba(240,237,232,0.6)', selected: 'rgba(255,255,255,0.25)' },
};

async function ocrPlate(b64: string, mediaType: string): Promise<string> {
  // Route via tRPC backend — ocr.scan endpoint
  const res = await fetch('/trpc/ocr.scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({ json: {
      imageBase64: b64,
      mediaType: (mediaType as 'image/jpeg' | 'image/png' | 'image/webp') || 'image/jpeg',
      documentType: 'auto',
    }}),
  });
  if (!res.ok) throw new Error(`OCR error ${res.status}`);
  const data = await res.json();
  return data?.result?.data?.vehicle?.licensePlate?.value || '';
}

export function PartyUnavailableModal({ onConfirm, onCancel }: Props) {
  const [step, setStep] = useState<'reason' | 'plate' | 'details'>('reason');
  const [selected, setSelected] = useState<typeof REASONS[0] | null>(null);
  const [platePhoto, setPlatePhoto] = useState<string | null>(null);
  const [plateNumber, setPlateNumber] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [vehicleDesc, setVehicleDesc] = useState('');
  const [policeRef, setPoliceRef] = useState('');
  const [notes, setNotes] = useState('');
  const [policeAlertDismissed, setPoliceAlertDismissed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const modalRef = useFocusTrap<HTMLDivElement>(onCancel);

  const handlePhotoCapture = async (file: File) => {
    setOcrLoading(true);
    try {
      const b64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res((r.result as string).split(',')[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      setPlatePhoto(b64);
      const plate = await ocrPlate(b64, file.type);
      if (plate !== 'ILLISIBLE') setPlateNumber(plate);
    } catch (error) {
      console.error('PartyUnavailableModal: OCR plate read failed', error);
    } finally {
      setOcrLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!selected) return;
    onConfirm({
      reason: selected.id,
      reasonLabel: selected.label,
      platePhoto: platePhoto || undefined,
      plateNumber: plateNumber || undefined,
      vehicleDescription: vehicleDesc || undefined,
      policeReportRef: policeRef || undefined,
      notes: notes || undefined,
      recordedAt: new Date().toISOString(),
    });
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: '1.5px solid rgba(240,237,232,0.12)',
    background: 'rgba(255,255,255,0.04)',
    color: 'var(--text)', fontSize: 14,
    boxSizing: 'border-box',
  };

  return (
    <div className="fixed inset-0 flex items-end justify-center" style={{ zIndex: 2000, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)' }}>
      <div ref={modalRef} role="dialog" aria-label="Partie B indisponible" aria-modal="true" className="w-full max-w-[480px] flex flex-col bg-[#0A0A16]" style={{ border: '1px solid rgba(255,255,255,0.25)', borderRadius: '20px 20px 0 0', maxHeight: '92svh', animation: 'slideUp 0.25s ease' }}>
        {/* Handle */}
        <div className="flex justify-center" style={{ padding: '12px 0 0' }}>
          <div className="w-9 h-1 rounded-sm" style={{ background: 'rgba(255,255,255,0.25)' }} />
        </div>

        {/* Header */}
        <div className="px-5 pt-3.5 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.25)' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-extrabold text-base">Partie B indisponible</div>
              <div className="text-[11px] mt-0.5"  style={{ opacity: 0.755 }}>
                {step === 'reason' && 'Sélectionnez la raison'}
                {step === 'plate' && 'Photo de la plaque'}
                {step === 'details' && 'Informations complémentaires'}
              </div>
            </div>
            <button onClick={onCancel} aria-label="Annuler" className="border-0 cursor-pointer rounded-lg text-xs px-3 py-1.5" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(240,237,232,0.5)' }}>Annuler</button>
          </div>
          {/* Step dots */}
          <div className="flex gap-1.5 mt-3">
            {['reason', 'plate', 'details'].map((s, i) => (
              <div key={s} className="h-[3px] flex-1 rounded-sm" style={{ background: ['reason', 'plate', 'details'].indexOf(step) >= i
                  ? 'var(--boom)' : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6">

          {/* ── STEP 1 : RAISON ── */}
          {step === 'reason' && (
            <div>
              <div className="text-[13px] leading-normal opacity-70 mb-3.5" >
                Le constat sera établi en <strong style={{ color: 'var(--boom)' }}>déclaration unilatérale de sinistre</strong> — document légalement reconnu par les assurances dans toute l'Europe.
              </div>
              {REASONS.map(r => {
                const c = URGENCY_COLORS[r.urgency];
                const isSelected = selected?.id === r.id;
                return (
                  <button key={r.id} onClick={() => setSelected(r)} className="w-full text-left rounded-xl cursor-pointer mb-2 flex items-center gap-3.5 px-4 py-3.5" style={{ border: `1.5px solid ${isSelected ? c.border : 'rgba(255,255,255,0.25)'}`, background: isSelected ? c.selected : 'rgba(255,255,255,0.03)', transition: 'all 0.15s' }}>
                    <span className="text-2xl shrink-0">{r.icon}</span>
                    <div className="flex-1">
                      <div className="text-sm font-bold" style={{ color: isSelected ? c.text : 'var(--text)' }}>
                        {r.label}
                      </div>
                      <div className="text-xs opacity-70 mt-0.5" >{r.sub}</div>
                    </div>
                    {isSelected && <span className="text-base" style={{ color: c.text }}>✓</span>}
                  </button>
                );
              })}

              <button
                onClick={() => setStep('plate')}
                disabled={!selected}
                className="w-full p-[15px] rounded-xl border-0 mt-2 font-bold text-[15px]" style={{ background: selected ? 'var(--boom)' : 'rgba(255,255,255,0.06)', color: selected ? '#fff' : 'rgba(255,255,255,0.6)', cursor: selected ? 'pointer' : 'not-allowed' }}
              >
                Continuer →
              </button>
            </div>
          )}

          {/* ── STEP 2 : PLAQUE ── */}
          {step === 'plate' && selected && (
            <div>
              {/* Alerte police proactive */}
              {selected.suggestPolice && !policeAlertDismissed && (
                <div className="rounded-xl mb-[18px] px-4 py-3.5" style={{ background: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.3)' }}>
                  <div className="flex items-start gap-2.5">
                    <span className="text-[22px] shrink-0">🚨</span>
                    <div className="flex-1">
                      <div className="text-sm font-extrabold text-red-500 mb-1">
                        {selected.id === 'deceased' ? 'La police est obligatoire' : 'Appelez la police'}
                      </div>
                      <div className="text-xs leading-normal opacity-70" >
                        {selected.id === 'deceased'
                          ? 'Un accident mortel nécessite obligatoirement l\'intervention des forces de l\'ordre.'
                          : selected.id === 'fled'
                          ? 'Un délit de fuite doit être signalé à la police dans les 24h. Sans rapport de police, votre assurance pourrait refuser la prise en charge.'
                          : 'En cas de blessé grave, la police et les secours doivent être alertés immédiatement.'}
                      </div>
                      <div className="flex gap-2 mt-2.5">
                        <a href="tel:117" className="rounded-lg text-white text-[13px] font-bold no-underline px-3.5 py-2 bg-[#ef4444]">📞 Police (117)</a>
                        <a href="tel:144" className="rounded-lg text-[13px] font-bold no-underline px-3.5 py-2" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text)' }}>🚑 Ambulance (144)</a>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setPoliceAlertDismissed(true)} aria-label="Confirmer que j'ai contacté les secours" className="mt-2.5 bg-none border-0 cursor-pointer text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    J'ai déjà contacté les secours ✓
                  </button>
                </div>
              )}

              {/* Photo plaque */}
              <div className="mb-5">
                <div className="text-[13px] font-bold mb-1.5">
                  {selected.plateMandatory ? '📸 Photo de la plaque *' : '📸 Photo de la plaque (recommandée)'}
                </div>
                <div className="text-xs mb-3" style={{ opacity: 0.755 }}>
                  La photo est enregistrée dans le dossier et transmise à votre assurance
                </div>

                {platePhoto ? (
                  <div className="relative mb-3">
                    <img
                      src={`data:image/jpeg;base64,${platePhoto}`}
                      alt="Photo de la plaque d'immatriculation"
                      className="w-full rounded-[10px]" style={{ border: '1px solid rgba(255,255,255,0.25)' }}
                    />
                    <button onClick={() => { setPlatePhoto(null); setPlateNumber(''); fileRef.current?.click(); }}
                      aria-label="Reprendre la photo"
                      className="absolute top-2 right-2 rounded-md border-0 text-white text-[11px] cursor-pointer px-2.5 py-1" style={{ background: 'rgba(0,0,0,0.7)' }}>
                      Reprendre
                    </button>
                    {ocrLoading && (
                      <div className="absolute inset-0 rounded-[10px] flex items-center justify-center text-[13px] text-white" style={{ background: 'rgba(0,0,0,0.6)' }}>⏳ Lecture en cours…</div>
                    )}
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()} className="w-full p-5 rounded-xl cursor-pointer text-sm mb-3" style={{ border: `2px dashed ${selected.plateMandatory ? 'rgba(255,53,0,0.4)' : 'rgba(255,255,255,0.15)'}`, background: 'rgba(255,255,255,0.02)', color: 'var(--text)' }}>
                    📷 Photographier la plaque
                  </button>
                )}

                <input ref={fileRef} type="file" accept="image/*" capture="environment"
                  className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handlePhotoCapture(e.target.files[0]); }} />

                {/* Numéro plaque */}
                <div className="mt-3">
                  <label htmlFor="party-unavail-plate" className="text-[11px] block opacity-70 mb-[5px] tracking-[0.5px]" style={{ fontFamily: 'monospace' }}>
                    NUMÉRO DE PLAQUE {plateNumber ? '✓ lu automatiquement' : '(saisissez si non lisible)'}
                  </label>
                  <input
                    id="party-unavail-plate"
                    aria-label="Numéro de plaque"
                    value={plateNumber}
                    onChange={e => setPlateNumber(e.target.value.toUpperCase())}
                    placeholder="VD 123456"
                    className="font-bold tracking-[2px] text-base" style={{ ...inp, fontFamily: 'DM Mono, monospace', borderColor: plateNumber ? 'rgba(34,197,94,0.4)' : 'rgba(240,237,232,0.12)' }}
                  />
                </div>

                {/* Description véhicule */}
                <div className="mt-3">
                  <label htmlFor="party-unavail-desc" className="text-[11px] block opacity-70 mb-[5px] tracking-[0.5px]">
                    DESCRIPTION DU VÉHICULE B (optionnel)
                  </label>
                  <input
                    id="party-unavail-desc"
                    aria-label="Description du véhicule"
                    value={vehicleDesc}
                    onChange={e => setVehicleDesc(e.target.value)}
                    placeholder="Ex: Berline grise, BMW Série 3"
                    style={inp}
                  />
                </div>
              </div>

              <div className="flex gap-2.5">
                <button onClick={() => setStep('reason')} className="flex-1 p-3.5 rounded-xl bg-transparent cursor-pointer text-sm" style={{ border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(240,237,232,0.5)' }}>← Retour</button>
                <button
                  onClick={() => setStep('details')}
                  disabled={selected.plateMandatory && !platePhoto && !plateNumber}
                  className="p-3.5 rounded-xl border-0 text-sm font-bold" style={{ flex: 2, background: (selected.plateMandatory && !platePhoto && !plateNumber)
                      ? 'rgba(255,255,255,0.06)' : 'var(--boom)', color: (selected.plateMandatory && !platePhoto && !plateNumber)
                      ? 'rgba(255,255,255,0.6)' : '#fff', cursor: (selected.plateMandatory && !platePhoto && !plateNumber) ? 'not-allowed' : 'pointer' }}
                >
                  Continuer →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3 : DÉTAILS ── */}
          {step === 'details' && selected && (
            <div>
              <div className="rounded-[10px] mb-[18px] text-xs px-3.5 py-3 leading-[1.6]" style={{ background: 'rgba(255,53,0,0.06)', border: '1px solid rgba(255,53,0,0.2)' }}>
                <strong style={{ color: 'var(--boom)' }}>Déclaration unilatérale de sinistre</strong><br/>
                Raison : <strong>{selected.label}</strong><br/>
                Ce dossier numérique horodaté documente votre déclaration. Il est à transmettre à votre assureur ou aux autorités compétentes.
              </div>

              {/* Référence police */}
              {selected.suggestPolice && (
                <div className="mb-3.5">
                  <label className="text-[11px] block opacity-70 mb-[5px] tracking-[0.5px]">
                    RÉFÉRENCE DU RAPPORT DE POLICE (si disponible)
                  </label>
                  <input
                    aria-label="Référence du rapport de police"
                    value={policeRef}
                    onChange={e => setPoliceRef(e.target.value)}
                    placeholder="N° PV ou rapport"
                    style={inp}
                  />
                </div>
              )}

              {/* Notes libres */}
              <div className="mb-5">
                <label className="text-[11px] block opacity-70 mb-[5px] tracking-[0.5px]">
                  OBSERVATIONS (optionnel)
                </label>
                <textarea
                  aria-label="Observations"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder={
                    selected.id === 'fled' ? 'Direction de fuite, signalement de témoins…'
                    : selected.id === 'refused' ? 'Témoins présents, comportement observé…'
                    : 'Toute information utile pour le dossier…'
                  }
                  rows={4}
                  className="leading-normal" style={{ ...inp, resize: 'none', fontFamily: 'inherit' }}
                />
              </div>

              {/* Récap */}
              <div className="rounded-[10px] mb-5 text-xs px-3.5 py-3 leading-[1.7]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.25)' }}>
                <div className="font-bold mb-1.5 opacity-75">RÉCAPITULATIF</div>
                <div>Raison : <strong>{selected.label}</strong></div>
                {plateNumber && <div>Plaque : <strong style={{ fontFamily: 'monospace', color: 'var(--boom)' }}>{plateNumber}</strong></div>}
                {vehicleDesc && <div>Véhicule : {vehicleDesc}</div>}
                {policeRef && <div>Réf. police : {policeRef}</div>}
                <div className="mt-1.5 opacity-75">
                  Enregistré le {new Date().toLocaleString('fr-CH')}
                </div>
              </div>

              <div className="flex gap-2.5">
                <button onClick={() => setStep('plate')} className="flex-1 p-3.5 rounded-xl bg-transparent cursor-pointer text-sm" style={{ border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(240,237,232,0.5)' }}>← Retour</button>
                <button onClick={handleConfirm} className="p-3.5 rounded-xl border-0 text-white cursor-pointer text-sm font-bold" style={{ flex: 2, background: 'var(--boom)' }}>
                  ✅ Finaliser le constat
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
}
