import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ColorPicker } from '../ColorPicker';
import { VoiceRecorder } from './VoiceRecorder';
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
  { id: 'c1',  labelKey: 'c1' },
  { id: 'c2',  labelKey: 'c2' },
  { id: 'c3',  labelKey: 'c3' },
  { id: 'c4',  labelKey: 'c4' },
  { id: 'c5',  labelKey: 'c5' },
  { id: 'c6',  labelKey: 'c6' },
  { id: 'c7',  labelKey: 'c7' },
  { id: 'c8',  labelKey: 'c8' },
  { id: 'c9',  labelKey: 'c9' },
  { id: 'c10', labelKey: 'c10' },
  { id: 'c11', labelKey: 'c11' },
  { id: 'c12', labelKey: 'c12' },
  { id: 'c13', labelKey: 'c13' },
  { id: 'c14', labelKey: 'c14' },
  { id: 'c15', labelKey: 'c15' },
  { id: 'c16', labelKey: 'c16' },
  { id: 'c17', labelKey: 'c17' },
];

// French labels for circumstances (used as translation values)
const CIRCUMSTANCE_LABELS: Record<string, string> = {
  c1: "Était à l'arrêt ou garé sur la chaussée",
  c2: "Quittait sa place de stationnement ou s'insérait dans la circulation",
  c3: 'Se garait ou cherchait à se stationner',
  c4: "Sortait d'un accès privé, d'un parking ou d'un chemin",
  c5: 'Entrait dans un accès privé, un parking ou un chemin',
  c6: "S'engageait dans un rond-point ou une voie de circulation",
  c7: 'Roulait dans le même sens sur la même voie',
  c8: 'Roulait dans le même sens sur une voie adjacente',
  c9: 'Changeait de voie ou se déportait latéralement',
  c10: 'Effectuait un dépassement',
  c11: 'Tournait à droite',
  c12: 'Tournait à gauche',
  c13: 'Effectuait une marche arrière',
  c14: 'Circulait à contresens sur sa voie',
  c15: 'Arrivait de droite à une intersection',
  c16: "N'avait pas respecté un signal de priorité ou un feu de signalisation",
  c17: 'Autre situation — préciser dans les observations',
};

const NON_REGISTERED_TYPES = ['bicycle', 'pedestrian', 'escooter', 'cargo_bike', 'moped'];

type Section = 'vehicle' | 'driver' | 'insurance' | 'circumstances' | 'complement';

