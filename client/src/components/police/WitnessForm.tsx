// client/src/components/police/WitnessForm.tsx
// Gestion des temoins : ajout, edition, suppression

export interface Witness {
  name: string;
  firstName?: string;
  phone?: string;
  address?: string;
  statement?: string;
}

interface Props {
  witnesses: Witness[];
  onChange: (witnesses: Witness[]) => void;
}

export function WitnessForm({ witnesses, onChange }: Props) {
  const addWitness = () => {
    onChange([...witnesses, { name: '', firstName: '', phone: '', address: '', statement: '' }]);
  };

  const updateWitness = (index: number, field: keyof Witness, value: string) => {
    const updated = [...witnesses];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeWitness = (index: number) => {
    onChange(witnesses.filter((_, i) => i !== index));
  };

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-400">
        Temoins
      </h3>

      {witnesses.length === 0 && (
        <p className="text-sm text-white/40">Aucun temoin enregistre.</p>
      )}

      {witnesses.map((w, i) => (
        <div key={i} className="p-4 rounded-lg border border-white/10 bg-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">Temoin {i + 1}</span>
            <button
              type="button"
              onClick={() => removeWitness(i)}
              className="text-red-400 hover:text-red-300 text-xs min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label={`Supprimer temoin ${i + 1}`}
            >
              Supprimer
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor={`witness-name-${i}`} className="text-xs text-white/50 block mb-1">Nom</label>
              <input
                id={`witness-name-${i}`}
                type="text"
                value={w.name}
                onChange={e => updateWitness(i, 'name', e.target.value)}
                placeholder="Nom de famille"
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-white/30 min-h-[44px]"
              />
            </div>
            <div>
              <label htmlFor={`witness-firstname-${i}`} className="text-xs text-white/50 block mb-1">Prenom</label>
              <input
                id={`witness-firstname-${i}`}
                type="text"
                value={w.firstName || ''}
                onChange={e => updateWitness(i, 'firstName', e.target.value)}
                placeholder="Prenom"
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-white/30 min-h-[44px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor={`witness-phone-${i}`} className="text-xs text-white/50 block mb-1">Telephone</label>
              <input
                id={`witness-phone-${i}`}
                type="tel"
                value={w.phone || ''}
                onChange={e => updateWitness(i, 'phone', e.target.value)}
                placeholder="+41 79 123 45 67"
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-white/30 min-h-[44px]"
              />
            </div>
            <div>
              <label htmlFor={`witness-address-${i}`} className="text-xs text-white/50 block mb-1">Adresse</label>
              <input
                id={`witness-address-${i}`}
                type="text"
                value={w.address || ''}
                onChange={e => updateWitness(i, 'address', e.target.value)}
                placeholder="Adresse du temoin"
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-white/30 min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <label htmlFor={`witness-statement-${i}`} className="text-xs text-white/50 block mb-1">Deposition resumee</label>
            <textarea
              id={`witness-statement-${i}`}
              value={w.statement || ''}
              onChange={e => updateWitness(i, 'statement', e.target.value)}
              placeholder="Resume de la deposition du temoin..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-white/30 resize-y"
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addWitness}
        className="w-full px-4 py-3 border border-dashed border-blue-500/50 rounded-lg text-sm text-blue-400 hover:bg-blue-500/10 transition-colors min-h-[44px]"
      >
        + Ajouter un temoin
      </button>
    </section>
  );
}
