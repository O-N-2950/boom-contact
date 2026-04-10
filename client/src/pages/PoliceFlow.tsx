// client/src/pages/PoliceFlow.tsx
// Interface agent de police — vue détaillée session + annotations
// Design institutionnel : dense, desktop-first, neutre, sans emojis surchargés
// Accessible via police.boom.contact/?session=XXX&token=JWT

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { trpc } from '../trpc';

interface Props {
  sessionId: string;
  token: string;
  agent: {
    id: string;
    firstName: string;
    lastName: string;
    badgeNumber?: string;
    role: string;
    station: { id: string; name: string; canton?: string; country?: string } | null;
  };
  onLogout: () => void;
}

type Tab = 'incident' | 'parties' | 'media' | 'annotations';

const INFRACTION_PRESETS_CH = [
  { code: 'LCR 27', description: 'Non-respect signal lumineux rouge' },
  { code: 'LCR 32', description: 'Vitesse inadaptee aux circonstances' },
  { code: 'LCR 34', description: 'Ecart ou changement de voie dangereux' },
  { code: 'LCR 35', description: 'Depassement interdit ou dangereux' },
  { code: 'LCR 36', description: 'Non-respect de la priorite' },
  { code: 'LCR 37', description: 'Manoeuvre dangereuse (demi-tour, marche arriere)' },
  { code: 'LCR 91', description: 'Conduite sous influence alcool / stupefiants' },
  { code: 'LCR 96', description: 'Absence / invalidite du permis de conduire' },
];

const MEASURE_TYPES = [
  { value: 'alcotest',       label: 'Alcotest / ethylometre' },
  { value: 'drug_test',      label: 'Test stupefiants' },
  { value: 'pv_issued',      label: 'PV dresse' },
  { value: 'warning',        label: 'Avertissement verbal' },
  { value: 'licence_seized', label: 'Permis saisi' },
  { value: 'vehicle_towed',  label: 'Vehicule evacue / deplace' },
  { value: 'other',          label: 'Autre mesure' },
];

// ── Styles communs ────────────────────────────────────────────
const S = {
  label: { fontSize: 10, opacity: 0.75, letterSpacing: 1, textTransform: 'uppercase' as const, fontFamily: 'DM Mono, monospace', marginBottom: 4 },
  value: { fontSize: 14, fontWeight: 600, color: 'var(--text)' },
  card: { padding: '14px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.25)', marginBottom: 10 },
  sectionHeader: (color = '#1e3a5f') => ({
    padding: '8px 14px', borderRadius: '6px 6px 0 0',
    background: color, fontSize: 11, fontWeight: 700,
    letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#fff',
  }),
  sectionBody: { padding: '12px 14px', border: '1px solid rgba(255,255,255,0.25)', borderTop: 'none', borderRadius: '0 0 6px 6px', marginBottom: 16 },
  fieldGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 },
  fieldBox: { padding: '8px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.25)' },
};

function FieldBox({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={S.fieldBox}>
      <div style={S.label}>{label}</div>
      <div style={S.value}>{value || <span className="opacity-70">—</span>}</div>
    </div>
  );
}

