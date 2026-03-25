import { useState } from 'react';
import type { VehicleType } from '../../../../shared/types';
import { VehicleSilhouetteSVG, getZonesForType, bodyStyleToShape, type DamageZone } from './VehicleSilhouettes';
import { identifyVehicle, BODY_STYLE_LABELS } from './vehicleMapper';

interface Props {
  role: string;
  vehicleType?: VehicleType;
  brand?: string;
  model?: string;
  color?: string;
  selected: string[];
  onChange: (zones: string[]) => void;
}

const VIEWBOX_HEIGHT: Record<string, number> = {
  car: 380, motorcycle: 400, scooter: 410, bicycle: 390,
  truck: 400, van: 400, bus: 390, tram: 400, pedestrian: 390, other: 370,
};

function ZoneHit({ zone, selected, hovering, color, onToggle, onHover, onLeave }: {
  zone: DamageZone; selected: boolean; hovering: boolean; color: string;
  onToggle: () => void; onHover: () => void; onLeave: () => void;
}) {
  const fill   = selected ? `${color}50` : hovering ? `${color}20` : 'transparent';
  const stroke = selected ? color : hovering ? `${color}60` : 'transparent';
  const sw     = selected ? 2.5 : 1.5;
  const common = {
    fill, stroke, strokeWidth: sw,
    style: { cursor: 'pointer', transition: 'fill 0.1s, stroke 0.1s' } as React.CSSProperties,
    role: 'button' as const,
    'aria-label': zone.label, 'aria-pressed': selected,
    onClick: onToggle, onMouseEnter: onHover, onMouseLeave: onLeave,
    onTouchStart: (e: React.TouchEvent) => { e.preventDefault(); onHover(); },
    onTouchEnd:   (e: React.TouchEvent) => { e.preventDefault(); onToggle(); onLeave(); },
  };
  if (zone.type === 'rect')    return <rect    {...common} x={zone.x} y={zone.y} width={zone.w} height={zone.h} rx="6"/>;
  if (zone.type === 'ellipse') return <ellipse {...common} cx={zone.cx} cy={zone.cy} rx={zone.rx} ry={zone.ry}/>;
  if (zone.type === 'circle')  return <circle  {...common} cx={zone.cx} cy={zone.cy} r={zone.r}/>;
  return null;
}

function ImpactMarker({ zone, color }: { zone: DamageZone; color: string }) {
  let cx = 0, cy = 0;
  if (zone.type === 'rect')    { cx = (zone.x ?? 0) + (zone.w ?? 0) / 2; cy = (zone.y ?? 0) + (zone.h ?? 0) / 2; }
  if (zone.type === 'ellipse' || zone.type === 'circle') { cx = zone.cx ?? 0; cy = zone.cy ?? 0; }
  return (
    <g pointerEvents="none">
      <circle cx={cx} cy={cy} r="13" fill={color} opacity="0.92"/>
      <circle cx={cx} cy={cy} r="11" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
      {[0,45,90,135,180,225,270,315].map(a => (
        <line key={a}
          x1={cx + Math.sin(a*Math.PI/180)*8}  y1={cy - Math.cos(a*Math.PI/180)*8}
          x2={cx + Math.sin(a*Math.PI/180)*16} y2={cy - Math.cos(a*Math.PI/180)*16}
          stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
      ))}
      <line x1={cx-5} y1={cy-5} x2={cx+5} y2={cy+5} stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1={cx+5} y1={cy-5} x2={cx-5} y2={cy+5} stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    </g>
  );
}

