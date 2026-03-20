import { useState } from 'react';
import type { ParticipantData, AccidentData } from '../../../../shared/types';

interface Props {
  role: 'A' | 'B';
  prefilled?: Partial<ParticipantData>;
  onSave: (data: Partial<ParticipantData>) => void;
}

// CEA standard circumstances checkboxes (translated for FR)
const CEA_CIRCUMSTANCES = [
  { id: 'c1',  label: 'En stationnement / à l\'arrêt' },
  { id: 'c2',  label: 'Quittait un stationnement / une place de stationnement' },
  { id: 'c3',  label: 'Prenait un stationnement / une place de stationnement' },
  { id: 'c4',  label: 'Sortait d\'un parking, d\'un lieu privé, d\'un chemin de terre' },
  { id: 'c5',  label: 'S\'engageait dans un parking, lieu privé, chemin de terre' },
  { id: 'c6',  label: 'S\'engageait dans une voie de circulation' },
  { id: 'c7',  label: 'Circulait dans le même sens, sur la même file' },
  { id: 'c8',  label: 'Circulait dans le même sens, sur une file différente' },
  { id: 'c9',  label: 'Changeait de file' },
  { id: 'c10', label: 'Doublait' },
  { id: 'c11', label: 'Prenait la droite pour une bifurcation' },
  { id: 'c12', label: 'Prenait la gauche pour une bifurcation' },
  { id: 'c13', label: 'Reculait' },
  { id: 'c14', label: 'Empiétait sur la voie réservée à la circulation en sens inverse' },
  { id: 'c15', label: 'Venait de droite (à un carrefour)' },
  { id: 'c16', label: 'N\'avait pas respecté un signal de priorité ou un feu rouge' },
  { id: 'c17', label: 'Autre — décrire dans les observations' },
];

type Section = 'vehicle' | 'driver' | 'insurance' | 'circumstances';

