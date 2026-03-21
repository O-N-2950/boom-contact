/**
 * boom.contact — Sélecteur de couleur véhicule
 * Swatches visuels + saisie libre — multilingue
 */

interface Props {
  value?: string;
  onChange: (color: string) => void;
  label?: string;
}

const COLORS = [
  // Row 1 — neutres
  { name: 'Blanc',        hex: '#F2F2F0' },
  { name: 'Blanc perle',  hex: '#EEEAE2' },
  { name: 'Argent',       hex: '#C4C4C4' },
  { name: 'Gris clair',   hex: '#AAAAAA' },
  { name: 'Gris',         hex: '#888888' },
  { name: 'Gris anthracite', hex: '#3E3E3E' },
  { name: 'Noir',         hex: '#1A1818' },
  // Row 2 — chauds
  { name: 'Rouge',        hex: '#CC1100' },
  { name: 'Rouge vif',    hex: '#EE2200' },
  { name: 'Bordeaux',     hex: '#7A1530' },
  { name: 'Orange',       hex: '#DD6600' },
  { name: 'Jaune',        hex: '#DDAA00' },
  { name: 'Or / Doré',    hex: '#C8A840' },
  { name: 'Bronze',       hex: '#886030' },
  // Row 3 — froids
  { name: 'Bleu marine',  hex: '#0A122E' },
  { name: 'Bleu foncé',   hex: '#1144AA' },
  { name: 'Bleu',         hex: '#2266CC' },
  { name: 'Bleu clair',   hex: '#4488CC' },
  { name: 'Vert foncé',   hex: '#114411' },
  { name: 'Vert',         hex: '#1A6622' },
  { name: 'Vert kaki',    hex: '#4A5522' },
  // Row 4 — autres
  { name: 'Marron',       hex: '#6A3A20' },
  { name: 'Beige',        hex: '#CCAA88' },
  { name: 'Violet',       hex: '#660088' },
  { name: 'Rose',         hex: '#DD4488' },
  { name: 'Titane',       hex: '#7A7A88' },
  { name: 'Champagne',    hex: '#C8B878' },
  { name: 'Nacré',        hex: '#E8E4DA' },
];

export function ColorPicker({ value, onChange, label = 'Couleur du véhicule' }: Props) {
  // Find matching color name if hex matches
  const selectedColor = COLORS.find(c =>
    c.hex.toLowerCase() === value?.toLowerCase() ||
    c.name.toLowerCase() === value?.toLowerCase()
  );

  const isCustom = value && !selectedColor && value.length > 0;

  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 8 }}>{label}</div>

      {/* Color grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 6,
        marginBottom: 10,
      }}>
        {COLORS.map(c => {
          const isSelected = selectedColor?.hex === c.hex ||
                             value?.toLowerCase() === c.name.toLowerCase();
          const isLight = parseInt(c.hex.slice(1,3), 16) > 200;

          return (
            <button
              key={c.hex}
              onClick={() => onChange(c.name)}
              title={c.name}
              aria-label={c.name}
              aria-pressed={isSelected}
              style={{
                width: '100%',
                aspectRatio: '1',
                borderRadius: 8,
                background: c.hex,
                border: isSelected
                  ? '2.5px solid var(--boom)'
                  : isLight
                    ? '1px solid rgba(0,0,0,0.15)'
                    : '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
                position: 'relative',
                transition: 'transform 0.1s, border 0.1s',
                transform: isSelected ? 'scale(1.12)' : 'scale(1)',
                boxShadow: isSelected ? '0 0 0 3px rgba(255,53,0,0.25)' : 'none',
              }}
            >
              {isSelected && (
                <span style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, color: isLight ? '#000' : '#fff',
                  fontWeight: 800,
                }}>✓</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected color name badge */}
      {(selectedColor || isCustom) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 10px', borderRadius: 8,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          marginBottom: 8,
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: 4, flexShrink: 0,
            background: selectedColor?.hex ?? '#888',
            border: '1px solid rgba(255,255,255,0.15)',
          }}/>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {selectedColor?.name ?? value}
          </span>
          <button
            onClick={() => onChange('')}
            style={{ marginLeft: 'auto', background: 'none', border: 'none',
              color: 'rgba(240,237,232,0.35)', cursor: 'pointer', fontSize: 14 }}
          >✕</button>
        </div>
      )}

      {/* Free text input for unlisted colors */}
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder="Autre couleur (ex: Vert racing, Gris Nardo…)"
          style={{
            width: '100%', padding: '10px 13px', borderRadius: 8,
            border: '1.5px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.04)',
            color: 'var(--text)', fontSize: 13, outline: 'none',
            boxSizing: 'border-box', fontFamily: 'inherit',
          }}
          onFocus={e => (e.target.style.borderColor = 'rgba(255,53,0,0.5)')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
        />
      </div>
    </div>
  );
}
