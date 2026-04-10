// client/src/components/police/InfractionForm.tsx
// Cases a cocher infractions + details + conducteur concerne
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface Infraction {
  code: string;
  description: string;
  party: 'A' | 'B' | 'both';
  details?: string;
}

const INFRACTION_PRESET_KEYS = [
  { code: 'SPEED', key: 'police.infractions.presets.speed' },
  { code: 'PRIORITY', key: 'police.infractions.presets.priority' },
  { code: 'RED_LIGHT', key: 'police.infractions.presets.red_light' },
  { code: 'STOP', key: 'police.infractions.presets.stop' },
  { code: 'NO_SIGNAL', key: 'police.infractions.presets.no_signal' },
  { code: 'DISTANCE', key: 'police.infractions.presets.distance' },
  { code: 'PHONE', key: 'police.infractions.presets.phone' },
  { code: 'SEATBELT', key: 'police.infractions.presets.seatbelt' },
  { code: 'DUI', key: 'police.infractions.presets.dui' },
  { code: 'NO_INSURANCE', key: 'police.infractions.presets.no_insurance' },
  { code: 'NO_LICENSE', key: 'police.infractions.presets.no_license' },
  { code: 'NO_CT', key: 'police.infractions.presets.no_ct' },
];

interface Props {
  infractions: Infraction[];
  onChange: (infractions: Infraction[]) => void;
}

export function InfractionForm({ infractions, onChange }: Props) {
  const { t } = useTranslation();
  const [customCode, setCustomCode] = useState('');
  const [customDesc, setCustomDesc] = useState('');

  const togglePreset = (code: string, label: string) => {
    const existing = infractions.find(i => i.code === code);
    if (existing) {
      onChange(infractions.filter(i => i.code !== code));
    } else {
      onChange([...infractions, { code, description: label, party: 'A' }]);
    }
  };

  const updateInfraction = (index: number, field: keyof Infraction, value: string) => {
    const updated = [...infractions];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const addCustom = () => {
    if (!customDesc.trim()) return;
    onChange([...infractions, {
      code: customCode.trim() || 'CUSTOM',
      description: customDesc.trim(),
      party: 'A',
    }]);
    setCustomCode('');
    setCustomDesc('');
  };

  const removeInfraction = (index: number) => {
    onChange(infractions.filter((_, i) => i !== index));
  };

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-400">
        {t('police.infractions.title')}
      </h3>

      {/* Preset checkboxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {INFRACTION_PRESET_KEYS.map(preset => {
          const label = t(preset.key);
          const isChecked = infractions.some(i => i.code === preset.code);
          return (
            <label
              key={preset.code}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors min-h-[44px] ${
                isChecked
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-white/25 bg-white/5 hover:bg-white/8'
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => togglePreset(preset.code, label)}
                className="w-5 h-5 rounded border-white/30 accent-blue-500"
                aria-label={label}
              />
              <span className="text-sm text-white/90">{label}</span>
            </label>
          );
        })}
      </div>

      {/* Details for checked infractions */}
      {infractions.length > 0 && (
        <div className="space-y-3 mt-4">
          <p className="text-xs text-white/50 uppercase tracking-wider">{t('police.infractions.details_per_infraction')}</p>
          {infractions.map((inf, i) => (
            <div key={`${inf.code}-${i}`} className="p-3 rounded-lg border border-white/25 bg-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">{inf.description}</span>
                <button
                  type="button"
                  onClick={() => removeInfraction(i)}
                  className="text-red-400 hover:text-red-300 text-xs min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label={`${t('police.infractions.remove')} ${inf.description}`}
                >
                  {t('police.infractions.remove')}
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <label htmlFor={`inf-details-${i}`} className="text-xs text-white/50 block mb-1">{t('police.infractions.details_label')}</label>
                  <input
                    id={`inf-details-${i}`}
                    type="text"
                    value={inf.details || ''}
                    onChange={e => updateInfraction(i, 'details', e.target.value)}
                    placeholder={t('police.infractions.details_placeholder')}
                    className="w-full bg-white/5 border border-white/25 rounded px-3 py-2 text-sm text-white placeholder-white/30 min-h-[44px]"
                  />
                </div>
                <div className="w-full sm:w-40">
                  <label htmlFor={`inf-party-${i}`} className="text-xs text-white/50 block mb-1">{t('police.infractions.driver_concerned')}</label>
                  <select
                    id={`inf-party-${i}`}
                    value={inf.party}
                    onChange={e => updateInfraction(i, 'party', e.target.value)}
                    className="w-full bg-white/5 border border-white/25 rounded px-3 py-2 text-sm text-white min-h-[44px]"
                  >
                    <option value="A">{t('police.infractions.driver_a')}</option>
                    <option value="B">{t('police.infractions.driver_b')}</option>
                    <option value="both">{t('police.infractions.both')}</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom infraction */}
      <div className="p-3 rounded-lg border border-dashed border-white/20 bg-white/3 space-y-2">
        <p className="text-xs text-white/50 uppercase tracking-wider">{t('police.infractions.add_custom')}</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={customCode}
            onChange={e => setCustomCode(e.target.value)}
            placeholder={t('police.infractions.code_placeholder')}
            className="w-full sm:w-32 bg-white/5 border border-white/25 rounded px-3 py-2 text-sm text-white placeholder-white/30 min-h-[44px]"
            aria-label={t('police.infractions.code_aria')}
          />
          <input
            type="text"
            value={customDesc}
            onChange={e => setCustomDesc(e.target.value)}
            placeholder={t('police.infractions.desc_placeholder')}
            className="flex-1 bg-white/5 border border-white/25 rounded px-3 py-2 text-sm text-white placeholder-white/30 min-h-[44px]"
            aria-label={t('police.infractions.desc_aria')}
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!customDesc.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded text-sm font-medium text-white min-h-[44px] min-w-[44px]"
          >
            {t('police.infractions.add_button')}
          </button>
        </div>
      </div>
    </section>
  );
}
