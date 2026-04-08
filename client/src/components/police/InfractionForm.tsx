// client/src/components/police/InfractionForm.tsx
// Cases a cocher infractions + details + conducteur concerne
import { useState } from 'react';

export interface Infraction {
  code: string;
  description: string;
  party: 'A' | 'B' | 'both';
  details?: string;
}

const INFRACTION_PRESETS = [
  { code: 'SPEED', label: 'Exces de vitesse' },
  { code: 'PRIORITY', label: 'Non-respect priorite' },
  { code: 'RED_LIGHT', label: 'Feu rouge grille' },
  { code: 'STOP', label: 'Stop grille' },
  { code: 'NO_SIGNAL', label: 'Changement de direction sans clignotant' },
  { code: 'DISTANCE', label: 'Distance de securite' },
  { code: 'PHONE', label: 'Usage du telephone' },
  { code: 'SEATBELT', label: 'Defaut de ceinture' },
  { code: 'DUI', label: 'Conduite sous influence (alcool/stupefiants)' },
  { code: 'NO_INSURANCE', label: "Defaut d'assurance" },
  { code: 'NO_LICENSE', label: 'Defaut de permis' },
  { code: 'NO_CT', label: 'Defaut de controle technique' },
];

interface Props {
  infractions: Infraction[];
  onChange: (infractions: Infraction[]) => void;
}

export function InfractionForm({ infractions, onChange }: Props) {
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
    (updated[index] as any)[field] = value;
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
        Infractions Code de la Route
      </h3>

      {/* Preset checkboxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {INFRACTION_PRESETS.map(preset => {
          const isChecked = infractions.some(i => i.code === preset.code);
          return (
            <label
              key={preset.code}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors min-h-[44px] ${
                isChecked
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-white/10 bg-white/5 hover:bg-white/8'
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => togglePreset(preset.code, preset.label)}
                className="w-5 h-5 rounded border-white/30 accent-blue-500"
                aria-label={preset.label}
              />
              <span className="text-sm text-white/90">{preset.label}</span>
            </label>
          );
        })}
      </div>

      {/* Details for checked infractions */}
      {infractions.length > 0 && (
        <div className="space-y-3 mt-4">
          <p className="text-xs text-white/50 uppercase tracking-wider">Details par infraction</p>
          {infractions.map((inf, i) => (
            <div key={`${inf.code}-${i}`} className="p-3 rounded-lg border border-white/10 bg-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">{inf.description}</span>
                <button
                  type="button"
                  onClick={() => removeInfraction(i)}
                  className="text-red-400 hover:text-red-300 text-xs min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label={`Supprimer infraction ${inf.description}`}
                >
                  Supprimer
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <label htmlFor={`inf-details-${i}`} className="text-xs text-white/50 block mb-1">Precisions</label>
                  <input
                    id={`inf-details-${i}`}
                    type="text"
                    value={inf.details || ''}
                    onChange={e => updateInfraction(i, 'details', e.target.value)}
                    placeholder="Details supplementaires..."
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-white/30 min-h-[44px]"
                  />
                </div>
                <div className="w-full sm:w-40">
                  <label htmlFor={`inf-party-${i}`} className="text-xs text-white/50 block mb-1">Conducteur concerne</label>
                  <select
                    id={`inf-party-${i}`}
                    value={inf.party}
                    onChange={e => updateInfraction(i, 'party', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white min-h-[44px]"
                  >
                    <option value="A">Conducteur A</option>
                    <option value="B">Conducteur B</option>
                    <option value="both">Les deux</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom infraction */}
      <div className="p-3 rounded-lg border border-dashed border-white/20 bg-white/3 space-y-2">
        <p className="text-xs text-white/50 uppercase tracking-wider">Ajouter une infraction libre</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={customCode}
            onChange={e => setCustomCode(e.target.value)}
            placeholder="Code (ex: LCR 32)"
            className="w-full sm:w-32 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-white/30 min-h-[44px]"
            aria-label="Code infraction libre"
          />
          <input
            type="text"
            value={customDesc}
            onChange={e => setCustomDesc(e.target.value)}
            placeholder="Description de l'infraction"
            className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-white/30 min-h-[44px]"
            aria-label="Description infraction libre"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!customDesc.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded text-sm font-medium text-white min-h-[44px] min-w-[44px]"
          >
            Ajouter
          </button>
        </div>
      </div>
    </section>
  );
}
