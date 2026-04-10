// client/src/components/police/PoliceObservations.tsx
// Observations libres + estimation de responsabilite
import { useTranslation } from 'react-i18next';

interface Props {
  observations: string;
  responsibilityEstimate: string;
  onObservationsChange: (v: string) => void;
  onResponsibilityChange: (v: string) => void;
}

const RESPONSIBILITY_OPTION_KEYS = [
  { value: '', key: 'police.observations.responsibility_options.not_specified' },
  { value: 'A_responsible', key: 'police.observations.responsibility_options.a_responsible' },
  { value: 'B_responsible', key: 'police.observations.responsibility_options.b_responsible' },
  { value: 'shared', key: 'police.observations.responsibility_options.shared' },
  { value: 'undetermined', key: 'police.observations.responsibility_options.undetermined' },
];

export function PoliceObservations({ observations, responsibilityEstimate, onObservationsChange, onResponsibilityChange }: Props) {
  const { t } = useTranslation();

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-400">
        {t('police.observations.title')}
      </h3>

      <div>
        <label htmlFor="police-observations" className="text-xs text-white/50 block mb-1">
          {t('police.observations.additional_label')}
        </label>
        <textarea
          id="police-observations"
          value={observations}
          onChange={e => onObservationsChange(e.target.value)}
          placeholder={t('police.observations.placeholder')}
          rows={6}
          className="w-full bg-white/5 border border-white/25 rounded px-3 py-2 text-sm text-white placeholder-white/30 resize-y"
        />
      </div>

      <div>
        <label htmlFor="responsibility-estimate" className="text-xs text-white/50 block mb-1">
          {t('police.observations.responsibility_label')}
        </label>
        <select
          id="responsibility-estimate"
          value={responsibilityEstimate}
          onChange={e => onResponsibilityChange(e.target.value)}
          className="w-full sm:w-72 bg-white/5 border border-white/25 rounded px-3 py-2 text-sm text-white min-h-[44px]"
        >
          {RESPONSIBILITY_OPTION_KEYS.map(opt => (
            <option key={opt.value} value={opt.value}>{t(opt.key)}</option>
          ))}
        </select>
        <p className="text-xs text-white/30 mt-1">
          {t('police.observations.disclaimer')}
        </p>
      </div>
    </section>
  );
}
