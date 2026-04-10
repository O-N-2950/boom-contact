// client/src/components/constat/MapVehiclePlacer.tsx
// v2 — Plan OSM par défaut (pas de voitures fantômes), satellite en option
// Géocodage automatique si lat/lng absent (Nominatim OSM)

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Socket } from 'socket.io-client';

interface VehiclePosition {
  x: number; y: number; angle: number; lat: number; lng: number;
}
interface Props {
  role: 'A' | 'B' | 'C' | 'D';
  required?: boolean; // false = afficher bouton "Passer"
  sessionId?: string; // pour polling temps réel des autres véhicules
  accidentLat?: number;
  accidentLng?: number;
  accidentAddress?: string;
  accidentCity?: string;
  accidentCountry?: string;
  vehicleColor?: string;
  vehicleType?: string;
  brand?: string;
  existingVehicles?: { role: string; pos: VehiclePosition }[];
  onComplete: (position: VehiclePosition, mapImageBase64: string) => void;
  onSkip: () => void;
}

const TILE_SIZE = 256;
const CANVAS_W = 380;
const CANVAS_H = 360;

// ── Tile URLs ─────────────────────────────────────────────────
function getTileUrl(x: number, y: number, zoom: number, satellite: boolean): string {
  if (satellite) {
    // ESRI World Imagery — satellite haute résolution, gratuit
    return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${x}`;
  }
  // OSM Plan — routes dessinées, aucune voiture sur la carte
  const s = ['a','b','c'][Math.abs(x + y) % 3];
  return `https://${s}.tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
}

// ── Conversions ───────────────────────────────────────────────
function latlngToTile(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  return {
    x: Math.floor((lng + 180) / 360 * n),
    y: Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n),
  };
}

function latlngToCanvasPixel(lat: number, lng: number, centerLat: number, centerLng: number, zoom: number) {
  const n = Math.pow(2, zoom) * TILE_SIZE;
  const toW = (la: number, lo: number) => ({
    x: (lo + 180) / 360 * n,
    y: (1 - Math.log(Math.tan(la * Math.PI / 180) + 1 / Math.cos(la * Math.PI / 180)) / Math.PI) / 2 * n,
  });
  const c = toW(centerLat, centerLng);
  const p = toW(lat, lng);
  return { px: p.x - c.x + CANVAS_W / 2, py: p.y - c.y + CANVAS_H / 2 };
}

function canvasPixelToLatlng(px: number, py: number, centerLat: number, centerLng: number, zoom: number) {
  const n = Math.pow(2, zoom) * TILE_SIZE;
  const c = {
    x: (centerLng + 180) / 360 * n,
    y: (1 - Math.log(Math.tan(centerLat * Math.PI / 180) + 1 / Math.cos(centerLat * Math.PI / 180)) / Math.PI) / 2 * n,
  };
  const wx = c.x + (px - CANVAS_W / 2);
  const wy = c.y + (py - CANVAS_H / 2);
  return {
    lng: wx / n * 360 - 180,
    lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * wy / n))) * 180 / Math.PI,
  };
}

// ── Couleur véhicule ──────────────────────────────────────────
const COLOR_MAP: Record<string, string> = {
  noir:'#1c1c2a', black:'#1c1c2a', schwarz:'#1c1c2a', nero:'#1c1c2a',
  blanc:'#e8e8e0', white:'#e8e8e0', weiss:'#e8e8e0', bianco:'#e8e8e0',
  gris:'#7a7a8c', grey:'#7a7a8c', gray:'#7a7a8c', grau:'#7a7a8c',
  rouge:'#b82020', red:'#b82020', rot:'#b82020', rosso:'#b82020',
  bleu:'#1a44aa', blue:'#1a44aa', blau:'#1a44aa',
  vert:'#1a6622', green:'#1a6622',
  jaune:'#cc9900', yellow:'#cc9900',
  orange:'#cc5500', argent:'#aab0bb', silver:'#aab0bb',
};

