/**
 * boom.contact — osm-map.service.ts
 * Fetch des tuiles OpenStreetMap côté serveur Railway
 * Même logique que MapVehiclePlacer.tsx côté client
 */

import { createCanvas, loadImage } from 'canvas';
import { logger } from '../logger.js';

const TILE_SIZE = 256;
const ZOOM = 18;

function latlngToTile(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lng + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y };
}

async function fetchTile(tx: number, ty: number, zoom: number): Promise<any> {
  const s = ['a','b','c','d'][tx % 4];
  // CartoDB Voyager : fond clair lisible, routes bien dessinées et contrastées,
  // sans la surcharge de POI d'OSM standard. Meilleur compromis pour un croquis d'accident.
  const url = `https://${s}.basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${tx}/${ty}.png`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'boom.contact/1.0 (contact@boom.contact)',
      'Accept': 'image/png',
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Tile ${tx}/${ty} HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  return loadImage(Buffer.from(buf));
}

export async function fetchAccidentMap(
  lat: number,
  lng: number,
  W = 900,
  H = 650,
  zoom = 18
): Promise<string> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Fond gris si tuiles indisponibles
  ctx.fillStyle = '#E8EDF2';
  ctx.fillRect(0, 0, W, H);

  const { x: cx, y: cy } = latlngToTile(lat, lng, zoom);
  const tilesX = Math.ceil(W / TILE_SIZE) + 3;
  const tilesY = Math.ceil(H / TILE_SIZE) + 3;

  const tasks: Promise<void>[] = [];

  for (let dx = -Math.ceil(tilesX/2); dx <= Math.ceil(tilesX/2); dx++) {
    for (let dy = -Math.ceil(tilesY/2); dy <= Math.ceil(tilesY/2); dy++) {
      const tx = cx + dx;
      const ty = cy + dy;
      const px = dx * TILE_SIZE + W/2 - TILE_SIZE/2;
      const py = dy * TILE_SIZE + H/2 - TILE_SIZE/2;

      tasks.push(
        fetchTile(tx, ty, zoom)
          .then(img => { ctx.drawImage(img as any, px, py, TILE_SIZE, TILE_SIZE); })
          .catch((e) => { logger.debug('Tile fetch failed (grey fallback)', { tile: `${tx},${ty}`, error: String(e) }); })
      );
    }
  }

  // Limiter à 16 tuiles max parallèles
  const chunks = [];
  for (let i = 0; i < tasks.length; i += 8) chunks.push(tasks.slice(i, i+8));
  for (const chunk of chunks) {
    await Promise.all(chunk);
    await new Promise(r => setTimeout(r, 30)); // rate limit OSM
  }

  // Crédit OSM
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillRect(W - 260, H - 20, 258, 19);
  ctx.fillStyle = '#555';
  ctx.font = '10px sans-serif';
  ctx.fillText('© OpenStreetMap contributors', W - 255, H - 6);

  logger.info(`[osm-map] Carte rendue: ${W}x${H} zoom=${zoom} (${lat.toFixed(4)},${lng.toFixed(4)})`);
  return canvas.toBuffer('image/png').toString('base64');
}


// ── Conversion lat/lng → pixel sur le canvas ─────────────────
function latlngToPixel(
  lat: number, lng: number,
  centerLat: number, centerLng: number,
  zoom: number, W: number, H: number
): { x: number; y: number } {
  const n = Math.pow(2, zoom) * TILE_SIZE;
  const toWorld = (la: number, lo: number) => ({
    x: (lo + 180) / 360 * n,
    y: (1 - Math.log(Math.tan(la * Math.PI / 180) + 1 / Math.cos(la * Math.PI / 180)) / Math.PI) / 2 * n,
  });
  const center = toWorld(centerLat, centerLng);
  const point  = toWorld(lat, lng);
  return {
    x: W / 2 + (point.x - center.x),
    y: H / 2 + (point.y - center.y),
  };
}

// ── Emoji par type de véhicule ──────────────────────────────
function getMarkerEmoji(vehicleType?: string): string {
  switch (vehicleType) {
    case 'motorcycle': case 'scooter': case 'moped': return '🏍';
    case 'escooter':   return '🛴';
    case 'bicycle': case 'cargo_bike': return '🚲';
    case 'pedestrian': return '🚶';
    case 'truck':      return '🚛';
    case 'van':        return '🚐';
    case 'bus':        return '🚌';
    case 'tram':       return '🚋';
    case 'quad':       return '🏎';
    default:           return '🚗';
  }
}