// ── Section Incident ─────────────────────────────────────────
function IncidentSection({ session }: { session: Record<string, unknown> }) {
  const accident = (session as any).accident || {};
  const loc = accident.location || {};

  return (
    <div>
      <div style={S.sectionHeader()}>1. Circonstances de l&apos;accident</div>
      <div style={S.sectionBody}>
        <div style={S.fieldGrid}>
          <FieldBox label="Date" value={accident.date} />
          <FieldBox label="Heure" value={accident.time} />
        </div>
        <div className="mb-2">
          <div style={S.label}>Lieu</div>
          <div style={S.value}>{[loc.address, loc.city, loc.country].filter(Boolean).join(', ') || '—'}</div>
        </div>
        <div style={S.fieldGrid}>
          <FieldBox label="Blesses" value={accident.injuries ? 'OUI' : 'NON'} />
          <FieldBox label="Nombre de vehicules" value={String(session.vehicleCount || 2)} />
        </div>
        {loc.lat && loc.lng && (
          <div className="mb-2">
            <div style={S.label}>Coordonnees GPS</div>
            <div className="text-xs" style={{ fontFamily: 'DM Mono, monospace' }}>
              {Number(loc.lat).toFixed(6)}, {Number(loc.lng).toFixed(6)}
            </div>
            <a
              href={`https://maps.google.com/?q=${loc.lat},${loc.lng}`}
              target="_blank" rel="noopener noreferrer"
              className="text-[11px] no-underline block mt-1 text-[#4a9eff]"
            >
              ↗ Ouvrir dans Google Maps
            </a>
          </div>
        )}
        {accident.injuries && accident.injuryDetails && (
          <div className="rounded-md mb-2 px-3 py-2.5" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <div className="text-[11px] font-bold text-red-500 mb-1.5">BLESSES — DETAILS</div>
            <div style={S.fieldGrid}>
              <FieldBox label="Gravite" value={accident.injuryDetails.severity} />
              <FieldBox label="Ambulance" value={accident.injuryDetails.ambulance ? 'OUI' : 'NON'} />
            </div>
            {accident.injuryDetails.description && (
              <FieldBox label="Description" value={accident.injuryDetails.description} />
            )}
          </div>
        )}
        <div style={S.fieldGrid}>
          <FieldBox label="Statut session" value={(session.status as string)?.toUpperCase()} />
          <FieldBox label="Session ID" value={session.id as string} />
        </div>
      </div>
    </div>
  );
}

