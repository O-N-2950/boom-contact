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
  const s = ['a','b','c'][tx % 3];
  const url = `https://${s}.tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`;
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
  vehicleType?: string
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
    const length = isLarge ? 54 : isMoto ? 26 : 38;
    const width  = isLarge ? 22 : isMoto ? 10 : 18;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((angle * Math.PI) / 180);

    ctx.fillStyle = color;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-length/2, -width/2, length, width, 4);
    ctx.fill(); ctx.stroke();

    // Toit
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    if (!isMoto) ctx.fillRect(-length/4, -width/2.5, length/2, width/1.25);

    // Pare-brise
    ctx.fillStyle = 'rgba(200,230,245,0.7)';
    ctx.fillRect(length/4, -width/3, length/6, width * 0.66);

    ctx.restore();
  }

  // Badge rôle — toujours visible, pas de rotation
  ctx.fillStyle = color;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x + 16, y - 16, 11, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 16, y - 16);
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

export async function fetchAccidentMapWithVehicles(
  centerLat: number,
  centerLng: number,
  vehicles: VehicleMarker[],
  W = 900,
  H = 650,
  zoom = 18
): Promise<string> {
  // 1. Générer la carte OSM de base
  const mapBase64 = await fetchAccidentMap(centerLat, centerLng, W, H, zoom);

  // 2. Charger l'image de base dans un nouveau canvas pour y superposer les marqueurs
  const canvas2 = createCanvas(W, H);
  const ctx2 = canvas2.getContext('2d');
  const mapImg = await loadImage(Buffer.from(mapBase64, 'base64'));
  ctx2.drawImage(mapImg as any, 0, 0, W, H);

  // 3. Dessiner chaque marqueur véhicule
  const roleColors: Record<string, string> = { A: '#1a44cc', B: '#cc3300', C: '#228833', D: '#9933cc' };
  for (const v of vehicles) {
    const { x, y } = latlngToPixel(v.lat, v.lng, centerLat, centerLng, zoom, W, H);
    const color = v.color || roleColors[v.label] || '#444';
    drawVehicleMarker(ctx2, x, y, v.angle || 0, color, v.label);
  }

  // 4. Légende en bas à gauche
  if (vehicles.length > 0) {
    ctx2.fillStyle = 'rgba(0,0,0,0.65)';
    ctx2.fillRect(10, H - 30 - vehicles.length * 22, 160, 10 + vehicles.length * 22);
    vehicles.forEach((v, i) => {
      const roleColors2: Record<string, string> = { A: '#1a44cc', B: '#cc3300', C: '#228833', D: '#9933cc' };
      ctx2.fillStyle = v.color || roleColors2[v.label] || '#444';
      ctx2.fillRect(16, H - 22 - (vehicles.length - i - 1) * 22, 12, 12);
      ctx2.fillStyle = '#fff';
      ctx2.font = '11px sans-serif';
      ctx2.fillText(`Conducteur ${v.label}`, 34, H - 13 - (vehicles.length - i - 1) * 22);
    });
  }

  logger.info(`[osm-map] Carte avec ${vehicles.length} véhicule(s) rendue`);
  return canvas2.toBuffer('image/png').toString('base64');
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
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn('[osm-map] Geocode failed:', msg);
  }
  return null;
}
