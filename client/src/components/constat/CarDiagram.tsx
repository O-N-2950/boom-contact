import { useState } from 'react';

interface Props {
  role: 'A' | 'B';
  selected: string[];
  onChange: (zones: string[]) => void;
}

// All clickable zones on the car
const ZONES = [
  // Front
  { id: 'front',       label: 'Avant',          x: 105, y: 12,  w: 70,  h: 28 },
  { id: 'front-left',  label: 'AV Gauche',      x: 52,  y: 22,  w: 52,  h: 34 },
  { id: 'front-right', label: 'AV Droit',       x: 176, y: 22,  w: 52,  h: 34 },
  // Windshields
  { id: 'windshield',  label: 'Pare-brise',     x: 90,  y: 46,  w: 100, h: 26 },
  // Doors left
  { id: 'door-fl',     label: 'Porte AV G',     x: 20,  y: 80,  w: 46,  h: 40 },
  { id: 'door-rl',     label: 'Porte AR G',     x: 20,  y: 126, w: 46,  h: 40 },
  // Doors right
  { id: 'door-fr',     label: 'Porte AV D',     x: 214, y: 80,  w: 46,  h: 40 },
  { id: 'door-rr',     label: 'Porte AR D',     x: 214, y: 126, w: 46,  h: 40 },
  // Roof / hood
  { id: 'hood',        label: 'Capot',          x: 88,  y: 48,  w: 104, h: 30 },
  { id: 'roof',        label: 'Toit',           x: 88,  y: 84,  w: 104, h: 74 },
  // Rear windshield
  { id: 'rear-window', label: 'Lunette AR',     x: 90,  y: 170, w: 100, h: 24 },
  // Rear
  { id: 'rear',        label: 'Arrière',        x: 105, y: 198, w: 70,  h: 28 },
  { id: 'rear-left',   label: 'AR Gauche',      x: 52,  y: 188, w: 52,  h: 34 },
  { id: 'rear-right',  label: 'AR Droit',       x: 176, y: 188, w: 52,  h: 34 },
  // Wheels
  { id: 'wheel-fl',    label: 'Roue AV G',      x: 14,  y: 74,  w: 30,  h: 48 },
  { id: 'wheel-rl',    label: 'Roue AR G',      x: 14,  y: 124, w: 30,  h: 48 },
  { id: 'wheel-fr',    label: 'Roue AV D',      x: 236, y: 74,  w: 30,  h: 48 },
  { id: 'wheel-rr',    label: 'Roue AR D',      x: 236, y: 124, w: 30,  h: 48 },
];

export function CarDiagram({ role, selected, onChange }: Props) {
  const [hovering, setHovering] = useState<string | null>(null);

  const toggle = (id: string) => {
    onChange(
      selected.includes(id) ? selected.filter(z => z !== id) : [...selected, id]
    );
  };

  const BOOM_COLOR = '#FF3500';
  const roleColor = role === 'A' ? '#FF3500' : '#00E5FF';

  return (
    <div style={{ padding: 20 }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
          Zones endommagées — Véhicule {role}
        </h3>
        <p style={{ fontSize: 12, opacity: 0.45 }}>
          Touchez les zones touchées sur le véhicule
        </p>
      </div>

      {/* SVG Car top-down view */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <svg width="280" height="240" viewBox="0 0 280 240" style={{ userSelect: 'none', touchAction: 'none' }}>

          {/* Car body base */}
          <rect x="60" y="18" width="160" height="204" rx="30" fill="#1a1a2e" stroke="rgba(240,237,232,0.15)" strokeWidth="1.5"/>

          {/* Wheels */}
          {[
            { cx: 32, cy: 90 }, { cx: 32, cy: 155 },
            { cx: 248, cy: 90 }, { cx: 248, cy: 155 }
          ].map((w, i) => (
            <ellipse key={i} cx={w.cx} cy={w.cy} rx="16" ry="22"
              fill="#0d0d1a" stroke="rgba(240,237,232,0.2)" strokeWidth="1.5"/>
          ))}

          {/* Hood */}
          <rect x="85" y="20" width="110" height="50" rx="8" fill="#141428" stroke="rgba(240,237,232,0.08)" strokeWidth="1"/>

          {/* Windshield front */}
          <rect x="90" y="68" width="100" height="28" rx="4" fill="#0a0a20" stroke="rgba(100,150,255,0.2)" strokeWidth="1"/>

          {/* Roof */}
          <rect x="85" y="98" width="110" height="44" rx="4" fill="#111125"/>

          {/* Rear window */}
          <rect x="90" y="144" width="100" height="26" rx="4" fill="#0a0a20" stroke="rgba(100,150,255,0.2)" strokeWidth="1"/>

          {/* Trunk */}
          <rect x="85" y="172" width="110" height="44" rx="8" fill="#141428" stroke="rgba(240,237,232,0.08)" strokeWidth="1"/>

          {/* Clickable hit zones */}
          {ZONES.map(zone => {
            const isSelected = selected.includes(zone.id);
            const isHover = hovering === zone.id;
            return (
              <rect
                key={zone.id}
                x={zone.x} y={zone.y} width={zone.w} height={zone.h}
                rx="4"
                fill={isSelected ? `${roleColor}55` : isHover ? `${roleColor}22` : 'transparent'}
                stroke={isSelected ? roleColor : isHover ? `${roleColor}66` : 'transparent'}
                strokeWidth={isSelected ? 2 : 1}
                style={{ cursor: 'pointer', transition: 'all 0.15s' }}
                onClick={() => toggle(zone.id)}
                onMouseEnter={() => setHovering(zone.id)}
                onMouseLeave={() => setHovering(null)}
              />
            );
          })}

          {/* Impact markers */}
          {selected.map(id => {
            const zone = ZONES.find(z => z.id === id);
            if (!zone) return null;
            const cx = zone.x + zone.w / 2;
            const cy = zone.y + zone.h / 2;
            return (
              <g key={id}>
                <circle cx={cx} cy={cy} r="10" fill={roleColor} opacity="0.9"/>
                <text x={cx} y={cy + 4} textAnchor="middle" fontSize="10" fill="white">✕</text>
              </g>
            );
          })}

          {/* Direction arrow */}
          <g transform="translate(6, 108)">
            <polygon points="4,0 12,10 8,10 8,22 0,22 0,10 -4,10" fill="rgba(255,255,255,0.15)" transform="rotate(-90, 6, 11)"/>
          </g>
          <text x="8" y="106" fontSize="7" fill="rgba(255,255,255,0.2)" transform="rotate(-90, 8, 106)">AVANT</text>
        </svg>
      </div>

      {/* Selected zones chips */}
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
                  padding: '4px 10px', borderRadius: 20, fontSize: 11,
                  background: `${roleColor}18`, border: `1px solid ${roleColor}50`,
                  color: roleColor, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {zone.label} <span style={{ opacity: 0.7 }}>✕</span>
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
