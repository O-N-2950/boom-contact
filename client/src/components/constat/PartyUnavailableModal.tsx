/**
 * boom.contact — PartyUnavailableModal
 * Quand la partie B ne peut pas rejoindre le constat
 * 5 raisons → photo plaque OCR → suggestion police proactive
 * Produit une "Déclaration unilatérale de sinistre" légalement reconnue
 */
import { useState, useRef } from 'react';

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
  low:      { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.12)', text: 'rgba(240,237,232,0.6)', selected: 'rgba(255,255,255,0.08)' },
};

async function ocrPlate(b64: string, mediaType: string): Promise<string> {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: b64 } },
          { type: 'text', text: 'Lis la plaque d\'immatriculation sur cette photo. Réponds UNIQUEMENT avec le numéro de plaque, sans explication. Si tu ne peux pas lire la plaque, réponds "ILLISIBLE".' },
        ],
      }],
    }),
  });
  const data = await resp.json();
  return data.content?.[0]?.text?.trim() || 'ILLISIBLE';
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
    } catch {
      // OCR failed — utilisateur saisit manuellement
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
    color: 'var(--text)', fontSize: 14, outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        width: '100%', maxWidth: 480, background: '#0A0A16',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '20px 20px 0 0', maxHeight: '92svh',
        display: 'flex', flexDirection: 'column',
        animation: 'slideUp 0.25s ease',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Partie B indisponible</div>
              <div style={{ fontSize: 11, opacity: 0.4, marginTop: 2 }}>
                {step === 'reason' && 'Sélectionnez la raison'}
                {step === 'plate' && 'Photo de la plaque'}
                {step === 'details' && 'Informations complémentaires'}
              </div>
            </div>
            <button onClick={onCancel} style={{
              background: 'rgba(255,255,255,0.06)', border: 'none',
              color: 'rgba(240,237,232,0.5)', cursor: 'pointer',
              borderRadius: 8, padding: '6px 12px', fontSize: 12,
            }}>Annuler</button>
          </div>
          {/* Step dots */}
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            {['reason', 'plate', 'details'].map((s, i) => (
              <div key={s} style={{
                height: 3, flex: 1, borderRadius: 2,
                background: ['reason', 'plate', 'details'].indexOf(step) >= i
                  ? 'var(--boom)' : 'rgba(255,255,255,0.1)',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 24px' }}>

          {/* ── STEP 1 : RAISON ── */}
          {step === 'reason' && (
            <div>
              <div style={{ fontSize: 13, opacity: 0.45, marginBottom: 14, lineHeight: 1.5 }}>
                Le constat sera établi en <strong style={{ color: 'var(--boom)' }}>déclaration unilatérale de sinistre</strong> — document légalement reconnu par les assurances dans toute l'Europe.
              </div>
              {REASONS.map(r => {
                const c = URGENCY_COLORS[r.urgency];
                const isSelected = selected?.id === r.id;
                return (
                  <button key={r.id} onClick={() => setSelected(r)} style={{
                    width: '100%', textAlign: 'left', padding: '14px 16px',
                    borderRadius: 12, border: `1.5px solid ${isSelected ? c.border : 'rgba(255,255,255,0.08)'}`,
                    background: isSelected ? c.selected : 'rgba(255,255,255,0.03)',
                    cursor: 'pointer', marginBottom: 8,
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 14,
                  }}>
                    <span style={{ fontSize: 24, flexShrink: 0 }}>{r.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: isSelected ? c.text : 'var(--text)' }}>
                        {r.label}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.45, marginTop: 2 }}>{r.sub}</div>
                    </div>
                    {isSelected && <span style={{ fontSize: 16, color: c.text }}>✓</span>}
                  </button>
                );
              })}

              <button
                onClick={() => setStep('plate')}
                disabled={!selected}
                style={{
                  width: '100%', padding: '15px', borderRadius: 12,
                  border: 'none', marginTop: 8,
                  background: selected ? 'var(--boom)' : 'rgba(255,255,255,0.06)',
                  color: selected ? '#fff' : 'rgba(255,255,255,0.2)',
                  cursor: selected ? 'pointer' : 'not-allowed',
                  fontSize: 15, fontWeight: 700,
                }}
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
                <div style={{
                  padding: '14px 16px', borderRadius: 12, marginBottom: 18,
                  background: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.4)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>🚨</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#ef4444', marginBottom: 4 }}>
                        {selected.id === 'deceased' ? 'La police est obligatoire' : 'Appelez la police'}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.5 }}>
                        {selected.id === 'deceased'
                          ? 'Un accident mortel nécessite obligatoirement l\'intervention des forces de l\'ordre.'
                          : selected.id === 'fled'
                          ? 'Un délit de fuite doit être signalé à la police dans les 24h. Sans rapport de police, votre assurance pourrait refuser la prise en charge.'
                          : 'En cas de blessé grave, la police et les secours doivent être alertés immédiatement.'}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <a href="tel:117" style={{
                          padding: '8px 14px', borderRadius: 8,
                          background: '#ef4444', color: '#fff',
                          fontSize: 13, fontWeight: 700, textDecoration: 'none',
                        }}>📞 Police (117)</a>
                        <a href="tel:144" style={{
                          padding: '8px 14px', borderRadius: 8,
                          background: 'rgba(255,255,255,0.1)', color: 'var(--text)',
                          fontSize: 13, fontWeight: 700, textDecoration: 'none',
                        }}>🚑 Ambulance (144)</a>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setPoliceAlertDismissed(true)} style={{
                    marginTop: 10, background: 'none', border: 'none',
                    color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 12,
                  }}>
                    J'ai déjà contacté les secours ✓
                  </button>
                </div>
              )}

              {/* Photo plaque */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                  {selected.plateMandatory ? '📸 Photo de la plaque *' : '📸 Photo de la plaque (recommandée)'}
                </div>
                <div style={{ fontSize: 12, opacity: 0.4, marginBottom: 12 }}>
                  La photo est enregistrée dans le dossier et transmise à votre assurance
                </div>

                {platePhoto ? (
                  <div style={{ position: 'relative', marginBottom: 12 }}>
                    <img
                      src={`data:image/jpeg;base64,${platePhoto}`}
                      alt="Plaque"
                      style={{ width: '100%', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                    <button onClick={() => { setPlatePhoto(null); setPlateNumber(''); fileRef.current?.click(); }}
                      style={{
                        position: 'absolute', top: 8, right: 8,
                        padding: '4px 10px', borderRadius: 6,
                        background: 'rgba(0,0,0,0.7)', border: 'none',
                        color: '#fff', fontSize: 11, cursor: 'pointer',
                      }}>
                      Reprendre
                    </button>
                    {ocrLoading && (
                      <div style={{
                        position: 'absolute', inset: 0, borderRadius: 10,
                        background: 'rgba(0,0,0,0.6)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, color: '#fff',
                      }}>⏳ Lecture en cours…</div>
                    )}
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()} style={{
                    width: '100%', padding: '20px', borderRadius: 12,
                    border: `2px dashed ${selected.plateMandatory ? 'rgba(255,53,0,0.4)' : 'rgba(255,255,255,0.15)'}`,
                    background: 'rgba(255,255,255,0.02)', color: 'var(--text)',
                    cursor: 'pointer', fontSize: 14, marginBottom: 12,
                  }}>
                    📷 Photographier la plaque
                  </button>
                )}

                <input ref={fileRef} type="file" accept="image/*" capture="environment"
                  style={{ display: 'none' }}
                  onChange={e => { if (e.target.files?.[0]) handlePhotoCapture(e.target.files[0]); }} />

                {/* Numéro plaque */}
                <div style={{ marginTop: 12 }}>
                  <label style={{ fontSize: 11, opacity: 0.45, marginBottom: 5, display: 'block', letterSpacing: 0.5, fontFamily: 'monospace' }}>
                    NUMÉRO DE PLAQUE {plateNumber ? '✓ lu automatiquement' : '(saisissez si non lisible)'}
                  </label>
                  <input
                    value={plateNumber}
                    onChange={e => setPlateNumber(e.target.value.toUpperCase())}
                    placeholder="VD 123456"
                    style={{
                      ...inp,
                      fontFamily: 'DM Mono, monospace',
                      fontSize: 16, fontWeight: 700, letterSpacing: 2,
                      borderColor: plateNumber ? 'rgba(34,197,94,0.4)' : 'rgba(240,237,232,0.12)',
                    }}
                  />
                </div>

                {/* Description véhicule */}
                <div style={{ marginTop: 12 }}>
                  <label style={{ fontSize: 11, opacity: 0.45, marginBottom: 5, display: 'block', letterSpacing: 0.5 }}>
                    DESCRIPTION DU VÉHICULE B (optionnel)
                  </label>
                  <input
                    value={vehicleDesc}
                    onChange={e => setVehicleDesc(e.target.value)}
                    placeholder="Ex: Berline grise, BMW Série 3"
                    style={inp}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setStep('reason')} style={{
                  flex: 1, padding: '14px', borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent', color: 'rgba(240,237,232,0.5)',
                  cursor: 'pointer', fontSize: 14,
                }}>← Retour</button>
                <button
                  onClick={() => setStep('details')}
                  disabled={selected.plateMandatory && !platePhoto && !plateNumber}
                  style={{
                    flex: 2, padding: '14px', borderRadius: 12, border: 'none',
                    background: (selected.plateMandatory && !platePhoto && !plateNumber)
                      ? 'rgba(255,255,255,0.06)' : 'var(--boom)',
                    color: (selected.plateMandatory && !platePhoto && !plateNumber)
                      ? 'rgba(255,255,255,0.2)' : '#fff',
                    cursor: (selected.plateMandatory && !platePhoto && !plateNumber) ? 'not-allowed' : 'pointer',
                    fontSize: 14, fontWeight: 700,
                  }}
                >
                  Continuer →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3 : DÉTAILS ── */}
          {step === 'details' && selected && (
            <div>
              <div style={{
                padding: '12px 14px', borderRadius: 10, marginBottom: 18,
                background: 'rgba(255,53,0,0.06)', border: '1px solid rgba(255,53,0,0.2)',
                fontSize: 12, lineHeight: 1.6,
              }}>
                <strong style={{ color: 'var(--boom)' }}>Déclaration unilatérale de sinistre</strong><br/>
                Raison : <strong>{selected.label}</strong><br/>
                Ce document est légalement valable auprès de votre assurance dans les 46 pays signataires de la Convention Européenne.
              </div>

              {/* Référence police */}
              {selected.suggestPolice && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, opacity: 0.45, marginBottom: 5, display: 'block', letterSpacing: 0.5 }}>
                    RÉFÉRENCE DU RAPPORT DE POLICE (si disponible)
                  </label>
                  <input
                    value={policeRef}
                    onChange={e => setPoliceRef(e.target.value)}
                    placeholder="N° PV ou rapport"
                    style={inp}
                  />
                </div>
              )}

              {/* Notes libres */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, opacity: 0.45, marginBottom: 5, display: 'block', letterSpacing: 0.5 }}>
                  OBSERVATIONS (optionnel)
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder={
                    selected.id === 'fled' ? 'Direction de fuite, signalement de témoins…'
                    : selected.id === 'refused' ? 'Témoins présents, comportement observé…'
                    : 'Toute information utile pour le dossier…'
                  }
                  rows={4}
                  style={{
                    ...inp,
                    resize: 'none', lineHeight: 1.5,
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Récap */}
              <div style={{
                padding: '12px 14px', borderRadius: 10, marginBottom: 20,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                fontSize: 12, lineHeight: 1.7,
              }}>
                <div style={{ fontWeight: 700, marginBottom: 6, opacity: 0.6 }}>RÉCAPITULATIF</div>
                <div>Raison : <strong>{selected.label}</strong></div>
                {plateNumber && <div>Plaque : <strong style={{ fontFamily: 'monospace', color: 'var(--boom)' }}>{plateNumber}</strong></div>}
                {vehicleDesc && <div>Véhicule : {vehicleDesc}</div>}
                {policeRef && <div>Réf. police : {policeRef}</div>}
                <div style={{ marginTop: 6, opacity: 0.5 }}>
                  Enregistré le {new Date().toLocaleString('fr-CH')}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setStep('plate')} style={{
                  flex: 1, padding: '14px', borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent', color: 'rgba(240,237,232,0.5)',
                  cursor: 'pointer', fontSize: 14,
                }}>← Retour</button>
                <button onClick={handleConfirm} style={{
                  flex: 2, padding: '14px', borderRadius: 12, border: 'none',
                  background: 'var(--boom)', color: '#fff',
                  cursor: 'pointer', fontSize: 14, fontWeight: 700,
                }}>
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