export function VehicleDiagram({ role, vehicleType, brand, model, color, selected, onChange }: Props) {
  const [hovering, setHovering] = useState<string | null>(null);
  const [tooltip, setTooltip]   = useState<string | null>(null);
  const roleColor = role === 'A' ? '#FF3500' : '#00E5FF';

  // ── Shape resolution: vehicleType PRIME sur brand/model ───
  // Si le type de véhicule est connu (OCR ou choix utilisateur),
  // on force la silhouette correspondante.
  function vehicleTypeToShape(vt?: string): string | null {
    if (!vt) return null;
    switch (vt) {
      case 'pedestrian':  return 'pedestrian';
      case 'motorcycle':  return 'motorcycle';
      case 'scooter':     return 'scooter';
      case 'moped':       return 'scooter';
      case 'escooter':    return 'escooter';
      case 'bicycle':
      case 'cargo_bike':  return 'bicycle';
      case 'truck':       return 'truck';
      case 'van':         return 'van';
      case 'bus':         return 'bus';
      case 'tram':
      case 'train':       return 'tram';
      case 'quad':        return 'other';
      case 'car':
      case 'suv':         return null; // laisser identifyVehicle affiner
      default:            return null;
    }
  }

  const forcedShape = vehicleTypeToShape(vehicleType);
  const identity    = identifyVehicle(brand, model, color);
  // Si vehicleType force une silhouette spécifique, l'utiliser — sinon OCR brand/model
  const shape = (forcedShape as any) ?? bodyStyleToShape(identity.bodyStyle);
  const zones = getZonesForType(shape as any);
  const vbH   = VIEWBOX_HEIGHT[shape] ?? 380;

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(z => z !== id) : [...selected, id]);
  };

  // Titre adapté au type
  const isPedestrian = vehicleType === 'pedestrian';
  const vehicleName = isPedestrian
    ? 'Piéton / Cycliste'
    : [brand, model].filter(Boolean).join(' ') || 'Véhicule';
  const bodyLabel = isPedestrian
    ? 'Corps humain — zones blessées'
    : identity.bodyStyle !== 'unknown' ? identity.label : '';
  const diagramTitle = isPedestrian
    ? `Blessures — ${role === 'A' ? 'Conducteur' : 'Partie'} ${role}`
    : `Zones endommagées — ${role === 'A' ? 'Conducteur' : 'Partie'} ${role}`;
  const diagramHint = isPedestrian
    ? 'Touchez les zones du corps blessées'
    : 'Touchez toutes les zones touchées par le choc';

  return (
    <div style={{ padding: '20px 16px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
          {diagramTitle}
        </h3>
        {/* Vehicle identity badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '5px 12px', borderRadius: 20, marginBottom: 4,
          background: `${roleColor}12`, border: `1px solid ${roleColor}35` }}>
          {/* Color swatch — masqué pour piéton */}
          {color && !isPedestrian && (
            <div style={{
              width: 14, height: 14, borderRadius: '50%',
              background: identity.bodyColor,
              border: '1.5px solid rgba(255,255,255,0.2)',
              flexShrink: 0,
            }}/>
          )}
          {isPedestrian && <span style={{ fontSize: 14 }}>🚶</span>}
          <span style={{ fontSize: 12, fontWeight: 600, color: roleColor }}>
            {vehicleName}
          </span>
          {bodyLabel && (
            <span style={{ fontSize: 10, opacity: 0.5 }}>· {bodyLabel}</span>
          )}
          {identity.confidence === 'exact' && !isPedestrian && (
            <span title="Modèle reconnu" style={{ fontSize: 10, color: '#22c55e' }}>✓</span>
          )}
        </div>
        <p style={{ fontSize: 11, opacity: 0.4, lineHeight: 1.5 }}>
          {diagramHint}
        </p>
      </div>

      {/* SVG */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        <svg
          viewBox={`0 0 280 ${vbH}`}
          width="100%"
          style={{ maxWidth: 300, display: 'block', userSelect: 'none', touchAction: 'none' }}
          aria-label={`${vehicleName} vue de dessus`}
        >
          <text x="140" y="8" textAnchor="middle" fontSize="7"
            fill="rgba(255,255,255,0.2)" letterSpacing="2">AVANT ↑</text>

          <VehicleSilhouetteSVG
            type={shape}
            color={roleColor}
            bodyColor={identity.bodyColor}
            bodyColorDark={identity.bodyColorDark}
          />

          {zones.map(zone => (
            <ZoneHit key={zone.id} zone={zone}
              selected={selected.includes(zone.id)}
              hovering={hovering === zone.id}
              color={roleColor}
              onToggle={() => toggle(zone.id)}
              onHover={() => { setHovering(zone.id); setTooltip(zone.label); }}
              onLeave={() => { setHovering(null); setTooltip(null); }}
            />
          ))}

          {selected.map(id => {
            const zone = zones.find(z => z.id === id);
            return zone ? <ImpactMarker key={id} zone={zone} color={roleColor}/> : null;
          })}
        </svg>
      </div>

      {/* Tooltip */}
      <div style={{
        height: 22, textAlign: 'center', fontSize: 12, marginBottom: 10,
        color: roleColor, fontWeight: 600,
        opacity: tooltip ? 1 : 0, transition: 'opacity 0.15s',
      }}>{tooltip}</div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, opacity: 0.35,
            textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 8 }}>
            {selected.length} zone{selected.length > 1 ? 's' : ''} sélectionnée{selected.length > 1 ? 's' : ''}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {selected.map(id => {
              const zone = zones.find(z => z.id === id);
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
        <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 12, opacity: 0.3 }}>
          Aucune zone sélectionnée — touchez le schéma ci-dessus
        </div>
      )}
    </div>
  );
}
