// client/src/components/police/PolicePhotoCapture.tsx
// Prise de photos categorisees par le policier
import { useRef } from 'react';

export interface PolicePhoto {
  id: string;
  category: 'overview' | 'tracks' | 'signage' | 'other';
  base64: string;
  caption?: string;
  takenAt: string;
}

const CATEGORIES = [
  { value: 'overview', label: 'Vue globale' },
  { value: 'tracks', label: 'Detail traces' },
  { value: 'signage', label: 'Signalisation' },
  { value: 'other', label: 'Autre' },
] as const;

interface Props {
  photos: PolicePhoto[];
  onChange: (photos: PolicePhoto[]) => void;
}

export function PolicePhotoCapture({ photos, onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = (category: PolicePhoto['category']) => {
    const input = fileInputRef.current;
    if (!input) return;
    input.setAttribute('data-category', category);
    input.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const category = (e.target.getAttribute('data-category') || 'other') as PolicePhoto['category'];

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const photo: PolicePhoto = {
        id: `pph_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        category,
        base64,
        takenAt: new Date().toISOString(),
      };
      onChange([...photos, photo]);
    };
    reader.readAsDataURL(file);
    // Reset input
    e.target.value = '';
  };

  const updateCaption = (index: number, caption: string) => {
    const updated = [...photos];
    updated[index] = { ...updated[index], caption };
    onChange(updated);
  };

  const removePhoto = (index: number) => {
    onChange(photos.filter((_, i) => i !== index));
  };

  const getCategoryLabel = (cat: string) =>
    CATEGORIES.find(c => c.value === cat)?.label || cat;

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-400">
        Photos police
      </h3>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* Capture buttons by category */}
      <div className="grid grid-cols-2 gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            type="button"
            onClick={() => handleCapture(cat.value)}
            className="px-3 py-3 border border-blue-500/30 rounded-lg text-sm text-blue-400 hover:bg-blue-500/10 transition-colors min-h-[44px] flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Photo gallery */}
      {photos.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-white/50">{photos.length} photo(s) prise(s)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((photo, i) => (
              <div key={photo.id} className="relative rounded-lg border border-white/25 overflow-hidden bg-white/5">
                <img
                  src={photo.base64}
                  alt={`Photo police ${i + 1} - ${getCategoryLabel(photo.category)}`}
                  className="w-full h-32 object-cover"
                />
                <div className="p-2 space-y-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                    {getCategoryLabel(photo.category)}
                  </span>
                  <input
                    type="text"
                    value={photo.caption || ''}
                    onChange={e => updateCaption(i, e.target.value)}
                    placeholder="Legende..."
                    className="w-full bg-transparent border-b border-white/25 text-xs text-white placeholder-white/30 py-1"
                    aria-label={`Legende photo ${i + 1}`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-red-400 text-xs flex items-center justify-center min-w-[44px] min-h-[44px]"
                  aria-label={`Supprimer photo ${i + 1}`}
                  
                >
                  X
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
