// client/src/components/constat/sketch-engine.ts
// Moteur de dessin professionnel pour croquis d'accident
// Silhouettes réalistes, couleurs véhicules, sens de circulation par pays

export interface SceneAnalysis {
  scenario: string;
  trafficSide: 'right' | 'left';
  country?: string;
  vehicleA: VehicleScene;
  vehicleB: VehicleScene;
  confidence: number;
  fault?: string;
  circumstances: string[];
  description: string;
  language: string;
  questions?: ClarifyQuestion[];
}

export interface VehicleScene {
  direction: string;
  impactZone: string;
  wasMoving: boolean;
  isReversing?: boolean;
  vehicleType?: string;
  speed?: string;
  // Données OCR enrichies
  color?: string;
  brand?: string;
  model?: string;
}

export interface ClarifyQuestion {
  id: string;
  question: string;
  options: { value: string; label: string }[];
  field: string;
}

// ── Correspondance couleur CSS ────────────────────────────────
const COLOR_MAP: Record<string, string> = {
  blanc: '#F5F5F0', white: '#F5F5F0', weiss: '#F5F5F0', bianco: '#F5F5F0',
  noir: '#1a1a2e', black: '#111118', schwarz: '#1a1a2e', nero: '#111118',
  gris: '#7a7a8a', grey: '#7a7a8a', gray: '#7a7a8a', grau: '#888890',
  rouge: '#cc2222', red: '#cc2222', rot: '#cc2222', rosso: '#cc2222',
  bleu: '#2255cc', blue: '#2255cc', blau: '#2255cc', azzurro: '#3366cc',
  vert: '#228833', green: '#228833', grün: '#228833', verde: '#228833',
  jaune: '#ddaa00', yellow: '#ddaa00', gelb: '#ddaa00', giallo: '#ddaa00',
  orange: '#dd6600', argent: '#aab0bb', silver: '#aab0bb', silber: '#aab0bb',
  beige: '#c8b880', marron: '#8b5e3c', brown: '#8b5e3c', braun: '#8b5e3c',
  bordeaux: '#8b1a2a', violet: '#6633aa', rose: '#cc5588',
};