export function ConstatForm({ role, prefilled, onSave }: Props) {
  const [section, setSection] = useState<Section>('vehicle');
  const [data, setData] = useState<Partial<ParticipantData>>({
    role,
    vehicle: prefilled?.vehicle ?? {},
    driver: prefilled?.driver ?? {},
    insurance: prefilled?.insurance ?? {},
    damagedZones: prefilled?.damagedZones ?? [],
    circumstances: prefilled?.circumstances ?? [],
    language: prefilled?.language ?? 'fr',
  });

  const sections: { id: Section; icon: string; label: string }[] = [
    { id: 'vehicle',      icon: '🚗', label: 'Véhicule' },
    { id: 'driver',       icon: '👤', label: 'Conducteur' },
    { id: 'insurance',    icon: '🟢', label: 'Assurance' },
    { id: 'circumstances',icon: '📋', label: 'Circonstances' },
  ];

  const update = (section: keyof ParticipantData, field: string, value: string) => {
    setData(prev => ({
      ...prev,
      [section]: { ...(prev[section] as any ?? {}), [field]: value },
    }));
  };

  const toggleCircumstance = (id: string) => {
    setData(prev => {
      const current = prev.circumstances ?? [];
      const updated = current.includes(id)
        ? current.filter(c => c !== id)
        : [...current, id];
      return { ...prev, circumstances: updated };
    });
  };

  const Field = ({ section: sec, field, label, placeholder, type = 'text', required = false }: {
    section: 'vehicle' | 'driver' | 'insurance';
    field: string; label: string; placeholder?: string; type?: string; required?: boolean;
  }) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, letterSpacing: 1.5, opacity: 0.45,
        textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 6 }}>
        {label}{required && <span style={{ color: 'var(--boom)', marginLeft: 4 }}>*</span>}
      </label>
      <input
        type={type}
        value={(data[sec] as any)?.[field] ?? ''}
        onChange={e => update(sec, field, e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '12px 14px', borderRadius: 8,
          border: `1.5px solid ${(data[sec] as any)?.[field] ? 'rgba(34,197,94,0.3)' : 'rgba(240,237,232,0.12)'}`,
          background: 'rgba(255,255,255,0.04)', color: 'var(--text)',
          fontSize: 14, outline: 'none', fontFamily: 'inherit',
          transition: 'border-color 0.2s',
        }}
      />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Section tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(240,237,232,0.08)', flexShrink: 0 }}>
        {sections.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{
            flex: 1, padding: '12px 4px', border: 'none', cursor: 'pointer',
            background: s.id === section ? 'rgba(255,53,0,0.08)' : 'transparent',
            borderBottom: s.id === section ? '2px solid var(--boom)' : '2px solid transparent',
            color: s.id === section ? 'var(--boom)' : 'var(--text)',
            transition: 'all 0.2s', fontSize: 11, fontWeight: 600,
          }}>
            <div style={{ fontSize: 18, marginBottom: 2 }}>{s.icon}</div>
            <div style={{ fontSize: 10, letterSpacing: 1, opacity: s.id === section ? 1 : 0.5 }}>{s.label}</div>
          </button>
        ))}
      </div>

      {/* Form fields */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

        {section === 'vehicle' && <>
          <Field sec section="vehicle" field="licensePlate" label="Immatriculation" placeholder="VD 123456" required />
          <Field sec section="vehicle" field="brand"        label="Marque"          placeholder="Toyota, VW, Peugeot..." required />
          <Field sec section="vehicle" field="model"        label="Modèle"          placeholder="Yaris, Golf, 208..." />
          <Field sec section="vehicle" field="year"         label="Année"           placeholder="2019" type="number" />
          <Field sec section="vehicle" field="color"        label="Couleur"         placeholder="Blanc, Noir, Rouge..." />
          <Field sec section="vehicle" field="vin"          label="N° châssis (VIN)" placeholder="VF1..." />
        </>}

        {section === 'driver' && <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <Field sec section="driver" field="firstName" label="Prénom" required />
            </div>
            <div>
              <Field sec section="driver" field="lastName"  label="Nom"    required />
            </div>
          </div>
          <Field sec section="driver" field="address"       label="Adresse"         placeholder="Rue de la Paix 1" required />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
            <div><Field sec section="driver" field="postalCode" label="NPA" placeholder="1000" /></div>
            <div><Field sec section="driver" field="city"       label="Localité" placeholder="Lausanne" required /></div>
          </div>
          <Field sec section="driver" field="country"       label="Pays"            placeholder="CH, FR, DE..." />
          <Field sec section="driver" field="phone"         label="Téléphone"       placeholder="+41 79 123 45 67" type="tel" required />
          <Field sec section="driver" field="email"         label="Email"           placeholder="nom@email.com" type="email" />
          <Field sec section="driver" field="licenseNumber" label="N° permis de conduire" required />
        </>}

        {section === 'insurance' && <>
          <Field sec section="insurance" field="company"         label="Compagnie d'assurance" placeholder="Zurich, AXA, Allianz..." required />
          <Field sec section="insurance" field="policyNumber"    label="N° de police"          placeholder="CH-2026-12345" required />
          <Field sec section="insurance" field="greenCardNumber" label="N° carte verte"        placeholder="..." />
          <Field sec section="insurance" field="greenCardExpiry" label="Validité carte verte"  placeholder="12/2026" />
          <Field sec section="insurance" field="agentName"       label="Agent / Courtier"      placeholder="Nom de l'agent" />
          <Field sec section="insurance" field="agentPhone"      label="Tél. assurance"        placeholder="+41 21 123 45 67" type="tel" />
        </>}

        {section === 'circumstances' && <>
          <p style={{ fontSize: 13, opacity: 0.5, marginBottom: 16, lineHeight: 1.6 }}>
            Cochez toutes les cases qui décrivent la situation de votre véhicule <strong>({role})</strong> au moment du choc.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CEA_CIRCUMSTANCES.map(c => {
              const checked = data.circumstances?.includes(c.id);
              return (
                <button key={c.id} onClick={() => toggleCircumstance(c.id)} style={{
                  padding: '12px 14px', borderRadius: 8, textAlign: 'left', cursor: 'pointer',
                  border: `1.5px solid ${checked ? 'rgba(255,53,0,0.4)' : 'rgba(240,237,232,0.08)'}`,
                  background: checked ? 'rgba(255,53,0,0.08)' : 'transparent',
                  color: 'var(--text)', fontSize: 13, lineHeight: 1.5,
                  display: 'flex', alignItems: 'flex-start', gap: 10, transition: 'all 0.15s',
                }}>
                  <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>
                    {checked ? '✅' : '⬜'}
                  </span>
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 16, fontSize: 11, opacity: 0.35, textAlign: 'center' }}>
            {data.circumstances?.length ?? 0} case{(data.circumstances?.length ?? 0) !== 1 ? 's' : ''} cochée{(data.circumstances?.length ?? 0) !== 1 ? 's' : ''}
          </div>
        </>}
      </div>

      {/* Save button */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(240,237,232,0.06)', flexShrink: 0 }}>
        <button onClick={() => onSave(data)} style={{
          width: '100%', padding: '16px', borderRadius: 10, border: 'none',
          background: 'var(--boom)', color: '#fff', cursor: 'pointer',
          fontSize: 15, fontWeight: 700,
        }}>
          Enregistrer et continuer →
        </button>
      </div>
    </div>
  );
}