function parseColor(s?: string): string {
  if (!s) return '#4466aa';
  const low = s.toLowerCase();
  for (const [k, v] of Object.entries(COLOR_MAP)) {
    if (low.includes(k)) return v;
  }
  return '#4466aa';
}

// ── Dessin véhicule vue de dessus ─────────────────────────────
function drawVehicle(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, angleDeg: number,
  bodyColor: string, label: string, roleColor: string,
  selected = false, length = 32, width = 16,
  vehicleType?: string,
) {
  // Override dimensions based on vehicle type when provided
  if (vehicleType) {
    const vt = vehicleType.toLowerCase();
    if (['truck', 'bus'].includes(vt)) { length = 52; width = 20; }
    else if (['van', 'van_small'].includes(vt)) { length = 42; width = 18; }
    else if (['motorcycle', 'moto_sport', 'moto_touring'].includes(vt)) { length = 28; width = 10; }
    else if (['scooter', 'moped'].includes(vt)) { length = 24; width = 8; }
    else if (['bicycle', 'cargo_bike'].includes(vt)) { length = 22; width = 6; }
    else if (vt === 'escooter') { length = 20; width = 4; }
    else if (vt === 'pedestrian') { length = 8; width = 8; }
    else if (vt === 'quad') { length = 22; width = 14; }
    else if (['tram', 'train'].includes(vt)) { length = 60; width = 22; }
    // car/sedan/estate/suv_small/suv_large/mpv/pickup/coupe/convertible → default 32x16
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angleDeg * Math.PI / 180);

  // Ombre
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 7;
  ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 3;

  // Carrosserie
  ctx.fillStyle = bodyColor;
  ctx.strokeStyle = selected ? '#FFD700' : 'rgba(0,0,0,0.7)';
  ctx.lineWidth = selected ? 2.5 : 1.2;
  ctx.beginPath();
  const r = 4;
  ctx.moveTo(-length/2+r, -width/2); ctx.lineTo(length/2-r, -width/2);
  ctx.arcTo(length/2,-width/2, length/2,-width/2+r, r);
  ctx.lineTo(length/2, width/2-r);
  ctx.arcTo(length/2, width/2, length/2-r, width/2, r);
  ctx.lineTo(-length/2+r, width/2);
  ctx.arcTo(-length/2, width/2, -length/2, width/2-r, r);
  ctx.lineTo(-length/2, -width/2+r);
  ctx.arcTo(-length/2,-width/2, -length/2+r,-width/2, r);
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  ctx.stroke();

  // Toit
  const [rr,rg,rb] = [1,3,5].map(i => parseInt(bodyColor.slice(i,i+2)||'44',16));
  ctx.fillStyle = `rgb(${Math.max(0,rr-35)},${Math.max(0,rg-35)},${Math.max(0,rb-35)})`;
  ctx.fillRect(-length/3, -width/2.8, length*2/3, width/1.4);

  // Pare-brise
  ctx.fillStyle = 'rgba(140,195,225,0.75)';
  ctx.beginPath();
  ctx.moveTo(length/2-5,-width/3); ctx.lineTo(length/2-5,width/3);
  ctx.lineTo(length/3+2,width/3.5); ctx.lineTo(length/3+2,-width/3.5);
  ctx.closePath(); ctx.fill();

  // Lunette arrière
  ctx.fillStyle = 'rgba(100,155,180,0.55)';
  ctx.beginPath();
  ctx.moveTo(-length/2+4,-width/3); ctx.lineTo(-length/2+4,width/3);
  ctx.lineTo(-length/3-2,width/3.5); ctx.lineTo(-length/3-2,-width/3.5);
  ctx.closePath(); ctx.fill();

  // Phares
  ctx.fillStyle = '#FFE88A';
  for (const sy of [-1,1]) { ctx.beginPath(); ctx.ellipse(length/2-3, sy*(width/2-3), 3.5, 2, 0, 0, Math.PI*2); ctx.fill(); }
  // Feux
  ctx.fillStyle = '#DD2222';
  for (const sy of [-1,1]) { ctx.beginPath(); ctx.ellipse(-length/2+3, sy*(width/2-3), 3, 1.8, 0, 0, Math.PI*2); ctx.fill(); }
  // Roues
  ctx.fillStyle = '#111118';
  for (const [wx,wy] of [[-length/3,-width/2-2],[length/3,-width/2-2],[-length/3,width/2+2],[length/3,width/2+2]] as [number,number][]) {
    ctx.save(); ctx.translate(wx,wy); ctx.fillRect(-5,-3,10,6); ctx.restore();
  }

  // Badge rôle
  ctx.fillStyle = roleColor; ctx.strokeStyle = 'white'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'white'; ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, 0);

  // Flèche direction
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath(); ctx.moveTo(length/2+8,0); ctx.lineTo(length/2+18,-5); ctx.lineTo(length/2+18,5); ctx.closePath(); ctx.fill();

  ctx.restore();
}

