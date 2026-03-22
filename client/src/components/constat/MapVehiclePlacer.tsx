// client/src/components/constat/MapVehiclePlacer.tsx
// Conducteur place son véhicule sur la vraie carte satellite
// Tiles ESRI World Imagery (gratuit, aucune clé, qualité Google Maps)
// Résultat: image PNG capturée → intégrée dans le PDF

import { useState, useRef, useEffect, useCallback } from 'react';

interface VehiclePosition {
  // Position en pixels sur le canvas
  x: number;
  y: number;
  // Angle de rotation en degrés (0 = droite)
  angle: number;
  // Coordonnées GPS réelles
  lat: number;
  lng: number;
}

interface Props {
  role: 'A' | 'B' | 'C' | 'D';
  accidentLat?: number;
  accidentLng?: number;
  vehicleColor?: string;  // Couleur réelle du véhicule (OCR)
  vehicleType?: string;   // Type (car, suv, truck...)
  brand?: string;
  existingVehicles?: { role: string; pos: VehiclePosition }[];
  onComplete: (position: VehiclePosition, mapImageBase64: string) => void;
  onSkip: () => void;
}

const ZOOM = 19;
const TILE_SIZE = 256;
const CANVAS_W = 380;
const CANVAS_H = 380;

// ── Conversion coordonnées ────────────────────────────────────
function latlngToTile(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lng + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y };
}

function latlngToPixel(lat: number, lng: number, originLat: number, originLng: number, zoom: number): { px: number; py: number } {
  const n = Math.pow(2, zoom);
  function toWorld(la: number, lo: number) {
    const x = (lo + 180) / 360 * n * TILE_SIZE;
    const latRad = la * Math.PI / 180;
    const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n * TILE_SIZE;
    return { x, y };
  }
  const origin = toWorld(originLat, originLng);
  const point = toWorld(lat, lng);
  return {
    px: point.x - origin.x + CANVAS_W / 2,
    py: point.y - origin.y + CANVAS_H / 2,
  };
}

function pixelToLatlng(px: number, py: number, originLat: number, originLng: number, zoom: number): { lat: number; lng: number } {
  const n = Math.pow(2, zoom);
  const latRad = originLat * Math.PI / 180;
  const originWorldX = (originLng + 180) / 360 * n * TILE_SIZE;
  const originWorldY = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n * TILE_SIZE;
  
  const worldX = originWorldX + (px - CANVAS_W / 2);
  const worldY = originWorldY + (py - CANVAS_H / 2);
  
  const lng = worldX / (n * TILE_SIZE) * 360 - 180;
  const latRad2 = Math.atan(Math.sinh(Math.PI * (1 - 2 * worldY / (n * TILE_SIZE))));
  const lat = latRad2 * 180 / Math.PI;
  return { lat, lng };
}