export const ConstatForm = React.memo(function ConstatForm({ role, prefilled, accidentData, onSave, sessionId, language }: Props) {
  const { t } = useTranslation();
  const [section, setSection] = useState<Section>('vehicle');
  const [data, setData] = useState<Partial<ParticipantData>>({
    role,
    vehicle:      prefilled?.vehicle      ?? {},
    driver:       prefilled?.driver       ?? {},
    insurance:    prefilled?.insurance    ?? {},
    damagedZones: prefilled?.damagedZones ?? [],
    circumstances:prefilled?.circumstances ?? [],
    language:     prefilled?.language     ?? 'fr',
  });

  const isNonRegistered = NON_REGISTERED_TYPES.includes(data.vehicle?.vehicleType as string ?? '');

  // Resynchroniser si prefilled change (retour depuis "Corriger" après OCR ou après signature)
  const prevPrefilled = useRef(prefilled);
  useEffect(() => {
    if (prefilled && prefilled !== prevPrefilled.current) {
      prevPrefilled.current = prefilled;
      setData(prev => ({
        ...prev,
        vehicle:      { ...( prefilled.vehicle      ?? {}), ...(Object.fromEntries(Object.entries(prev.vehicle      ?? {}).filter(([,v]) => v))) },
        driver:       { ...( prefilled.driver        ?? {}), ...(Object.fromEntries(Object.entries(prev.driver       ?? {}).filter(([,v]) => v))) },
        insurance:    { ...( prefilled.insurance     ?? {}), ...(Object.fromEntries(Object.entries(prev.insurance    ?? {}).filter(([,v]) => v))) },
        circumstances:prev.circumstances?.length ? prev.circumstances : (prefilled.circumstances ?? []),
      }));
    }
  }, [prefilled]);

  // Champs accident complémentaires (partagés — section 13-14)
  const [accDate, setAccDate]           = useState(accidentData?.date || new Date().toISOString().split('T')[0]);
  const [accTime, setAccTime]           = useState(accidentData?.time || new Date().toTimeString().slice(0, 5));
  const [witnesses, setWitnesses]       = useState(accidentData?.witnesses ?? '');
  const [thirdParty, setThirdParty]     = useState<boolean | null>(
    accidentData?.thirdPartyDamage !== undefined ? accidentData.thirdPartyDamage : null
  );
  const [observations, setObservations] = useState('');
  const [visibleDamage, setVisibleDamage] = useState('');
  const [voiceDeclaration, setVoiceDeclaration] = useState('');

  const sections: { id: Section; icon: string; label: string }[] = [
    { id: 'vehicle',      icon: '🚗', label: t('constatForm.tab_vehicle') },
    { id: 'driver',       icon: '👤', label: t('constatForm.tab_driver') },
    { id: 'insurance',    icon: '🟢', label: t('constatForm.tab_insurance') },
    { id: 'circumstances',icon: '📋', label: t('constatForm.tab_circumstances') },
    { id: 'complement',   icon: '📝', label: t('constatForm.tab_complement') },
  ];

  const update = (section: keyof ParticipantData, field: string, value: string) => {
    setData(prev => ({
      ...prev,
      [section]: { ...((prev[section] as Record<string, unknown>) ?? {}), [field]: value },
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

  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

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
    const fieldId = `${sec}-${field}`;
    const value = ((data[sec] as Record<string, unknown>)?.[field] as string) ?? '';
    const isTouched = touchedFields.has(fieldId);
    const hasError = required && isTouched && !value.trim();
    const errorId = `${fieldId}-error`;
    return (
    <div className="mb-3.5">
      <label htmlFor={fieldId} className="block text-[11px] opacity-70 uppercase mb-1.5 tracking-[1.5px]" style={{ fontFamily: 'monospace' }}>
        {label}{required && <span className="ml-1" style={{ color: 'var(--boom)' }}>*</span>}
      </label>
      <input
        id={fieldId}
        type={inputType}
        inputMode={inputMode}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize={type === 'email' || type === 'number' || field === 'licensePlate' || field === 'policyNumber' || field === 'vin' ? 'none' : 'words'}
        value={value}
        onChange={e => update(sec, field, e.target.value)}
        onBlur={() => setTouchedFields(prev => new Set(prev).add(fieldId))}
        placeholder={placeholder}
        aria-label={label}
        aria-required={required}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? errorId : undefined}
        className="w-full rounded-lg text-sm px-3.5 py-3" style={{ border: `1.5px solid ${hasError ? 'rgba(239,68,68,0.5)' : value ? 'rgba(34,197,94,0.3)' : 'rgba(240,237,232,0.12)'}`, background: 'rgba(255,255,255,0.04)', color: 'var(--text)', fontFamily: 'inherit', transition: 'border-color 0.2s' }}
      />
      {hasError && (
        <div id={errorId} role="alert" className="text-[11px] mt-1 opacity-90" style={{ color: '#ef4444' }}>
          {t('constatForm.field_required')}
        </div>
      )}
    </div>
    );
  };

  return (
    <div className="flex flex-col h-full">

      {/* Section tabs */}
      <div role="tablist" aria-label={t('constatForm.form_tabs_aria')} className="flex shrink-0" style={{ borderBottom: '1px solid rgba(240,237,232,0.08)' }}>
        {sections.map(s => (
          <button key={s.id} id={`form-tab-${s.id}`} role="tab" aria-selected={s.id === section} aria-controls={`form-tabpanel-${s.id}`} onClick={() => setSection(s.id)} className="flex-1 border-0 cursor-pointer transition-all duration-200 text-[11px] font-semibold px-1 py-3" style={{ background: s.id === section ? 'rgba(255,53,0,0.08)' : 'transparent', borderBottom: s.id === section ? '2px solid var(--boom)' : '2px solid transparent', color: s.id === section ? 'var(--boom)' : 'var(--text)' }}>
            <div className="text-lg mb-0.5" >{s.icon}</div>
            <div className="text-[10px] tracking-[1px]" style={{ opacity: s.id === section ? 1 : 0.85 }}>{s.label}</div>
          </button>
        ))}
      </div>

      {/* Form fields */}
      <div role="tabpanel" id={`form-tabpanel-${section}`} aria-labelledby={`form-tab-${section}`} className="flex-1 overflow-y-auto p-5">

        {section === 'vehicle' && <>
          <Field section="vehicle" field="licensePlate" label={t('constatForm.plate_label')} placeholder="VD 123456" required={!isNonRegistered} />
          <Field section="vehicle" field="brand"        label={t('constatForm.brand_label')} placeholder="Toyota, VW, Peugeot..." required />
          <Field section="vehicle" field="model"        label={t('constatForm.model_label')} placeholder="Yaris, Golf, 208..." />
          <Field section="vehicle" field="year"         label={t('constatForm.year_label')} placeholder="2019" type="number" />
          {/* Couleur — sélecteur visuel */}
          <ColorPicker
            value={data.vehicle?.color ?? ''}
            onChange={v => setData(prev => ({
              ...prev,
              vehicle: { ...prev.vehicle, color: v }
            }))}
          />
          <Field section="vehicle" field="vin"          label={t('constatForm.vin_label')} placeholder="VF1..." />
        </>}

        {section === 'driver' && <>
          <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <Field section="driver" field="firstName" label={t('constatForm.firstName_label')} required />
            </div>
            <div>
              <Field section="driver" field="lastName"  label={t('constatForm.lastName_label')} required />
            </div>
          </div>
          <Field section="driver" field="address"       label={t('constatForm.address_label')} placeholder="Rue de la Paix 1" required />
          <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 2fr' }}>
            <div><Field section="driver" field="postalCode" label={t('constatForm.postalCode_label')} placeholder="1000" /></div>
            <div><Field section="driver" field="city"       label={t('constatForm.city_label')} placeholder="Lausanne" required /></div>
          </div>
          <Field section="driver" field="country"       label={t('constatForm.country_label')} placeholder="CH, FR, DE..." />
          <Field section="driver" field="phone"         label={t('constatForm.phone_label')} placeholder="+41 79 123 45 67" type="tel" required />
          <Field section="driver" field="email"         label={t('constatForm.email_label')} placeholder="nom@email.com" type="email" />
          <Field section="driver" field="licenseNumber" label={t('constatForm.license_label')} required={!isNonRegistered} />
        </>}

        {section === 'insurance' && <>
          <Field section="insurance" field="company"         label={t('constatForm.company_label')} placeholder="Zurich, AXA, Allianz..." required={!isNonRegistered} />
          <Field section="insurance" field="policyNumber"    label={t('constatForm.policyNumber_label')} placeholder="CH-2026-12345" required={!isNonRegistered} />
          <Field section="insurance" field="greenCardNumber" label={t('constatForm.greenCardNumber_label')} placeholder="..." />
          <Field section="insurance" field="greenCardExpiry" label={t('constatForm.greenCardExpiry_label')} placeholder="12/2026" />
          <Field section="insurance" field="agentName"       label={t('constatForm.agentName_label')} placeholder="Nom de l'agent" />
          <Field section="insurance" field="agentPhone"      label={t('constatForm.agentPhone_label')} placeholder="+41 21 123 45 67" type="tel" />
        </>}

        {section === 'circumstances' && <>
          <p className="text-[13px] mb-4 leading-relaxed opacity-75" dangerouslySetInnerHTML={{ __html: t('constatForm.circumstances_desc', { role }) }} />
          <div className="flex flex-col gap-2">
            {ACCIDENT_CIRCUMSTANCES.map(c => {
              const checked = data.circumstances?.includes(c.id);
              return (
                <button key={c.id} role="checkbox" aria-checked={!!checked} onClick={() => toggleCircumstance(c.id)} className="rounded-lg text-left cursor-pointer text-[13px] leading-normal flex items-start gap-2.5 px-3.5 py-3" style={{ border: `1.5px solid ${checked ? 'rgba(255,53,0,0.4)' : 'rgba(240,237,232,0.08)'}`, background: checked ? 'rgba(255,53,0,0.08)' : 'transparent', color: 'var(--text)', transition: 'all 0.15s' }}>
                  <span aria-hidden="true" className="text-base shrink-0 mt-px" >
                    {checked ? '✅' : '⬜'}
                  </span>
                  <span>{CIRCUMSTANCE_LABELS[c.id]}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 text-[11px] text-center opacity-70" >
            {t('constatForm.boxes_checked', { count: data.circumstances?.length ?? 0 })}
          </div>
        </>}
        {section === 'complement' && (
          <div className="flex flex-col gap-[18px]" >
            <p className="text-[13px] leading-relaxed opacity-75">
              {t('constatForm.complement_desc')}
            </p>

            {/* Date/heure éditable */}
            <div>
              <label htmlFor="acc-date" className="text-[11px] uppercase mb-2 block opacity-70 tracking-[1.5px]">{t('constatForm.datetime_label')}</label>
              <div className="flex gap-2">
                <input id="acc-date" type="date" value={accDate} max={new Date().toISOString().split('T')[0]} onChange={e => setAccDate(e.target.value)}
                  aria-label={t('constatForm.datetime_label')}
                  className="flex-1 rounded-lg text-sm px-[13px] py-[11px]" style={{ border: '1.5px solid rgba(240,237,232,0.1)', background: 'rgba(240,237,232,0.04)', color: 'var(--text)', colorScheme: 'dark' }} />
                <input id="acc-time" type="time" value={accTime} onChange={e => setAccTime(e.target.value)}
                  aria-label={t('constatForm.datetime_label')}
                  className="flex-1 rounded-lg text-sm px-[13px] py-[11px]" style={{ border: '1.5px solid rgba(240,237,232,0.1)', background: 'rgba(240,237,232,0.04)', color: 'var(--text)', colorScheme: 'dark' }} />
              </div>
            </div>

            {/* Dégâts apparents section 11 */}
            <div>
              <label htmlFor="visible-damage" className="text-[11px] uppercase mb-2 block opacity-70 tracking-[1.5px]">{t('constatForm.visible_damage_label')}</label>
              <textarea id="visible-damage" value={visibleDamage} onChange={e => setVisibleDamage(e.target.value)}
                placeholder={t('constatForm.visible_damage_placeholder')}
                aria-label={t('constatForm.visible_damage_label')}
                rows={3}
                className="w-full rounded-lg text-sm box-border resize-y px-[13px] py-[11px]" style={{ border: '1.5px solid rgba(240,237,232,0.1)', background: 'rgba(240,237,232,0.04)', color: 'var(--text)', fontFamily: 'inherit' }} />
            </div>

            {/* Dégâts matériels à des tiers */}
            <div>
              <div className="text-[11px] uppercase mb-2 opacity-70 tracking-[1.5px]">{t('constatForm.third_party_label')}</div>
              <div className="flex gap-2">
                {[{ val: false, label: `✅ ${t('common.no')}`, color: 'rgba(34,197,94,0.6)' }, { val: true, label: `⚠️ ${t('common.yes')}`, color: 'rgba(255,179,0,0.6)' }].map(opt => (
                  <button key={String(opt.val)} onClick={() => setThirdParty(opt.val)}
                    className="flex-1 rounded-lg cursor-pointer text-sm font-semibold p-3"  style={{ border: `1.5px solid ${thirdParty === opt.val ? opt.color : 'rgba(240,237,232,0.08)'}`, background: thirdParty === opt.val ? `${opt.color}22` : 'transparent', color: 'var(--text)' }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Témoins */}
            <div>
              <label htmlFor="witnesses" className="text-[11px] uppercase mb-2 block opacity-70 tracking-[1.5px]">{t('constatForm.witnesses_label')}</label>
              <textarea id="witnesses" value={witnesses} onChange={e => setWitnesses(e.target.value)}
                placeholder={t('constatForm.witnesses_placeholder')}
                aria-label={t('constatForm.witnesses_label')}
                rows={3}
                className="w-full rounded-lg text-sm box-border resize-y px-[13px] py-[11px]" style={{ border: '1.5px solid rgba(240,237,232,0.1)', background: 'rgba(240,237,232,0.04)', color: 'var(--text)', fontFamily: 'inherit' }} />
            </div>

            {/* Déclaration vocale */}
            {sessionId && (
              <div>
                <div className="text-[11px] uppercase mb-2.5 opacity-70 tracking-[1.5px]">
                  {t('constatForm.voice_declaration_label')}
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
              <label htmlFor="observations-field" className="block text-[11px] uppercase mb-2 opacity-70 tracking-[1.5px]">{t('constatForm.observations_label', { role })}</label>
              <textarea id="observations-field" aria-label={t('constatForm.observations_label', { role })} value={observations} onChange={e => setObservations(e.target.value)}
                placeholder={t('constatForm.observations_placeholder')}
                rows={4}
                className="w-full rounded-lg text-sm box-border resize-y px-[13px] py-[11px]" style={{ border: '1.5px solid rgba(240,237,232,0.1)', background: 'rgba(240,237,232,0.04)', color: 'var(--text)', fontFamily: 'inherit' }} />
            </div>

            {/* Preneur d'assurance différent du conducteur */}
            <div className="rounded-[10px] p-3.5"  style={{ background: 'rgba(240,237,232,0.03)', border: '1px solid rgba(240,237,232,0.08)' }}>
              <div className="text-[11px] uppercase mb-3 opacity-70 tracking-[1.5px]">{t('constatForm.insurance_holder_label')}</div>
              {(['insuranceHolder', 'insuranceHolderAddress'] as const).map(field => (
                <div key={field} className="mb-2.5">
                  <label htmlFor={`ins-${field}`} className="sr-only">{field === 'insuranceHolder' ? t('constatForm.holder_name_aria') : t('constatForm.holder_address_aria')}</label>
                  <input
                    id={`ins-${field}`}
                    placeholder={field === 'insuranceHolder' ? t('constatForm.holder_name_placeholder') : t('constatForm.holder_address_placeholder')}
                    aria-label={field === 'insuranceHolder' ? t('constatForm.holder_name_aria') : t('constatForm.holder_address_aria')}
                    value={((data.insurance as Record<string, unknown>)?.[field] as string) ?? ''}
                    onChange={e => setData(prev => ({ ...prev, insurance: { ...(prev.insurance ?? {}), [field]: e.target.value } }))}
                    className="w-full rounded-lg text-sm box-border px-[13px] py-[11px]" style={{ border: '1.5px solid rgba(240,237,232,0.1)', background: 'rgba(240,237,232,0.04)', color: 'var(--text)' }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="shrink-0 px-5 py-3.5" style={{ borderTop: '1px solid rgba(240,237,232,0.06)' }}>
        <button onClick={() => onSave(data, {
          date: accDate || undefined,
          time: accTime || undefined,
          witnesses: witnesses || undefined,
          thirdPartyDamage: thirdParty !== null ? thirdParty : undefined,
          description: observations || undefined,
        })} className="w-full p-4 rounded-[10px] border-0 text-white cursor-pointer font-bold text-[15px]" style={{ background: 'var(--boom)' }}>
          {t('constatForm.save_btn')}
        </button>
      </div>
    </div>
  );
});
