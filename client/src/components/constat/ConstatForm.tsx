import { ColorPicker } from '../ColorPicker';
import { VoiceRecorder } from './VoiceRecorder';
import { useState } from 'react';
import type { ParticipantData, AccidentData, ParticipantRole } from '../../../../shared/types';

interface Props {
  role: ParticipantRole;
  prefilled?: Partial<ParticipantData>;
  accidentData?: Partial<AccidentData>;
  onSave: (data: Partial<ParticipantData>, accident?: Partial<AccidentData>) => void;
  sessionId?: string;
  language?: string;
}

// Circonstances boom.contact — reformulées (17 situations standard)
const ACCIDENT_CIRCUMSTANCES = [
  { id: 'c1',  label: 'Était à l\'arrêt ou garé sur la chaussée' },
  { id: 'c2',  label: 'Quittait sa place de stationnement ou s\'insérait dans la circulation' },
  { id: 'c3',  label: 'Se garait ou cherchait à se stationner' },
  { id: 'c4',  label: 'Sortait d\'un accès privé, d\'un parking ou d\'un chemin' },
  { id: 'c5',  label: 'Entrait dans un accès privé, un parking ou un chemin' },
  { id: 'c6',  label: 'S\'engageait dans un rond-point ou une voie de circulation' },
  { id: 'c7',  label: 'Roulait dans le même sens sur la même voie' },
  { id: 'c8',  label: 'Roulait dans le même sens sur une voie adjacente' },
  { id: 'c9',  label: 'Changeait de voie ou se déportait latéralement' },
  { id: 'c10', label: 'Effectuait un dépassement' },
  { id: 'c11', label: 'Tournait à droite' },
  { id: 'c12', label: 'Tournait à gauche' },
  { id: 'c13', label: 'Effectuait une marche arrière' },
  { id: 'c14', label: 'Circulait à contresens sur sa voie' },
  { id: 'c15', label: 'Arrivait de droite à une intersection' },
  { id: 'c16', label: 'N\'avait pas respecté un signal de priorité ou un feu de signalisation' },
  { id: 'c17', label: 'Autre situation — préciser dans les observations' },
];

type Section = 'vehicle' | 'driver' | 'insurance' | 'circumstances' | 'complement';

