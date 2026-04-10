// client/src/components/police/ConditionsForm.tsx
// Meteo, visibilite, chaussee, signalisation
import { useTranslation } from 'react-i18next';

export interface Conditions {
  weather: string;
  visibility: string;
  roadState: string;
  signage: string;
  signageDetails?: string;
  speedLimit?: number;
}

const WEATHER_OPTION_KEYS = [
  { value: 'clear', key: 'police.conditions.weather_options.clear' },
  { value: 'rain', key: 'police.conditions.weather_options.rain' },
  { value: 'fog', key: 'police.conditions.weather_options.fog' },
  { value: 'snow_ice', key: 'police.conditions.weather_options.snow_ice' },
  { value: 'strong_wind', key: 'police.conditions.weather_options.strong_wind' },
];

const VISIBILITY_OPTION_KEYS = [
  { value: 'good', key: 'police.conditions.visibility_options.good' },
  { value: 'reduced', key: 'police.conditions.visibility_options.reduced' },
  { value: 'night_no_light', key: 'police.conditions.visibility_options.night_no_light' },
  { value: 'night_with_light', key: 'police.conditions.visibility_options.night_with_light' },
];

const ROAD_OPTION_KEYS = [
  { value: 'dry', key: 'police.conditions.road_options.dry' },
  { value: 'wet', key: 'police.conditions.road_options.wet' },
  { value: 'icy', key: 'police.conditions.road_options.icy' },
  { value: 'gravel', key: 'police.conditions.road_options.gravel' },
  { value: 'construction', key: 'police.conditions.road_options.construction' },
];

const SIGNAGE_OPTION_KEYS = [
  { value: 'compliant', key: 'police.conditions.signage_options.compliant' },
  { value: 'defective', key: 'police.conditions.signage_options.defective' },
  { value: 'missing', key: 'police.conditions.signage_options.missing' },
];

interface Props {
  conditions: Conditions;
  onChange: (conditions: Conditions) => void;
}

function RadioGroup({ name, options, value, onChange, label }: {
  name: string;
  options: { value: string; key: string }[];
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const { t } = useTranslation();

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
            {t(opt.key)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ConditionsForm({ conditions, onChange }: Props) {
  const { t } = useTranslation();

  const update = (field: string, value: unknown) => {
    onChange({ ...conditions, [field]: value });
  };

  return (
    <section className="space-y-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-400">
        {t('police.conditions.title')}
      </h3>

      <RadioGroup
        name="weather"
        label={t('police.conditions.weather')}
        options={WEATHER_OPTION_KEYS}
        value={conditions.weather}
        onChange={v => update('weather', v)}
      />

      <RadioGroup
        name="visibility"
        label={t('police.conditions.visibility')}
        options={VISIBILITY_OPTION_KEYS}
        value={conditions.visibility}
        onChange={v => update('visibility', v)}
      />

      <RadioGroup
        name="roadState"
        label={t('police.conditions.road_state')}
        options={ROAD_OPTION_KEYS}
        value={conditions.roadState}
        onChange={v => update('roadState', v)}
      />

      <RadioGroup
        name="signage"
        label={t('police.conditions.signage')}
        options={SIGNAGE_OPTION_KEYS}
        value={conditions.signage}
        onChange={v => update('signage', v)}
      />

      {conditions.signage === 'defective' || conditions.signage === 'missing' ? (
        <div>
          <label htmlFor="signage-details" className="text-xs text-white/50 block mb-1">
            {conditions.signage === 'missing'
              ? t('police.conditions.signage_missing_detail')
              : t('police.conditions.signage_defective_detail')}
          </label>
          <input
            id="signage-details"
            type="text"
            value={conditions.signageDetails || ''}
            onChange={e => update('signageDetails', e.target.value)}
            placeholder={t('police.conditions.signage_detail_placeholder')}
            className="w-full bg-white/5 border border-white/25 rounded px-3 py-2 text-sm text-white placeholder-white/30 min-h-[44px]"
          />
        </div>
      ) : null}

      <div>
        <label htmlFor="speed-limit" className="text-xs text-white/50 block mb-1">
          {t('police.conditions.speed_limit')}
        </label>
        <input
          id="speed-limit"
          type="number"
          min={0}
          max={300}
          value={conditions.speedLimit ?? ''}
          onChange={e => update('speedLimit', e.target.value ? Number(e.target.value) : undefined)}
          placeholder={t('police.conditions.speed_limit_placeholder')}
          className="w-32 bg-white/5 border border-white/25 rounded px-3 py-2 text-sm text-white placeholder-white/30 min-h-[44px]"
        />
      </div>
    </section>
  );
}