// ── Dessin d'un véhicule sur canvas ──────────────────────────
function drawVehicle(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  angle: number,
  color: string,
  label: string,
  roleColor: string,
  length = 32, width = 16,
  selected = false
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle * Math.PI / 180);

  // Ombre
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;

  // Carrosserie
  ctx.fillStyle = color;
  ctx.strokeStyle = selected ? '#FFD700' : 'rgba(0,0,0,0.8)';
  ctx.lineWidth = selected ? 2.5 : 1.2;
  const r = 4;
  ctx.beginPath();
  ctx.moveTo(-length/2 + r, -width/2);
  ctx.lineTo(length/2 - r, -width/2);
  ctx.arcTo(length/2, -width/2, length/2, -width/2 + r, r);
  ctx.lineTo(length/2, width/2 - r);
  ctx.arcTo(length/2, width/2, length/2 - r, width/2, r);
  ctx.lineTo(-length/2 + r, width/2);
  ctx.arcTo(-length/2, width/2, -length/2, width/2 - r, r);
  ctx.lineTo(-length/2, -width/2 + r);
  ctx.arcTo(-length/2, -width/2, -length/2 + r, -width/2, r);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  ctx.stroke();

  // Toit
  const tr = parseInt(color.slice(1,3),16);
  const tg = parseInt(color.slice(3,5),16);
  const tb = parseInt(color.slice(5,7),16);
  ctx.fillStyle = `rgb(${Math.max(0,tr-35)},${Math.max(0,tg-35)},${Math.max(0,tb-35)})`;
  ctx.fillRect(-length/3, -width/2.8, length*2/3, width/1.4);

  // Pare-brise avant (vitré)
  ctx.fillStyle = 'rgba(140,195,225,0.75)';
  ctx.beginPath();
  ctx.moveTo(length/2-5, -width/3);
  ctx.lineTo(length/2-5, width/3);
  ctx.lineTo(length/3+2, width/3.5);
  ctx.lineTo(length/3+2, -width/3.5);
  ctx.closePath();
  ctx.fill();

  // Lunette arrière
  ctx.fillStyle = 'rgba(100,155,180,0.6)';
  ctx.beginPath();
  ctx.moveTo(-length/2+4, -width/3);
  ctx.lineTo(-length/2+4, width/3);
  ctx.lineTo(-length/3-2, width/3.5);
  ctx.lineTo(-length/3-2, -width/3.5);
  ctx.closePath();
  ctx.fill();

  // Phares avant
  ctx.fillStyle = '#FFE88A';
  ctx.beginPath(); ctx.ellipse(length/2-3, -width/2+3, 3.5, 2.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(length/2-3,  width/2-3, 3.5, 2.5, 0, 0, Math.PI*2); ctx.fill();

  // Feux arrière
  ctx.fillStyle = '#DD2222';
  ctx.beginPath(); ctx.ellipse(-length/2+3, -width/2+3, 3, 2, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-length/2+3,  width/2-3, 3, 2, 0, 0, Math.PI*2); ctx.fill();

  // Roues
  const wheelPositions = [[-length/3,-width/2-2],[length/3,-width/2-2],[-length/3,width/2+2],[length/3,width/2+2]] as const;
  wheelPositions.forEach(([wx,wy]) => {
    ctx.fillStyle = '#111118';
    ctx.beginPath(); ctx.ellipse(wx, wy, 5, 3, 0, 0, Math.PI*2); ctx.fill();
  });

  // Badge rôle
  ctx.fillStyle = roleColor;
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'white';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, 0);

  // Indicateur de direction (flèche)
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.moveTo(length/2 + 8, 0);
  ctx.lineTo(length/2 + 18, -5);
  ctx.lineTo(length/2 + 18, 5);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// ── Composant principal ───────────────────────────────────────
