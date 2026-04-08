import React, { useState } from 'react';
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
    style: { cursor: 'pointer', transition: 'fill 0.1s, stroke 0.1s', outline: 'none' } as React.CSSProperties,
    role: 'button' as const,
    tabIndex: 0,
    'aria-label': zone.label, 'aria-pressed': selected,
    onClick: onToggle, onMouseEnter: onHover, onMouseLeave: onLeave,
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } },
    onFocus: onHover, onBlur: onLeave,
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

export const VehicleDiagram = React.memo(function VehicleDiagram({ role, vehicleType, brand, model, color, selected, onChange }: Props) {
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
      case 'tractor':
      case 'construction':return 'truck';   // silhouette camion — le plus proche
      case 'van':         return 'van';
      case 'bus':         return 'bus';
      case 'tram':
      case 'train':       return 'tram';
      case 'quad':
      case 'boat':
      case 'other':       return 'other';
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

  // Titre et hint adaptés au type
  const isPedestrian = vehicleType === 'pedestrian';
  const isBicycle    = vehicleType === 'bicycle' || vehicleType === 'cargo_bike';
  const isMoto       = vehicleType === 'motorcycle' || vehicleType === 'scooter' || vehicleType === 'moped' || vehicleType === 'escooter';

  const vehicleName = isPedestrian
    ? 'Piéton'
    : isBicycle ? 'Cycliste'
    : [brand, model].filter(Boolean).join(' ') || 'Véhicule';

  const bodyLabel = isPedestrian
    ? 'Corps humain — zones blessées'
    : isBicycle ? 'Vélo — zones endommagées'
    : identity.bodyStyle !== 'unknown' ? identity.label : '';

  const diagramTitle = isPedestrian
    ? `Blessures corporelles — ${role === 'A' ? 'Conducteur' : 'Partie'} ${role}`
    : `Zones endommagées — ${role === 'A' ? 'Conducteur' : 'Partie'} ${role}`;

  const diagramHint = isPedestrian
    ? 'Touchez les zones du corps blessées'
    : isBicycle ? 'Touchez les zones endommagées sur le vélo'
    : isMoto ? 'Touchez les zones touchées sur la moto / scooter'
    : 'Touchez toutes les zones touchées par le choc';

  return (
    <div className="px-4 py-5">
      {/* Header */}
      <div className="text-center mb-3.5" >
        <h2 className="text-base font-bold mb-1">
          {diagramTitle}
        </h2>
        {/* Vehicle identity badge */}
        <div className="inline-flex items-center gap-2 rounded-[20px] mb-1 px-3 py-[5px]" style={{ background: `${roleColor}12`, border: `1px solid ${roleColor}35` }}>
          {/* Color swatch — masqué pour piéton */}
          {color && !isPedestrian && (
            <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: identity.bodyColor, border: '1.5px solid rgba(255,255,255,0.2)' }}/>
          )}
          {isPedestrian && <span className="text-sm">🚶</span>}
          <span className="text-[10px] font-bold text-white rounded px-1.5 py-px" style={{ background: roleColor }}>
            {role}
          </span>
          <span className="text-xs font-semibold" style={{ color: roleColor }}>
            {vehicleName}
          </span>
          {bodyLabel && (
            <span className="text-[10px] opacity-75">· {bodyLabel}</span>
          )}
          {identity.confidence === 'exact' && !isPedestrian && (
            <span title="Modèle reconnu" className="text-[10px] text-green-500">✓</span>
          )}
        </div>
        <p className="text-[11px] leading-normal opacity-70" >
          {diagramHint}
        </p>
      </div>

      {/* SVG */}
      <div className="flex justify-center mb-2">
        <svg
          viewBox={`0 0 280 ${vbH}`}
          width="100%"
          role="img"
          className="block max-w-[300px] select-none touch-none"
          aria-label={`Schéma interactif — ${vehicleName} vue de dessus — Conducteur ${role}`}
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
      <div className="h-[22px] text-center text-xs mb-2.5 font-semibold" style={{ color: roleColor, opacity: tooltip ? 1 : 0, transition: 'opacity 0.15s' }}>{tooltip}</div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] opacity-70 uppercase mb-2 tracking-[2px]" style={{ fontFamily: 'monospace' }}>
            {selected.length} zone{selected.length > 1 ? 's' : ''} sélectionnée{selected.length > 1 ? 's' : ''}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selected.map(id => {
              const zone = zones.find(z => z.id === id);
              return zone ? (
                <button key={id} onClick={() => toggle(id)} className="rounded-[20px] text-xs cursor-pointer flex items-center gap-[5px] px-3 py-[5px]" style={{ background: `${roleColor}18`, border: `1px solid ${roleColor}50`, color: roleColor }}>
                  {zone.label} <span className="text-[10px] opacity-70" >✕</span>
                </button>
              ) : null;
            })}
          </div>
        </div>
      )}

      {selected.length === 0 && (
        <div className="text-center text-xs opacity-70"  style={{ padding: '8px 0' }}>
          Aucune zone sélectionnée — touchez le schéma ci-dessus
        </div>
      )}
    </div>
  );
});
