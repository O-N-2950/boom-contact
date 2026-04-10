// client/src/components/police/DriverStateForm.tsx
// Etat des conducteurs + tests alcoolemie/stupefiants
import { useTranslation } from 'react-i18next';

export interface DriverState {
  party: 'A' | 'B';
  apparentState: 'normal' | 'shocked' | 'minor_injury' | 'serious_injury' | 'under_influence';
  alcoholTestDone: boolean;
  alcoholResult?: 'negative' | 'positive';
  alcoholRate?: string;
  drugTestDone: boolean;
  drugResult?: 'negative' | 'positive';
  testRefused: boolean;
}

const STATE_OPTION_KEYS = [
  { value: 'normal', key: 'police.driver_state.states.normal' },
  { value: 'shocked', key: 'police.driver_state.states.shocked' },
  { value: 'minor_injury', key: 'police.driver_state.states.minor_injury' },
  { value: 'serious_injury', key: 'police.driver_state.states.serious_injury' },
  { value: 'under_influence', key: 'police.driver_state.states.under_influence' },
] as const;

interface Props {
  driverStates: DriverState[];
  onChange: (states: DriverState[]) => void;
}

const DEFAULT_STATE: DriverState = {
  party: 'A',
  apparentState: 'normal',
  alcoholTestDone: false,
  drugTestDone: false,
  testRefused: false,
};

export function DriverStateForm({ driverStates, onChange }: Props) {
  const { t } = useTranslation();

  // Ensure we always have entries for A and B
  const getState = (party: 'A' | 'B'): DriverState => {
    return driverStates.find(s => s.party === party) || { ...DEFAULT_STATE, party };
  };

  const updateDriver = (party: 'A' | 'B', field: string, value: unknown) => {
    const current = getState(party);
    const updated = { ...current, [field]: value };
    const others = driverStates.filter(s => s.party !== party);
    onChange([...others, updated]);
  };

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-400">
        {t('police.driver_state.title')}
      </h3>

      {(['A', 'B'] as const).map(party => {
        const state = getState(party);
        return (
          <div key={party} className="p-4 rounded-lg border border-white/25 bg-white/5 space-y-3">
            <h4 className="text-sm font-semibold text-white">{t('police.driver_state.driver')} {party}</h4>

            {/* Apparent state */}
            <div>
              <label htmlFor={`state-${party}`} className="text-xs text-white/50 block mb-1">
                {t('police.driver_state.apparent_state')}
              </label>
              <select
                id={`state-${party}`}
                value={state.apparentState}
                onChange={e => updateDriver(party, 'apparentState', e.target.value)}
                className="w-full bg-white/5 border border-white/25 rounded px-3 py-2 text-sm text-white min-h-[44px]"
              >
                {STATE_OPTION_KEYS.map(opt => (
                  <option key={opt.value} value={opt.value}>{t(opt.key)}</option>
                ))}
              </select>
            </div>

            {/* Alcohol test */}
            <div className="space-y-2">
              <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.alcoholTestDone}
                  onChange={e => updateDriver(party, 'alcoholTestDone', e.target.checked)}
                  className="w-5 h-5 rounded accent-blue-500"
                />
                <span className="text-sm text-white/90">{t('police.driver_state.alcohol_test_done')}</span>
              </label>

              {state.alcoholTestDone && (
                <div className="ml-8 flex flex-col sm:flex-row gap-2">
                  <div>
                    <label htmlFor={`alc-result-${party}`} className="text-xs text-white/50 block mb-1">{t('police.driver_state.result')}</label>
                    <select
                      id={`alc-result-${party}`}
                      value={state.alcoholResult || 'negative'}
                      onChange={e => updateDriver(party, 'alcoholResult', e.target.value)}
                      className="bg-white/5 border border-white/25 rounded px-3 py-2 text-sm text-white min-h-[44px]"
                    >
                      <option value="negative">{t('police.driver_state.negative')}</option>
                      <option value="positive">{t('police.driver_state.positive')}</option>
                    </select>
                  </div>
                  {state.alcoholResult === 'positive' && (
                    <div>
                      <label htmlFor={`alc-rate-${party}`} className="text-xs text-white/50 block mb-1">{t('police.driver_state.alcohol_rate')}</label>
                      <input
                        id={`alc-rate-${party}`}
                        type="text"
                        value={state.alcoholRate || ''}
                        onChange={e => updateDriver(party, 'alcoholRate', e.target.value)}
                        placeholder={t('police.driver_state.alcohol_rate_placeholder')}
                        className="bg-white/5 border border-white/25 rounded px-3 py-2 text-sm text-white placeholder-white/30 min-h-[44px]"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Drug test */}
            <div className="space-y-2">
              <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.drugTestDone}
                  onChange={e => updateDriver(party, 'drugTestDone', e.target.checked)}
                  className="w-5 h-5 rounded accent-blue-500"
                />
                <span className="text-sm text-white/90">{t('police.driver_state.drug_test_done')}</span>
              </label>

              {state.drugTestDone && (
                <div className="ml-8">
                  <label htmlFor={`drug-result-${party}`} className="text-xs text-white/50 block mb-1">{t('police.driver_state.result')}</label>
                  <select
                    id={`drug-result-${party}`}
                    value={state.drugResult || 'negative'}
                    onChange={e => updateDriver(party, 'drugResult', e.target.value)}
                    className="bg-white/5 border border-white/25 rounded px-3 py-2 text-sm text-white min-h-[44px]"
                  >
                    <option value="negative">{t('police.driver_state.negative')}</option>
                    <option value="positive">{t('police.driver_state.positive')}</option>
                  </select>
                </div>
              )}
            </div>

            {/* Test refused */}
            <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
              <input
                type="checkbox"
                checked={state.testRefused}
                onChange={e => updateDriver(party, 'testRefused', e.target.checked)}
                className="w-5 h-5 rounded accent-red-500"
              />
              <span className="text-sm text-red-400">{t('police.driver_state.test_refused')}</span>
            </label>
          </div>
        );
      })}
    </section>
  );
}