export function MapVehiclePlacer({
  role, accidentLat, accidentLng,
  vehicleColor, vehicleType, brand,
  existingVehicles = [],
  onComplete, onSkip
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tilesRef  = useRef<Map<string, HTMLImageElement>>(new Map());
  const [loading, setLoading] = useState(true);
  const [tilesLoaded, setTilesLoaded] = useState(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: CANVAS_W/2, y: CANVAS_H/2 });
  const [angle, setAngle] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [rotating, setRotating] = useState(false);
  const dragStart = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);
  const rotStart  = useRef<{ angle: number; touchAngle: number } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [step, setStep] = useState<'place' | 'rotate' | 'confirm'>('place');

  const centerLat = accidentLat || 47.3602;
  const centerLng = accidentLng || 7.3448;

  const roleColor = { A: '#1a44cc', B: '#cc3300', C: '#228833', D: '#9933cc' }[role] || '#444';
  const bodyColor = vehicleColor?.startsWith('#') ? vehicleColor : 
    vehicleColor === 'noir' || vehicleColor === 'black' ? '#1c1c2a' :
    vehicleColor === 'blanc' || vehicleColor === 'white' ? '#e0e0d8' :
    vehicleColor === 'rouge' || vehicleColor === 'red' ? '#b82020' :
    vehicleColor === 'bleu' || vehicleColor === 'blue' ? '#1a44aa' :
    vehicleColor === 'gris' || vehicleColor === 'grey' ? '#7a7a8c' :
    vehicleColor === 'vert' || vehicleColor === 'green' ? '#1a6622' :
    '#4466aa';

  // ── Chargement des tiles satellite ──────────────────────────
  useEffect(() => {
    const { x: cx, y: cy } = latlngToTile(centerLat, centerLng, ZOOM);
    const pad = 2;
    const total = (pad*2+1) * (pad*2+1);
    let loaded = 0;

    for (let dy = -pad; dy <= pad; dy++) {
      for (let dx = -pad; dx <= pad; dx++) {
        const tx = cx + dx, ty = cy + dy;
        const key = `${ZOOM}/${ty}/${tx}`;
        if (tilesRef.current.has(key)) { loaded++; continue; }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        // ESRI World Imagery — satellite gratuit, qualité très haute
        img.src = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${ZOOM}/${ty}/${tx}`;
        img.onload  = () => { tilesRef.current.set(key, img); loaded++; setTilesLoaded(loaded); if (loaded === total) setLoading(false); };
        img.onerror = () => { loaded++; setTilesLoaded(loaded); if (loaded === total) setLoading(false); };
      }
    }
  }, [centerLat, centerLng]);

  // ── Rendu canvas ─────────────────────────────────────────────
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Tiles satellite
    const { x: cx, y: cy } = latlngToTile(centerLat, centerLng, ZOOM);
    const pad = 2;
    for (let dy = -pad; dy <= pad; dy++) {
      for (let dx = -pad; dx <= pad; dx++) {
        const tx = cx + dx, ty = cy + dy;
        const img = tilesRef.current.get(`${ZOOM}/${ty}/${tx}`);
        if (img) {
          // Position du tile en pixels
          const tileWorldX = tx * TILE_SIZE;
          const tileWorldY = ty * TILE_SIZE;
          const latRad = centerLat * Math.PI / 180;
          const originWorldX = (centerLng + 180) / 360 * Math.pow(2, ZOOM) * TILE_SIZE;
          const originWorldY = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * Math.pow(2, ZOOM) * TILE_SIZE;
          const drawX = tileWorldX - originWorldX + CANVAS_W / 2;
          const drawY = tileWorldY - originWorldY + CANVAS_H / 2;
          ctx.drawImage(img, drawX, drawY, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    // Véhicules existants (autres conducteurs)
    existingVehicles.forEach(ev => {
      const oc = { A:'#1a44cc', B:'#cc3300', C:'#228833', D:'#9933cc' }[ev.role] || '#444';
      drawVehicle(ctx, ev.pos.x, ev.pos.y, ev.pos.angle, '#888', ev.role, oc, 30, 14, false);
    });

    // Véhicule courant
    drawVehicle(ctx, position.x, position.y, angle, bodyColor, role, roleColor, 34, 16, true);

    // Point GPS accident (croix rouge)
    const impX = CANVAS_W/2, impY = CANVAS_H/2;
    ctx.strokeStyle = 'rgba(255,50,0,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(impX-12,impY); ctx.lineTo(impX+12,impY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(impX,impY-12); ctx.lineTo(impX,impY+12); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,50,0,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(impX, impY, 20, 0, Math.PI*2); ctx.stroke();

    // Instruction
    const instr = step === 'place' ? '↖↗ Faites glisser votre véhicule à sa position' :
                  step === 'rotate' ? '↻ Tournez le véhicule dans sa direction' :
                  '✓ Position confirmée';
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, CANVAS_H-30, CANVAS_W, 30);
    ctx.fillStyle = 'white';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(instr, CANVAS_W/2, CANVAS_H-11);
  }, [position, angle, bodyColor, role, roleColor, existingVehicles, step, tilesLoaded, centerLat, centerLng]);

  useEffect(() => { render(); }, [render]);

  // ── Touch/Mouse handlers ──────────────────────────────────────
  const getEventPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    if ('touches' in e && e.touches.length > 0) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY };
  };

  const onStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (confirmed) return;
    const pos = getEventPos(e);
    const dx = pos.x - position.x, dy = pos.y - position.y;
    const dist = Math.sqrt(dx*dx + dy*dy);

    if (dist < 30) {
      // Clic sur le véhicule → drag
      setDragging(true);
      dragStart.current = { x: pos.x, y: pos.y, posX: position.x, posY: position.y };
      setStep('place');
    }
  };

  const onMove = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!dragging || !dragStart.current || confirmed) return;
    const pos = getEventPos(e);
    const nx = Math.max(20, Math.min(CANVAS_W-20, dragStart.current.posX + (pos.x - dragStart.current.x)));
    const ny = Math.max(20, Math.min(CANVAS_H-20, dragStart.current.posY + (pos.y - dragStart.current.y)));
    setPosition({ x: nx, y: ny });
  };

  const onEnd = () => {
    if (dragging) {
      setDragging(false);
      dragStart.current = null;
      setStep('rotate');
    }
    setRotating(false);
  };

  const captureAndConfirm = () => {
    const canvas = canvasRef.current!;
    const gps = pixelToLatlng(position.x, position.y, centerLat, centerLng, ZOOM);
    const imageB64 = canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
    const vehiclePos: VehiclePosition = {
      x: position.x, y: position.y, angle,
      lat: gps.lat, lng: gps.lng,
    };
    setConfirmed(true);
    setStep('confirm');
    onComplete(vehiclePos, imageB64);
  };

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 16, animation: 'spin 1s linear infinite', display:'inline-block' }}>🛰️</div>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Chargement de la carte satellite…</div>
      <div style={{ fontSize: 13, opacity: 0.5 }}>{tilesLoaded}/25 tiles · © Esri World Imagery</div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const roleLabel = { A: 'Conducteur A', B: 'Conducteur B', C: 'Conducteur C', D: 'Conducteur D' }[role];
  const rColor = roleColor;

  return (
    <div style={{ padding: '16px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${rColor}22`, border: `2px solid ${rColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: rColor }}>
          {role}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            {roleLabel} — Positionner mon véhicule
          </div>
          <div style={{ fontSize: 11, opacity: 0.5 }}>
            {brand ? `${brand} · ` : ''}{vehicleType || 'Voiture'} · Carte satellite réelle
          </div>
        </div>
      </div>

      {/* Instructions étapes */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[
          { s: 'place', icon: '✋', label: '1. Placer' },
          { s: 'rotate', icon: '↻', label: '2. Orienter' },
          { s: 'confirm', icon: '✓', label: '3. Valider' },
        ].map(({ s, icon, label }) => (
          <div key={s} style={{
            flex: 1, padding: '6px 4px', borderRadius: 8, textAlign: 'center',
            background: step === s ? `${rColor}22` : 'rgba(255,255,255,0.04)',
            border: `1px solid ${step === s ? rColor : 'rgba(255,255,255,0.08)'}`,
            fontSize: 11, color: step === s ? rColor : 'rgba(255,255,255,0.4)',
            fontWeight: step === s ? 700 : 400,
          }}>
            {icon} {label}
          </div>
        ))}
      </div>

      {/* Canvas satellite */}
      <div style={{
        borderRadius: 12, overflow: 'hidden',
        border: `2px solid ${rColor}55`,
        marginBottom: 14,
        boxShadow: `0 0 20px ${rColor}22`,
      }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ width: '100%', display: 'block', cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
          onMouseDown={onStart}
          onMouseMove={onMove}
          onMouseUp={onEnd}
          onMouseLeave={onEnd}
          onTouchStart={onStart}
          onTouchMove={onMove}
          onTouchEnd={onEnd}
        />
      </div>

      {/* Rotation slider */}
      {step === 'rotate' && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 8, textAlign: 'center' }}>
            Direction du véhicule : {angle}° {angle === 0 ? '→ Est' : angle === 90 ? '↓ Sud' : angle === 180 ? '← Ouest' : angle === 270 ? '↑ Nord' : ''}
          </div>
          <input
            type="range" min={0} max={359} value={angle}
            onChange={e => setAngle(Number(e.target.value))}
            style={{ width: '100%', accentColor: rColor }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, opacity: 0.4, marginTop: 2 }}>
            <span>↑ N</span><span>→ E</span><span>↓ S</span><span>← O</span>
          </div>
        </div>
      )}

      {/* Actions */}
      {!confirmed ? (
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onSkip}
            style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.4)', touchAction: 'manipulation' }}>
            Passer
          </button>
          <button onClick={step === 'place' ? () => setStep('rotate') : captureAndConfirm}
            style={{ flex: 2, padding: '14px', borderRadius: 10, border: 'none', background: rColor, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700, touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as any }}>
            {step === 'place' ? 'Orienter →' : '✓ Valider la position'}
          </button>
        </div>
      ) : (
        <div style={{ padding: '14px', borderRadius: 10, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', textAlign: 'center', fontSize: 14, color: '#22c55e', fontWeight: 700 }}>
          ✅ Position enregistrée sur la carte
        </div>
      )}
    </div>
  );
}