// ── Dessiner un marqueur véhicule sur canvas ──────────────────
function drawVehicleMarker(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, angle: number,
  color: string, label: string,
  vehicleType?: string,
  badgeDir?: { dx: number; dy: number },
) {
  const isPedOrCycle = ['pedestrian','escooter','bicycle','cargo_bike'].includes(vehicleType || '');
  const emoji = getMarkerEmoji(vehicleType);

  if (isPedOrCycle) {
    // Cercle coloré + emoji pour piéton/trottinette/vélo
    ctx.fillStyle = color + 'CC';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(emoji, x, y + 1);
  } else {
    // Silhouette vue du dessus pour voitures/motos/camions
    const isLarge = ['truck','bus','tram'].includes(vehicleType || '');
    const isMoto  = ['motorcycle','scooter','moped'].includes(vehicleType || '');
    const length = isLarge ? 70 : isMoto ? 34 : 50;
    const width  = isLarge ? 30 : isMoto ? 14 : 24;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((angle * Math.PI) / 180);

    // Halo blanc pour détacher le véhicule du fond de carte
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = color;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-length/2, -width/2, length, width, 5);
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;

    // Toit
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    if (!isMoto) ctx.fillRect(-length/4, -width/2.5, length/2, width/1.25);

    // Pare-brise (indique l'avant)
    ctx.fillStyle = 'rgba(200,230,245,0.85)';
    ctx.fillRect(length/4, -width/3, length/6, width * 0.66);

    ctx.restore();
  }

  // Badge rôle — toujours visible, pas de rotation, décalé à l'opposé de l'autre véhicule
  const bd = badgeDir || { dx: 1, dy: -1 };
  const bnorm = Math.hypot(bd.dx, bd.dy) || 1;
  const bx = x + (bd.dx / bnorm) * 26;
  const by = y + (bd.dy / bnorm) * 26;
  ctx.fillStyle = color;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(bx, by, 13, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, bx, by);
  ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
}

// ── Carte OSM avec marqueurs véhicules ───────────────────────
export interface VehicleMarker {
  lat: number;
  lng: number;
  angle?: number;
  label: string;       // 'A' | 'B' | 'C' ...
  color: string;       // hex
  vehicleType?: string; // car, motorcycle, escooter, bicycle, pedestrian, truck, van, bus...
}

export interface AccidentMapMeta {
  /** Point d'impact (collision) — affiché comme repère central. */
  impact?: { lat: number; lng: number };
  /** Cartouche d'en-tête optionnel rendu sur la carte (lieu · date · heure). */
  header?: string;
}

/**
 * Choisit le zoom OSM le plus serré (le plus détaillé) tel que tous les
 * marqueurs tiennent dans le cadre avec une marge confortable. Garantit
 * une vue centrée sur l'accident plutôt qu'un zoom fixe inadapté.
 */
function pickZoomForMarkers(
  vehicles: VehicleMarker[], impact: { lat: number; lng: number } | undefined,
  W: number, H: number, minZoom = 16, maxZoom = 19,
): number {
  const pts = [...vehicles.map(v => ({ lat: v.lat, lng: v.lng })), ...(impact ? [impact] : [])];
  if (pts.length < 2) return maxZoom; // un seul point : vue la plus serrée
  const marginPx = 150; // garde une marge autour des véhicules (badges, labels)
  for (let z = maxZoom; z >= minZoom; z--) {
    const xs = pts.map(p => lngToWorldX(p.lng, z));
    const ys = pts.map(p => latToWorldY(p.lat, z));
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanY = Math.max(...ys) - Math.min(...ys);
    if (spanX <= W - 2 * marginPx && spanY <= H - 2 * marginPx) return z;
  }
  return minZoom;
}

function lngToWorldX(lng: number, zoom: number): number {
  return (lng + 180) / 360 * Math.pow(2, zoom) * TILE_SIZE;
}
function latToWorldY(lat: number, zoom: number): number {
  return (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom) * TILE_SIZE;
}

