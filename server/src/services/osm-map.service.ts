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
          .catch(() => {}) // tuile indisponible = fond gris
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

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'boom.contact/1.0 (contact@boom.contact)' },
      signal: AbortSignal.timeout(6000),
    });
    const data = await res.json() as any[];
    if (data?.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (e: any) {
    logger.warn('[osm-map] Geocode failed:', e.message);
  }
  return null;
}