// ── Section Conducteurs ───────────────────────────────────────
function ParticipantCard({ label, participant, color }: { label: string; participant: any; color: string }) {
  const d = participant?.driver || {} as any;
  const v = participant?.vehicle || {} as any;
  const i = participant?.insurance || {} as any;

  const isEmpty = !d.lastName && !d.firstName && !v.plate;

  return (
    <div className="mb-4">
      <div style={S.sectionHeader(color)}>{label}</div>
      <div style={S.sectionBody}>
        {isEmpty ? (
          <div className="p-3 text-center text-[13px] opacity-70" >
            Conducteur non encore enregistre
          </div>
        ) : (
          <>
            <div className="text-[11px] font-bold mb-2 opacity-75 tracking-[1px]">IDENTITE</div>
            <div style={S.fieldGrid}>
              <FieldBox label="Nom" value={d.lastName} />
              <FieldBox label="Prenom" value={d.firstName} />
            </div>
            <div style={S.fieldGrid}>
              <FieldBox label="Date de naissance" value={d.birthDate} />
              <FieldBox label="Email" value={d.email} />
            </div>
            <FieldBox label="Adresse" value={d.address} />

            <div className="text-[11px] font-bold opacity-75 tracking-[1px]" style={{ margin: '12px 0 8px' }}>VEHICULE</div>
            <div style={S.fieldGrid}>
              <FieldBox label="Plaque" value={v.plate} />
              <FieldBox label="Marque / Modele" value={[v.brand, v.model].filter(Boolean).join(' ')} />
            </div>
            <div style={S.fieldGrid}>
              <FieldBox label="Couleur" value={v.color} />
              <FieldBox label="Type" value={v.vehicleType} />
            </div>

            <div className="text-[11px] font-bold opacity-75 tracking-[1px]" style={{ margin: '12px 0 8px' }}>ASSURANCE</div>
            <div style={S.fieldGrid}>
              <FieldBox label="Assureur" value={i.company} />
              <FieldBox label="N\u00b0 police" value={i.policyNumber} />
            </div>

            {(participant.damagedZones as any)?.length > 0 && (
              <>
                <div className="text-[11px] font-bold opacity-75 tracking-[1px]" style={{ margin: '12px 0 8px' }}>ZONES ENDOMMAGEES</div>
                <div className="flex flex-wrap gap-1">
                  {(participant.damagedZones as string[]).map((z: string) => (
                    <span key={z} className="rounded text-[11px] px-2 py-[3px] text-[#ff6633]" style={{ background: 'rgba(255,53,0,0.12)', border: '1px solid rgba(255,53,0,0.25)' }}>{z}</span>
                  ))}
                </div>
              </>
            )}

            {(participant.circumstances as any)?.length > 0 && (
              <>
                <div className="text-[11px] font-bold opacity-75 tracking-[1px]" style={{ margin: '12px 0 8px' }}>CIRCONSTANCES DECLAREES</div>
                <div className="flex flex-col gap-[3px]">
                  {(participant.circumstances as string[]).map((c: string, i: number) => (
                    <div key={i} className="text-xs" style={{ padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>• {c}</div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PartiesSection({ session }: { session: Record<string, unknown> }) {
  const s = session as any;
  return (
    <div>
      <ParticipantCard label="Conducteur A" participant={s.participantA} color="#1a3a6e" />
      <ParticipantCard label="Conducteur B" participant={s.participantB} color="#1a3a6e" />
      {s.participantC && <ParticipantCard label="Conducteur C" participant={s.participantC} color="#2d4a1a" />}
      {s.participantD && <ParticipantCard label="Conducteur D" participant={s.participantD} color="#2d4a1a" />}
    </div>
  );
}

// ── Section Medias ────────────────────────────────────────────
function MediaSection({ session }: { session: Record<string, unknown> }) {
  const acc = (session as any).accident || {};
  const photos = (acc.photos || []) as Array<{
    id: string; category: string; base64: string; caption?: string; takenAt: string;
  }>;
  const sketchImage = acc.sketchImage as string | undefined;

  const CATEGORIES: Record<string, string> = {
    scene: 'Vue generale de scene',
    vehicleA: 'Dommages vehicule A',
    vehicleB: 'Dommages vehicule B',
    injury: 'Blessures',
    document: 'Documents',
    other: 'Autre',
  };

  return (
    <div>
      <div style={S.sectionHeader()}>3. Photos et croquis</div>
      <div style={S.sectionBody}>
        {photos.length === 0 && !sketchImage ? (
          <div className="text-center p-5 opacity-70" >Aucun media enregistre</div>
        ) : (
          <>
            {photos.length > 0 && (
              <>
                <div className="text-[11px] font-bold mb-2.5 opacity-75 tracking-[1px]">
                  PHOTOS ({photos.length})
                </div>
                <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  {photos.map((photo) => (
                    <div key={photo.id} className="rounded-md overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.25)' }}>
                      <img
                        src={`data:image/jpeg;base64,${photo.base64}`}
                        alt={CATEGORIES[photo.category] || photo.category}
                        className="w-full object-cover block" style={{ aspectRatio: '4/3' }}
                      />
                      <div className="text-[9px] opacity-80 px-[7px] py-[5px]" style={{ background: 'rgba(0,0,0,0.6)' }}>
                        {CATEGORIES[photo.category] || photo.category}
                        {photo.caption && <span className="opacity-75"> — {photo.caption}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {sketchImage && (
              <>
                <div className="text-[11px] font-bold mb-2.5 opacity-75 tracking-[1px]">
                  CROQUIS
                </div>
                <div className="rounded-lg overflow-hidden mb-2" style={{ border: '1px solid rgba(255,255,255,0.25)' }}>
                  <img
                    src={sketchImage}
                    alt="Croquis de l'accident"
                    className="w-full block bg-white" />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Section Annotations ───────────────────────────────────────
interface AnnotationState {
  reportNumber: string;
  infractions: Array<{ code: string; description: string; party: 'A' | 'B' | 'both' }>;
  measures: Array<{ type: string; description: string; party: 'A' | 'B' | 'both' }>;
  witnesses: Array<{ name: string; address: string; phone: string; statement: string }>;
  observations: string;
}

function AnnotationsSection({
  sessionId, token, stationId, country,
  onSaved, onGeneratePDF,
}: {
  sessionId: string;
  token: string;
  stationId: string;
  country: string;
  onSaved: () => void;
  onGeneratePDF: () => void;
}) {
  const [ann, setAnn] = useState<AnnotationState>({
    reportNumber: '',
    infractions: [],
    measures: [],
    witnesses: [],
    observations: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingPDF, setLoadingPDF] = useState(false);

  // Load existing annotations
  const { data: existing } = trpc.police.getAnnotation.useQuery({ token, sessionId });
  useEffect(() => {
    if (existing) {
      setAnn({
        reportNumber: existing.reportNumber || '',
        infractions: (existing.infractions as any[]) || [],
        measures: (existing.measures as any[]) || [],
        witnesses: (existing.witnesses as any[]) || [],
        observations: existing.observations || '',
      });
    }
  }, [existing]);

  const saveMutation = trpc.police.saveAnnotation.useMutation({
    onSuccess: () => { setSaving(false); setSaved(true); onSaved(); setTimeout(() => setSaved(false), 3000); },
    onError: () => setSaving(false),
  });

  const handleSave = () => {
    setSaving(true);
    saveMutation.mutate({ token, sessionId, data: ann });
  };

  const handleGeneratePDF = async () => {
    setLoadingPDF(true);
    handleSave();
    setTimeout(() => { onGeneratePDF(); setLoadingPDF(false); }, 500);
  };

  const addInfraction = (preset?: { code: string; description: string }) => {
    setAnn(a => ({
      ...a,
      infractions: [...a.infractions, { code: preset?.code || '', description: preset?.description || '', party: 'A' }]
    }));
  };

  const addMeasure = () => {
    setAnn(a => ({ ...a, measures: [...a.measures, { type: 'pv_issued', description: '', party: 'A' }] }));
  };

  const addWitness = () => {
    setAnn(a => ({ ...a, witnesses: [...a.witnesses, { name: '', address: '', phone: '', statement: '' }] }));
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.25)',
    background: 'rgba(255,255,255,0.05)',
    color: 'var(--text)', fontSize: 13, boxSizing: 'border-box',
    fontFamily: 'inherit',
  };

  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

  return (
    <div>
      {/* Numero de rapport */}
      <div style={S.sectionHeader()}>N\u00b0 de rapport / PV</div>
      <div style={S.sectionBody}>
        <input
          type="text"
          placeholder="Ex: JU-2026-00123"
          aria-label="Numéro de rapport ou PV"
          value={ann.reportNumber}
          onChange={e => setAnn(a => ({ ...a, reportNumber: e.target.value }))}
          style={inputStyle}
        />
      </div>

      {/* Infractions */}
      <div style={S.sectionHeader()}>Infractions constatees</div>
      <div style={S.sectionBody}>
        {ann.infractions.map((inf, i) => (
          <div key={i} className="grid gap-1.5 mb-2 items-center" style={{ gridTemplateColumns: '140px 1fr 80px 32px' }}>
            <input
              placeholder="Code (ex: LCR 36)"
              aria-label="Code infraction"
              value={inf.code}
              onChange={e => { const n = [...ann.infractions]; n[i].code = e.target.value; setAnn(a => ({ ...a, infractions: n })); }}
              style={inputStyle}
            />
            <input
              placeholder="Description"
              aria-label="Description infraction"
              value={inf.description}
              onChange={e => { const n = [...ann.infractions]; n[i].description = e.target.value; setAnn(a => ({ ...a, infractions: n })); }}
              style={inputStyle}
            />
            <select
              value={inf.party}
              onChange={e => { const n = [...ann.infractions]; n[i].party = e.target.value as 'A' | 'B'; setAnn(a => ({ ...a, infractions: n })); }}
              aria-label="Partie concernée par l'infraction"
              style={selectStyle}
            >
              <option value="A">Partie A</option>
              <option value="B">Partie B</option>
              <option value="both">A + B</option>
            </select>
            <button
              onClick={() => setAnn(a => ({ ...a, infractions: a.infractions.filter((_, j) => j !== i) }))}
              className="rounded-md text-red-500 cursor-pointer text-sm min-h-[44px] min-w-[44px]"  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}
              aria-label="Supprimer"
            >×</button>
          </div>
        ))}

        <div className="flex gap-2 flex-wrap mt-1.5" >
          <button
            onClick={() => addInfraction()}
            className="rounded-md bg-transparent cursor-pointer text-xs px-3 py-1.5" style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'var(--text)' }}
          >
            + Ajouter
          </button>
          {country === 'CH' && INFRACTION_PRESETS_CH.map(p => (
            <button
              key={p.code}
              onClick={() => addInfraction(p)}
              className="rounded-md cursor-pointer text-[11px] px-2.5 py-1 text-[#FFB300]" style={{ border: '1px solid rgba(255,179,0,0.25)', background: 'rgba(255,179,0,0.06)' }}
            >
              {p.code}
            </button>
          ))}
        </div>
      </div>

      {/* Mesures */}
      <div style={S.sectionHeader()}>Mesures prises</div>
      <div style={S.sectionBody}>
        {ann.measures.map((m, i) => (
          <div key={i} className="grid gap-1.5 mb-2 items-center" style={{ gridTemplateColumns: '1fr 1fr 80px 32px' }}>
            <select
              aria-label="Type de mesure"
              value={m.type}
              onChange={e => { const n = [...ann.measures]; n[i].type = e.target.value; setAnn(a => ({ ...a, measures: n })); }}
              style={selectStyle}
            >
              {MEASURE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input
              placeholder="Precision (optionnel)"
              aria-label="Précision mesure"
              value={m.description}
              onChange={e => { const n = [...ann.measures]; n[i].description = e.target.value; setAnn(a => ({ ...a, measures: n })); }}
              style={inputStyle}
            />
            <select
              aria-label="Partie concernée par la mesure"
              value={m.party}
              onChange={e => { const n = [...ann.measures]; n[i].party = e.target.value as 'A' | 'B'; setAnn(a => ({ ...a, measures: n })); }}
              style={selectStyle}
            >
              <option value="A">Partie A</option>
              <option value="B">Partie B</option>
              <option value="both">A + B</option>
            </select>
            <button
              onClick={() => setAnn(a => ({ ...a, measures: a.measures.filter((_, j) => j !== i) }))}
              className="rounded-md text-red-500 cursor-pointer text-sm min-h-[44px] min-w-[44px]"  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}
              aria-label="Supprimer"
            >×</button>
          </div>
        ))}
        <button onClick={addMeasure} className="rounded-md bg-transparent cursor-pointer text-xs mt-1 px-3 py-1.5" style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'var(--text)' }}>
          + Ajouter une mesure
        </button>
      </div>

      {/* Temoins */}
      <div style={S.sectionHeader()}>Temoins</div>
      <div style={S.sectionBody}>
        {ann.witnesses.map((w, i) => (
          <div key={i} className="p-3 rounded-lg mb-2.5 relative" style={{ border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.02)' }}>
            <button
              onClick={() => setAnn(a => ({ ...a, witnesses: a.witnesses.filter((_, j) => j !== i) }))}
              className="absolute rounded text-red-500 cursor-pointer text-xs top-2 right-2 px-2 py-0.5" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
            >Supprimer</button>
            <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <div className="mb-1">Nom complet *</div>
                <input aria-label="Nom complet du témoin" value={w.name} onChange={e => { const n = [...ann.witnesses]; n[i].name = e.target.value; setAnn(a => ({ ...a, witnesses: n })); }} style={inputStyle} />
              </div>
              <div>
                <div className="mb-1">Telephone</div>
                <input aria-label="Téléphone du témoin" value={w.phone} onChange={e => { const n = [...ann.witnesses]; n[i].phone = e.target.value; setAnn(a => ({ ...a, witnesses: n })); }} style={inputStyle} />
              </div>
            </div>
            <div className="mb-2">
              <div className="mb-1">Adresse</div>
              <input aria-label="Adresse du témoin" value={w.address} onChange={e => { const n = [...ann.witnesses]; n[i].address = e.target.value; setAnn(a => ({ ...a, witnesses: n })); }} style={inputStyle} />
            </div>
            <div>
              <div className="mb-1">Declaration</div>
              <textarea
                aria-label="Déclaration du témoin"
                value={w.statement}
                onChange={e => { const n = [...ann.witnesses]; n[i].statement = e.target.value; setAnn(a => ({ ...a, witnesses: n })); }}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
          </div>
        ))}
        <button onClick={addWitness} className="rounded-md bg-transparent cursor-pointer text-xs px-3 py-1.5" style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'var(--text)' }}>
          + Ajouter un temoin
        </button>
      </div>

      {/* Observations */}
      <div style={S.sectionHeader()}>Observations de l&apos;agent</div>
      <div style={S.sectionBody}>
        <textarea
          aria-label="Observations de l'agent"
          value={ann.observations}
          onChange={e => setAnn(a => ({ ...a, observations: e.target.value }))}
          placeholder="Observations libres, contexte, elements importants non couverts par les sections precedentes..."
          rows={5}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2.5 mt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 p-[13px] rounded-lg border-0 text-sm font-semibold" style={{ background: saved ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.1)', color: saved ? '#22c55e' : 'var(--text)', cursor: saving ? 'not-allowed' : 'pointer' }}
        >
          {saving ? 'Sauvegarde...' : saved ? 'Sauvegarde ✓' : 'Sauvegarder'}
        </button>
        <button
          onClick={handleGeneratePDF}
          disabled={loadingPDF}
          className="p-[13px] rounded-lg border-0 text-white text-sm font-bold" style={{ flex: 2, background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)', cursor: loadingPDF ? 'not-allowed' : 'pointer' }}
        >
          {loadingPDF ? 'Generation...' : 'Generer Rapport d\'Intervention PDF'}
        </button>
      </div>
    </div>
  );
}

// ── Page principale PoliceFlow ────────────────────────────────
export function PoliceFlow({ sessionId, token, agent, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('incident');
  const [pdfLoading, setPdfLoading] = useState(false);

  const { data, isLoading, error } = trpc.police.getFullSession.useQuery(
    { token, sessionId },
    { refetchInterval: 30000 } // refresh every 30s
  );

  const generatePDFMutation = trpc.police.generateReport.useMutation({
    onSuccess: (result) => {
      // Download PDF
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${result.pdfBase64}`;
      link.download = result.filename;
      link.click();
      setPdfLoading(false);
    },
    onError: () => setPdfLoading(false),
  });

  const handleGeneratePDF = () => {
    setPdfLoading(true);
    generatePDFMutation.mutate({ token, sessionId });
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: 'incident',    label: 'Incident' },
    { id: 'parties',     label: 'Conducteurs' },
    { id: 'media',       label: 'Photos / Croquis' },
    { id: 'annotations', label: 'Annotations' },
  ];

  const stationCountry = agent.station?.country || 'CH';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--black)' }}>
      <h1 className="absolute p-0 overflow-hidden whitespace-nowrap w-px h-px m-[-1px] border-0"  style={{ clip: 'rect(0,0,0,0)' }}>Dossier police — constat {sessionId}</h1>

      {/* Header institutionnel */}
      <div className="flex items-center gap-4 shrink-0 px-5 py-3 bg-[#0d1b35]" style={{ borderBottom: '1px solid rgba(255,255,255,0.25)' }}>
        <div className="flex items-center gap-2.5">
          <img src="/logo.webp" alt="boom.contact" loading="lazy" className="object-contain h-8 opacity-90"  />
          <div>
            <div className="font-bold text-sm text-[#e8eaf0]">Module Police</div>
            <div className="text-[10px] opacity-75 tracking-[1px]" style={{ fontFamily: 'DM Mono, monospace' }}>
              {agent.station?.name?.toUpperCase() || 'POSTE'} {agent.station?.canton ? `· ${agent.station.canton}` : ''}
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-4">
          {/* Session ID badge */}
          <div className="rounded-md text-[11px] px-2.5 py-1" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.25)', fontFamily: 'DM Mono, monospace' }}>
            Session: {sessionId}
          </div>
          {/* Agent info */}
          <div className="text-xs text-right opacity-70" >
            <div className="font-semibold">{agent.firstName} {agent.lastName}</div>
            {agent.badgeNumber && <div className="text-[10px] opacity-75">Badge: {agent.badgeNumber}</div>}
          </div>
          <button
            onClick={onLogout}
            className="rounded-md bg-transparent cursor-pointer text-xs px-3 py-1.5" style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)' }}
          >
            Deconnexion
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 bg-[#0d1b35]" style={{ borderBottom: '1px solid rgba(255,255,255,0.25)', padding: '0 20px' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="bg-none border-0 cursor-pointer text-[13px] px-[18px] py-2.5" style={{ color: activeTab === tab.id ? '#4a9eff' : 'rgba(255,255,255,0.45)', borderBottom: activeTab === tab.id ? '2px solid #4a9eff' : '2px solid transparent', fontWeight: activeTab === tab.id ? 700 : 400, transition: 'all 0.15s' }}
          >
            {tab.label}
            {tab.id === 'annotations' && (
              <span className="rounded-[10px] text-[10px] text-white ml-1.5 px-1.5 py-px bg-[#1d4ed8]">
                Confidentiel
              </span>
            )}
          </button>
        ))}

        {/* Generate PDF button in tab bar */}
        <button
          onClick={handleGeneratePDF}
          disabled={pdfLoading || isLoading}
          className="ml-auto rounded-md border-0 text-white text-xs font-bold self-center px-4 py-2 bg-[#1d4ed8]" style={{ cursor: pdfLoading ? 'not-allowed' : 'pointer' }}
        >
          {pdfLoading ? 'Generation...' : 'Rapport PDF'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto w-full mx-auto p-5 max-w-[900px]" >
        {isLoading && (
          <div className="text-center p-[60px] opacity-75">
            Chargement de la session...
          </div>
        )}

        {error && (
          <div className="p-5 rounded-lg text-red-500" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
            Erreur : {error.message}
          </div>
        )}

        {data && (
          <>
            {activeTab === 'incident'    && <IncidentSection session={data.session as any} />}
            {activeTab === 'parties'     && <PartiesSection session={data.session as any} />}
            {activeTab === 'media'       && <MediaSection session={data.session as any} />}
            {activeTab === 'annotations' && (
              <AnnotationsSection
                sessionId={sessionId}
                token={token}
                stationId={agent.station?.id || ''}
                country={stationCountry}
                onSaved={() => {}}
                onGeneratePDF={handleGeneratePDF}
              />
            )}
          </>
        )}
      </div>

      {/* Bandeau confidentiel */}
      <div className="text-center text-[10px] p-1.5 opacity-70 tracking-[1px] bg-[#0d1b35]" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        DOCUMENT OFFICIEL — USAGE INTERNE EXCLUSIVEMENT — boom.contact Module Police
      </div>
    </div>
  );
}