export async function fetchAccidentMapWithVehicles(
  centerLat: number,
  centerLng: number,
  vehicles: VehicleMarker[],
  W = 900,
  H = 650,
  zoom?: number,
  meta: AccidentMapMeta = {},
): Promise<string> {
  // Cadrage intelligent : centre = barycentre des véhicules (+ impact), zoom auto
  const impact = meta.impact;
  const framePts = [...vehicles.map(v => ({ lat: v.lat, lng: v.lng })), ...(impact ? [impact] : [])];
  const cLat = framePts.length ? framePts.reduce((s, p) => s + p.lat, 0) / framePts.length : centerLat;
  const cLng = framePts.length ? framePts.reduce((s, p) => s + p.lng, 0) / framePts.length : centerLng;
  const z = zoom ?? pickZoomForMarkers(vehicles, impact, W, H);

  // 1. Carte de base claire, centrée sur le barycentre de l'accident
  const mapBase64 = await fetchAccidentMap(cLat, cLng, W, H, z);

  const canvas2 = createCanvas(W, H);
  const ctx2 = canvas2.getContext('2d');
  const mapImg = await loadImage(Buffer.from(mapBase64, 'base64'));
  ctx2.drawImage(mapImg as any, 0, 0, W, H);

  const roleColors: Record<string, string> = { A: '#1a44cc', B: '#cc3300', C: '#228833', D: '#9933cc', E: '#cc8800' };

  // 2. Trait reliant les véhicules au point d'impact (raconte la collision)
  if (impact) {
    const ip = latlngToPixel(impact.lat, impact.lng, cLat, cLng, z, W, H);
    for (const v of vehicles) {
      const vp = latlngToPixel(v.lat, v.lng, cLat, cLng, z, W, H);
      ctx2.strokeStyle = 'rgba(40,40,40,0.35)';
      ctx2.lineWidth = 2;
      ctx2.setLineDash([6, 5]);
      ctx2.beginPath(); ctx2.moveTo(vp.x, vp.y); ctx2.lineTo(ip.x, ip.y); ctx2.stroke();
      ctx2.setLineDash([]);
    }
  }

  // 3. Marqueurs véhicules (silhouettes orientées, badges décalés pour ne pas se chevaucher)
  const pixelPos = vehicles.map(v => latlngToPixel(v.lat, v.lng, cLat, cLng, z, W, H));
  for (let i = 0; i < vehicles.length; i++) {
    const v = vehicles[i];
    const { x, y } = pixelPos[i];
    const color = v.color || roleColors[v.label] || '#444';
    // Badge décalé à l'opposé du barycentre des AUTRES véhicules (évite la superposition)
    let bdx = 1, bdy = -1;
    if (vehicles.length > 1) {
      const others = pixelPos.filter((_, j) => j !== i);
      const ox = others.reduce((s, p) => s + p.x, 0) / others.length;
      const oy = others.reduce((s, p) => s + p.y, 0) / others.length;
      bdx = x - ox; bdy = y - oy;
      if (Math.abs(bdx) < 1 && Math.abs(bdy) < 1) { bdx = 1; bdy = -1; }
    }
    drawVehicleMarker(ctx2 as any, x, y, v.angle || 0, color, v.label, v.vehicleType, { dx: bdx, dy: bdy });
  }

  // 4. Repère d'impact (étoile rouge) par-dessus
  if (impact) {
    const ip = latlngToPixel(impact.lat, impact.lng, cLat, cLng, z, W, H);
    drawImpactStar(ctx2 as any, ip.x, ip.y);
  }

  // 5. Cartouche d'en-tête (lieu · date) — carte auto-suffisante
  if (meta.header) {
    ctx2.font = 'bold 15px sans-serif';
    const tw = ctx2.measureText(meta.header).width;
    ctx2.fillStyle = 'rgba(255,255,255,0.92)';
    ctx2.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx2.lineWidth = 1;
    roundRectPath(ctx2 as any, 12, 12, tw + 28, 34, 8);
    ctx2.fill(); ctx2.stroke();
    ctx2.fillStyle = '#102033';
    ctx2.textBaseline = 'middle';
    ctx2.fillText(meta.header, 26, 30);
    ctx2.textBaseline = 'alphabetic';
  }

  // (l'attribution © OpenStreetMap est déjà rendue par fetchAccidentMap)

  logger.info(`[osm-map] Carte avec ${vehicles.length} véhicule(s) rendue (zoom auto=${z})`);
  return canvas2.toBuffer('image/png').toString('base64');
}

/** Étoile rouge "impact" au point de collision. */
function drawImpactStar(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const spikes = 8, outer = 15, inner = 6;
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i * Math.PI) / spikes - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = '#e8090c';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 5;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.restore();
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'boom.contact/1.0 (contact@boom.contact)' },
      signal: AbortSignal.timeout(6000),
    });
    const data = await res.json() as Record<string, unknown>[];
    if (data?.length > 0) {
      return { lat: parseFloat(data[0].lat as string), lng: parseFloat(data[0].lon as string) };
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn('[osm-map] Geocode failed:', msg as any);
  }
  return null;
}