export function parseColor(colorStr?: string): string {
  if (!colorStr) return '#4466aa';
  const lower = colorStr.toLowerCase().trim();
  for (const [key, val] of Object.entries(COLOR_MAP)) {
    if (lower.includes(key)) return val;
  }
  // Try hex
  if (lower.match(/^#[0-9a-f]{3,6}$/)) return colorStr;
  return '#4466aa';
}

// ── Dessinateurs de silhouettes ───────────────────────────────
function drawCar(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  W: number, H: number,
  color: string, label: string,
  angle: number
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  const w = W, h = H;

  // Ombre portée
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 10; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 3;

  // Carrosserie principale
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-w/2, -h/2, w, h, h * 0.2);
  ctx.fill();

  ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

  // Contour
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-w/2, -h/2, w, h, h * 0.2);
  ctx.stroke();

  // Habitacle (toit)
  const roofColor = color === '#F5F5F0' ? '#d8d8d0' : 'rgba(0,0,0,0.3)';
  ctx.fillStyle = roofColor;
  ctx.beginPath();
  ctx.roundRect(-w * 0.28, -h/2 - h * 0.55, w * 0.56, h * 0.6, h * 0.15);
  ctx.fill();

  // Pare-brise avant (vitres)
  ctx.fillStyle = 'rgba(150,200,255,0.4)';
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1;
  // Avant
  ctx.beginPath();
  ctx.roundRect(w * 0.18, -h * 0.42, w * 0.1, h * 0.35, 3);
  ctx.fill(); ctx.stroke();
  // Arrière
  ctx.beginPath();
  ctx.roundRect(-w * 0.28, -h * 0.42, w * 0.1, h * 0.35, 3);
  ctx.fill(); ctx.stroke();

  // Phares avant
  ctx.fillStyle = '#ffffcc';
  ctx.shadowColor = '#ffff88'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.ellipse(w/2 - 5, -h*0.28, 5, 4, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(w/2 - 5,  h*0.28, 5, 4, 0, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0;

  // Feux arrière
  ctx.fillStyle = '#ff4444';
  ctx.beginPath(); ctx.ellipse(-w/2 + 5, -h*0.28, 4, 3, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-w/2 + 5,  h*0.28, 4, 3, 0, 0, Math.PI*2); ctx.fill();

  // Roues
  ctx.fillStyle = '#222';
  ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
  const wheelPositions = [
    [w * 0.28, -h/2], [w * 0.28, h/2],
    [-w * 0.28, -h/2], [-w * 0.28, h/2],
  ];
  wheelPositions.forEach(([wx, wy]) => {
    ctx.beginPath();
    ctx.ellipse(wx as number, wy as number, h * 0.18, h * 0.14, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.ellipse(wx as number, wy as number, h * 0.08, h * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
  });

  // Label (A ou B)
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${h * 0.55}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 4;
  ctx.fillText(label, 0, 0);
  ctx.shadowBlur = 0;

  ctx.restore();
}

function drawSUV(ctx: CanvasRenderingContext2D, cx: number, cy: number, W: number, H: number, color: string, label: string, angle: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  const w = W * 1.05, h = H * 1.15;

  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 12;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.roundRect(-w/2, -h/2, w, h, h*0.15); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5;
  ctx.stroke();

  // Toit plus plat et large (SUV)
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.roundRect(-w*0.32, -h/2 - h*0.5, w*0.64, h*0.55, h*0.1); ctx.fill();

  // Barre de toit
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-w*0.25, -h/2 - h*0.22);
  ctx.lineTo( w*0.25, -h/2 - h*0.22);
  ctx.stroke();

  // Label
  ctx.fillStyle = '#fff'; ctx.font = `bold ${h*0.5}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 4;
  ctx.fillText(label, 0, 0); ctx.shadowBlur = 0;
  ctx.restore();
}

function drawTruck(ctx: CanvasRenderingContext2D, cx: number, cy: number, W: number, H: number, color: string, label: string, angle: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  const w = W * 1.8, h = H * 1.2;

  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 14;

  // Remorque
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.rect(-w/2, -h/2, w*0.65, h); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();

  // Cabine
  ctx.fillStyle = color === '#F5F5F0' ? '#ddddcc' : color;
  ctx.beginPath(); ctx.roundRect(w*0.15, -h/2, w*0.35, h, 6); ctx.fill(); ctx.stroke();

  ctx.shadowBlur = 0;
  // Phares
  ctx.fillStyle = '#ffffcc'; ctx.shadowColor = '#ffff88'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.ellipse(w/2 - 6, -h*0.28, 6, 4, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(w/2 - 6,  h*0.28, 6, 4, 0, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#fff'; ctx.font = `bold ${h*0.45}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 4;
  ctx.fillText(label, -w*0.1, 0); ctx.shadowBlur = 0;
  ctx.restore();
}

function drawMotorcycle(ctx: CanvasRenderingContext2D, cx: number, cy: number, W: number, H: number, color: string, label: string, angle: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  const w = W * 0.9, h = H * 0.6;

  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 8;

  // Corps moto
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(0, 0, w*0.45, h*0.35, 0, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();

  // Roues
  ctx.fillStyle = '#222'; ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc( w*0.4,  0, h*0.38, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(-w*0.4,  0, h*0.38, 0, Math.PI*2); ctx.fill(); ctx.stroke();

  // Guidon
  ctx.strokeStyle = '#888'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(w*0.3, -h*0.4); ctx.lineTo(w*0.3, h*0.4); ctx.stroke();

  // Label
  ctx.fillStyle = '#fff'; ctx.font = `bold ${h*0.7}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 4;
  ctx.fillText(label, 0, 0); ctx.shadowBlur = 0;
  ctx.restore();
}

function drawScooter(ctx: CanvasRenderingContext2D, cx: number, cy: number, W: number, H: number, color: string, label: string, angle: number) {
  drawMotorcycle(ctx, cx, cy, W * 0.75, H * 0.75, color, label, angle);
}

function drawEscooter(ctx: CanvasRenderingContext2D, cx: number, cy: number, W: number, _H: number, color: string, label: string, angle: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  const w = W * 0.4, h = w;

  ctx.strokeStyle = color; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(w*0.3, -h*0.8); ctx.lineTo(0, 0); ctx.lineTo(-w*0.3, 0); ctx.stroke();
  ctx.beginPath(); ctx.arc( w*0.3, 0, h*0.28, 0, Math.PI*2);
  ctx.arc(-w*0.3, 0, h*0.28, 0, Math.PI*2); ctx.strokeStyle = '#333'; ctx.lineWidth = 3; ctx.stroke();

  ctx.fillStyle = '#fff'; ctx.font = `bold ${h*0.7}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 4;
  ctx.fillText(label, 0, -h*0.4); ctx.shadowBlur = 0;
  ctx.restore();
}

function drawBicycle(ctx: CanvasRenderingContext2D, cx: number, cy: number, W: number, _H: number, color: string, label: string, angle: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  const r = W * 0.22;

  ctx.strokeStyle = color; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc( r*1.5, 0, r, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.arc(-r*1.5, 0, r, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-r*1.5, 0); ctx.lineTo(0, -r*1.2); ctx.lineTo(r*1.5, 0);
  ctx.moveTo(0, -r*1.2); ctx.lineTo(0, r*0.3);
  ctx.stroke();

  ctx.fillStyle = '#fff'; ctx.font = `bold ${r}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 4;
  ctx.fillText(label, 0, -r*1.8); ctx.shadowBlur = 0;
  ctx.restore();
}

function drawPedestrian(ctx: CanvasRenderingContext2D, cx: number, cy: number, _W: number, H: number, _color: string, label: string, angle: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  const h = H;

  ctx.strokeStyle = '#ffaa00'; ctx.lineWidth = 3;
  ctx.fillStyle = '#ffaa00';
  // Tête
  ctx.beginPath(); ctx.arc(0, -h*0.6, h*0.18, 0, Math.PI*2); ctx.fill();
  // Corps
  ctx.beginPath();
  ctx.moveTo(0, -h*0.42); ctx.lineTo(0, h*0.1);
  ctx.moveTo(0, -h*0.2); ctx.lineTo(-h*0.25, h*0.05);
  ctx.moveTo(0, -h*0.2); ctx.lineTo( h*0.25, h*0.05);
  ctx.moveTo(0,  h*0.1); ctx.lineTo(-h*0.2,  h*0.55);
  ctx.moveTo(0,  h*0.1); ctx.lineTo( h*0.2,  h*0.55);
  ctx.stroke();

  ctx.fillStyle = '#fff'; ctx.font = `bold ${h*0.28}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 4;
  ctx.fillText(label, h*0.55, -h*0.6); ctx.shadowBlur = 0;
  ctx.restore();
}

function drawTram(ctx: CanvasRenderingContext2D, cx: number, cy: number, W: number, H: number, color: string, label: string, angle: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  const w = W * 2.2, h = H * 1.1;

  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 12;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.roundRect(-w/2, -h/2, w, h, 8); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2; ctx.stroke();

  // Fenêtres
  ctx.fillStyle = 'rgba(150,200,255,0.5)';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath(); ctx.rect(i*w*0.16 - w*0.07, -h*0.38, w*0.12, h*0.38); ctx.fill();
  }

  // Rail
  ctx.strokeStyle = '#888'; ctx.lineWidth = 3; ctx.setLineDash([8,4]);
  ctx.beginPath(); ctx.moveTo(-w/2-20, 0); ctx.lineTo(w/2+20, 0); ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#fff'; ctx.font = `bold ${h*0.4}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 4;
  ctx.fillText(label, 0, 0); ctx.shadowBlur = 0;
  ctx.restore();
}

function drawVan(ctx: CanvasRenderingContext2D, cx: number, cy: number, W: number, H: number, color: string, label: string, angle: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  const w = W * 1.3, h = H * 1.1;

  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 10;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.roundRect(-w/2, -h/2, w, h, 6); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();

  // Toit haut et carré
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.roundRect(-w*0.45, -h/2 - h*0.6, w*0.9, h*0.65, 4); ctx.fill();

  ctx.fillStyle = '#fff'; ctx.font = `bold ${h*0.5}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 4;
  ctx.fillText(label, 0, 0); ctx.shadowBlur = 0;
  ctx.restore();
}

// ── Dispatcher de dessin ──────────────────────────────────────
export function drawVehicle(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  angle: number,
  vehicleData: VehicleScene,
  label: 'A' | 'B',
  impactColor: string = '#ef4444'
) {
  const VW = 70, VH = 34; // base dimensions
  const color = parseColor(vehicleData.color);
  const type = vehicleData.vehicleType || 'car';

  switch (type) {
    case 'suv':      drawSUV(ctx, cx, cy, VW, VH, color, label, angle); break;
    case 'truck':    drawTruck(ctx, cx, cy, VW, VH, color, label, angle); break;
    case 'van':      drawVan(ctx, cx, cy, VW, VH, color, label, angle); break;
    case 'motorcycle': drawMotorcycle(ctx, cx, cy, VW, VH, color, label, angle); break;
    case 'scooter':  drawScooter(ctx, cx, cy, VW, VH, color, label, angle); break;
    case 'moped':    drawScooter(ctx, cx, cy, VW*0.75, VH*0.75, color, label, angle); break;
    case 'bicycle':  drawBicycle(ctx, cx, cy, VW, VH, color, label, angle); break;
    case 'escooter': drawEscooter(ctx, cx, cy, VW, VH, color, label, angle); break;
    case 'pedestrian': drawPedestrian(ctx, cx, cy, VW, VH, color, label, angle); break;
    case 'tram':     drawTram(ctx, cx, cy, VW, VH, color, label, angle); break;
    case 'bus':      drawTruck(ctx, cx, cy, VW, VH, '#2255aa', label, angle); break;
    default:         drawCar(ctx, cx, cy, VW, VH, color, label, angle);
  }

  // Zone d'impact
  const impactOffsets: Record<string, [number, number]> = {
    front:       [ 42,   0], front_left:  [ 38, -20], front_right: [ 38,  20],
    rear:        [-42,   0], rear_left:   [-38, -20], rear_right:  [-38,  20],
    left:        [  0, -22], right:       [  0,  22],
  };

  const off = impactOffsets[vehicleData.impactZone];
  if (off) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillStyle = impactColor;
    ctx.shadowColor = impactColor; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(off[0], off[1], 7, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(off[0], off[1], 7, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

// ── Direction → angle de rotation ────────────────────────────
export function directionToAngle(dir: string, trafficSide: 'right' | 'left' = 'right'): number {
  // Les véhicules pointent leur "avant" vers leur direction de déplacement
  // Sur croquis: east = droite (0°), north = haut (-90°), west = gauche (180°), south = bas (90°)
  const base: Record<string, number> = {
    east: 0, west: Math.PI,
    north: -Math.PI / 2, south: Math.PI / 2,
    reversing_east: Math.PI, reversing_west: 0,
    reversing_north: Math.PI / 2, reversing_south: -Math.PI / 2,
    stopped: 0,
  };
  return base[dir] ?? 0;
}

// ── Dessin de la route ────────────────────────────────────────
export function drawRoadScene(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  scenario: string,
  trafficSide: 'right' | 'left'
) {
  const cx = W / 2, cy = H / 2;
  const ROAD = 'rgba(80,80,90,0.9)';
  const LINE = 'rgba(255,255,230,0.5)';
  const DASH_LINE = 'rgba(255,255,230,0.3)';
  const CURB = 'rgba(200,190,170,0.4)';
  const GRASS = 'rgba(40,70,40,0.15)';
  const LANE = 55;

  ctx.save();

  const drawStraightRoad = (horizontal: boolean, x1: number, y1: number, x2: number, y2: number) => {
    ctx.fillStyle = ROAD;
    if (horizontal) {
      ctx.fillRect(x1, cy - LANE, x2 - x1, LANE * 2);
      // Bandes latérales
      ctx.fillStyle = CURB;
      ctx.fillRect(x1, cy - LANE - 4, x2 - x1, 4);
      ctx.fillRect(x1, cy + LANE, x2 - x1, 4);
      // Lignes de bord
      ctx.strokeStyle = LINE; ctx.lineWidth = 2.5; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(x1, cy - LANE); ctx.lineTo(x2, cy - LANE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x1, cy + LANE); ctx.lineTo(x2, cy + LANE); ctx.stroke();
      // Ligne centrale
      ctx.strokeStyle = DASH_LINE; ctx.lineWidth = 2; ctx.setLineDash([16, 12]);
      ctx.beginPath(); ctx.moveTo(x1, cy); ctx.lineTo(x2, cy); ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.fillRect(cx - LANE, y1, LANE * 2, y2 - y1);
      ctx.fillStyle = CURB;
      ctx.fillRect(cx - LANE - 4, y1, 4, y2 - y1);
      ctx.fillRect(cx + LANE, y1, 4, y2 - y1);
      ctx.strokeStyle = LINE; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(cx - LANE, y1); ctx.lineTo(cx - LANE, y2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + LANE, y1); ctx.lineTo(cx + LANE, y2); ctx.stroke();
      ctx.strokeStyle = DASH_LINE; ctx.lineWidth = 2; ctx.setLineDash([16, 12]);
      ctx.beginPath(); ctx.moveTo(cx, y1); ctx.lineTo(cx, y2); ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  switch (scenario) {
    case 'intersection_cross': {
      drawStraightRoad(true, 0, cy, W, cy);
      drawStraightRoad(false, 0, cy, W, H);
      // Masquer le centre (carrefour)
      ctx.fillStyle = ROAD;
      ctx.fillRect(cx - LANE, cy - LANE, LANE * 2, LANE * 2);
      // Lignes stop
      ctx.strokeStyle = 'rgba(255,255,200,0.6)'; ctx.lineWidth = 3; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(cx - LANE, cy - LANE); ctx.lineTo(cx + LANE, cy - LANE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - LANE, cy + LANE); ctx.lineTo(cx + LANE, cy + LANE); ctx.stroke();
      break;
    }
    case 'intersection_t': {
      drawStraightRoad(true, 0, cy, W, cy);
      // Route verticale seulement en bas
      ctx.fillStyle = ROAD;
      ctx.fillRect(cx - LANE, cy, LANE * 2, H - cy);
      ctx.strokeStyle = LINE; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(cx - LANE, cy); ctx.lineTo(cx - LANE, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + LANE, cy); ctx.lineTo(cx + LANE, H); ctx.stroke();
      break;
    }
    case 'roundabout': {
      const r = 95;
      // Routes d'accès
      ctx.fillStyle = ROAD;
      ctx.fillRect(0, cy - LANE, cx - r + 10, LANE * 2);
      ctx.fillRect(cx + r - 10, cy - LANE, W - cx - r + 10, LANE * 2);
      ctx.fillRect(cx - LANE, 0, LANE * 2, cy - r + 10);
      ctx.fillRect(cx - LANE, cy + r - 10, LANE * 2, H - cy - r + 10);
      // Rond-point
      ctx.fillStyle = ROAD;
      ctx.beginPath(); ctx.arc(cx, cy, r + LANE, 0, Math.PI * 2); ctx.fill();
      // Îlot central
      ctx.fillStyle = GRASS;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = CURB; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, r + LANE * 2, 0, Math.PI * 2);
      ctx.strokeStyle = LINE; ctx.lineWidth = 2; ctx.stroke();
      break;
    }
    case 'parking_forward':
    case 'parking_reverse':
    case 'parking': {
      // Route principale horizontale
      drawStraightRoad(true, 0, cy, W, cy);
      // Zone de parking en haut
      const parkY = cy - LANE - 80;
      ctx.fillStyle = 'rgba(60,60,75,0.7)';
      ctx.fillRect(0, 0, W, cy - LANE);
      // Lignes de places
      ctx.strokeStyle = 'rgba(200,190,150,0.5)'; ctx.lineWidth = 1.5;
      const nbPlaces = 6;
      for (let i = 0; i <= nbPlaces; i++) {
        const x = (W / nbPlaces) * i;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, cy - LANE); ctx.stroke();
      }
      // Ligne de trottoir
      ctx.strokeStyle = CURB; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(0, cy - LANE); ctx.lineTo(W, cy - LANE); ctx.stroke();
      break;
    }
    case 'straight_rear':
    case 'straight_head':
    case 'overtaking': {
      drawStraightRoad(true, 0, cy, W, cy);
      // Séparation physique pour overtaking
      if (scenario === 'overtaking') {
        ctx.strokeStyle = 'rgba(255,165,0,0.5)'; ctx.lineWidth = 3; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
      }
      break;
    }
    case 'lane_change': {
      drawStraightRoad(true, 0, cy, W, cy);
      // 3ème voie
      ctx.fillStyle = ROAD;
      ctx.fillRect(0, cy - LANE * 3, W, LANE);
      ctx.strokeStyle = LINE; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, cy - LANE * 3); ctx.lineTo(W, cy - LANE * 3); ctx.stroke();
      ctx.strokeStyle = DASH_LINE; ctx.lineWidth = 1.5; ctx.setLineDash([12, 10]);
      ctx.beginPath(); ctx.moveTo(0, cy - LANE * 2); ctx.lineTo(W, cy - LANE * 2); ctx.stroke();
      ctx.setLineDash([]);
      break;
    }
    default: {
      drawStraightRoad(true, 0, cy, W, cy);
    }
  }

  ctx.restore();
}

// ── Flèche de trajectoire ─────────────────────────────────────
export function drawTrajectoryArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number, fromY: number,
  toX: number, toY: number,
  color: string,
  dashed: boolean = false,
  isReversing: boolean = false
) {
  const len = Math.sqrt((toX-fromX)**2 + (toY-fromY)**2);
  if (len < 10) return;
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const headLen = 16;

  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = 0.85;
  if (dashed) ctx.setLineDash([10, 8]);
  else ctx.setLineDash([]);

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX - Math.cos(angle) * headLen, toY - Math.sin(angle) * headLen);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // Flèche (inversée si marche arrière)
  const arrowTip = isReversing ? { x: fromX, y: fromY } : { x: toX, y: toY };
  const arrowAngle = isReversing ? angle + Math.PI : angle;
  ctx.beginPath();
  ctx.moveTo(arrowTip.x, arrowTip.y);
  ctx.lineTo(arrowTip.x - headLen * Math.cos(arrowAngle - 0.4), arrowTip.y - headLen * Math.sin(arrowAngle - 0.4));
  ctx.lineTo(arrowTip.x - headLen * Math.cos(arrowAngle + 0.4), arrowTip.y - headLen * Math.sin(arrowAngle + 0.4));
  ctx.closePath(); ctx.fill();

  ctx.restore();
}

// ── Calcul des positions selon le scénario ────────────────────
export function calcVehiclePositions(
  analysis: SceneAnalysis,
  W: number, H: number
): {
  posA: { x: number; y: number; angle: number };
  posB: { x: number; y: number; angle: number };
  impactX: number; impactY: number;
} {
  const cx = W / 2, cy = H / 2;
  const L = 55; // Lane width
  const side = analysis.trafficSide === 'left' ? -1 : 1; // +1 = right-hand traffic

  switch (analysis.scenario) {
    case 'parking_forward':
    case 'parking_reverse':
    case 'parking': {
      // A sort du parking (en haut), B roule sur la route
      // En trafic à droite: B vient de gauche (direction est), circule sur voie du bas
      const posA = { x: cx - 80, y: cy - L * 1.5, angle: Math.PI / 2 }; // A sort vers le bas
      const posB = { x: cx + 90, y: cy - L * 0.4 * side, angle: Math.PI }; // B vient de droite
      if (analysis.vehicleA.isReversing) posA.angle = -Math.PI / 2; // A recule
      return {
        posA, posB,
        impactX: cx - 10, impactY: cy - L * 0.6,
      };
    }
    case 'intersection_cross':
    case 'intersection_t': {
      const dirPos: Record<string, { x: number; y: number; angle: number }> = {
        east:  { x: cx - 130, y: cy - L * 0.4 * side, angle: 0         },
        west:  { x: cx + 130, y: cy + L * 0.4 * side, angle: Math.PI   },
        north: { x: cx + L * 0.4 * side, y: cy + 130, angle: -Math.PI/2 },
        south: { x: cx - L * 0.4 * side, y: cy - 130, angle:  Math.PI/2 },
        stopped: { x: cx, y: cy, angle: 0 },
      };
      const posA = dirPos[analysis.vehicleA.direction] || dirPos.east;
      const posB = dirPos[analysis.vehicleB.direction] || dirPos.north;
      return { posA, posB, impactX: cx, impactY: cy };
    }
    case 'roundabout': {
      return {
        posA: { x: cx - 140, y: cy - L * 0.4 * side, angle: 0 },
        posB: { x: cx + L * 0.4 * side, y: cy - 120, angle: Math.PI / 2 },
        impactX: cx - 60, impactY: cy - 60,
      };
    }
    case 'straight_rear': {
      return {
        posA: { x: cx - 100, y: cy - L * 0.4 * side, angle: 0 },
        posB: { x: cx + 80,  y: cy - L * 0.4 * side, angle: 0 },
        impactX: cx, impactY: cy - L * 0.4 * side,
      };
    }
    case 'straight_head': {
      return {
        posA: { x: cx - 120, y: cy - L * 0.4 * side, angle: 0 },
        posB: { x: cx + 120, y: cy + L * 0.4 * side, angle: Math.PI },
        impactX: cx, impactY: cy,
      };
    }
    case 'overtaking': {
      return {
        posA: { x: cx - 60,  y: cy - L * 1.4 * side, angle: 0 },
        posB: { x: cx + 100, y: cy - L * 0.4 * side, angle: 0 },
        impactX: cx + 20, impactY: cy - L * side,
      };
    }
    default: {
      return {
        posA: { x: cx - 120, y: cy - L * 0.4 * side, angle: 0 },
        posB: { x: cx + 100, y: cy + L * 0.4 * side, angle: Math.PI },
        impactX: cx, impactY: cy,
      };
    }
  }
}

// ── Fonction principale ───────────────────────────────────────
export function renderAccidentSketch(
  canvas: HTMLCanvasElement,
  analysis: SceneAnalysis,
  vehicleAColor?: string,
  vehicleBColor?: string,
  vehicleAType?: string,
  vehicleBType?: string,
) {
  const ctx = canvas.getContext('2d')!;
  const W = canvas.width, H = canvas.height;

  // Enrichir avec données OCR
  const enrichedA: VehicleScene = {
    ...analysis.vehicleA,
    color: vehicleAColor || analysis.vehicleA.color,
    vehicleType: vehicleAType || analysis.vehicleA.vehicleType || 'car',
  };
  const enrichedB: VehicleScene = {
    ...analysis.vehicleB,
    color: vehicleBColor || analysis.vehicleB.color,
    vehicleType: vehicleBType || analysis.vehicleB.vehicleType || 'car',
  };

  // 1. Fond
  ctx.fillStyle = '#12121f';
  ctx.fillRect(0, 0, W, H);

  // 2. Route
  const trafficSide = analysis.trafficSide || 'right';
  drawRoadScene(ctx, W, H, analysis.scenario, trafficSide);

  // 3. Positions
  const { posA, posB, impactX, impactY } = calcVehiclePositions(analysis, W, H);

  // 4. Trajectoires (tirets avant les véhicules)
  const trajLen = 90;
  if (enrichedA.wasMoving) {
    const fromX = posA.x - Math.cos(posA.angle) * trajLen;
    const fromY = posA.y - Math.sin(posA.angle) * trajLen;
    drawTrajectoryArrow(ctx, fromX, fromY, posA.x, posA.y, '#4488ff', false, enrichedA.isReversing);
  }
  if (enrichedB.wasMoving) {
    const fromX = posB.x - Math.cos(posB.angle) * trajLen;
    const fromY = posB.y - Math.sin(posB.angle) * trajLen;
    drawTrajectoryArrow(ctx, fromX, fromY, posB.x, posB.y, '#ff8833', false, enrichedB.isReversing);
  }

  // 5. Véhicules
  drawVehicle(ctx, posA.x, posA.y, posA.angle, enrichedA, 'A', '#ef4444');
  drawVehicle(ctx, posB.x, posB.y, posB.angle, enrichedB, 'B', '#ef4444');

  // 6. Point d'impact
  ctx.save();
  ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 25;
  ctx.fillStyle = '#ef4444';
  ctx.beginPath(); ctx.arc(impactX, impactY, 11, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(impactX - 7, impactY - 7); ctx.lineTo(impactX + 7, impactY + 7);
  ctx.moveTo(impactX + 7, impactY - 7); ctx.lineTo(impactX - 7, impactY + 7);
  ctx.stroke();
  ctx.restore();

  // 7. Label IMPACT
  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '1px';
  ctx.fillText('IMPACT', impactX, impactY + 22);

  // 8. Légende
  ctx.fillStyle = 'rgba(255,255,230,0.2)';
  ctx.font = '9px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('● Zone impact  → Trajectoire', 10, H - 10);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,230,0.15)';
  ctx.fillText(`IA BOOM.CONTACT · ${trafficSide === 'left' ? 'Left-hand traffic' : 'Circulation à droite'}`, W - 10, H - 10);
}
