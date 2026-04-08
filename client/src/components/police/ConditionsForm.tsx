// client/src/components/police/ConditionsForm.tsx
// Meteo, visibilite, chaussee, signalisation

export interface Conditions {
  weather: string;
  visibility: string;
  roadState: string;
  signage: string;
  signageDetails?: string;
  speedLimit?: number;
}

const WEATHER_OPTIONS = [
  { value: 'clear', label: 'Beau temps' },
  { value: 'rain', label: 'Pluie' },
  { value: 'fog', label: 'Brouillard' },
  { value: 'snow_ice', label: 'Neige / Verglas' },
  { value: 'strong_wind', label: 'Vent fort' },
];

const VISIBILITY_OPTIONS = [
  { value: 'good', label: 'Bonne' },
  { value: 'reduced', label: 'Reduite' },
  { value: 'night_no_light', label: 'Nuit sans eclairage' },
  { value: 'night_with_light', label: 'Nuit avec eclairage' },
];

const ROAD_OPTIONS = [
  { value: 'dry', label: 'Seche' },
  { value: 'wet', label: 'Mouillee' },
  { value: 'icy', label: 'Verglacee' },
  { value: 'gravel', label: 'Gravillons' },
  { value: 'construction', label: 'Travaux' },
];

const SIGNAGE_OPTIONS = [
  { value: 'compliant', label: 'Conforme' },
  { value: 'defective', label: 'Defaillante' },
  { value: 'missing', label: 'Absente' },
];

interface Props {
  conditions: Conditions;
  onChange: (conditions: Conditions) => void;
}

function RadioGroup({ name, options, value, onChange, label }: {
  name: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <fieldset>
      <legend className="text-xs text-white/50 uppercase tracking-wider mb-2">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <label
            key={opt.value}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors min-h-[44px] text-sm ${
              value === opt.value
                ? 'border-blue-500 bg-blue-500/10 text-white'
                : 'border-white/25 bg-white/5 text-white/70 hover:bg-white/8'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ConditionsForm({ conditions, onChange }: Props) {
  const update = (field: string, value: unknown) => {
    onChange({ ...conditions, [field]: value });
  };

  return (
    <section className="space-y-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-400">
        Conditions de l'accident
      </h3>

      <RadioGroup
        name="weather"
        label="Meteo"
        options={WEATHER_OPTIONS}
        value={conditions.weather}
        onChange={v => update('weather', v)}
      />

      <RadioGroup
        name="visibility"
        label="Visibilite"
        options={VISIBILITY_OPTIONS}
        value={conditions.visibility}
        onChange={v => update('visibility', v)}
      />

      <RadioGroup
        name="roadState"
        label="Etat de la chaussee"
        options={ROAD_OPTIONS}
        value={conditions.roadState}
        onChange={v => update('roadState', v)}
      />

      <RadioGroup
        name="signage"
        label="Signalisation"
        options={SIGNAGE_OPTIONS}
        value={conditions.signage}
        onChange={v => update('signage', v)}
      />

      {conditions.signage === 'defective' || conditions.signage === 'missing' ? (
        <div>
          <label htmlFor="signage-details" className="text-xs text-white/50 block mb-1">
            Preciser la signalisation {conditions.signage === 'missing' ? 'absente' : 'defaillante'}
          </label>
          <input
            id="signage-details"
            type="text"
            value={conditions.signageDetails || ''}
            onChange={e => update('signageDetails', e.target.value)}
            placeholder="Ex: panneau stop manquant au croisement..."
            className="w-full bg-white/5 border border-white/25 rounded px-3 py-2 text-sm text-white placeholder-white/30 min-h-[44px]"
          />
        </div>
      ) : null}

      <div>
        <label htmlFor="speed-limit" className="text-xs text-white/50 block mb-1">
          Limitation de vitesse sur zone (km/h)
        </label>
        <input
          id="speed-limit"
          type="number"
          min={0}
          max={300}
          value={conditions.speedLimit ?? ''}
          onChange={e => update('speedLimit', e.target.value ? Number(e.target.value) : undefined)}
          placeholder="Ex: 50"
          className="w-32 bg-white/5 border border-white/25 rounded px-3 py-2 text-sm text-white placeholder-white/30 min-h-[44px]"
        />
      </div>
    </section>
  );
}
