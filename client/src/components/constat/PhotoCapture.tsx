import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ScenePhoto, PhotoCategory } from '../../../../shared/types';

interface Props {
  photos: ScenePhoto[];
  onChange: (photos: ScenePhoto[]) => void;
  onContinue: () => void;
  vehicleCount?: number;
}

const MAX_PHOTOS = 5;
const MAX_PX = 1024;
const QUALITY = 0.85;

const CATEGORIES: { id: PhotoCategory; icon: string; label: string; sub: string }[] = [
  { id: 'scene',    icon: '📍', label: 'Lieu du sinistre',     sub: 'Vue générale, signalisation, traces de freinage' },
  { id: 'vehicleA', icon: '🚗', label: 'Dommages véhicule A',  sub: 'Choc, rayures, déformation' },
  { id: 'vehicleB', icon: '🚙', label: 'Dommages véhicule B',  sub: 'Choc, rayures, déformation' },
  { id: 'vehicleC', icon: '🚐', label: 'Dommages véhicule C',  sub: 'Choc, rayures, déformation' },
  { id: 'vehicleD', icon: '🚓', label: 'Dommages véhicule D',  sub: 'Choc, rayures, déformation' },
  { id: 'vehicleE', icon: '🚛', label: 'Dommages véhicule E',  sub: 'Choc, rayures, déformation' },
  { id: 'injury',   icon: '🩹', label: 'Blessures',            sub: 'Uniquement si consentement' },
  { id: 'document', icon: '📄', label: 'Document / Plaque',    sub: 'Plaque d\'immatriculation, papiers' },
  { id: 'other',    icon: '📷', label: 'Autre',                sub: 'Tout ce qui peut être utile' },
];

// Catégories véhicule visibles selon le nombre de véhicules (C si ≥3, D si
// ≥4, E si ≥5). 2 véhicules ⇒ liste inchangée (aucune régression).
function visibleCategories(vehicleCount?: number) {
  const n = vehicleCount ?? 2;
  const hidden = new Set<PhotoCategory>();
  if (n < 3) hidden.add('vehicleC');
  if (n < 4) hidden.add('vehicleD');
  if (n < 5) hidden.add('vehicleE');
  return CATEGORIES.filter(c => !hidden.has(c.id));
}

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > MAX_PX || height > MAX_PX) {
        if (width > height) { height = Math.round(height * MAX_PX / width); width = MAX_PX; }
        else { width = Math.round(width * MAX_PX / height); height = MAX_PX; }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', QUALITY).split(',')[1]);
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = url;
  });
}

