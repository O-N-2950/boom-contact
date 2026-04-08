// client/src/components/police/DriverStateForm.tsx
// Etat des conducteurs + tests alcoolemie/stupefiants

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

const STATE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'shocked', label: 'Choque' },
  { value: 'minor_injury', label: 'Blesse leger' },
  { value: 'serious_injury', label: 'Blesse grave' },
  { value: 'under_influence', label: 'Sous influence apparente' },
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
        Etat des Conducteurs
      </h3>

      {(['A', 'B'] as const).map(party => {
        const state = getState(party);
        return (
          <div key={party} className="p-4 rounded-lg border border-white/10 bg-white/5 space-y-3">
            <h4 className="text-sm font-semibold text-white">Conducteur {party}</h4>

            {/* Apparent state */}
            <div>
              <label htmlFor={`state-${party}`} className="text-xs text-white/50 block mb-1">
                Etat apparent
              </label>
              <select
                id={`state-${party}`}
                value={state.apparentState}
                onChange={e => updateDriver(party, 'apparentState', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white min-h-[44px]"
              >
                {STATE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
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
                <span className="text-sm text-white/90">Test d'alcoolemie effectue</span>
              </label>

              {state.alcoholTestDone && (
                <div className="ml-8 flex flex-col sm:flex-row gap-2">
                  <div>
                    <label htmlFor={`alc-result-${party}`} className="text-xs text-white/50 block mb-1">Resultat</label>
                    <select
                      id={`alc-result-${party}`}
                      value={state.alcoholResult || 'negative'}
                      onChange={e => updateDriver(party, 'alcoholResult', e.target.value)}
                      className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white min-h-[44px]"
                    >
                      <option value="negative">Negatif</option>
                      <option value="positive">Positif</option>
                    </select>
                  </div>
                  {state.alcoholResult === 'positive' && (
                    <div>
                      <label htmlFor={`alc-rate-${party}`} className="text-xs text-white/50 block mb-1">Taux (g/l ou mg/l)</label>
                      <input
                        id={`alc-rate-${party}`}
                        type="text"
                        value={state.alcoholRate || ''}
                        onChange={e => updateDriver(party, 'alcoholRate', e.target.value)}
                        placeholder="ex: 0.8 g/l"
                        className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-white/30 min-h-[44px]"
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
                <span className="text-sm text-white/90">Test stupefiants effectue</span>
              </label>

              {state.drugTestDone && (
                <div className="ml-8">
                  <label htmlFor={`drug-result-${party}`} className="text-xs text-white/50 block mb-1">Resultat</label>
                  <select
                    id={`drug-result-${party}`}
                    value={state.drugResult || 'negative'}
                    onChange={e => updateDriver(party, 'drugResult', e.target.value)}
                    className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white min-h-[44px]"
                  >
                    <option value="negative">Negatif</option>
                    <option value="positive">Positif</option>
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
              <span className="text-sm text-red-400">Refus de se soumettre au test</span>
            </label>
          </div>
        );
      })}
    </section>
  );
}
