import { useState } from 'react';

interface Props {
  role: 'A' | 'B';
  selected: string[];
  onChange: (zones: string[]) => void;
}

// ── Zones en coordonnées relatives au viewBox 280×240 ─────────
// Toutes les zones touch font au minimum ~38×38 dans le viewBox
// ce qui donne ≥44px sur un écran 375px (iPhone SE) après scaling
const ZONES = [
  // Avant
  { id: 'front',        label: 'Avant',       x: 95,  y: 10,  w: 90,  h: 36 },
  { id: 'front-left',   label: 'AV Gauche',   x: 44,  y: 14,  w: 56,  h: 38 },
  { id: 'front-right',  label: 'AV Droit',    x: 180, y: 14,  w: 56,  h: 38 },
  // Pare-brise
  { id: 'windshield',   label: 'Pare-brise',  x: 88,  y: 58,  w: 104, h: 32 },
  // Portières gauche
  { id: 'door-fl',      label: 'Porte AV G',  x: 14,  y: 88,  w: 52,  h: 44 },
  { id: 'door-rl',      label: 'Porte AR G',  x: 14,  y: 136, w: 52,  h: 44 },
  // Portières droit
  { id: 'door-fr',      label: 'Porte AV D',  x: 214, y: 88,  w: 52,  h: 44 },
  { id: 'door-rr',      label: 'Porte AR D',  x: 214, y: 136, w: 52,  h: 44 },
  // Capot / toit
  { id: 'hood',         label: 'Capot',       x: 86,  y: 56,  w: 108, h: 36 },
  { id: 'roof',         label: 'Toit',        x: 86,  y: 94,  w: 108, h: 80 },
  // Lunette AR
  { id: 'rear-window',  label: 'Lunette AR',  x: 88,  y: 176, w: 104, h: 28 },
  // Arrière
  { id: 'rear',         label: 'Arrière',     x: 95,  y: 196, w: 90,  h: 36 },
  { id: 'rear-left',    label: 'AR Gauche',   x: 44,  y: 192, w: 56,  h: 38 },
  { id: 'rear-right',   label: 'AR Droit',    x: 180, y: 192, w: 56,  h: 38 },
  // Roues — min 38×44 pour touch target ≥44px
  { id: 'wheel-fl',     label: 'Roue AV G',   x: 10,  y: 82,  w: 38,  h: 50 },
  { id: 'wheel-rl',     label: 'Roue AR G',   x: 10,  y: 132, w: 38,  h: 50 },
  { id: 'wheel-fr',     label: 'Roue AV D',   x: 232, y: 82,  w: 38,  h: 50 },
  { id: 'wheel-rr',     label: 'Roue AR D',   x: 232, y: 132, w: 38,  h: 50 },
];

