import { useState, useRef } from 'react';
import type { ScenePhoto, PhotoCategory } from '../../../../shared/types';

interface Props {
  photos: ScenePhoto[];
  onChange: (photos: ScenePhoto[]) => void;
  onContinue: () => void;
}

const MAX_PHOTOS = 5;
const MAX_PX = 1024;
const QUALITY = 0.85;

const CATEGORIES: { id: PhotoCategory; icon: string; label: string; sub: string }[] = [
  { id: 'scene',    icon: '📍', label: 'Lieu du sinistre',     sub: 'Vue générale, signalisation, traces de freinage' },
  { id: 'vehicleA', icon: '🚗', label: 'Dommages véhicule A',  sub: 'Choc, rayures, déformation' },
  { id: 'vehicleB', icon: '🚙', label: 'Dommages véhicule B',  sub: 'Choc, rayures, déformation' },
  { id: 'injury',   icon: '🩹', label: 'Blessures',            sub: 'Uniquement si consentement' },
  { id: 'document', icon: '📄', label: 'Document / Plaque',    sub: 'Plaque d\'immatriculation, papiers' },
  { id: 'other',    icon: '📷', label: 'Autre',                sub: 'Tout ce qui peut être utile' },
];

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

export function PhotoCapture({ photos, onChange, onContinue }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<PhotoCategory>('scene');
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
    <div style={{ padding: '20px', maxWidth: 420, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontWeight: 800, fontSize: 20, marginBottom: 6 }}>
          📸 Photos de la scène
        </h2>
        <p style={{ fontSize: 13, opacity: 0.5, lineHeight: 1.5 }}>
          Documentez l'accident en photos. {MAX_PHOTOS - photos.length} photo{MAX_PHOTOS - photos.length !== 1 ? 's' : ''} restante{MAX_PHOTOS - photos.length !== 1 ? 's' : ''}.
        </p>
      </div>

      {/* Category selector */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.4, letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' }}>
          Catégorie
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: selectedCategory === cat.id ? 'rgba(255,83,0,0.12)' : 'rgba(240,237,232,0.04)',
                outline: selectedCategory === cat.id ? '1.5px solid var(--boom)' : '1.5px solid transparent',
                textAlign: 'left', color: 'inherit', transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 22, flexShrink: 0 }}>{cat.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{cat.label}</div>
                <div style={{ fontSize: 11, opacity: 0.4 }}>{cat.sub}</div>
              </div>
              {catCount(cat.id) > 0 && (
                <span style={{
                  background: 'var(--boom)', color: '#fff',
                  fontSize: 11, fontWeight: 800, borderRadius: 20,
                  padding: '2px 7px', flexShrink: 0
                }}>
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
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleCapture}
      />
      <button
        onClick={() => {
          if (photos.length >= MAX_PHOTOS) { setError(`Maximum ${MAX_PHOTOS} photos atteint.`); return; }
          fileInputRef.current?.click();
        }}
        disabled={loading || photos.length >= MAX_PHOTOS}
        style={{
          width: '100%', padding: '15px', borderRadius: 12, border: 'none',
          background: photos.length >= MAX_PHOTOS ? 'rgba(240,237,232,0.08)' : 'var(--boom)',
          color: photos.length >= MAX_PHOTOS ? 'rgba(240,237,232,0.3)' : '#fff',
          cursor: photos.length >= MAX_PHOTOS ? 'not-allowed' : 'pointer',
          fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 8, marginBottom: 16,
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? '⏳ Traitement...' : `📷 Prendre une photo · ${CATEGORIES.find(c => c.id === selectedCategory)?.label}`}
      </button>

      {error && (
        <div style={{ background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ff3b30', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Photo gallery */}
      {photos.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.4, letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' }}>
            Photos prises ({photos.length}/{MAX_PHOTOS})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {photos.map(photo => {
              const cat = CATEGORIES.find(c => c.id === photo.category);
              return (
                <div key={photo.id} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: 'rgba(240,237,232,0.04)' }}>
                  <img
                    src={`data:image/jpeg;base64,${photo.base64}`}
                    alt={cat?.label}
                    style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }}
                  />
                  {/* Overlay top */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '6px 8px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 16 }}>{cat?.icon}</span>
                    <button
                      onClick={() => removePhoto(photo.id)}
                      style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      ×
                    </button>
                  </div>
                  {/* Caption */}
                  <div style={{ padding: '6px 8px' }}>
                    {editingCaption === photo.id ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <input
                          autoFocus
                          value={captionValue}
                          onChange={e => setCaptionValue(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveCaption(photo.id); if (e.key === 'Escape') setEditingCaption(null); }}
                          placeholder="Légende..."
                          style={{ flex: 1, background: 'rgba(240,237,232,0.08)', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 11, color: 'inherit', outline: '1px solid var(--boom)' }}
                        />
                        <button onClick={() => saveCaption(photo.id)} style={{ background: 'var(--boom)', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>✓</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingCaption(photo.id); setCaptionValue(photo.caption || ''); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.5, fontSize: 11, padding: 0, textAlign: 'left', width: '100%' }}
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
        style={{
          width: '100%', padding: '16px', borderRadius: 12, border: 'none',
          background: photos.length > 0 ? 'var(--boom)' : 'rgba(240,237,232,0.08)',
          color: photos.length > 0 ? '#fff' : 'rgba(240,237,232,0.3)',
          cursor: 'pointer', fontSize: 15, fontWeight: 700,
        }}
      >
        {photos.length === 0 ? 'Passer (sans photo) →' : `Continuer avec ${photos.length} photo${photos.length > 1 ? 's' : ''} →`}
      </button>

      {photos.length === 0 && (
        <p style={{ fontSize: 12, opacity: 0.35, textAlign: 'center', marginTop: 10 }}>
          Les photos ne sont pas obligatoires mais renforcent votre dossier.
        </p>
      )}
    </div>
  );
}
