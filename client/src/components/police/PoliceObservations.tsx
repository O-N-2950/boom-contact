// client/src/components/police/PoliceObservations.tsx
// Observations libres + estimation de responsabilite

interface Props {
  observations: string;
  responsibilityEstimate: string;
  onObservationsChange: (v: string) => void;
  onResponsibilityChange: (v: string) => void;
}

const RESPONSIBILITY_OPTIONS = [
  { value: '', label: 'Non renseignee' },
  { value: 'A_responsible', label: 'A responsable' },
  { value: 'B_responsible', label: 'B responsable' },
  { value: 'shared', label: 'Responsabilite partagee' },
  { value: 'undetermined', label: 'Indeterminee' },
];

export function PoliceObservations({ observations, responsibilityEstimate, onObservationsChange, onResponsibilityChange }: Props) {
  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-400">
        Observations du policier
      </h3>

      <div>
        <label htmlFor="police-observations" className="text-xs text-white/50 block mb-1">
          Observations complementaires
        </label>
        <textarea
          id="police-observations"
          value={observations}
          onChange={e => onObservationsChange(e.target.value)}
          placeholder="Observations libres de l'agent : description des lieux, comportement des parties, elements notables..."
          rows={6}
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-white/30 resize-y"
        />
      </div>

      <div>
        <label htmlFor="responsibility-estimate" className="text-xs text-white/50 block mb-1">
          Estimation de responsabilite (indicatif)
        </label>
        <select
          id="responsibility-estimate"
          value={responsibilityEstimate}
          onChange={e => onResponsibilityChange(e.target.value)}
          className="w-full sm:w-72 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white min-h-[44px]"
        >
          {RESPONSIBILITY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <p className="text-xs text-white/30 mt-1">
          Cette estimation est purement indicative et n'a pas de valeur juridique.
        </p>
      </div>
    </section>
  );
}