// ── Composant principal ───────────────────────────────────────
export const MapVehiclePlacer = React.memo(function MapVehiclePlacer({ role, required = true, sessionId, accidentLat, accidentLng, accidentAddress, accidentCity, accidentCountry, vehicleColor, vehicleType, brand, existingVehicles = [], onComplete, onSkip }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tilesRef  = useRef<Map<string, HTMLImageElement>>(new Map());

  // Zoom level — user-controllable (15–19)
  const [zoom, setZoom] = useState(18);
  const MIN_ZOOM = 15;
  const MAX_ZOOM = 19;
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartZoom = useRef<number>(18);

  // Plan OSM par défaut — pas de voitures sur la carte
  const [satellite, setSatellite] = useState(false);
  const [centerLat, setCenterLat] = useState<number | null>(accidentLat || null);
  const [centerLng, setCenterLng] = useState<number | null>(accidentLng || null);
  const [geoStatus, setGeoStatus] = useState<'loading'|'ok'|'error'|'waiting'>('loading');
  const [tilesLoaded, setTilesLoaded] = useState(0);
  const [totalTiles, setTotalTiles] = useState(25);
  const [position, setPosition] = useState({ x: CANVAS_W/2, y: CANVAS_H/2 });
  const [angle, setAngle] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);
  const [step, setStep] = useState<'place'|'rotate'|'confirm'>('place');
  const [confirmed, setConfirmed] = useState(false);

  const roleColors: Record<string, string> = { A:'#1a44cc', B:'#cc3300', C:'#228833', D:'#9933cc' };

  // ── Live positions des autres véhicules (Socket.io) ─────────
  const [livePositions, setLivePositions] = useState<{ role: string; pos: VehiclePosition }[]>(existingVehicles);
  const socketRef = useRef<Socket | null>(null);

  // If waiting for coords (driver B case), use A's position from socket as center
  useEffect(() => {
    if (geoStatus !== 'waiting' && geoStatus !== 'loading') return;
    const aPos = livePositions.find(p => p.role === 'A');
    if (aPos?.pos?.lat && aPos?.pos?.lng) {
      setCenterLat(aPos.pos.lat);
      setCenterLng(aPos.pos.lng);
      setGeoStatus('ok');
    }
  }, [livePositions, geoStatus]);

  useEffect(() => {
    if (!sessionId) return;

    let socket: Socket | null = null;
    let cancelled = false;

    (async () => {
      // Initial fetch for current state
      try {
        const res = await fetch(`/trpc/session.get?input=${encodeURIComponent(JSON.stringify({ sessionId }))}`, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return;
        const data = await res.json();
        const session = data?.result?.data;
        if (!session) return;
        const positions: { role: string; pos: VehiclePosition; vehicleType?: string }[] = [];
        const parts: Record<string, unknown> = {
          A: session.participantA,
          B: session.participantB,
          C: session.participantC,
          D: session.participantD,
        };
        for (const [r, p] of Object.entries(parts)) {
          if (r === role) continue; // skip own vehicle
          const pos = (p as any)?.vehicle?.mapPosition;
          if (pos?.x !== undefined && pos?.lat !== undefined) {
            positions.push({ role: r, pos, vehicleType: (p as any)?.vehicle?.vehicleType });
          }
        }
        // Also check vehicleAPos in accident
        const vehicleAPos = session.accident?.vehicleAPos;
        if (vehicleAPos && role !== 'A' && !positions.find(p => p.role === 'A')) {
          positions.push({ role: 'A', pos: vehicleAPos });
        }
        if (!cancelled) setLivePositions(positions);
      } catch (e) { console.warn('[MapVehiclePlacer] Failed to fetch initial positions', e); }

      // Connect to Socket.io and join session room
      const { io: socketIO } = await import('socket.io-client');
      if (cancelled) return;

      socket = socketIO(window.location.origin, { reconnection: true });
      socketRef.current = socket;

      socket.on('connect', () => {
        socket!.emit('join-session', sessionId);
      });

      // Listen for data updates (participant vehicle position changes)
      socket.on('data-updated', ({ role: updatedRole, data }: { role: string; data: Record<string, unknown> }) => {
        if (updatedRole === role) return; // skip own updates
        const pos = (data as any)?.vehicle?.mapPosition;
        if (pos?.x !== undefined && pos?.lat !== undefined) {
          setLivePositions(prev => {
            const updated = prev.filter(p => p.role !== updatedRole);
            return [...updated, { role: updatedRole, pos, vehicleType: (data as any)?.vehicle?.vehicleType }];
          });
        }
      });

      // Listen for accident updates (vehicleAPos changes)
      socket.on('accident-updated', (data: any) => {
        const vehicleAPos = data?.vehicleAPos;
        if (vehicleAPos && role !== 'A') {
          setLivePositions(prev => {
            const updated = prev.filter(p => p.role !== 'A');
            return [...updated, { role: 'A', pos: vehicleAPos }];
          });
        }
      });
    })();

    // Cleanup on unmount
    return () => {
      cancelled = true;
      if (socket) {
        socket.off('data-updated');
        socket.off('accident-updated');
        socket.off('connect');
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [sessionId, role]);
  const roleColor = roleColors[role] || '#444';
  const bodyColor = parseColor(vehicleColor);

  // ── Géocodage de l'adresse si lat/lng manquants ──────────────
  useEffect(() => {
    if (accidentLat && accidentLng) {
      setCenterLat(accidentLat); setCenterLng(accidentLng); setGeoStatus('ok'); return;
    }
    const parts = [accidentAddress, accidentCity, accidentCountry].filter(Boolean).join(', ');
    if (!parts) {
      // No address either — wait for session polling to provide coords (for driver B)
      setGeoStatus('waiting');
      return;
    }

    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(parts)}&format=json&limit=1`, {
      headers: { 'User-Agent': 'boom.contact/1.0 accident-report' }
    })
      .then(r => r.json())
      .then(results => {
        if (results?.[0]) {
          setCenterLat(parseFloat(results[0].lat));
          setCenterLng(parseFloat(results[0].lon));
          setGeoStatus('ok');
        } else { setGeoStatus('error'); }
      })
      .catch(() => setGeoStatus('error'));
  }, [accidentLat, accidentLng, accidentAddress, accidentCity, accidentCountry]);

  // ── Chargement tiles ──────────────────────────────────────────
  useEffect(() => {
    if (!centerLat || !centerLng) return;
    tilesRef.current.clear();
    setTilesLoaded(0);
    const { x: cx, y: cy } = latlngToTile(centerLat, centerLng, zoom);
    const pad = 2;
    const total = (pad*2+1)*(pad*2+1);
    setTotalTiles(total);
    let loaded = 0;

    for (let dy = -pad; dy <= pad; dy++) {
      for (let dx = -pad; dx <= pad; dx++) {
        const tx = cx+dx, ty = cy+dy;
        const key = `${satellite?'sat':'osm'}/${zoom}/${ty}/${tx}`;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = getTileUrl(tx, ty, zoom, satellite);
        img.onload  = () => { tilesRef.current.set(key, img); loaded++; setTilesLoaded(loaded); };
        img.onerror = () => { loaded++; setTilesLoaded(loaded); };
      }
    }
  }, [centerLat, centerLng, satellite, zoom]);

  // ── Rendu ────────────────────────────────────────────────────
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !centerLat || !centerLng) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    const { x: cx, y: cy } = latlngToTile(centerLat, centerLng, zoom);
    const pad = 2;
    const latRad = centerLat * Math.PI / 180;
    const originX = (centerLng + 180) / 360 * Math.pow(2, zoom) * TILE_SIZE;
    const originY = (1 - Math.log(Math.tan(latRad) + 1/Math.cos(latRad)) / Math.PI) / 2 * Math.pow(2, zoom) * TILE_SIZE;

    for (let dy = -pad; dy <= pad; dy++) {
      for (let dx = -pad; dx <= pad; dx++) {
        const tx = cx+dx, ty = cy+dy;
        const img = tilesRef.current.get(`${satellite?'sat':'osm'}/${zoom}/${ty}/${tx}`);
        if (img) {
          const drawX = tx*TILE_SIZE - originX + CANVAS_W/2;
          const drawY = ty*TILE_SIZE - originY + CANVAS_H/2;
          ctx.drawImage(img, drawX, drawY, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    // Véhicules existants
    for (const ev of livePositions) {
      drawVehicle(ctx, ev.pos.x, ev.pos.y, ev.pos.angle, '#888', ev.role, roleColors[ev.role]||'#444', false, undefined, undefined, (ev as any).vehicleType);
    }

    // Véhicule courant
    drawVehicle(ctx, position.x, position.y, angle, bodyColor, role, roleColor, true, undefined, undefined, vehicleType);

    // Croix GPS (point d'accident)
    const gpx = CANVAS_W/2, gpy = CANVAS_H/2;
    ctx.strokeStyle = 'rgba(255,50,0,0.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(gpx-10,gpy); ctx.lineTo(gpx+10,gpy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gpx,gpy-10); ctx.lineTo(gpx,gpy+10); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,50,0,0.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(gpx,gpy,18,0,Math.PI*2); ctx.stroke();

    // Barre inférieure
    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    ctx.fillRect(0, CANVAS_H-26, CANVAS_W, 26);
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
    const instr = step==='place' ? '✋ Faites glisser votre véhicule à sa position exacte'
                : step==='rotate' ? '↻ Orientez votre véhicule dans sa direction'
                : '✓ Position confirmée';
    ctx.fillText(instr, CANVAS_W/2, CANVAS_H-9);

    // Attribution
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, satellite ? 195 : 205, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = '8px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(satellite ? '© Esri, Maxar, Earthstar Geographics' : '© OpenStreetMap contributors', 4, 10);
  }, [position, angle, bodyColor, role, roleColor, livePositions, step, tilesLoaded, centerLat, centerLng, satellite, zoom]);

  useEffect(() => { render(); }, [render]);

  // ── Handlers touch/mouse ─────────────────────────────────────
  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const r = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    const sx = CANVAS_W / r.width, sy = CANVAS_H / r.height;
    if ('touches' in e && e.touches.length > 0)
      return { x: (e.touches[0].clientX - r.left)*sx, y: (e.touches[0].clientY - r.top)*sy };
    return { x: ((e as React.MouseEvent).clientX - r.left)*sx, y: ((e as React.MouseEvent).clientY - r.top)*sy };
  };

  // Pinch-to-zoom: compute distance between two touches
  const getTouchDist = (e: React.TouchEvent) => {
    if (e.touches.length < 2) return null;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const onStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault(); if (confirmed) return;
    // Pinch-to-zoom start
    if ('touches' in e && e.touches.length === 2) {
      const dist = getTouchDist(e);
      if (dist !== null) {
        pinchStartDist.current = dist;
        pinchStartZoom.current = zoom;
      }
      return;
    }
    const p = getPos(e);
    const d = Math.hypot(p.x - position.x, p.y - position.y);
    if (d < 35) {
      setDragging(true);
      dragStart.current = { x: p.x, y: p.y, posX: position.x, posY: position.y };
      setStep('place');
    }
  };
  const onMove = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    // Pinch-to-zoom move
    if ('touches' in e && e.touches.length === 2 && pinchStartDist.current !== null) {
      const dist = getTouchDist(e);
      if (dist !== null) {
        const ratio = dist / pinchStartDist.current;
        // Each 50% change in finger distance = 1 zoom level
        const delta = Math.round(Math.log2(ratio));
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchStartZoom.current + delta));
        if (newZoom !== zoom) setZoom(newZoom);
      }
      return;
    }
    if (!dragging || !dragStart.current || confirmed) return;
    const p = getPos(e);
    setPosition({
      x: Math.max(20, Math.min(CANVAS_W-20, dragStart.current.posX + p.x - dragStart.current.x)),
      y: Math.max(20, Math.min(CANVAS_H-20, dragStart.current.posY + p.y - dragStart.current.y)),
    });
  };
  const onEnd = () => {
    pinchStartDist.current = null;
    if (dragging) { setDragging(false); dragStart.current = null; setStep('rotate'); }
  };

  const confirm = () => {
    if (!centerLat || !centerLng) return;
    const canvas = canvasRef.current!;
    const gps = canvasPixelToLatlng(position.x, position.y, centerLat, centerLng, zoom);
    const b64 = canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
    setConfirmed(true); setStep('confirm');
    onComplete({ x: position.x, y: position.y, angle, lat: gps.lat, lng: gps.lng }, b64);
  };

  // ── Rendu JSX ────────────────────────────────────────────────
  if (geoStatus === 'loading') return (
    <div role="status" aria-label="Chargement en cours" className="p-10 text-center" style={{ color: 'rgba(255,255,255,0.7)' }}>
      <div className="text-4xl mb-3 inline-block"  style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true">🌍</div>
      <div className="font-bold">Localisation de l'accident…</div>
      <div className="text-xs mt-1.5 opacity-75">Géocodage de l'adresse</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (geoStatus === 'error') return (
    <div className="p-6">
      <div className="rounded-[10px] text-[13px] p-3.5 mb-3.5"  style={{ background: 'rgba(255,100,0,0.08)', border: '1px solid rgba(255,100,0,0.2)', color: 'rgba(255,200,100,0.9)' }}>
        ⚠️ Impossible de localiser l'adresse sur la carte. Vérifiez l'adresse saisie à l'étape Lieu.
      </div>
      <button onClick={onSkip} className="w-full p-3 rounded-[10px] cursor-pointer text-[13px]" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.6)' }}>
        Passer cette étape
      </button>
    </div>
  );

  const loadingTiles = tilesLoaded < totalTiles;
  const roleLabel = { A:'Conducteur A', B:'Conducteur B', C:'Conducteur C', D:'Conducteur D' }[role];

  return (
    <div className="px-[18px] py-3.5">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="rounded-full flex items-center justify-center font-extrabold text-[15px] w-[34px] h-[34px]"  style={{ background: `${roleColor}22`, border: `2px solid ${roleColor}`, color: roleColor }}>
          {role}
        </div>
        <div>
          <div className="font-bold text-sm">{roleLabel} — Positionner mon véhicule</div>
          <div className="text-[11px] opacity-70" >{brand ? `${brand} · ` : ''}{vehicleType || 'Voiture'}</div>
        </div>
        {/* Toggle plan / satellite */}
        <button
          onClick={() => setSatellite(s => !s)}
          className="ml-auto rounded-2xl text-[11px] cursor-pointer font-semibold touch-manipulation whitespace-nowrap px-2.5 py-[5px]" style={{ border: `1px solid ${satellite ? '#f59e0b' : 'rgba(255,255,255,0.15)'}`, background: satellite ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.04)', color: satellite ? '#f59e0b' : 'rgba(255,255,255,0.55)' }}>
          {satellite ? '🛰 Satellite' : '🗺 Plan'}
        </button>
      </div>

      {/* Étapes */}
      <div className="flex gap-1.5 mb-2.5">
        {[['place','✋','1. Placer'],['rotate','↻','2. Orienter'],['confirm','✓','3. Valider']] .map(([s,icon,label]) => (
          <div key={s} className="flex-1 rounded-lg text-center text-[10px] px-[3px] py-[5px]" style={{ background: step===s?`${roleColor}20`:'rgba(255,255,255,0.03)', border: `1px solid ${step===s?roleColor:'rgba(255,255,255,0.07)'}`, color: step===s?roleColor:'rgba(255,255,255,0.55)', fontWeight: step===s?700:400 }}>
            {icon} {label}
          </div>
        ))}
      </div>

      {/* Canvas */}
      <div className="rounded-xl overflow-hidden mb-3 relative" style={{ border: `2px solid ${roleColor}44` }}>
        {loadingTiles && (
          <div className="absolute rounded-lg text-[10px] z-10 top-2 right-2 px-2 py-[3px]" style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.6)' }}>
            {tilesLoaded}/{totalTiles} tiles…
          </div>
        )}
        {/* Zoom controls */}
        <div className="absolute z-10 flex flex-col gap-1" style={{ top: 8, right: 8 }}>
          <button
            aria-label="Zoom avant"
            onClick={() => setZoom(z => Math.min(MAX_ZOOM, z + 1))}
            disabled={zoom >= MAX_ZOOM}
            className="flex items-center justify-center cursor-pointer font-bold touch-manipulation"
            style={{ width: 32, height: 32, background: '#111', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 6, color: zoom >= MAX_ZOOM ? 'rgba(255,255,255,0.25)' : 'white', fontSize: 18, lineHeight: 1 }}
          >+</button>
          <button
            aria-label="Zoom arrière"
            onClick={() => setZoom(z => Math.max(MIN_ZOOM, z - 1))}
            disabled={zoom <= MIN_ZOOM}
            className="flex items-center justify-center cursor-pointer font-bold touch-manipulation"
            style={{ width: 32, height: 32, background: '#111', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 6, color: zoom <= MIN_ZOOM ? 'rgba(255,255,255,0.25)' : 'white', fontSize: 18, lineHeight: 1 }}
          >-</button>
        </div>
        <canvas
          ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
          aria-label="Placement du véhicule sur le schéma"
          className="w-full block touch-none" style={{ cursor: dragging?'grabbing':'grab' }}
          onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
          onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
        />
      </div>

      {/* Slider rotation */}
      {step === 'rotate' && !confirmed && (
        <div className="mb-3">
          <div className="text-[11px] text-center mb-1.5 opacity-85">
            Direction : {angle}° {angle<22?'→ Est':angle<67?'↘ SE':angle<112?'↓ Sud':angle<157?'↙ SO':angle<202?'← Ouest':angle<247?'↖ NO':angle<292?'↑ Nord':angle<337?'↗ NE':'→ Est'}
          </div>
          <input type="range" aria-label="Direction du véhicule" min={0} max={359} value={angle}
            onChange={e => setAngle(Number(e.target.value))}
            className="w-full" style={{ accentColor: roleColor }} />
          <div className="flex justify-between text-[9px] mt-0.5 opacity-75">
            <span>↑N</span><span>→E</span><span>↓S</span><span>←O</span>
          </div>
        </div>
      )}

      {/* Boutons */}
      {!confirmed ? (
        <div className="flex gap-2">
          <button onClick={onSkip}
            className="flex-1 rounded-[10px] bg-transparent cursor-pointer text-[13px] touch-manipulation p-[11px]"  style={{ border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.55)' }}>
            Passer
          </button>
          <button onClick={step==='place' ? () => setStep('rotate') : confirm}
            className="rounded-[10px] border-0 text-white cursor-pointer text-sm font-bold touch-manipulation p-[13px]"  style={{ flex: 2, background: roleColor }}>
            {step==='place' ? 'Orienter →' : '✓ Valider ma position'}
          </button>
        </div>
      ) : (
        <div className="rounded-[10px] text-center text-sm text-green-500 font-bold p-[13px]"  style={{ background: 'rgba(34,197,94,0.09)', border: '1px solid rgba(34,197,94,0.28)' }}>
          ✅ Position enregistrée sur la carte
        </div>
      )}
    </div>
  );
});