export function ConstatForm({ role, prefilled, accidentData, onSave, sessionId, language }: Props) {
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

  // Champs accident complémentaires (partagés — section 13-14)
  const [accDate, setAccDate]           = useState(accidentData?.date ?? '');
  const [accTime, setAccTime]           = useState(accidentData?.time ?? '');
  const [witnesses, setWitnesses]       = useState(accidentData?.witnesses ?? '');
  const [thirdParty, setThirdParty]     = useState<boolean | null>(
    accidentData?.thirdPartyDamage !== undefined ? accidentData.thirdPartyDamage : null
  );
  const [observations, setObservations] = useState('');
  const [visibleDamage, setVisibleDamage] = useState('');
  const [voiceDeclaration, setVoiceDeclaration] = useState('');

  const sections: { id: Section; icon: string; label: string }[] = [
    { id: 'vehicle',      icon: '🚗', label: 'Véhicule' },
    { id: 'driver',       icon: '👤', label: 'Conducteur' },
    { id: 'insurance',    icon: '🟢', label: 'Assurance' },
    { id: 'circumstances',icon: '📋', label: 'Circonstances' },
    { id: 'complement',   icon: '📝', label: 'Complément' },
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
  }) => {
    // Fix iOS keyboard switching: never use type="number", use inputMode instead
    const inputType = type === 'number' ? 'text' : type;
    const inputMode: React.InputHTMLAttributes<HTMLInputElement>['inputMode'] =
      type === 'number' ? 'numeric' :
      type === 'tel'    ? 'tel' :
      type === 'email'  ? 'email' : 'text';
    return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, letterSpacing: 1.5, opacity: 0.45,
        textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 6 }}>
        {label}{required && <span style={{ color: 'var(--boom)', marginLeft: 4 }}>*</span>}
      </label>
      <input
        type={inputType}
        inputMode={inputMode}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize={type === 'email' || type === 'number' || field === 'licensePlate' || field === 'policyNumber' || field === 'vin' ? 'none' : 'words'}
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
  };

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
          {/* Couleur — sélecteur visuel */}
          <ColorPicker
            value={data.vehicle?.color ?? ''}
            onChange={v => setData(prev => ({
              ...prev,
              vehicle: { ...prev.vehicle, color: v }
            }))}
          />
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
            {ACCIDENT_CIRCUMSTANCES.map(c => {
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
        {section === 'complement' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{ fontSize: 13, opacity: 0.5, lineHeight: 1.6 }}>
              Informations complémentaires du constat — sections 11, 13 et 14.
            </p>

            {/* Date/heure éditable */}
            <div>
              <div style={{ fontSize: 11, letterSpacing: 1.5, opacity: 0.45, textTransform: 'uppercase', marginBottom: 8 }}>Date et heure de l'accident</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="date" value={accDate} onChange={e => setAccDate(e.target.value)}
                  style={{ flex: 1, padding: '11px 13px', borderRadius: 8, border: '1.5px solid rgba(240,237,232,0.1)', background: 'rgba(240,237,232,0.04)', color: 'var(--text)', fontSize: 14, outline: 'none' }} />
                <input type="time" value={accTime} onChange={e => setAccTime(e.target.value)}
                  style={{ flex: 1, padding: '11px 13px', borderRadius: 8, border: '1.5px solid rgba(240,237,232,0.1)', background: 'rgba(240,237,232,0.04)', color: 'var(--text)', fontSize: 14, outline: 'none' }} />
              </div>
            </div>

            {/* Dégâts apparents section 11 */}
            <div>
              <div style={{ fontSize: 11, letterSpacing: 1.5, opacity: 0.45, textTransform: 'uppercase', marginBottom: 8 }}>Dégâts apparents (section 11)</div>
              <textarea value={visibleDamage} onChange={e => setVisibleDamage(e.target.value)}
                placeholder="Décrivez les dommages visibles sur votre véhicule..."
                rows={3}
                style={{ width: '100%', padding: '11px 13px', borderRadius: 8, border: '1.5px solid rgba(240,237,232,0.1)', background: 'rgba(240,237,232,0.04)', color: 'var(--text)', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>

            {/* Dégâts matériels à des tiers */}
            <div>
              <div style={{ fontSize: 11, letterSpacing: 1.5, opacity: 0.45, textTransform: 'uppercase', marginBottom: 8 }}>Dégâts matériels à des tiers (autres que A et B)</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ val: false, label: '✅ Non', color: 'rgba(34,197,94,0.6)' }, { val: true, label: '⚠️ Oui', color: 'rgba(255,179,0,0.6)' }].map(opt => (
                  <button key={String(opt.val)} onClick={() => setThirdParty(opt.val)}
                    style={{ flex: 1, padding: '12px', borderRadius: 8, border: `1.5px solid ${thirdParty === opt.val ? opt.color : 'rgba(240,237,232,0.08)'}`, background: thirdParty === opt.val ? `${opt.color}22` : 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Témoins */}
            <div>
              <div style={{ fontSize: 11, letterSpacing: 1.5, opacity: 0.45, textTransform: 'uppercase', marginBottom: 8 }}>Témoins</div>
              <textarea value={witnesses} onChange={e => setWitnesses(e.target.value)}
                placeholder="Nom, prénom, téléphone de chaque témoin..."
                rows={3}
                style={{ width: '100%', padding: '11px 13px', borderRadius: 8, border: '1.5px solid rgba(240,237,232,0.1)', background: 'rgba(240,237,232,0.04)', color: 'var(--text)', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>

            {/* Déclaration vocale */}
            {sessionId && (
              <div>
                <div style={{ fontSize: 11, letterSpacing: 1.5, opacity: 0.45, textTransform: 'uppercase', marginBottom: 10 }}>
                  🎙️ Déclaration vocale (optionnel)
                </div>
                <VoiceRecorder
                  role={role as 'A' | 'B' | 'C' | 'D' | 'E'}
                  sessionId={sessionId}
                  lang={language}
                  onComplete={(transcript) => {
                    setVoiceDeclaration(transcript);
                    // Ajouter la transcription aux observations
                    setObservations(prev => prev
                      ? prev + '\n\n[Déclaration vocale]: ' + transcript
                      : '[Déclaration vocale]: ' + transcript
                    );
                  }}
                />
              </div>
            )}

            {/* Observations libres section 14 */}
            <div>
              <div style={{ fontSize: 11, letterSpacing: 1.5, opacity: 0.45, textTransform: 'uppercase', marginBottom: 8 }}>Observations libres — conducteur {role} (section 14)</div>
              <textarea value={observations} onChange={e => setObservations(e.target.value)}
                placeholder="Ajoutez tout élément utile : conditions météo, état de la chaussée, vitesse estimée, remarques..."
                rows={4}
                style={{ width: '100%', padding: '11px 13px', borderRadius: 8, border: '1.5px solid rgba(240,237,232,0.1)', background: 'rgba(240,237,232,0.04)', color: 'var(--text)', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>

            {/* Preneur d'assurance différent du conducteur */}
            <div style={{ padding: '14px', borderRadius: 10, background: 'rgba(240,237,232,0.03)', border: '1px solid rgba(240,237,232,0.08)' }}>
              <div style={{ fontSize: 11, letterSpacing: 1.5, opacity: 0.45, textTransform: 'uppercase', marginBottom: 12 }}>Preneur d'assurance (si différent du conducteur)</div>
              {(['insuranceHolder', 'insuranceHolderAddress'] as const).map(field => (
                <div key={field} style={{ marginBottom: 10 }}>
                  <input
                    placeholder={field === 'insuranceHolder' ? 'Nom complet du preneur' : 'Adresse du preneur'}
                    value={(data.insurance as any)?.[field] ?? ''}
                    onChange={e => setData(prev => ({ ...prev, insurance: { ...(prev.insurance ?? {}), [field]: e.target.value } }))}
                    style={{ width: '100%', padding: '11px 13px', borderRadius: 8, border: '1.5px solid rgba(240,237,232,0.1)', background: 'rgba(240,237,232,0.04)', color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Save button */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(240,237,232,0.06)', flexShrink: 0 }}>
        <button onClick={() => onSave(data, {
          date: accDate || undefined,
          time: accTime || undefined,
          witnesses: witnesses || undefined,
          thirdPartyDamage: thirdParty !== null ? thirdParty : undefined,
          description: observations || undefined,
        })} style={{
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