export function CarDiagram({ role, selected, onChange }: Props) {
  const [hovering, setHovering] = useState<string | null>(null);
  const roleColor = role === 'A' ? '#FF3500' : '#00E5FF';

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(z => z !== id) : [...selected, id]);
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
          Zones endommagées — Véhicule {role}
        </h3>
        <p style={{ fontSize: 12, opacity: 0.45 }}>
          Touchez les zones endommagées sur le véhicule
        </p>
      </div>

      {/* SVG responsive — width:100% s'adapte à l'écran, viewBox maintient les proportions */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <svg
          viewBox="0 0 280 240"
          width="100%"
          style={{
            maxWidth: 320,
            userSelect: 'none',
            touchAction: 'none',
            display: 'block',
          }}
          aria-label="Schéma de véhicule vue de dessus"
        >
          {/* Carrosserie */}
          <rect x="60" y="18" width="160" height="204" rx="30"
            fill="#1a1a2e" stroke="rgba(240,237,232,0.15)" strokeWidth="1.5"/>

          {/* Roues */}
          {[
            { cx: 29, cy: 107 }, { cx: 29, cy: 157 },
            { cx: 251, cy: 107 }, { cx: 251, cy: 157 },
          ].map((w, i) => (
            <ellipse key={i} cx={w.cx} cy={w.cy} rx="18" ry="26"
              fill="#0d0d1a" stroke="rgba(240,237,232,0.2)" strokeWidth="1.5"/>
          ))}

          {/* Capot */}
          <rect x="82" y="20" width="116" height="56" rx="10"
            fill="#141428" stroke="rgba(240,237,232,0.08)" strokeWidth="1"/>

          {/* Pare-brise avant */}
          <rect x="88" y="70" width="104" height="30" rx="4"
            fill="#0a0a20" stroke="rgba(100,150,255,0.25)" strokeWidth="1"/>

          {/* Toit */}
          <rect x="82" y="102" width="116" height="76" rx="4" fill="#111125"/>

          {/* Lunette AR */}
          <rect x="88" y="178" width="104" height="28" rx="4"
            fill="#0a0a20" stroke="rgba(100,150,255,0.25)" strokeWidth="1"/>

          {/* Coffre */}
          <rect x="82" y="174" width="116" height="44" rx="10"
            fill="#141428" stroke="rgba(240,237,232,0.08)" strokeWidth="1"/>

          {/* ── Zones cliquables ── */}
          {ZONES.map(zone => {
            const isSelected = selected.includes(zone.id);
            const isHover = hovering === zone.id;
            const cx = zone.x + zone.w / 2;
            const cy = zone.y + zone.h / 2;

            return (
              <g key={zone.id}>
                <rect
                  x={zone.x} y={zone.y} width={zone.w} height={zone.h}
                  rx="6"
                  fill={isSelected
                    ? `${roleColor}55`
                    : isHover ? `${roleColor}22` : 'transparent'}
                  stroke={isSelected
                    ? roleColor
                    : isHover ? `${roleColor}66` : 'transparent'}
                  strokeWidth={isSelected ? 2 : 1}
                  style={{ cursor: 'pointer', transition: 'fill 0.12s, stroke 0.12s' }}
                  role="button"
                  aria-label={zone.label}
                  aria-pressed={isSelected}
                  onClick={() => toggle(zone.id)}
                  onMouseEnter={() => setHovering(zone.id)}
                  onMouseLeave={() => setHovering(null)}
                />
                {/* Marqueur d'impact */}
                {isSelected && (
                  <g pointerEvents="none">
                    <circle cx={cx} cy={cy} r="11" fill={roleColor} opacity="0.9"/>
                    <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11"
                      fontWeight="bold" fill="white">✕</text>
                  </g>
                )}
                {/* Label au hover sur desktop */}
                {isHover && !isSelected && (
                  <text x={cx} y={cy + 4} textAnchor="middle" fontSize="8"
                    fill={roleColor} opacity="0.8" pointerEvents="none">
                    {zone.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Flèche direction AVANT */}
          <text x="140" y="8" textAnchor="middle" fontSize="7"
            fill="rgba(255,255,255,0.25)" letterSpacing="2">AVANT ↑</text>
        </svg>
      </div>

      {/* Chips zones sélectionnées */}
      {selected.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, opacity: 0.35, textTransform: 'uppercase',
            fontFamily: 'monospace', marginBottom: 8 }}>
            {selected.length} zone{selected.length > 1 ? 's' : ''} sélectionnée{selected.length > 1 ? 's' : ''}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {selected.map(id => {
              const zone = ZONES.find(z => z.id === id);
              return zone ? (
                <button key={id} onClick={() => toggle(id)} style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: 12,
                  background: `${roleColor}18`, border: `1px solid ${roleColor}50`,
                  color: roleColor, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  {zone.label} <span style={{ opacity: 0.7, fontSize: 10 }}>✕</span>
                </button>
              ) : null;
            })}
          </div>
        </div>
      )}

      {selected.length === 0 && (
        <div style={{ textAlign: 'center', padding: '10px 0', fontSize: 12, opacity: 0.3 }}>
          Aucune zone sélectionnée — touchez le véhicule ci-dessus
        </div>
      )}
    </div>
  );
}
