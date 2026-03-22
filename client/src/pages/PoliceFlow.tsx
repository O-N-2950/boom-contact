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
  label: { fontSize: 10, opacity: 0.5, letterSpacing: 1, textTransform: 'uppercase' as const, fontFamily: 'DM Mono, monospace', marginBottom: 4 },
  value: { fontSize: 14, fontWeight: 600, color: 'var(--text)' },
  card: { padding: '14px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 10 },
  sectionHeader: (color = '#1e3a5f') => ({
    padding: '8px 14px', borderRadius: '6px 6px 0 0',
    background: color, fontSize: 11, fontWeight: 700,
    letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#fff',
  }),
  sectionBody: { padding: '12px 14px', border: '1px solid rgba(255,255,255,0.08)', borderTop: 'none', borderRadius: '0 0 6px 6px', marginBottom: 16 },
  fieldGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 },
  fieldBox: { padding: '8px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' },
};

function FieldBox({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={S.fieldBox}>
      <div style={S.label}>{label}</div>
      <div style={S.value}>{value || <span style={{ opacity: 0.3 }}>—</span>}</div>
    </div>
  );
}

// ── Section Incident ─────────────────────────────────────────
function IncidentSection({ session }: { session: any }) {
  const accident = session.accident || {};
  const loc = accident.location || {};

  return (
    <div>
      <div style={S.sectionHeader()}>1. Circonstances de l&apos;accident</div>
      <div style={S.sectionBody}>
        <div style={S.fieldGrid}>
          <FieldBox label="Date" value={accident.date} />
          <FieldBox label="Heure" value={accident.time} />
        </div>
        <div style={{ ...S.fieldBox, marginBottom: 8 }}>
          <div style={S.label}>Lieu</div>
          <div style={S.value}>{[loc.address, loc.city, loc.country].filter(Boolean).join(', ') || '—'}</div>
        </div>
        <div style={S.fieldGrid}>
          <FieldBox label="Blesses" value={accident.injuries ? 'OUI' : 'NON'} />
          <FieldBox label="Nombre de vehicules" value={String(session.vehicleCount || 2)} />
        </div>
        {loc.lat && loc.lng && (
          <div style={{ ...S.fieldBox, marginBottom: 8 }}>
            <div style={S.label}>Coordonnees GPS</div>
            <div style={{ ...S.value, fontFamily: 'DM Mono, monospace', fontSize: 12 }}>
              {Number(loc.lat).toFixed(6)}, {Number(loc.lng).toFixed(6)}
            </div>
            <a
              href={`https://maps.google.com/?q=${loc.lat},${loc.lng}`}
              target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: '#4a9eff', textDecoration: 'none', display: 'block', marginTop: 4 }}
            >
              ↗ Ouvrir dans Google Maps
            </a>
          </div>
        )}
        {accident.injuries && accident.injuryDetails && (
          <div style={{ padding: '10px 12px', borderRadius: 6, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>BLESSES — DETAILS</div>
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
          <FieldBox label="Statut session" value={session.status?.toUpperCase()} />
          <FieldBox label="Session ID" value={session.id} />
        </div>
      </div>
    </div>
  );
}

// ── Section Conducteurs ───────────────────────────────────────
function ParticipantCard({ label, participant, color }: { label: string; participant: any; color: string }) {
  const d = participant?.driver || {};
  const v = participant?.vehicle || {};
  const i = participant?.insurance || {};

  const isEmpty = !d.lastName && !d.firstName && !v.plate;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={S.sectionHeader(color)}>{label}</div>
      <div style={S.sectionBody}>
        {isEmpty ? (
          <div style={{ padding: 12, textAlign: 'center', opacity: 0.4, fontSize: 13 }}>
            Conducteur non encore enregistre
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.5, letterSpacing: 1, marginBottom: 8 }}>IDENTITE</div>
            <div style={S.fieldGrid}>
              <FieldBox label="Nom" value={d.lastName} />
              <FieldBox label="Prenom" value={d.firstName} />
            </div>
            <div style={S.fieldGrid}>
              <FieldBox label="Date de naissance" value={d.birthDate} />
              <FieldBox label="Email" value={d.email} />
            </div>
            <FieldBox label="Adresse" value={d.address} />

            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.5, letterSpacing: 1, margin: '12px 0 8px' }}>VEHICULE</div>
            <div style={S.fieldGrid}>
              <FieldBox label="Plaque" value={v.plate} />
              <FieldBox label="Marque / Modele" value={[v.brand, v.model].filter(Boolean).join(' ')} />
            </div>
            <div style={S.fieldGrid}>
              <FieldBox label="Couleur" value={v.color} />
              <FieldBox label="Type" value={v.vehicleType} />
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.5, letterSpacing: 1, margin: '12px 0 8px' }}>ASSURANCE</div>
            <div style={S.fieldGrid}>
              <FieldBox label="Assureur" value={i.company} />
              <FieldBox label="N\u00b0 police" value={i.policyNumber} />
            </div>

            {participant.damagedZones?.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.5, letterSpacing: 1, margin: '12px 0 8px' }}>ZONES ENDOMMAGEES</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {participant.damagedZones.map((z: string) => (
                    <span key={z} style={{ padding: '3px 8px', borderRadius: 4, background: 'rgba(255,53,0,0.12)', border: '1px solid rgba(255,53,0,0.25)', fontSize: 11, color: '#ff6633' }}>{z}</span>
                  ))}
                </div>
              </>
            )}

            {participant.circumstances?.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.5, letterSpacing: 1, margin: '12px 0 8px' }}>CIRCONSTANCES DECLAREES</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {participant.circumstances.map((c: string, i: number) => (
                    <div key={i} style={{ fontSize: 12, padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>• {c}</div>
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

function PartiesSection({ session }: { session: any }) {
  return (
    <div>
      <ParticipantCard label="Conducteur A" participant={session.participantA} color="#1a3a6e" />
      <ParticipantCard label="Conducteur B" participant={session.participantB} color="#1a3a6e" />
      {session.participantC && <ParticipantCard label="Conducteur C" participant={session.participantC} color="#2d4a1a" />}
      {session.participantD && <ParticipantCard label="Conducteur D" participant={session.participantD} color="#2d4a1a" />}
    </div>
  );
}

// ── Section Medias ────────────────────────────────────────────
function MediaSection({ session }: { session: any }) {
  const photos = (session.accident?.photos || []) as Array<{
    id: string; category: string; base64: string; caption?: string; takenAt: string;
  }>;
  const sketchImage = session.accident?.sketchImage;

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
          <div style={{ textAlign: 'center', padding: 20, opacity: 0.4 }}>Aucun media enregistre</div>
        ) : (
          <>
            {photos.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.5, letterSpacing: 1, marginBottom: 10 }}>
                  PHOTOS ({photos.length})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                  {photos.map((photo) => (
                    <div key={photo.id} style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <img
                        src={`data:image/jpeg;base64,${photo.base64}`}
                        alt={CATEGORIES[photo.category] || photo.category}
                        style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }}
                      />
                      <div style={{ padding: '5px 7px', background: 'rgba(0,0,0,0.6)', fontSize: 9, opacity: 0.8 }}>
                        {CATEGORIES[photo.category] || photo.category}
                        {photo.caption && <span style={{ opacity: 0.6 }}> — {photo.caption}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {sketchImage && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.5, letterSpacing: 1, marginBottom: 10 }}>
                  CROQUIS
                </div>
                <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', marginBottom: 8 }}>
                  <img
                    src={sketchImage}
                    alt="Croquis de l'accident"
                    style={{ width: '100%', display: 'block', background: '#fff' }}
                  />
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
        infractions: (existing.infractions as any) || [],
        measures: (existing.measures as any) || [],
        witnesses: (existing.witnesses as any) || [],
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
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.05)',
    color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
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
          value={ann.reportNumber}
          onChange={e => setAnn(a => ({ ...a, reportNumber: e.target.value }))}
          style={inputStyle}
        />
      </div>

      {/* Infractions */}
      <div style={S.sectionHeader()}>Infractions constatees</div>
      <div style={S.sectionBody}>
        {ann.infractions.map((inf, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 80px 32px', gap: 6, marginBottom: 8, alignItems: 'center' }}>
            <input
              placeholder="Code (ex: LCR 36)"
              value={inf.code}
              onChange={e => { const n = [...ann.infractions]; n[i].code = e.target.value; setAnn(a => ({ ...a, infractions: n })); }}
              style={inputStyle}
            />
            <input
              placeholder="Description"
              value={inf.description}
              onChange={e => { const n = [...ann.infractions]; n[i].description = e.target.value; setAnn(a => ({ ...a, infractions: n })); }}
              style={inputStyle}
            />
            <select
              value={inf.party}
              onChange={e => { const n = [...ann.infractions]; n[i].party = e.target.value as any; setAnn(a => ({ ...a, infractions: n })); }}
              style={selectStyle}
            >
              <option value="A">Partie A</option>
              <option value="B">Partie B</option>
              <option value="both">A + B</option>
            </select>
            <button
              onClick={() => setAnn(a => ({ ...a, infractions: a.infractions.filter((_, j) => j !== i) }))}
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#ef4444', cursor: 'pointer', fontSize: 14, height: 34 }}
            >×</button>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => addInfraction()}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 12 }}
          >
            + Ajouter
          </button>
          {country === 'CH' && INFRACTION_PRESETS_CH.map(p => (
            <button
              key={p.code}
              onClick={() => addInfraction(p)}
              style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,179,0,0.25)', background: 'rgba(255,179,0,0.06)', color: '#FFB300', cursor: 'pointer', fontSize: 11 }}
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
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 32px', gap: 6, marginBottom: 8, alignItems: 'center' }}>
            <select
              value={m.type}
              onChange={e => { const n = [...ann.measures]; n[i].type = e.target.value; setAnn(a => ({ ...a, measures: n })); }}
              style={selectStyle}
            >
              {MEASURE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input
              placeholder="Precision (optionnel)"
              value={m.description}
              onChange={e => { const n = [...ann.measures]; n[i].description = e.target.value; setAnn(a => ({ ...a, measures: n })); }}
              style={inputStyle}
            />
            <select
              value={m.party}
              onChange={e => { const n = [...ann.measures]; n[i].party = e.target.value as any; setAnn(a => ({ ...a, measures: n })); }}
              style={selectStyle}
            >
              <option value="A">Partie A</option>
              <option value="B">Partie B</option>
              <option value="both">A + B</option>
            </select>
            <button
              onClick={() => setAnn(a => ({ ...a, measures: a.measures.filter((_, j) => j !== i) }))}
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#ef4444', cursor: 'pointer', fontSize: 14, height: 34 }}
            >×</button>
          </div>
        ))}
        <button onClick={addMeasure} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 12, marginTop: 4 }}>
          + Ajouter une mesure
        </button>
      </div>

      {/* Temoins */}
      <div style={S.sectionHeader()}>Temoins</div>
      <div style={S.sectionBody}>
        {ann.witnesses.map((w, i) => (
          <div key={i} style={{ padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', marginBottom: 10, background: 'rgba(255,255,255,0.02)', position: 'relative' }}>
            <button
              onClick={() => setAnn(a => ({ ...a, witnesses: a.witnesses.filter((_, j) => j !== i) }))}
              style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 4, color: '#ef4444', cursor: 'pointer', fontSize: 12, padding: '2px 8px' }}
            >Supprimer</button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div>
                <div style={{ ...S.label, marginBottom: 4 }}>Nom complet *</div>
                <input value={w.name} onChange={e => { const n = [...ann.witnesses]; n[i].name = e.target.value; setAnn(a => ({ ...a, witnesses: n })); }} style={inputStyle} />
              </div>
              <div>
                <div style={{ ...S.label, marginBottom: 4 }}>Telephone</div>
                <input value={w.phone} onChange={e => { const n = [...ann.witnesses]; n[i].phone = e.target.value; setAnn(a => ({ ...a, witnesses: n })); }} style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ ...S.label, marginBottom: 4 }}>Adresse</div>
              <input value={w.address} onChange={e => { const n = [...ann.witnesses]; n[i].address = e.target.value; setAnn(a => ({ ...a, witnesses: n })); }} style={inputStyle} />
            </div>
            <div>
              <div style={{ ...S.label, marginBottom: 4 }}>Declaration</div>
              <textarea
                value={w.statement}
                onChange={e => { const n = [...ann.witnesses]; n[i].statement = e.target.value; setAnn(a => ({ ...a, witnesses: n })); }}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
          </div>
        ))}
        <button onClick={addWitness} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 12 }}>
          + Ajouter un temoin
        </button>
      </div>

      {/* Observations */}
      <div style={S.sectionHeader()}>Observations de l&apos;agent</div>
      <div style={S.sectionBody}>
        <textarea
          value={ann.observations}
          onChange={e => setAnn(a => ({ ...a, observations: e.target.value }))}
          placeholder="Observations libres, contexte, elements importants non couverts par les sections precedentes..."
          rows={5}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 1, padding: '13px', borderRadius: 8, border: 'none',
            background: saved ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.1)',
            color: saved ? '#22c55e' : 'var(--text)',
            cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600,
          }}
        >
          {saving ? 'Sauvegarde...' : saved ? 'Sauvegarde ✓' : 'Sauvegarder'}
        </button>
        <button
          onClick={handleGeneratePDF}
          disabled={loadingPDF}
          style={{
            flex: 2, padding: '13px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)',
            color: '#fff', cursor: loadingPDF ? 'not-allowed' : 'pointer',
            fontSize: 14, fontWeight: 700,
          }}
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
    <div style={{ minHeight: '100vh', background: 'var(--black)', display: 'flex', flexDirection: 'column' }}>

      {/* Header institutionnel */}
      <div style={{ background: '#0d1b35', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="boom.contact" style={{ height: 32, objectFit: 'contain', opacity: 0.9 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#e8eaf0' }}>Module Police</div>
            <div style={{ fontSize: 10, opacity: 0.5, fontFamily: 'DM Mono, monospace', letterSpacing: 1 }}>
              {agent.station?.name?.toUpperCase() || 'POSTE'} {agent.station?.canton ? `· ${agent.station.canton}` : ''}
            </div>
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Session ID badge */}
          <div style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'DM Mono, monospace', fontSize: 11 }}>
            Session: {sessionId}
          </div>
          {/* Agent info */}
          <div style={{ fontSize: 12, opacity: 0.7, textAlign: 'right' }}>
            <div style={{ fontWeight: 600 }}>{agent.firstName} {agent.lastName}</div>
            {agent.badgeNumber && <div style={{ fontSize: 10, opacity: 0.6 }}>Badge: {agent.badgeNumber}</div>}
          </div>
          <button
            onClick={onLogout}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 12 }}
          >
            Deconnexion
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ background: '#0d1b35', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 20px', display: 'flex', gap: 0 }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === tab.id ? '#4a9eff' : 'rgba(255,255,255,0.45)',
              borderBottom: activeTab === tab.id ? '2px solid #4a9eff' : '2px solid transparent',
              fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 400,
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
            {tab.id === 'annotations' && (
              <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 10, background: '#1d4ed8', fontSize: 10, color: '#fff' }}>
                Confidentiel
              </span>
            )}
          </button>
        ))}

        {/* Generate PDF button in tab bar */}
        <button
          onClick={handleGeneratePDF}
          disabled={pdfLoading || isLoading}
          style={{
            marginLeft: 'auto', padding: '8px 16px',
            borderRadius: 6, border: 'none',
            background: '#1d4ed8', color: '#fff',
            cursor: pdfLoading ? 'not-allowed' : 'pointer',
            fontSize: 12, fontWeight: 700, alignSelf: 'center',
          }}
        >
          {pdfLoading ? 'Generation...' : 'Rapport PDF'}
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', maxWidth: 900, width: '100%', margin: '0 auto' }}>
        {isLoading && (
          <div style={{ textAlign: 'center', padding: 60, opacity: 0.5 }}>
            Chargement de la session...
          </div>
        )}

        {error && (
          <div style={{ padding: 20, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
            Erreur : {error.message}
          </div>
        )}

        {data && (
          <>
            {activeTab === 'incident'    && <IncidentSection session={data.session} />}
            {activeTab === 'parties'     && <PartiesSection session={data.session} />}
            {activeTab === 'media'       && <MediaSection session={data.session} />}
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
      <div style={{ padding: '6px', textAlign: 'center', background: '#0d1b35', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 10, opacity: 0.4, letterSpacing: 1 }}>
        DOCUMENT OFFICIEL — USAGE INTERNE EXCLUSIVEMENT — boom.contact Module Police
      </div>
    </div>
  );
}