export const PhotoCapture = React.memo(function PhotoCapture({ photos, onChange, onContinue, vehicleCount }: Props) {
  const { t } = useTranslation();
  const cats = visibleCategories(vehicleCount);
  const [selectedCategory, setSelectedCategory] = useState<PhotoCategory>('scene');
  const [injuryConfirmed, setInjuryConfirmed] = useState(false);
  const [showInjuryConfirm, setShowInjuryConfirm] = useState(false);
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [captionValue, setCaptionValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = '';
    if (!file) return;
    if (photos.length >= MAX_PHOTOS) {
      setError(`Maximum ${MAX_PHOTOS} photos atteint.`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const base64 = await compressImage(file);
      const photo: ScenePhoto = {
        id: crypto.randomUUID(),
        category: selectedCategory,
        base64,
        takenAt: new Date().toISOString(),
      };
      onChange([...photos, photo]);
    } catch {
      setError('Erreur lors du traitement de la photo.');
    } finally {
      setLoading(false);
    }
  };

  const removePhoto = (id: string) => {
    onChange(photos.filter(p => p.id !== id));
  };

  const saveCaption = (id: string) => {
    onChange(photos.map(p => p.id === id ? { ...p, caption: captionValue.trim() || undefined } : p));
    setEditingCaption(null);
    setCaptionValue('');
  };

  const catCount = (cat: PhotoCategory) => photos.filter(p => p.category === cat).length;

  return (
    <div className="mx-auto p-5 max-w-[420px]" >

      {/* Header */}
      <div className="mb-6">
        <h2 className="font-extrabold text-xl mb-1.5">
          📸 Photos de la scène
        </h2>
        <p className="text-[13px] leading-normal opacity-75">
          Documentez l'accident en photos. {MAX_PHOTOS - photos.length} photo{MAX_PHOTOS - photos.length !== 1 ? 's' : ''} restante{MAX_PHOTOS - photos.length !== 1 ? 's' : ''}.
        </p>
      </div>

      {/* Category selector */}
      <div className="mb-5">
        <div className="text-[11px] font-bold mb-2.5 uppercase opacity-70 tracking-[1px]">
          Catégorie
        </div>
        <div className="flex flex-col gap-2">
          {cats.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className="flex items-center gap-3 rounded-[10px] border-0 cursor-pointer text-left px-3.5 py-2.5" style={{ background: selectedCategory === cat.id ? 'rgba(255,83,0,0.12)' : 'rgba(240,237,232,0.04)', outline: selectedCategory === cat.id ? '1.5px solid var(--boom)' : '1.5px solid transparent', color: 'inherit', transition: 'all 0.15s' }}
            >
              <span className="text-[22px] shrink-0">{cat.icon}</span>
              <div className="flex-1">
                <div className="text-[13px] font-bold">{cat.label}</div>
                <div className="text-[11px] opacity-70" >{cat.sub}</div>
              </div>
              {catCount(cat.id) > 0 && (
                <span className="text-white text-[11px] font-extrabold rounded-[20px] shrink-0 px-[7px] py-0.5" style={{ background: 'var(--boom)' }}>
                  {catCount(cat.id)}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Capture button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        aria-label="Prendre une photo de dégâts"
        capture="environment"
        className="hidden"
        onChange={handleCapture}
      />
      <button
        onClick={() => {
          if (photos.length >= MAX_PHOTOS) { setError(`Maximum ${MAX_PHOTOS} photos atteint.`); return; }
          // Confirmation légère pour les photos de blessures (données sensibles)
          if (selectedCategory === 'injury' && !injuryConfirmed) { setShowInjuryConfirm(true); return; }
          fileInputRef.current?.click();
        }}
        disabled={loading || photos.length >= MAX_PHOTOS}
        className="w-full p-[15px] rounded-xl border-0 font-bold flex items-center justify-center gap-2 mb-4 text-[15px]" style={{ background: photos.length >= MAX_PHOTOS ? 'rgba(240,237,232,0.08)' : 'var(--boom)', color: photos.length >= MAX_PHOTOS ? 'rgba(240,237,232,0.3)' : '#fff', cursor: photos.length >= MAX_PHOTOS ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
      >
        {loading ? '⏳ Traitement...' : `📷 Prendre une photo · ${cats.find(c => c.id === selectedCategory)?.label}`}
      </button>

      {showInjuryConfirm && (
        <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.35)' }}>
          <div className="text-[13px] leading-snug mb-3 opacity-90">{t('legal.injury_confirm.body')}</div>
          <div className="flex gap-2.5">
            <button
              onClick={() => { setInjuryConfirmed(true); setShowInjuryConfirm(false); fileInputRef.current?.click(); }}
              className="flex-1 rounded-[10px] border-0 text-white text-[13px] font-bold p-[11px] cursor-pointer" style={{ background: 'var(--boom)' }}
            >
              {t('legal.injury_confirm.continue')}
            </button>
            <button
              onClick={() => { setShowInjuryConfirm(false); setSelectedCategory('scene'); }}
              className="flex-1 rounded-[10px] bg-transparent cursor-pointer text-[13px] p-[11px]" style={{ border: '1.5px solid rgba(240,237,232,0.2)', color: 'var(--text)' }}
            >
              {t('legal.injury_confirm.change')}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg text-[13px] mb-4 px-3.5 py-2.5 text-[var(--red)]" style={{ background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.3)' }}>
          {error}
        </div>
      )}

      {/* Photo gallery */}
      {photos.length > 0 && (
        <div className="mb-6">
          <div className="text-[11px] font-bold mb-3 uppercase opacity-70 tracking-[1px]">
            Photos prises ({photos.length}/{MAX_PHOTOS})
          </div>
          <div className="grid gap-2.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {photos.map(photo => {
              const cat = CATEGORIES.find(c => c.id === photo.category);
              return (
                <div key={photo.id} className="relative rounded-[10px] overflow-hidden" style={{ background: 'rgba(240,237,232,0.04)' }}>
                  <img
                    src={`data:image/jpeg;base64,${photo.base64}`}
                    alt={cat?.label || 'Photo du constat'}
                    className="w-full object-cover block" style={{ aspectRatio: '4/3' }}
                  />
                  {/* Overlay top */}
                  <div className="absolute flex justify-between items-start top-0 left-0 right-0 px-2 py-1.5" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)' }}>
                    <span className="text-base">{cat?.icon}</span>
                    <button
                      onClick={() => removePhoto(photo.id)}
                      className="border-0 text-white rounded-full cursor-pointer text-[13px] flex items-center justify-center w-[22px] h-[22px]"  style={{ background: 'rgba(0,0,0,0.5)' }}
                    >
                      ×
                    </button>
                  </div>
                  {/* Caption */}
                  <div className="px-2 py-1.5">
                    {editingCaption === photo.id ? (
                      <div className="flex gap-1">
                        <input
                          autoFocus
                          value={captionValue}
                          onChange={e => setCaptionValue(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveCaption(photo.id); if (e.key === 'Escape') setEditingCaption(null); }}
                          placeholder="Légende..."
                          aria-label="Légende de la photo"
                          className="flex-1 border-0 rounded-md text-[11px] px-2 py-1" style={{ background: 'rgba(240,237,232,0.08)', color: 'inherit', outline: '1px solid var(--boom)' }}
                        />
                        <button onClick={() => saveCaption(photo.id)} className="border-0 text-white rounded-md cursor-pointer text-[11px] px-2 py-1" style={{ background: 'var(--boom)' }} aria-label="Sauvegarder la légende">✓</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingCaption(photo.id); setCaptionValue(photo.caption || ''); }}
                        className="bg-transparent border-0 cursor-pointer text-[11px] p-0 text-left w-full opacity-75" style={{ color: 'inherit' }}
                      >
                        {photo.caption || '+ Légende'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Continue */}
      <button
        onClick={onContinue}
        className="w-full p-4 rounded-xl cursor-pointer font-bold text-[15px]"
        style={{ background: photos.length > 0 ? 'var(--boom)' : 'rgba(255,255,255,0.07)', color: photos.length > 0 ? '#fff' : 'rgba(240,237,232,0.6)', border: photos.length === 0 ? '1.5px solid rgba(255,255,255,0.12)' : 'none' } as React.CSSProperties}
      >
        {photos.length === 0
          ? '→ Continuer sans photo'
          : `Continuer avec ${photos.length} photo${photos.length > 1 ? 's' : ''} →`}
      </button>

      <p className="text-xs text-center mt-2 opacity-70" >
        {photos.length === 0
          ? 'Photos facultatives — fortement conseillées pour votre dossier'
          : 'Vous pouvez ajouter d\'autres photos ou continuer'}
      </p>
    </div>
  );
});
