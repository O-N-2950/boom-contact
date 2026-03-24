/**
 * boom.contact — Silhouettes vectorielles véhicules vue de dessus — Niveau 2
 * Chaque carrosserie a sa propre silhouette distincte
 */
import type { BodyStyle } from './vehicleMapper';

export type VehicleShape =
  | 'car'         // hatchback générique
  | 'sedan'       // berline 3-box
  | 'estate'      // break / familiale
  | 'coupe'       // coupé 2 portes
  | 'convertible' // cabriolet
  | 'suv_small'   // SUV compact
  | 'suv_large'   // Grand SUV
  | 'mpv'         // Monospace / minivan
  | 'pickup'      // Pick-up (cab + benne)
  | 'motorcycle'  // Moto roadster / naked
  | 'moto_sport'  // Moto sportive (full carénage)
  | 'moto_touring'// Moto touring (demi-carénage + sacoches)
  | 'scooter'     // Scooter
  | 'escooter'    // Trottinette électrique
  | 'bicycle'
  | 'van_small'   // Utilitaire léger
  | 'van'         // Fourgon moyen
  | 'truck'       // Camion / grand fourgon
  | 'bus'
  | 'tram'
  | 'train'
  | 'pedestrian'
  | 'quad'
  | 'other';

export function bodyStyleToShape(bs?: BodyStyle): VehicleShape {
  if (!bs) return 'car';
  switch (bs) {
    case 'hatchback_3': case 'hatchback_5': return 'car';
    case 'sedan':       return 'sedan';
    case 'estate':      return 'estate';
    case 'coupe':       return 'coupe';
    case 'convertible': return 'convertible';
    case 'suv_small':   return 'suv_small';
    case 'suv_medium':  return 'suv_small';
    case 'suv_large':   return 'suv_large';
    case 'mpv': case 'minivan': return 'mpv';
    case 'pickup':      return 'pickup';
    case 'van_small':   return 'van_small';
    case 'van_medium':  return 'van';
    case 'van_large':   return 'truck';
    case 'moto_naked':  return 'motorcycle';
    case 'moto_sport':  return 'moto_sport';
    case 'moto_touring':return 'moto_touring';
    case 'scooter':     return 'scooter';
    case 'bicycle':     return 'bicycle';
    case 'escooter':    return 'escooter';
    case 'truck_rigid': return 'truck';
    case 'truck_semi':  return 'truck';
    case 'bus':         return 'bus';
    case 'tram': case 'train': return 'tram';
    case 'pedestrian':  return 'pedestrian';
    default:            return 'car';
  }
}

export interface DamageZone {
  id: string;
  label: string;
  type: 'rect' | 'polygon' | 'ellipse' | 'circle';
  x?: number; y?: number; w?: number; h?: number;
  points?: string;
  cx?: number; cy?: number; rx?: number; ry?: number; r?: number;
}

// ── ZONES COMMUNES VOITURE (hatchback)
export const CAR_ZONES: DamageZone[] = [
  { id: 'front',       label: 'Avant',         type: 'rect',    x: 88,  y: 8,   w: 104, h: 36 },
  { id: 'front-left',  label: 'Av. Gauche',    type: 'rect',    x: 38,  y: 14,  w: 54,  h: 44 },
  { id: 'front-right', label: 'Av. Droit',     type: 'rect',    x: 188, y: 14,  w: 54,  h: 44 },
  { id: 'hood',        label: 'Capot',         type: 'rect',    x: 84,  y: 44,  w: 112, h: 44 },
  { id: 'windshield',  label: 'Pare-brise',    type: 'rect',    x: 88,  y: 90,  w: 104, h: 30 },
  { id: 'mirror-l',   label: 'Rétro Gauche',  type: 'rect',    x: 50,  y: 94,  w: 36,  h: 24 },
  { id: 'mirror-r',   label: 'Rétro Droit',   type: 'rect',    x: 194, y: 94,  w: 36,  h: 24 },
  { id: 'door-fl',    label: 'Porte Av.G',    type: 'rect',    x: 32,  y: 122, w: 52,  h: 52 },
  { id: 'door-fr',    label: 'Porte Av.D',    type: 'rect',    x: 196, y: 122, w: 52,  h: 52 },
  { id: 'roof',        label: 'Toit',          type: 'rect',    x: 84,  y: 122, w: 112, h: 96 },
  { id: 'door-rl',    label: 'Porte Ar.G',    type: 'rect',    x: 32,  y: 178, w: 52,  h: 48 },
  { id: 'door-rr',    label: 'Porte Ar.D',    type: 'rect',    x: 196, y: 178, w: 52,  h: 48 },
  { id: 'rear-window',label: 'Lunette Ar.',   type: 'rect',    x: 88,  y: 220, w: 104, h: 28 },
  { id: 'trunk',       label: 'Coffre',        type: 'rect',    x: 84,  y: 248, w: 112, h: 44 },
  { id: 'rear',        label: 'Arrière',       type: 'rect',    x: 88,  y: 290, w: 104, h: 36 },
  { id: 'rear-left',  label: 'Ar. Gauche',    type: 'rect',    x: 38,  y: 280, w: 54,  h: 44 },
  { id: 'rear-right', label: 'Ar. Droit',     type: 'rect',    x: 188, y: 280, w: 54,  h: 44 },
  { id: 'wheel-fl',   label: 'Roue Av.G',     type: 'ellipse', cx: 48,  cy: 138, rx: 18, ry: 26 },
  { id: 'wheel-fr',   label: 'Roue Av.D',     type: 'ellipse', cx: 232, cy: 138, rx: 18, ry: 26 },
  { id: 'wheel-rl',   label: 'Roue Ar.G',     type: 'ellipse', cx: 48,  cy: 210, rx: 18, ry: 26 },
  { id: 'wheel-rr',   label: 'Roue Ar.D',     type: 'ellipse', cx: 232, cy: 210, rx: 18, ry: 26 },
];

// Zones berline = zones voiture (même structure)
export const SEDAN_ZONES: DamageZone[] = CAR_ZONES;

// Zones break = zones voiture (même structure)
export const ESTATE_ZONES: DamageZone[] = CAR_ZONES;

// Zones coupé
export const COUPE_ZONES: DamageZone[] = [
  { id: 'front',      label: 'Avant',       type: 'rect',    x: 86,  y: 8,   w: 108, h: 36 },
  { id: 'front-left', label: 'Av. Gauche',  type: 'rect',    x: 36,  y: 14,  w: 54,  h: 44 },
  { id: 'front-right',label: 'Av. Droit',   type: 'rect',    x: 190, y: 14,  w: 54,  h: 44 },
  { id: 'hood',       label: 'Capot',       type: 'rect',    x: 82,  y: 44,  w: 116, h: 50 },
  { id: 'windshield', label: 'Pare-brise',  type: 'rect',    x: 86,  y: 92,  w: 108, h: 28 },
  { id: 'roof',       label: 'Toit',        type: 'rect',    x: 84,  y: 120, w: 112, h: 80 },
  { id: 'door-fl',   label: 'Porte G',     type: 'rect',    x: 32,  y: 118, w: 54,  h: 84 },
  { id: 'door-fr',   label: 'Porte D',     type: 'rect',    x: 194, y: 118, w: 54,  h: 84 },
  { id: 'rear-window',label: 'Lunette Ar.', type: 'rect',    x: 88,  y: 202, w: 104, h: 26 },
  { id: 'trunk',      label: 'Coffre',      type: 'rect',    x: 84,  y: 228, w: 112, h: 44 },
  { id: 'rear',       label: 'Arrière',     type: 'rect',    x: 86,  y: 270, w: 108, h: 36 },
  { id: 'rear-left',  label: 'Ar. Gauche',  type: 'rect',    x: 36,  y: 260, w: 54,  h: 44 },
  { id: 'rear-right', label: 'Ar. Droit',   type: 'rect',    x: 190, y: 260, w: 54,  h: 44 },
  { id: 'wheel-fl',   label: 'Roue Av.G',   type: 'ellipse', cx: 46,  cy: 136, rx: 20, ry: 28 },
  { id: 'wheel-fr',   label: 'Roue Av.D',   type: 'ellipse', cx: 234, cy: 136, rx: 20, ry: 28 },
  { id: 'wheel-rl',   label: 'Roue Ar.G',   type: 'ellipse', cx: 46,  cy: 206, rx: 20, ry: 28 },
  { id: 'wheel-rr',   label: 'Roue Ar.D',   type: 'ellipse', cx: 234, cy: 206, rx: 20, ry: 28 },
];

// Zones SUV
export const SUV_ZONES: DamageZone[] = [
  { id: 'front',      label: 'Avant',         type: 'rect',    x: 82,  y: 8,   w: 116, h: 38 },
  { id: 'front-left', label: 'Av. Gauche',    type: 'rect',    x: 26,  y: 12,  w: 60,  h: 50 },
  { id: 'front-right',label: 'Av. Droit',     type: 'rect',    x: 194, y: 12,  w: 60,  h: 50 },
  { id: 'hood',       label: 'Capot',         type: 'rect',    x: 78,  y: 46,  w: 124, h: 46 },
  { id: 'windshield', label: 'Pare-brise',    type: 'rect',    x: 82,  y: 90,  w: 116, h: 30 },
  { id: 'door-fl',   label: 'Porte Av.G',    type: 'rect',    x: 22,  y: 124, w: 58,  h: 54 },
  { id: 'door-fr',   label: 'Porte Av.D',    type: 'rect',    x: 200, y: 124, w: 58,  h: 54 },
  { id: 'roof',       label: 'Toit',          type: 'rect',    x: 78,  y: 124, w: 124, h: 96 },
  { id: 'door-rl',   label: 'Porte Ar.G',    type: 'rect',    x: 22,  y: 180, w: 58,  h: 52 },
  { id: 'door-rr',   label: 'Porte Ar.D',    type: 'rect',    x: 200, y: 180, w: 58,  h: 52 },
  { id: 'rear-window',label: 'Lunette Ar.',   type: 'rect',    x: 82,  y: 224, w: 116, h: 28 },
  { id: 'rear',       label: 'Arrière',       type: 'rect',    x: 82,  y: 256, w: 116, h: 38 },
  { id: 'rear-left',  label: 'Ar. Gauche',    type: 'rect',    x: 26,  y: 246, w: 60,  h: 50 },
  { id: 'rear-right', label: 'Ar. Droit',     type: 'rect',    x: 194, y: 246, w: 60,  h: 50 },
  { id: 'wheel-fl',   label: 'Roue Av.G',     type: 'ellipse', cx: 42,  cy: 144, rx: 22, ry: 30 },
  { id: 'wheel-fr',   label: 'Roue Av.D',     type: 'ellipse', cx: 238, cy: 144, rx: 22, ry: 30 },
  { id: 'wheel-rl',   label: 'Roue Ar.G',     type: 'ellipse', cx: 42,  cy: 218, rx: 22, ry: 30 },
  { id: 'wheel-rr',   label: 'Roue Ar.D',     type: 'ellipse', cx: 238, cy: 218, rx: 22, ry: 30 },
];

// Zones MPV / Monospace
export const MPV_ZONES: DamageZone[] = [
  { id: 'front',      label: 'Avant',         type: 'rect',    x: 80,  y: 8,   w: 120, h: 34 },
  { id: 'front-left', label: 'Av. Gauche',    type: 'rect',    x: 24,  y: 10,  w: 60,  h: 48 },
  { id: 'front-right',label: 'Av. Droit',     type: 'rect',    x: 196, y: 10,  w: 60,  h: 48 },
  { id: 'hood',       label: 'Capot',         type: 'rect',    x: 76,  y: 42,  w: 128, h: 36 },
  { id: 'windshield', label: 'Pare-brise',    type: 'rect',    x: 80,  y: 78,  w: 120, h: 32 },
  { id: 'door-fl',   label: 'Porte Av.G',    type: 'rect',    x: 18,  y: 114, w: 60,  h: 54 },
  { id: 'door-fr',   label: 'Porte Av.D',    type: 'rect',    x: 202, y: 114, w: 60,  h: 54 },
  { id: 'roof',       label: 'Toit',          type: 'rect',    x: 74,  y: 112, w: 132, h: 116 },
  { id: 'door-ml',   label: 'Porte Mid.G',   type: 'rect',    x: 18,  y: 170, w: 60,  h: 50 },
  { id: 'door-mr',   label: 'Porte Mid.D',   type: 'rect',    x: 202, y: 170, w: 60,  h: 50 },
  { id: 'door-rl',   label: 'Porte Ar.G',    type: 'rect',    x: 18,  y: 222, w: 60,  h: 46 },
  { id: 'door-rr',   label: 'Porte Ar.D',    type: 'rect',    x: 202, y: 222, w: 60,  h: 46 },
  { id: 'rear-window',label: 'Lunette Ar.',   type: 'rect',    x: 80,  y: 232, w: 120, h: 28 },
  { id: 'rear',       label: 'Arrière',       type: 'rect',    x: 80,  y: 260, w: 120, h: 36 },
  { id: 'rear-left',  label: 'Ar. Gauche',    type: 'rect',    x: 24,  y: 252, w: 60,  h: 46 },
  { id: 'rear-right', label: 'Ar. Droit',     type: 'rect',    x: 196, y: 252, w: 60,  h: 46 },
  { id: 'wheel-fl',   label: 'Roue Av.G',     type: 'ellipse', cx: 38,  cy: 140, rx: 18, ry: 26 },
  { id: 'wheel-fr',   label: 'Roue Av.D',     type: 'ellipse', cx: 242, cy: 140, rx: 18, ry: 26 },
  { id: 'wheel-rl',   label: 'Roue Ar.G',     type: 'ellipse', cx: 38,  cy: 234, rx: 18, ry: 26 },
  { id: 'wheel-rr',   label: 'Roue Ar.D',     type: 'ellipse', cx: 242, cy: 234, rx: 18, ry: 26 },
];

// Zones Pickup
export const PICKUP_ZONES: DamageZone[] = [
  { id: 'front',      label: 'Avant',         type: 'rect',    x: 80,  y: 8,   w: 120, h: 36 },
  { id: 'front-left', label: 'Av. Gauche',    type: 'rect',    x: 26,  y: 12,  w: 58,  h: 48 },
  { id: 'front-right',label: 'Av. Droit',     type: 'rect',    x: 196, y: 12,  w: 58,  h: 48 },
  { id: 'hood',       label: 'Capot',         type: 'rect',    x: 76,  y: 44,  w: 128, h: 44 },
  { id: 'windshield', label: 'Pare-brise',    type: 'rect',    x: 80,  y: 86,  w: 120, h: 28 },
  { id: 'door-fl',   label: 'Porte Av.G',    type: 'rect',    x: 22,  y: 118, w: 58,  h: 54 },
  { id: 'door-fr',   label: 'Porte Av.D',    type: 'rect',    x: 200, y: 118, w: 58,  h: 54 },
  { id: 'cab-roof',   label: 'Toit Cabine',   type: 'rect',    x: 76,  y: 116, w: 128, h: 60 },
  { id: 'bed-left',   label: 'Flanc G. Benne',type: 'rect',    x: 22,  y: 178, w: 40,  h: 108 },
  { id: 'bed-right',  label: 'Flanc D. Benne',type: 'rect',    x: 218, y: 178, w: 40,  h: 108 },
  { id: 'bed-floor',  label: 'Benne',         type: 'rect',    x: 62,  y: 178, w: 156, h: 108 },
  { id: 'tailgate',   label: 'Hayon Benne',   type: 'rect',    x: 62,  y: 284, w: 156, h: 28 },
  { id: 'rear',       label: 'Arrière',       type: 'rect',    x: 80,  y: 312, w: 120, h: 34 },
  { id: 'rear-left',  label: 'Ar. Gauche',    type: 'rect',    x: 26,  y: 302, w: 58,  h: 46 },
  { id: 'rear-right', label: 'Ar. Droit',     type: 'rect',    x: 196, y: 302, w: 58,  h: 46 },
  { id: 'wheel-fl',   label: 'Roue Av.G',     type: 'ellipse', cx: 40,  cy: 136, rx: 20, ry: 28 },
  { id: 'wheel-fr',   label: 'Roue Av.D',     type: 'ellipse', cx: 240, cy: 136, rx: 20, ry: 28 },
  { id: 'wheel-rl',   label: 'Roue Ar.G',     type: 'ellipse', cx: 34,  cy: 252, rx: 22, ry: 32 },
  { id: 'wheel-rr',   label: 'Roue Ar.D',     type: 'ellipse', cx: 246, cy: 252, rx: 22, ry: 32 },
];

// Zones Van Small
export const VAN_SMALL_ZONES: DamageZone[] = [
  { id: 'front',      label: 'Avant',         type: 'rect',    x: 78,  y: 8,   w: 124, h: 36 },
  { id: 'front-left', label: 'Av. Gauche',    type: 'rect',    x: 22,  y: 12,  w: 60,  h: 46 },
  { id: 'front-right',label: 'Av. Droit',     type: 'rect',    x: 198, y: 12,  w: 60,  h: 46 },
  { id: 'windshield', label: 'Pare-brise',    type: 'rect',    x: 78,  y: 44,  w: 124, h: 36 },
  { id: 'cab-roof',   label: 'Toit cabine',   type: 'rect',    x: 74,  y: 80,  w: 132, h: 48 },
  { id: 'door-fl',   label: 'Porte G',       type: 'rect',    x: 22,  y: 52,  w: 58,  h: 80 },
  { id: 'door-fr',   label: 'Porte D',       type: 'rect',    x: 200, y: 52,  w: 58,  h: 80 },
  { id: 'cargo-left', label: 'Flanc G',       type: 'rect',    x: 14,  y: 130, w: 46,  h: 148 },
  { id: 'cargo-right',label: 'Flanc D',       type: 'rect',    x: 220, y: 130, w: 46,  h: 148 },
  { id: 'cargo-roof', label: 'Toit caisse',   type: 'rect',    x: 60,  y: 130, w: 160, h: 148 },
  { id: 'rear-doors', label: 'Portes Ar.',    type: 'rect',    x: 60,  y: 278, w: 160, h: 36 },
  { id: 'rear',       label: 'Arrière',       type: 'rect',    x: 78,  y: 308, w: 124, h: 34 },
  { id: 'wheel-fl',   label: 'Roue Av.G',     type: 'ellipse', cx: 38,  cy: 108, rx: 16, ry: 24 },
  { id: 'wheel-fr',   label: 'Roue Av.D',     type: 'ellipse', cx: 242, cy: 108, rx: 16, ry: 24 },
  { id: 'wheel-rl',   label: 'Roue Ar.G',     type: 'ellipse', cx: 30,  cy: 238, rx: 16, ry: 22 },
  { id: 'wheel-rr',   label: 'Roue Ar.D',     type: 'ellipse', cx: 250, cy: 238, rx: 16, ry: 22 },
];

// ── Existantes
export const MOTO_ZONES: DamageZone[] = [
  { id: 'front-wheel',   label: 'Roue avant',       type: 'ellipse', cx: 140, cy: 52,  rx: 22, ry: 38 },
  { id: 'handlebar-l',   label: 'Guidon Gauche',    type: 'rect',    x: 58,  y: 100, w: 68,  h: 22 },
  { id: 'handlebar-r',   label: 'Guidon Droit',     type: 'rect',    x: 154, y: 100, w: 68,  h: 22 },
  { id: 'fairing',       label: 'Carénage avant',   type: 'rect',    x: 110, y: 94,  w: 60,  h: 40 },
  { id: 'tank',          label: 'Réservoir',        type: 'rect',    x: 108, y: 136, w: 64,  h: 56 },
  { id: 'fairing-l',     label: 'Flanc Gauche',     type: 'rect',    x: 72,  y: 140, w: 40,  h: 80 },
  { id: 'fairing-r',     label: 'Flanc Droit',      type: 'rect',    x: 168, y: 140, w: 40,  h: 80 },
  { id: 'seat',          label: 'Selle',            type: 'rect',    x: 104, y: 192, w: 72,  h: 48 },
  { id: 'exhaust-l',     label: 'Échappement G',    type: 'rect',    x: 68,  y: 230, w: 36,  h: 60 },
  { id: 'exhaust-r',     label: 'Échappement D',    type: 'rect',    x: 176, y: 230, w: 36,  h: 60 },
  { id: 'rear-wheel',    label: 'Roue arrière',     type: 'ellipse', cx: 140, cy: 322, rx: 22, ry: 38 },
];

export const SCOOTER_ZONES: DamageZone[] = [
  { id: 'front-wheel',   label: 'Roue avant',       type: 'ellipse', cx: 140, cy: 50,  rx: 18, ry: 30 },
  { id: 'handlebar-l',   label: 'Guidon Gauche',    type: 'rect',    x: 62,  y: 86,  w: 64,  h: 20 },
  { id: 'handlebar-r',   label: 'Guidon Droit',     type: 'rect',    x: 154, y: 86,  w: 64,  h: 20 },
  { id: 'front-panel',   label: 'Tablier avant',    type: 'rect',    x: 104, y: 86,  w: 72,  h: 56 },
  { id: 'footboard',     label: 'Plancher',         type: 'rect',    x: 100, y: 150, w: 80,  h: 100 },
  { id: 'seat',          label: 'Selle',            type: 'rect',    x: 106, y: 250, w: 68,  h: 50 },
  { id: 'rear-wheel',    label: 'Roue arrière',     type: 'ellipse', cx: 140, cy: 356, rx: 18, ry: 30 },
];

export const BICYCLE_ZONES: DamageZone[] = [
  { id: 'front-wheel',   label: 'Roue avant',       type: 'ellipse', cx: 140, cy: 54,  rx: 20, ry: 40 },
  { id: 'handlebar-l',   label: 'Guidon Gauche',    type: 'rect',    x: 62,  y: 96,  w: 70,  h: 18 },
  { id: 'handlebar-r',   label: 'Guidon Droit',     type: 'rect',    x: 148, y: 96,  w: 70,  h: 18 },
  { id: 'frame-top',     label: 'Cadre haut',       type: 'rect',    x: 120, y: 146, w: 40,  h: 90 },
  { id: 'saddle',        label: 'Selle',            type: 'rect',    x: 118, y: 238, w: 44,  h: 28 },
  { id: 'rear-wheel',    label: 'Roue arrière',     type: 'ellipse', cx: 140, cy: 316, rx: 20, ry: 40 },
];

export const TRUCK_ZONES: DamageZone[] = [
  { id: 'cab-front',     label: 'Pare-choc avant',  type: 'rect',    x: 72,  y: 8,   w: 136, h: 32 },
  { id: 'cab-left',      label: 'Cabine Gauche',    type: 'rect',    x: 30,  y: 36,  w: 46,  h: 80 },
  { id: 'cab-right',     label: 'Cabine Droite',    type: 'rect',    x: 204, y: 36,  w: 46,  h: 80 },
  { id: 'windshield',    label: 'Pare-brise',       type: 'rect',    x: 78,  y: 36,  w: 124, h: 36 },
  { id: 'cab-roof',      label: 'Toit Cabine',      type: 'rect',    x: 78,  y: 74,  w: 124, h: 44 },
  { id: 'coupling',      label: 'Attelage',         type: 'rect',    x: 92,  y: 118, w: 96,  h: 28 },
  { id: 'cargo-left',    label: 'Flanc Gauche',     type: 'rect',    x: 26,  y: 148, w: 42,  h: 176 },
  { id: 'cargo-right',   label: 'Flanc Droit',      type: 'rect',    x: 212, y: 148, w: 42,  h: 176 },
  { id: 'cargo-roof',    label: 'Toit Caisse',      type: 'rect',    x: 68,  y: 148, w: 144, h: 176 },
  { id: 'cargo-rear',    label: 'Hayon / Arrière',  type: 'rect',    x: 68,  y: 326, w: 144, h: 40 },
  { id: 'wheel-fl',      label: 'Roue Av.G',        type: 'ellipse', cx: 46,  cy: 80,  rx: 14, ry: 26 },
  { id: 'wheel-fr',      label: 'Roue Av.D',        type: 'ellipse', cx: 234, cy: 80,  rx: 14, ry: 26 },
  { id: 'wheel-rl',      label: 'Essieu Ar.G',      type: 'rect',    x: 14,  y: 258, w: 26,  h: 60 },
  { id: 'wheel-rr',      label: 'Essieu Ar.D',      type: 'rect',    x: 240, y: 258, w: 26,  h: 60 },
];

export const BUS_ZONES: DamageZone[] = [
  { id: 'front',         label: 'Face avant',       type: 'rect',    x: 68,  y: 8,   w: 144, h: 36 },
  { id: 'front-left',    label: 'Av. Gauche',       type: 'rect',    x: 24,  y: 14,  w: 48,  h: 52 },
  { id: 'front-right',   label: 'Av. Droit',        type: 'rect',    x: 208, y: 14,  w: 48,  h: 52 },
  { id: 'windshield',    label: 'Pare-brise',       type: 'rect',    x: 74,  y: 44,  w: 132, h: 30 },
  { id: 'side-left',     label: 'Flanc Gauche',     type: 'rect',    x: 14,  y: 68,  w: 48,  h: 224 },
  { id: 'side-right',    label: 'Flanc Droit',      type: 'rect',    x: 218, y: 68,  w: 48,  h: 224 },
  { id: 'roof',          label: 'Toit',             type: 'rect',    x: 62,  y: 68,  w: 156, h: 224 },
  { id: 'door-front',    label: 'Porte avant',      type: 'rect',    x: 14,  y: 78,  w: 48,  h: 60 },
  { id: 'door-rear',     label: 'Porte arrière',    type: 'rect',    x: 14,  y: 188, w: 48,  h: 60 },
  { id: 'rear',          label: 'Face arrière',     type: 'rect',    x: 68,  y: 318, w: 144, h: 36 },
  { id: 'wheel-fl',      label: 'Roue Av.G',        type: 'ellipse', cx: 36,  cy: 100, rx: 14, ry: 22 },
  { id: 'wheel-fr',      label: 'Roue Av.D',        type: 'ellipse', cx: 244, cy: 100, rx: 14, ry: 22 },
  { id: 'wheel-rl',      label: 'Roue Ar.G',        type: 'ellipse', cx: 36,  cy: 268, rx: 14, ry: 22 },
  { id: 'wheel-rr',      label: 'Roue Ar.D',        type: 'ellipse', cx: 244, cy: 268, rx: 14, ry: 22 },
];

export const TRAM_ZONES: DamageZone[] = [
  { id: 'cab-front',     label: 'Cabine avant',     type: 'rect',    x: 72,  y: 6,   w: 136, h: 52 },
  { id: 'section1-left', label: 'Section 1 Gauche', type: 'rect',    x: 20,  y: 58,  w: 56,  h: 88 },
  { id: 'section1-right',label: 'Section 1 Droite', type: 'rect',    x: 204, y: 58,  w: 56,  h: 88 },
  { id: 'section1-roof', label: 'Toit Section 1',   type: 'rect',    x: 76,  y: 58,  w: 128, h: 88 },
  { id: 'joint',         label: 'Soufflet',         type: 'rect',    x: 60,  y: 148, w: 160, h: 28 },
  { id: 'section2-left', label: 'Section 2 Gauche', type: 'rect',    x: 20,  y: 178, w: 56,  h: 88 },
  { id: 'section2-right',label: 'Section 2 Droite', type: 'rect',    x: 204, y: 178, w: 56,  h: 88 },
  { id: 'section2-roof', label: 'Toit Section 2',   type: 'rect',    x: 76,  y: 178, w: 128, h: 88 },
  { id: 'cab-rear',      label: 'Cabine arrière',   type: 'rect',    x: 72,  y: 268, w: 136, h: 52 },
];

export const PEDESTRIAN_ZONES: DamageZone[] = [
  { id: 'head',          label: 'Tête',             type: 'circle',  cx: 140, cy: 52,  r: 36 },
  { id: 'shoulder-l',    label: 'Épaule Gauche',    type: 'circle',  cx: 80,  cy: 116, r: 28 },
  { id: 'shoulder-r',    label: 'Épaule Droite',    type: 'circle',  cx: 200, cy: 116, r: 28 },
  { id: 'chest',         label: 'Poitrine / Buste', type: 'rect',    x: 104, y: 100, w: 72,  h: 54 },
  { id: 'arm-l',         label: 'Bras Gauche',      type: 'rect',    x: 44,  y: 130, w: 42,  h: 90 },
  { id: 'arm-r',         label: 'Bras Droit',       type: 'rect',    x: 194, y: 130, w: 42,  h: 90 },
  { id: 'abdomen',       label: 'Abdomen',          type: 'rect',    x: 108, y: 154, w: 64,  h: 52 },
  { id: 'hip-l',         label: 'Hanche Gauche',    type: 'rect',    x: 86,  y: 206, w: 50,  h: 46 },
  { id: 'hip-r',         label: 'Hanche Droite',    type: 'rect',    x: 144, y: 206, w: 50,  h: 46 },
  { id: 'leg-l',         label: 'Jambe Gauche',     type: 'rect',    x: 92,  y: 252, w: 42,  h: 90 },
  { id: 'leg-r',         label: 'Jambe Droite',     type: 'rect',    x: 146, y: 252, w: 42,  h: 90 },
  { id: 'foot-l',        label: 'Pied Gauche',      type: 'rect',    x: 88,  y: 340, w: 46,  h: 32 },
  { id: 'foot-r',        label: 'Pied Droit',       type: 'rect',    x: 146, y: 340, w: 46,  h: 32 },
];

export function getZonesForType(type: VehicleShape): DamageZone[] {
  switch (type) {
    case 'car':          return CAR_ZONES;
    case 'sedan':        return SEDAN_ZONES;
    case 'estate':       return ESTATE_ZONES;
    case 'coupe':        return COUPE_ZONES;
    case 'convertible':  return COUPE_ZONES;
    case 'suv_small':    return SUV_ZONES;
    case 'suv_large':    return SUV_ZONES;
    case 'mpv':          return MPV_ZONES;
    case 'pickup':       return PICKUP_ZONES;
    case 'van_small':    return VAN_SMALL_ZONES;
    case 'van':          return [...TRUCK_ZONES];
    case 'truck':        return TRUCK_ZONES;
    case 'motorcycle':   return MOTO_ZONES;
    case 'moto_sport':   return MOTO_ZONES;
    case 'moto_touring': return MOTO_ZONES;
    case 'scooter':
    case 'escooter':     return SCOOTER_ZONES;
    case 'bicycle':      return BICYCLE_ZONES;
    case 'bus':          return BUS_ZONES;
    case 'tram':
    case 'train':        return TRAM_ZONES;
    case 'pedestrian':   return PEDESTRIAN_ZONES;
    default:             return CAR_ZONES;
  }
}

// ── SVG RENDERER ──────────────────────────────────────────────
interface SilhouetteProps {
  type: VehicleShape;
  color: string;
  bodyColor?: string;
  bodyColorDark?: string;
}

export function VehicleSilhouetteSVG({ type, color, bodyColor, bodyColorDark }: SilhouetteProps) {
  const body   = bodyColor     ?? '#1C1C32';
  const body2  = bodyColorDark ?? '#14142A';
  const glass  = 'rgba(100,160,255,0.18)';
  const wheel  = '#0a0a18';
  const stripe = 'rgba(240,237,232,0.07)';
  const line   = 'rgba(240,237,232,0.12)';

  // Wheel helper
  const Wheel = ({ cx, cy, rx = 18, ry = 26 }: { cx: number; cy: number; rx?: number; ry?: number }) => (
    <g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={wheel} stroke="rgba(240,237,232,0.18)" strokeWidth="1.5"/>
      <ellipse cx={cx} cy={cy} rx={rx * 0.52} ry={ry * 0.52} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8"/>
      {[0,72,144,216,288].map(a => (
        <circle key={a} cx={cx + Math.sin(a * Math.PI / 180) * rx * 0.32} cy={cy - Math.cos(a * Math.PI / 180) * ry * 0.35} r="1.2" fill="rgba(255,255,255,0.2)"/>
      ))}
    </g>
  );

  switch (type) {

    // ── HATCHBACK (générique)
    case 'car': return (
      <g>
        <ellipse cx="140" cy="200" rx="108" ry="210" fill="rgba(0,0,0,0.18)"/>
        <path d="M88,18 Q140,6 192,18 L216,44 L222,120 L222,230 L214,300 Q140,320 66,300 L58,230 L58,120 L64,44 Z"
          fill={body} stroke={color} strokeWidth="1.2" strokeOpacity="0.35"/>
        <path d="M90,42 Q140,32 190,42 L204,88 L76,88 Z" fill={body2} stroke={line} strokeWidth="0.8"/>
        <line x1="140" y1="36" x2="140" y2="88" stroke={stripe} strokeWidth="1.5"/>
        <path d="M90,88 L80,116 L200,116 L190,88 Z" fill={glass} stroke="rgba(100,160,255,0.3)" strokeWidth="1"/>
        <rect x="80" y="116" width="120" height="108" rx="4" fill={body2}/>
        <rect x="100" y="130" width="80" height="60" rx="6" fill="rgba(0,0,0,0.3)" stroke={stripe} strokeWidth="0.8"/>
        <path d="M80,224 L90,252 L190,252 L200,224 Z" fill={glass} stroke="rgba(100,160,255,0.3)" strokeWidth="1"/>
        <path d="M90,252 Q140,268 190,252 L200,292 Q140,310 80,292 Z" fill={body2} stroke={line} strokeWidth="0.8"/>
        <path d="M80,292 Q140,312 200,292 L204,308 Q140,326 76,308 Z" fill="#111122" stroke={line} strokeWidth="0.8"/>
        <rect x="80" y="294" width="26" height="12" rx="2" fill="rgba(255,60,60,0.5)"/>
        <rect x="174" y="294" width="26" height="12" rx="2" fill="rgba(255,60,60,0.5)"/>
        <rect x="82" y="30" width="24" height="10" rx="2" fill="rgba(255,240,180,0.5)"/>
        <rect x="174" y="30" width="24" height="10" rx="2" fill="rgba(255,240,180,0.5)"/>
        <path d="M64,106 L50,100 L50,122 L64,116 Z" fill={body} stroke={line} strokeWidth="0.8"/>
        <path d="M216,106 L230,100 L230,122 L216,116 Z" fill={body} stroke={line} strokeWidth="0.8"/>
        <line x1="66" y1="156" x2="80" y2="156" stroke={line} strokeWidth="1"/>
        <line x1="200" y1="156" x2="214" y2="156" stroke={line} strokeWidth="1"/>
        <Wheel cx={48} cy={138}/><Wheel cx={232} cy={138}/>
        <Wheel cx={48} cy={210}/><Wheel cx={232} cy={210}/>
      </g>
    );

    // ── BERLINE SEDAN (3-box) — plus longue, coffre marqué
    case 'sedan': return (
      <g>
        <ellipse cx="140" cy="200" rx="106" ry="210" fill="rgba(0,0,0,0.18)"/>
        {/* Carrosserie — body plus long, transitions 3-box */}
        <path d="M88,16 Q140,4 192,16 L214,40 L220,120 L220,250 L210,306 Q140,322 70,306 L60,250 L60,120 L66,40 Z"
          fill={body} stroke={color} strokeWidth="1.2" strokeOpacity="0.35"/>
        {/* Capot long */}
        <path d="M90,40 Q140,28 190,40 L202,94 L78,94 Z" fill={body2} stroke={line} strokeWidth="0.8"/>
        <line x1="140" y1="34" x2="140" y2="94" stroke={stripe} strokeWidth="1.5"/>
        {/* Pare-brise droit (sedan) */}
        <path d="M92,94 L84,118 L196,118 L188,94 Z" fill={glass} stroke="rgba(100,160,255,0.3)" strokeWidth="1"/>
        {/* Toit plat long */}
        <rect x="84" y="118" width="112" height="94" rx="4" fill={body2}/>
        {/* Lunette arrière presque verticale */}
        <path d="M86,212 L92,234 L188,234 L194,212 Z" fill={glass} stroke="rgba(100,160,255,0.3)" strokeWidth="1"/>
        {/* Coffre marqué — 3ème box */}
        <path d="M92,234 Q140,244 188,234 L194,284 Q140,298 86,284 Z" fill={body2} stroke={line} strokeWidth="0.8"/>
        {/* Séparation coffre visible — caracteristique berline */}
        <line x1="80" y1="234" x2="200" y2="234" stroke="rgba(240,237,232,0.2)" strokeWidth="1.5"/>
        {/* Pare-choc arrière */}
        <path d="M86,284 Q140,298 194,284 L198,304 Q140,318 82,304 Z" fill="#111122" stroke={line} strokeWidth="0.8"/>
        <rect x="84" y="287" width="28" height="12" rx="2" fill="rgba(255,60,60,0.5)"/>
        <rect x="168" y="287" width="28" height="12" rx="2" fill="rgba(255,60,60,0.5)"/>
        <rect x="86" y="28" width="24" height="10" rx="2" fill="rgba(255,240,180,0.5)"/>
        <rect x="170" y="28" width="24" height="10" rx="2" fill="rgba(255,240,180,0.5)"/>
        {/* Rétroviseurs */}
        <path d="M66,108 L52,102 L52,122 L66,118 Z" fill={body} stroke={line} strokeWidth="0.8"/>
        <path d="M214,108 L228,102 L228,122 L214,118 Z" fill={body} stroke={line} strokeWidth="0.8"/>
        {/* Lignes de portes */}
        <line x1="64" y1="162" x2="78" y2="162" stroke={line} strokeWidth="1"/>
        <line x1="202" y1="162" x2="216" y2="162" stroke={line} strokeWidth="1"/>
        <Wheel cx={48} cy={138}/><Wheel cx={232} cy={138}/>
        <Wheel cx={48} cy={210}/><Wheel cx={232} cy={210}/>
      </g>
    );

    // ── BREAK / ESTATE — toit prolongé jusqu'au hayon
    case 'estate': return (
      <g>
        <ellipse cx="140" cy="200" rx="108" ry="215" fill="rgba(0,0,0,0.18)"/>
        <path d="M88,16 Q140,4 192,16 L214,40 L220,120 L220,290 L210,318 Q140,330 70,318 L60,290 L60,120 L66,40 Z"
          fill={body} stroke={color} strokeWidth="1.2" strokeOpacity="0.35"/>
        {/* Capot */}
        <path d="M90,40 Q140,28 190,40 L202,90 L78,90 Z" fill={body2} stroke={line} strokeWidth="0.8"/>
        <line x1="140" y1="34" x2="140" y2="90" stroke={stripe} strokeWidth="1.5"/>
        {/* Pare-brise */}
        <path d="M92,90 L84,114 L196,114 L188,90 Z" fill={glass} stroke="rgba(100,160,255,0.3)" strokeWidth="1"/>
        {/* Toit long étendu jusqu'à l'arrière — caractéristique break */}
        <rect x="84" y="114" width="112" height="150" rx="4" fill={body2}/>
        {/* Rail de toit (galerie) */}
        <rect x="86" y="116" width="108" height="4" rx="2" fill="rgba(240,237,232,0.12)"/>
        <rect x="86" y="258" width="108" height="4" rx="2" fill="rgba(240,237,232,0.12)"/>
        {/* Lunette arrière verticale — break */}
        <path d="M86,264 L84,290 L196,290 L194,264 Z" fill={glass} stroke="rgba(100,160,255,0.3)" strokeWidth="1"/>
        {/* Hayon */}
        <path d="M84,290 Q140,302 196,290 L202,316 Q140,326 78,316 Z" fill={body2} stroke={line} strokeWidth="0.8"/>
        <rect x="84" y="294" width="28" height="12" rx="2" fill="rgba(255,60,60,0.5)"/>
        <rect x="168" y="294" width="28" height="12" rx="2" fill="rgba(255,60,60,0.5)"/>
        <rect x="86" y="28" width="24" height="10" rx="2" fill="rgba(255,240,180,0.5)"/>
        <rect x="170" y="28" width="24" height="10" rx="2" fill="rgba(255,240,180,0.5)"/>
        <path d="M66,106 L52,100 L52,120 L66,116 Z" fill={body} stroke={line} strokeWidth="0.8"/>
        <path d="M214,106 L228,100 L228,120 L214,116 Z" fill={body} stroke={line} strokeWidth="0.8"/>
        <line x1="64" y1="158" x2="78" y2="158" stroke={line} strokeWidth="1"/>
        <line x1="202" y1="158" x2="216" y2="158" stroke={line} strokeWidth="1"/>
        <line x1="64" y1="220" x2="78" y2="220" stroke={line} strokeWidth="1"/>
        <line x1="202" y1="220" x2="216" y2="220" stroke={line} strokeWidth="1"/>
        <Wheel cx={48} cy={138}/><Wheel cx={232} cy={138}/>
        <Wheel cx={48} cy={222}/><Wheel cx={232} cy={222}/>
      </g>
    );

    // ── COUPÉ — profil sport, plus large, sans montant C visible
    case 'coupe': return (
      <g>
        <ellipse cx="140" cy="190" rx="116" ry="200" fill="rgba(0,0,0,0.2)"/>
        {/* Carrosserie plus large, lignes fluides */}
        <path d="M82,16 Q140,2 198,16 L220,46 L228,124 L228,232 L216,286 Q140,306 64,286 L52,232 L52,124 L60,46 Z"
          fill={body} stroke={color} strokeWidth="1.2" strokeOpacity="0.35"/>
        {/* Capot long bas */}
        <path d="M86,44 Q140,30 194,44 L208,96 L72,96 Z" fill={body2} stroke={line} strokeWidth="0.8"/>
        <line x1="140" y1="38" x2="140" y2="96" stroke={stripe} strokeWidth="1.5"/>
        {/* Pare-brise très incliné */}
        <path d="M90,96 L78,128 L202,128 L210,96 Z" fill={glass} stroke="rgba(100,160,255,0.35)" strokeWidth="1"/>
        <line x1="140" y1="96" x2="140" y2="128" stroke="rgba(240,237,232,0.1)" strokeWidth="1"/>
        {/* Toit raccourci, plus sport */}
        <rect x="78" y="128" width="124" height="80" rx="5" fill={body2}/>
        {/* Lunette arrière inclinée */}
        <path d="M80,208 L86,234 L194,234 L200,208 Z" fill={glass} stroke="rgba(100,160,255,0.3)" strokeWidth="1"/>
        {/* Coffre sport court */}
        <path d="M86,234 Q140,248 194,234 L202,278 Q140,296 78,278 Z" fill={body2} stroke={line} strokeWidth="0.8"/>
        {/* Diffuseur arrière */}
        <path d="M86,278 Q140,294 194,278 L198,298 Q140,312 82,298 Z" fill="#0a0a1c" stroke={line} strokeWidth="0.8"/>
        <rect x="90" y="280" width="26" height="14" rx="2" fill="rgba(255,40,40,0.55)"/>
        <rect x="164" y="280" width="26" height="14" rx="2" fill="rgba(255,40,40,0.55)"/>
        {/* Phares avant larges */}
        <path d="M64,28 L84,20 L86,44 L62,44 Z" fill="rgba(255,240,180,0.3)" stroke="rgba(255,240,160,0.5)" strokeWidth="1"/>
        <path d="M196,28 L216,20 L218,44 L194,44 Z" fill="rgba(255,240,180,0.3)" stroke="rgba(255,240,160,0.5)" strokeWidth="1"/>
        {/* Rétroviseurs sport */}
        <path d="M60,116 L44,110 L44,130 L60,124 Z" fill={body} stroke={line} strokeWidth="0.8"/>
        <path d="M220,116 L236,110 L236,130 L220,124 Z" fill={body} stroke={line} strokeWidth="0.8"/>
        {/* Pas de porte arrière (coupé 2 portes) */}
        <Wheel cx={44} cy={146} rx={21} ry={30}/><Wheel cx={236} cy={146} rx={21} ry={30}/>
        <Wheel cx={44} cy={218} rx={21} ry={30}/><Wheel cx={236} cy={218} rx={21} ry={30}/>
      </g>
    );

    // ── CABRIOLET — coupé avec capote indiquée
    case 'convertible': return (
      <g>
        <ellipse cx="140" cy="190" rx="116" ry="200" fill="rgba(0,0,0,0.2)"/>
        <path d="M82,16 Q140,2 198,16 L220,46 L228,124 L228,232 L216,286 Q140,306 64,286 L52,232 L52,124 L60,46 Z"
          fill={body} stroke={color} strokeWidth="1.2" strokeOpacity="0.35"/>
        <path d="M86,44 Q140,30 194,44 L208,96 L72,96 Z" fill={body2} stroke={line} strokeWidth="0.8"/>
        <line x1="140" y1="38" x2="140" y2="96" stroke={stripe} strokeWidth="1.5"/>
        <path d="M90,96 L78,128 L202,128 L210,96 Z" fill={glass} stroke="rgba(100,160,255,0.35)" strokeWidth="1"/>
        {/* Capote souple indiquée (pli central) */}
        <rect x="80" y="128" width="120" height="74" rx="5" fill="#1a1428"/>
        <line x1="140" y1="130" x2="140" y2="200" stroke="rgba(240,237,232,0.15)" strokeWidth="2"/>
        {[136,142,148,156,164,172,180,190].map(y => (
          <line key={y} x1="82" y1={y} x2="198" y2={y} stroke={stripe} strokeWidth="1"/>
        ))}
        {/* Séparation capote / carrosserie */}
        <rect x="80" y="126" width="120" height="5" rx="2" fill="rgba(240,237,232,0.15)"/>
        <rect x="80" y="200" width="120" height="5" rx="2" fill="rgba(240,237,232,0.15)"/>
        <path d="M86,206 L90,234 L190,234 L194,206 Z" fill={glass} stroke="rgba(100,160,255,0.3)" strokeWidth="1"/>
        <path d="M90,234 Q140,248 190,234 L196,276 Q140,292 84,276 Z" fill={body2} stroke={line} strokeWidth="0.8"/>
        <path d="M86,276 Q140,292 194,276 L198,296 Q140,310 82,296 Z" fill="#0a0a1c" stroke={line} strokeWidth="0.8"/>
        <rect x="90" y="278" width="24" height="14" rx="2" fill="rgba(255,40,40,0.55)"/>
        <rect x="166" y="278" width="24" height="14" rx="2" fill="rgba(255,40,40,0.55)"/>
        <path d="M64,28 L84,20 L86,44 L62,44 Z" fill="rgba(255,240,180,0.3)" stroke="rgba(255,240,160,0.5)" strokeWidth="1"/>
        <path d="M196,28 L216,20 L218,44 L194,44 Z" fill="rgba(255,240,180,0.3)" stroke="rgba(255,240,160,0.5)" strokeWidth="1"/>
        <path d="M60,116 L44,110 L44,130 L60,124 Z" fill={body} stroke={line} strokeWidth="0.8"/>
        <path d="M220,116 L236,110 L236,130 L220,124 Z" fill={body} stroke={line} strokeWidth="0.8"/>
        <Wheel cx={44} cy={146} rx={21} ry={30}/><Wheel cx={236} cy={146} rx={21} ry={30}/>
        <Wheel cx={44} cy={218} rx={21} ry={30}/><Wheel cx={236} cy={218} rx={21} ry={30}/>
      </g>
    );

    // ── SUV COMPACT — plus large, garde au sol visible, arches roues saillantes
    case 'suv_small': return (
      <g>
        <ellipse cx="140" cy="196" rx="120" ry="210" fill="rgba(0,0,0,0.2)"/>
        {/* Carrosserie large et droite */}
        <path d="M80,16 Q140,4 200,16 L220,46 L228,126 L228,244 L216,298 Q140,316 64,298 L52,244 L52,126 L60,46 Z"
          fill={body} stroke={color} strokeWidth="1.2" strokeOpacity="0.4"/>
        {/* Skid plate avant */}
        <path d="M84,14 Q140,4 196,14 L202,36 L78,36 Z" fill="#0d0d20" stroke="rgba(200,200,200,0.15)" strokeWidth="1"/>
        {/* Capot court haut */}
        <path d="M82,36 Q140,26 198,36 L210,90 L70,90 Z" fill={body2} stroke={line} strokeWidth="0.8"/>
        <line x1="140" y1="30" x2="140" y2="90" stroke={stripe} strokeWidth="1.5"/>
        {/* Pare-brise haut */}
        <path d="M84,90 L76,118 L204,118 L196,90 Z" fill={glass} stroke="rgba(100,160,255,0.3)" strokeWidth="1"/>
        {/* Toit haut, carré */}
        <rect x="76" y="118" width="128" height="100" rx="4" fill={body2}/>
        {/* Rails de toit */}
        <rect x="78" y="120" width="124" height="4" rx="2" fill="rgba(240,237,232,0.15)"/>
        <rect x="78" y="212" width="124" height="4" rx="2" fill="rgba(240,237,232,0.15)"/>
        {/* Lunette arrière haute */}
        <path d="M78,222 L82,248 L198,248 L202,222 Z" fill={glass} stroke="rgba(100,160,255,0.3)" strokeWidth="1"/>
        {/* Hayon */}
        <path d="M82,248 Q140,262 198,248 L206,292 Q140,308 74,292 Z" fill={body2} stroke={line} strokeWidth="0.8"/>
        {/* Skid plate arrière */}
        <path d="M82,292 Q140,306 198,292 L202,310 Q140,322 78,310 Z" fill="#0d0d20" stroke="rgba(200,200,200,0.15)" strokeWidth="1"/>
        <rect x="78" y="294" width="32" height="13" rx="2" fill="rgba(255,60,60,0.5)"/>
        <rect x="170" y="294" width="32" height="13" rx="2" fill="rgba(255,60,60,0.5)"/>
        <rect x="82" y="24" width="28" height="10" rx="2" fill="rgba(255,240,180,0.5)"/>
        <rect x="170" y="24" width="28" height="10" rx="2" fill="rgba(255,240,180,0.5)"/>
        {/* Rétroviseurs larges */}
        <path d="M62,108 L46,102 L46,126 L62,120 Z" fill={body} stroke={line} strokeWidth="1"/>
        <path d="M218,108 L234,102 L234,126 L218,120 Z" fill={body} stroke={line} strokeWidth="1"/>
        {/* Arches de roues saillantes (SUV) */}
        <path d="M28,108 Q8,142 28,176" fill="none" stroke="rgba(240,237,232,0.18)" strokeWidth="4"/>
        <path d="M252,108 Q272,142 252,176" fill="none" stroke="rgba(240,237,232,0.18)" strokeWidth="4"/>
        <path d="M28,186 Q8,220 28,254" fill="none" stroke="rgba(240,237,232,0.18)" strokeWidth="4"/>
        <path d="M252,186 Q272,220 252,254" fill="none" stroke="rgba(240,237,232,0.18)" strokeWidth="4"/>
        <line x1="56" y1="164" x2="74" y2="164" stroke={line} strokeWidth="1"/>
        <line x1="206" y1="164" x2="224" y2="164" stroke={line} strokeWidth="1"/>
        <Wheel cx={40} cy={142} rx={22} ry={30}/><Wheel cx={240} cy={142} rx={22} ry={30}/>
        <Wheel cx={40} cy={222} rx={22} ry={30}/><Wheel cx={240} cy={222} rx={22} ry={30}/>
      </g>
    );

    // ── GRAND SUV — SUV plus large et plus long
    case 'suv_large': return (
      <g>
        <ellipse cx="140" cy="200" rx="126" ry="218" fill="rgba(0,0,0,0.22)"/>
        <path d="M78,14 Q140,2 202,14 L224,46 L232,130 L232,264 L218,308 Q140,326 62,308 L48,264 L48,130 L56,46 Z"
          fill={body} stroke={color} strokeWidth="1.3" strokeOpacity="0.4"/>
        <path d="M82,14 Q140,2 198,14 L204,38 L76,38 Z" fill="#0c0c1e" stroke="rgba(200,200,200,0.15)" strokeWidth="1"/>
        <path d="M80,38 Q140,26 200,38 L212,92 L68,92 Z" fill={body2} stroke={line} strokeWidth="0.8"/>
        <line x1="140" y1="32" x2="140" y2="92" stroke={stripe} strokeWidth="1.5"/>
        <path d="M82,92 L72,122 L208,122 L198,92 Z" fill={glass} stroke="rgba(100,160,255,0.3)" strokeWidth="1"/>
        <rect x="72" y="122" width="136" height="110" rx="4" fill={body2}/>
        <rect x="74" y="124" width="132" height="4" rx="2" fill="rgba(240,237,232,0.15)"/>
        <rect x="74" y="228" width="132" height="4" rx="2" fill="rgba(240,237,232,0.15)"/>
        <path d="M74,234 L78,262 L202,262 L206,234 Z" fill={glass} stroke="rgba(100,160,255,0.3)" strokeWidth="1"/>
        <path d="M78,262 Q140,276 202,262 L210,304 Q140,320 70,304 Z" fill={body2} stroke={line} strokeWidth="0.8"/>
        <path d="M78,304 Q140,318 202,304 L206,322 Q140,334 74,322 Z" fill="#0c0c1e" stroke="rgba(200,200,200,0.15)" strokeWidth="1"/>
        <rect x="74" y="306" width="36" height="14" rx="2" fill="rgba(255,60,60,0.5)"/>
        <rect x="170" y="306" width="36" height="14" rx="2" fill="rgba(255,60,60,0.5)"/>
        <rect x="80" y="22" width="30" height="12" rx="2" fill="rgba(255,240,180,0.5)"/>
        <rect x="170" y="22" width="30" height="12" rx="2" fill="rgba(255,240,180,0.5)"/>
        <path d="M58,110 L42,104 L42,130 L58,124 Z" fill={body} stroke={line} strokeWidth="1"/>
        <path d="M222,110 L238,104 L238,130 L222,124 Z" fill={body} stroke={line} strokeWidth="1"/>
        <path d="M24,108 Q4,148 24,188" fill="none" stroke="rgba(240,237,232,0.18)" strokeWidth="4"/>
        <path d="M256,108 Q276,148 256,188" fill="none" stroke="rgba(240,237,232,0.18)" strokeWidth="4"/>
        <path d="M24,200 Q4,240 24,280" fill="none" stroke="rgba(240,237,232,0.18)" strokeWidth="4"/>
        <path d="M256,200 Q276,240 256,280" fill="none" stroke="rgba(240,237,232,0.18)" strokeWidth="4"/>
        <line x1="52" y1="172" x2="70" y2="172" stroke={line} strokeWidth="1"/>
        <line x1="210" y1="172" x2="228" y2="172" stroke={line} strokeWidth="1"/>
        <line x1="52" y1="236" x2="70" y2="236" stroke={line} strokeWidth="1"/>
        <line x1="210" y1="236" x2="228" y2="236" stroke={line} strokeWidth="1"/>
        <Wheel cx={36} cy={150} rx={24} ry={34}/><Wheel cx={244} cy={150} rx={24} ry={34}/>
        <Wheel cx={36} cy={244} rx={24} ry={34}/><Wheel cx={244} cy={244} rx={24} ry={34}/>
      </g>
    );

    // ── MPV / MONOSPACE — carré, court capot, grande baie vitrée
    case 'mpv': return (
      <g>
        <ellipse cx="140" cy="200" rx="122" ry="210" fill="rgba(0,0,0,0.18)"/>
        {/* Corps très carré, hauteur visible */}
        <path d="M76,16 Q140,6 204,16 L220,44 L226,124 L226,256 L216,300 Q140,316 64,300 L54,256 L54,124 L60,44 Z"
          fill={body} stroke={color} strokeWidth="1.2" strokeOpacity="0.35"/>
        {/* Capot très court */}
        <path d="M80,42 Q140,32 200,42 L206,78 L74,78 Z" fill={body2} stroke={line} strokeWidth="0.8"/>
        <line x1="140" y1="36" x2="140" y2="78" stroke={stripe} strokeWidth="1.2"/>
        {/* Grande bande de pare-brise */}
        <path d="M80,78 L74,108 L206,108 L200,78 Z" fill={glass} stroke="rgba(100,160,255,0.3)" strokeWidth="1"/>
        <line x1="140" y1="78" x2="140" y2="108" stroke="rgba(240,237,232,0.1)" strokeWidth="1"/>
        {/* Toit plat + haut */}
        <rect x="74" y="108" width="132" height="124" rx="4" fill={body2}/>
        {/* Baies vitrées laterales — 3 rangées */}
        {[116,152,188].map((y, i) => (
          <g key={i}>
            <rect x="36" y={y} width="42" height="36" rx="4" fill={glass} stroke="rgba(100,160,255,0.2)" strokeWidth="0.8"/>
            <rect x="202" y={y} width="42" height="36" rx="4" fill={glass} stroke="rgba(100,160,255,0.2)" strokeWidth="0.8"/>
          </g>
        ))}
        {/* Portes coulissantes latérales */}
        <line x1="58" y1="150" x2="72" y2="150" stroke={line} strokeWidth="1.5"/>
        <line x1="208" y1="150" x2="222" y2="150" stroke={line} strokeWidth="1.5"/>
        {/* Lunette arrière haute */}
        <path d="M76,234 L78,256 L202,256 L204,234 Z" fill={glass} stroke="rgba(100,160,255,0.28)" strokeWidth="1"/>
        {/* Hayon vertical */}
        <path d="M78,256 Q140,268 202,256 L206,296 Q140,308 74,296 Z" fill={body2} stroke={line} strokeWidth="0.8"/>
        <rect x="78" y="260" width="30" height="12" rx="2" fill="rgba(255,60,60,0.5)"/>
        <rect x="172" y="260" width="30" height="12" rx="2" fill="rgba(255,60,60,0.5)"/>
        <rect x="80" y="28" width="26" height="10" rx="2" fill="rgba(255,240,180,0.5)"/>
        <rect x="174" y="28" width="26" height="10" rx="2" fill="rgba(255,240,180,0.5)"/>
        <path d="M62,100 L46,94 L46,118 L62,112 Z" fill={body} stroke={line} strokeWidth="0.8"/>
        <path d="M218,100 L234,94 L234,118 L218,112 Z" fill={body} stroke={line} strokeWidth="0.8"/>
        <Wheel cx={44} cy={144} rx={18} ry={26}/><Wheel cx={236} cy={144} rx={18} ry={26}/>
        <Wheel cx={44} cy={232} rx={18} ry={26}/><Wheel cx={236} cy={232} rx={18} ry={26}/>
      </g>
    );

    // ── PICK-UP — cabine courte + benne ouverte
    case 'pickup': return (
      <g>
        <ellipse cx="140" cy="210" rx="122" ry="215" fill="rgba(0,0,0,0.2)"/>
        {/* === CABINE === */}
        <path d="M78,14 Q140,2 202,14 L216,44 L222,130 L222,176 L200,182 L80,182 L58,176 L58,130 L64,44 Z"
          fill={body} stroke={color} strokeWidth="1.2" strokeOpacity="0.4"/>
        {/* Capot */}
        <path d="M80,42 Q140,28 200,42 L210,90 L70,90 Z" fill={body2} stroke={line} strokeWidth="0.8"/>
        <line x1="140" y1="36" x2="140" y2="90" stroke={stripe} strokeWidth="1.5"/>
        {/* Pare-brise */}
        <path d="M82,90 L74,116 L206,116 L198,90 Z" fill={glass} stroke="rgba(100,160,255,0.3)" strokeWidth="1"/>
        <line x1="140" y1="90" x2="140" y2="116" stroke="rgba(240,237,232,0.1)" strokeWidth="1"/>
        {/* Toit cabine */}
        <rect x="74" y="116" width="132" height="60" rx="4" fill={body2}/>
        {/* Fenêtre arrière cabine */}
        <rect x="82" y="120" width="116" height="34" rx="4" fill={glass} stroke="rgba(100,160,255,0.25)" strokeWidth="0.8"/>
        {/* Phares avant */}
        <path d="M62,24 L82,16 L84,42 L60,42 Z" fill="rgba(255,240,180,0.3)" stroke="rgba(255,240,160,0.5)" strokeWidth="1"/>
        <path d="M198,24 L218,16 L220,42 L196,42 Z" fill="rgba(255,240,180,0.3)" stroke="rgba(255,240,160,0.5)" strokeWidth="1"/>
        {/* Rétroviseurs larges pickup */}
        <path d="M60,108 L42,100 L42,126 L60,118 Z" fill={body} stroke={line} strokeWidth="1"/>
        <path d="M220,108 L238,100 L238,126 L220,118 Z" fill={body} stroke={line} strokeWidth="1"/>
        {/* === BENNE === */}
        {/* Bords de benne */}
        <rect x="36" y="180" width="28" height="120" rx="2" fill={body} stroke={color} strokeWidth="1" strokeOpacity="0.4"/>
        <rect x="216" y="180" width="28" height="120" rx="2" fill={body} stroke={color} strokeWidth="1" strokeOpacity="0.4"/>
        {/* Plancher benne */}
        <rect x="64" y="182" width="152" height="116" rx="2" fill={body2} stroke={line} strokeWidth="1"/>
        {/* Nervures de benne */}
        {[200,216,232,248,266].map(y => (
          <line key={y} x1="66" y1={y} x2="214" y2={y} stroke={stripe} strokeWidth="1.5"/>
        ))}
        {/* Hayon */}
        <rect x="64" y="296" width="152" height="18" rx="2" fill={body} stroke={color} strokeWidth="1" strokeOpacity="0.4"/>
        {/* Feux arrière */}
        <rect x="38" y="298" width="24" height="14" rx="2" fill="rgba(255,50,50,0.5)"/>
        <rect x="218" y="298" width="24" height="14" rx="2" fill="rgba(255,50,50,0.5)"/>
        {/* Roue de secours sous caisse */}
        <ellipse cx="140" cy="246" rx="22" ry="18" fill="rgba(0,0,0,0.25)" stroke="rgba(240,237,232,0.08)" strokeWidth="1" strokeDasharray="3,2"/>
        {/* Roues avant */}
        <Wheel cx={42} cy={146} rx={20} ry={28}/><Wheel cx={238} cy={146} rx={20} ry={28}/>
        {/* Roues arrière (plus grosses) */}
        <Wheel cx={36} cy={252} rx={22} ry={30}/><Wheel cx={244} cy={252} rx={22} ry={30}/>
      </g>
    );

    // ── VAN PETIT UTILITAIRE — carré, court, toit haut
    case 'van_small': return (
      <g>
        <ellipse cx="140" cy="200" rx="118" ry="210" fill="rgba(0,0,0,0.18)"/>
        {/* Corps */}
        <path d="M74,12 Q140,2 206,12 L218,42 L222,132 L222,298 L210,316 Q140,326 70,316 L58,298 L58,132 L62,42 Z"
          fill={body} stroke={color} strokeWidth="1.2" strokeOpacity="0.35"/>
        {/* Cabine avant */}
        <path d="M76,42 Q140,30 204,42 L210,94 L70,94 Z" fill={body2} stroke={line} strokeWidth="0.8"/>
        <line x1="140" y1="36" x2="140" y2="94" stroke={stripe} strokeWidth="1.2"/>
        {/* Pare-brise */}
        <path d="M78,94 L72,122 L208,122 L202,94 Z" fill={glass} stroke="rgba(100,160,255,0.3)" strokeWidth="1"/>
        <line x1="140" y1="94" x2="140" y2="122" stroke="rgba(240,237,232,0.1)" strokeWidth="1"/>
        {/* Toit cabine */}
        <rect x="72" y="122" width="136" height="44" rx="4" fill={body2}/>
        {/* Porte côté conducteur */}
        <rect x="36" y="62" width="40" height="68" rx="4" fill="rgba(255,255,255,0.03)" stroke={line} strokeWidth="1"/>
        {/* Porte passager */}
        <rect x="204" y="62" width="40" height="68" rx="4" fill="rgba(255,255,255,0.03)" stroke={line} strokeWidth="1"/>
        {/* Séparation cabine / caisse */}
        <line x1="58" y1="168" x2="222" y2="168" stroke="rgba(240,237,232,0.2)" strokeWidth="1.5"/>
        {/* Caisse utilitaire */}
        <rect x="64" y="168" width="152" height="136" rx="2" fill={body2} stroke={line} strokeWidth="0.8"/>
        {/* Porte coulissante latérale G */}
        <rect x="36" y="170" width="30" height="108" rx="3" fill="rgba(255,255,255,0.02)" stroke={line} strokeWidth="1"/>
        <rect x="36" y="210" width="30" height="6" rx="1" fill="rgba(240,237,232,0.08)"/>
        {/* Porte coulissante latérale D */}
        <rect x="214" y="170" width="30" height="108" rx="3" fill="rgba(255,255,255,0.02)" stroke={line} strokeWidth="1"/>
        <rect x="214" y="210" width="30" height="6" rx="1" fill="rgba(240,237,232,0.08)"/>
        {/* Portes arrières doubles */}
        <line x1="140" y1="268" x2="140" y2="310" stroke={line} strokeWidth="1.5"/>
        <rect x="66" y="270" width="72" height="36" rx="2" fill="rgba(255,255,255,0.02)" stroke={line} strokeWidth="1"/>
        <rect x="142" y="270" width="72" height="36" rx="2" fill="rgba(255,255,255,0.02)" stroke={line} strokeWidth="1"/>
        {/* Feux arrière */}
        <rect x="64" y="305" width="32" height="13" rx="2" fill="rgba(255,50,50,0.45)"/>
        <rect x="184" y="305" width="32" height="13" rx="2" fill="rgba(255,50,50,0.45)"/>
        {/* Phares avant */}
        <rect x="74" y="18" width="34" height="18" rx="3" fill="rgba(255,240,160,0.25)" stroke="rgba(255,240,160,0.4)" strokeWidth="1"/>
        <rect x="172" y="18" width="34" height="18" rx="3" fill="rgba(255,240,160,0.25)" stroke="rgba(255,240,160,0.4)" strokeWidth="1"/>
        <Wheel cx={44} cy={142} rx={18} ry={26}/><Wheel cx={236} cy={142} rx={18} ry={26}/>
        <Wheel cx={40} cy={240} rx={18} ry={24}/><Wheel cx={240} cy={240} rx={18} ry={24}/>
      </g>
    );

    // ── MOTO SPORTIVE — full carénage, profilée
    case 'moto_sport': return (
      <g>
        <ellipse cx="140" cy="190" rx="58" ry="195" fill="rgba(0,0,0,0.15)"/>
        {/* Roue avant */}
        <ellipse cx="140" cy="54" rx="24" ry="40" fill={wheel} stroke="rgba(240,237,232,0.2)" strokeWidth="1.5"/>
        <ellipse cx="140" cy="54" rx="12" ry="20" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8"/>
        {/* Carénage avant — plus aérodynamique que naked */}
        <path d="M112,92 Q140,78 168,92 L176,122 Q140,136 104,122 Z" fill={body2} stroke={color} strokeWidth="1" strokeOpacity="0.5"/>
        {/* Bulle / saute-vent */}
        <path d="M120,80 Q140,68 160,80 L164,100 Q140,108 116,100 Z" fill="rgba(100,160,255,0.12)" stroke="rgba(100,160,255,0.4)" strokeWidth="0.8"/>
        {/* Phare intégré */}
        <ellipse cx="140" cy="100" rx="12" ry="7" fill="rgba(255,240,160,0.2)" stroke="rgba(255,240,160,0.5)" strokeWidth="0.8"/>
        {/* Guidon sous carénage (presque caché) */}
        <path d="M82,110 Q108,104 116,110" fill="none" stroke="rgba(240,237,232,0.25)" strokeWidth="3.5" strokeLinecap="round"/>
        <path d="M164,110 Q172,104 198,110" fill="none" stroke="rgba(240,237,232,0.25)" strokeWidth="3.5" strokeLinecap="round"/>
        {/* Réservoir sport */}
        <path d="M114,134 Q140,122 166,134 L168,182 Q140,196 112,182 Z" fill={body} stroke={line} strokeWidth="1"/>
        {/* Carénages latéraux profilés */}
        <path d="M80,148 Q68,172 70,230 Q88,252 112,248 L110,182 Q90,168 80,148 Z" fill={body} stroke={color} strokeWidth="1" strokeOpacity="0.4"/>
        <path d="M200,148 Q212,172 210,230 Q192,252 168,248 L170,182 Q190,168 200,148 Z" fill={body} stroke={color} strokeWidth="1" strokeOpacity="0.4"/>
        {/* Selle étroite sport */}
        <path d="M114,190 Q140,182 166,190 L162,238 Q140,248 118,238 Z" fill="#1a1428" stroke={line} strokeWidth="0.8"/>
        {/* Silhouette selle passager */}
        <path d="M122,240 Q140,234 158,240 L156,262 Q140,270 124,262 Z" fill="#141228" stroke={line} strokeWidth="0.6"/>
        {/* Pot d'échappement sport haut */}
        <path d="M172,220 Q192,228 196,258 Q194,270 186,272" fill="none" stroke="rgba(180,130,40,0.5)" strokeWidth="7" strokeLinecap="round"/>
        {/* Bras oscillant */}
        <path d="M118,248 Q128,290 134,316" fill="none" stroke="rgba(240,237,232,0.18)" strokeWidth="2.5"/>
        <path d="M162,248 Q152,290 146,316" fill="none" stroke="rgba(240,237,232,0.18)" strokeWidth="2.5"/>
        {/* Roue arrière */}
        <ellipse cx="140" cy="322" rx="24" ry="40" fill={wheel} stroke="rgba(240,237,232,0.2)" strokeWidth="1.5"/>
        <ellipse cx="140" cy="322" rx="12" ry="20" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8"/>
      </g>
    );

    // ── MOTO TOURING — demi-carénage + sacoches latérales
    case 'moto_touring': return (
      <g>
        <ellipse cx="140" cy="200" rx="80" ry="195" fill="rgba(0,0,0,0.15)"/>
        {/* Roue avant */}
        <ellipse cx="140" cy="52" rx="24" ry="40" fill={wheel} stroke="rgba(240,237,232,0.2)" strokeWidth="1.5"/>
        <ellipse cx="140" cy="52" rx="12" ry="20" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8"/>
        {/* Carénage demi-bulle */}
        <path d="M108,90 Q140,74 172,90 L178,130 Q140,148 102,130 Z" fill={body} stroke={color} strokeWidth="1" strokeOpacity="0.5"/>
        {/* Bulle/saute-vent touring (plus grand) */}
        <path d="M114,74 Q140,60 166,74 L170,96 Q140,108 110,96 Z" fill="rgba(100,160,255,0.1)" stroke="rgba(100,160,255,0.4)" strokeWidth="1"/>
        {/* Phare */}
        <rect x="126" y="88" width="28" height="16" rx="6" fill="rgba(255,240,160,0.2)" stroke="rgba(255,240,160,0.4)" strokeWidth="0.8"/>
        {/* Guidon */}
        <path d="M64,110 Q100,100 112,108" fill="none" stroke="rgba(240,237,232,0.35)" strokeWidth="4" strokeLinecap="round"/>
        <path d="M168,108 Q180,100 216,110" fill="none" stroke="rgba(240,237,232,0.35)" strokeWidth="4" strokeLinecap="round"/>
        <circle cx="64" cy="110" r="5" fill={body2} stroke={line} strokeWidth="1"/>
        <circle cx="216" cy="110" r="5" fill={body2} stroke={line} strokeWidth="1"/>
        {/* Réservoir */}
        <path d="M110,136 Q140,126 170,136 L172,188 Q140,200 108,188 Z" fill={body} stroke={line} strokeWidth="1"/>
        {/* Selle large touring */}
        <path d="M106,192 Q140,182 174,192 L172,252 Q140,264 108,252 Z" fill="#1a1428" stroke={line} strokeWidth="0.8"/>
        {/* SACOCHES latérales — caractéristique touring */}
        <path d="M60,180 L78,174 L80,250 L60,250 Z" fill={body2} stroke={color} strokeWidth="1" strokeOpacity="0.5"/>
        <rect x="56" y="178" width="28" height="76" rx="6" fill={body} stroke={color} strokeWidth="1" strokeOpacity="0.4"/>
        <rect x="58" y="188" width="24" height="50" rx="4" fill={body2}/>
        <path d="M200,180 L222,174 L222,250 L200,250 Z" fill={body2} stroke={color} strokeWidth="1" strokeOpacity="0.5"/>
        <rect x="196" y="178" width="28" height="76" rx="6" fill={body} stroke={color} strokeWidth="1" strokeOpacity="0.4"/>
        <rect x="198" y="188" width="24" height="50" rx="4" fill={body2}/>
        {/* Top-case arrière */}
        <rect x="112" y="254" width="56" height="38" rx="6" fill={body} stroke={color} strokeWidth="1" strokeOpacity="0.4"/>
        {/* Bras oscillant */}
        <path d="M118,252 Q128,296 134,318" fill="none" stroke="rgba(240,237,232,0.18)" strokeWidth="2.5"/>
        <path d="M162,252 Q152,296 146,318" fill="none" stroke="rgba(240,237,232,0.18)" strokeWidth="2.5"/>
        {/* Roue arrière */}
        <ellipse cx="140" cy="326" rx="24" ry="40" fill={wheel} stroke="rgba(240,237,232,0.2)" strokeWidth="1.5"/>
        <ellipse cx="140" cy="326" rx="12" ry="20" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8"/>
      </g>
    );

    // ── TROTTINETTE ÉLECTRIQUE (kickscooter) — très étroite
    case 'escooter': return (
      <g>
        {/* Roue avant petite */}
        <ellipse cx="140" cy="46" rx="14" ry="20" fill={wheel} stroke="rgba(240,237,232,0.2)" strokeWidth="1.5"/>
        {/* Guidon T */}
        <rect x="88" y="66" width="104" height="10" rx="5" fill="rgba(240,237,232,0.3)"/>
        <rect x="132" y="66" width="16" height="36" rx="4" fill={body} stroke={line} strokeWidth="0.8"/>
        {/* Poignées */}
        <rect x="80" y="64" width="16" height="14" rx="4" fill={body2} stroke={line} strokeWidth="1"/>
        <rect x="184" y="64" width="16" height="14" rx="4" fill={body2} stroke={line} strokeWidth="1"/>
        {/* Colonne de direction */}
        <rect x="133" y="100" width="14" height="80" rx="3" fill={body} stroke={line} strokeWidth="0.8"/>
        {/* Plateau / plateforme étroite */}
        <rect x="120" y="180" width="40" height="110" rx="4" fill={body} stroke={color} strokeWidth="1" strokeOpacity="0.5"/>
        {/* Batterie intégrée */}
        <rect x="126" y="196" width="28" height="56" rx="4" fill={body2}/>
        <rect x="130" y="202" width="20" height="10" rx="2" fill={`${color}40`}/>
        {/* Garde-boue arrière */}
        <rect x="128" y="288" width="24" height="18" rx="3" fill={body2} stroke={line} strokeWidth="0.8"/>
        {/* Roue arrière petite */}
        <ellipse cx="140" cy="322" rx="14" ry="20" fill={wheel} stroke="rgba(240,237,232,0.2)" strokeWidth="1.5"/>
        {/* Feu arrière */}
        <rect x="130" y="306" width="20" height="8" rx="2" fill="rgba(255,40,40,0.5)"/>
        {/* Feu avant */}
        <ellipse cx="140" cy="58" rx="6" ry="4" fill="rgba(255,240,160,0.3)" stroke="rgba(255,240,160,0.5)" strokeWidth="0.8"/>
      </g>
    );

    // ── MOTORCYCLE (naked/roadster) — existant conservé
    case 'motorcycle': return (
      <g>
        <ellipse cx="140" cy="190" rx="60" ry="195" fill="rgba(0,0,0,0.15)"/>
        <ellipse cx="140" cy="54" rx="24" ry="40" fill={wheel} stroke="rgba(240,237,232,0.2)" strokeWidth="1.5"/>
        <ellipse cx="140" cy="54" rx="12" ry="20" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8"/>
        <path d="M134,92 L128,118 L152,118 L146,92 Z" fill={body} stroke={line} strokeWidth="0.8"/>
        <path d="M116,108 Q140,96 164,108 L168,128 Q140,140 112,128 Z" fill={body2} stroke={line} strokeWidth="1"/>
        <ellipse cx="140" cy="116" rx="14" ry="8" fill="rgba(255,240,160,0.2)" stroke="rgba(255,240,160,0.4)" strokeWidth="0.8"/>
        <path d="M64,112 Q100,102 116,108" fill="none" stroke="rgba(240,237,232,0.35)" strokeWidth="4" strokeLinecap="round"/>
        <path d="M164,108 Q180,102 216,112" fill="none" stroke="rgba(240,237,232,0.35)" strokeWidth="4" strokeLinecap="round"/>
        <circle cx="66" cy="112" r="5" fill={body2} stroke={line} strokeWidth="1"/>
        <circle cx="214" cy="112" r="5" fill={body2} stroke={line} strokeWidth="1"/>
        <path d="M112,136 Q140,126 168,136 L170,188 Q140,200 110,188 Z" fill={body} stroke={line} strokeWidth="1"/>
        <path d="M118,142 Q140,134 162,142 L160,180 Q140,190 120,180 Z" fill={body2}/>
        <path d="M88,156 L96,230 Q104,250 112,256" fill="none" stroke="rgba(240,237,232,0.2)" strokeWidth="3"/>
        <path d="M192,156 L184,230 Q176,250 168,256" fill="none" stroke="rgba(240,237,232,0.2)" strokeWidth="3"/>
        <path d="M110,192 Q140,182 170,192 L168,254 Q140,268 112,254 Z" fill="#1a1428" stroke={line} strokeWidth="0.8"/>
        <path d="M88,210 Q72,220 68,246 Q66,272 72,290" fill="none" stroke="rgba(160,120,60,0.4)" strokeWidth="5" strokeLinecap="round"/>
        <path d="M192,210 Q208,220 212,246 Q214,272 208,290" fill="none" stroke="rgba(160,120,60,0.4)" strokeWidth="5" strokeLinecap="round"/>
        <path d="M118,256 Q128,296 134,312" fill="none" stroke="rgba(240,237,232,0.18)" strokeWidth="2.5"/>
        <path d="M162,256 Q152,296 146,312" fill="none" stroke="rgba(240,237,232,0.18)" strokeWidth="2.5"/>
        <ellipse cx="140" cy="322" rx="24" ry="40" fill={wheel} stroke="rgba(240,237,232,0.2)" strokeWidth="1.5"/>
        <ellipse cx="140" cy="322" rx="12" ry="20" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8"/>
      </g>
    );

    // ── SCOOTER ─────────────────────────────────────────────────
    case 'scooter':
    case 'moped': return (
      <g>
        <ellipse cx="140" cy="200" rx="52" ry="195" fill="rgba(0,0,0,0.14)"/>
        <ellipse cx="140" cy="52" rx="20" ry="34" fill={wheel} stroke="rgba(240,237,232,0.2)" strokeWidth="1.5"/>
        <ellipse cx="140" cy="52" rx="10" ry="17" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8"/>
        <path d="M134,84 L130,104 L150,104 L146,84 Z" fill={body} stroke={line} strokeWidth="0.8"/>
        <path d="M68,96 Q104,88 120,100" fill="none" stroke="rgba(240,237,232,0.3)" strokeWidth="4.5" strokeLinecap="round"/>
        <path d="M160,100 Q176,88 212,96" fill="none" stroke="rgba(240,237,232,0.3)" strokeWidth="4.5" strokeLinecap="round"/>
        <circle cx="68" cy="97" r="6" fill={body2} stroke={line} strokeWidth="1"/>
        <circle cx="212" cy="97" r="6" fill={body2} stroke={line} strokeWidth="1"/>
        <path d="M108,100 Q140,90 172,100 L176,156 Q140,168 104,156 Z" fill={body} stroke={line} strokeWidth="1"/>
        <ellipse cx="140" cy="108" rx="16" ry="9" fill="rgba(255,240,160,0.18)" stroke="rgba(255,240,160,0.35)" strokeWidth="0.8"/>
        <rect x="112" y="158" width="56" height="34" rx="6" fill={body2} stroke={line} strokeWidth="0.8"/>
        <path d="M96,192 L184,192 L186,252 L94,252 Z" fill={body} stroke={line} strokeWidth="1"/>
        <line x1="100" y1="210" x2="180" y2="210" stroke={stripe} strokeWidth="1"/>
        <line x1="100" y1="228" x2="180" y2="228" stroke={stripe} strokeWidth="1"/>
        <path d="M108,252 Q140,242 172,252 L170,306 Q140,318 110,306 Z" fill="#1a1428" stroke={line} strokeWidth="0.8"/>
        <path d="M112,308 Q140,296 168,308 L166,340 Q140,352 114,340 Z" fill={body2} stroke={line} strokeWidth="0.8"/>
        <ellipse cx="140" cy="362" rx="20" ry="34" fill={wheel} stroke="rgba(240,237,232,0.2)" strokeWidth="1.5"/>
        <ellipse cx="140" cy="362" rx="10" ry="17" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8"/>
      </g>
    );

    // ── VÉLO ─────────────────────────────────────────────────
    case 'bicycle':
    case 'cargo_bike': return (
      <g>
        <ellipse cx="140" cy="54" rx="22" ry="42" fill={wheel} stroke="rgba(240,237,232,0.2)" strokeWidth="1.5"/>
        <ellipse cx="140" cy="54" rx="11" ry="21" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8"/>
        {[0,45,90,135,180,225,270,315].map(a => (
          <line key={a} x1="140" y1="54" x2={140 + Math.sin(a * Math.PI / 180) * 18} y2={54 - Math.cos(a * Math.PI / 180) * 36}
            stroke="rgba(255,255,255,0.08)" strokeWidth="0.8"/>
        ))}
        <path d="M136,94 L132,116 L148,116 L144,94 Z" fill={body} stroke={line} strokeWidth="0.8"/>
        <path d="M70,104 Q104,96 124,108" fill="none" stroke="rgba(240,237,232,0.28)" strokeWidth="4" strokeLinecap="round"/>
        <path d="M156,108 Q176,96 210,104" fill="none" stroke="rgba(240,237,232,0.28)" strokeWidth="4" strokeLinecap="round"/>
        <rect x="133" y="106" width="14" height="28" rx="3" fill={body2} stroke={line} strokeWidth="0.8"/>
        <path d="M136,134 L124,230" fill="none" stroke="rgba(240,237,232,0.22)" strokeWidth="5" strokeLinecap="round"/>
        <path d="M144,134 L156,230" fill="none" stroke="rgba(240,237,232,0.22)" strokeWidth="5" strokeLinecap="round"/>
        <rect x="132" y="162" width="16" height="68" rx="3" fill={body2} stroke={line} strokeWidth="1"/>
        <path d="M116,236 Q140,226 164,236 L164,248 Q140,258 116,248 Z" fill="#1a1428" stroke={line} strokeWidth="0.8"/>
        <rect x="134" y="228" width="12" height="16" rx="2" fill={body2}/>
        <path d="M128,232 Q116,262 124,302" fill="none" stroke="rgba(240,237,232,0.16)" strokeWidth="3.5"/>
        <path d="M152,232 Q164,262 156,302" fill="none" stroke="rgba(240,237,232,0.16)" strokeWidth="3.5"/>
        <circle cx="140" cy="238" r="10" fill={body} stroke={line} strokeWidth="1"/>
        <ellipse cx="140" cy="318" rx="22" ry="42" fill={wheel} stroke="rgba(240,237,232,0.2)" strokeWidth="1.5"/>
        <ellipse cx="140" cy="318" rx="11" ry="21" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8"/>
        {[0,45,90,135,180,225,270,315].map(a => (
          <line key={a} x1="140" y1="318" x2={140 + Math.sin(a * Math.PI / 180) * 18} y2={318 - Math.cos(a * Math.PI / 180) * 36}
            stroke="rgba(255,255,255,0.08)" strokeWidth="0.8"/>
        ))}
      </g>
    );

    // ── CAMION — existant conservé
    case 'truck':
    case 'van': return (
      <g>
        <rect x="56" y="10" width="168" height="110" rx="10" fill="rgba(0,0,0,0.15)"/>
        <path d="M68,12 Q140,4 212,12 L220,50 L220,118 L60,118 L60,50 Z"
          fill={body} stroke={color} strokeWidth="1.2" strokeOpacity="0.4"/>
        <path d="M68,10 Q140,2 212,10" fill="none" stroke="rgba(200,200,200,0.3)" strokeWidth="3" strokeLinecap="round"/>
        <rect x="68" y="14" width="34" height="16" rx="3" fill="rgba(255,240,160,0.25)" stroke="rgba(255,240,160,0.4)" strokeWidth="1"/>
        <rect x="178" y="14" width="34" height="16" rx="3" fill="rgba(255,240,160,0.25)" stroke="rgba(255,240,160,0.4)" strokeWidth="1"/>
        <rect x="104" y="14" width="72" height="22" rx="2" fill="rgba(0,0,0,0.3)" stroke={line} strokeWidth="0.8"/>
        {[0,1,2,3].map(i => (
          <line key={i} x1={110 + i * 14} y1="14" x2={110 + i * 14} y2="36" stroke={stripe} strokeWidth="1.2"/>
        ))}
        <path d="M66,48 L70,86 L210,86 L214,48 Z" fill={glass} stroke="rgba(100,160,255,0.3)" strokeWidth="1"/>
        <line x1="140" y1="48" x2="140" y2="86" stroke="rgba(240,237,232,0.12)" strokeWidth="1"/>
        <rect x="68" y="86" width="144" height="30" rx="4" fill={body2}/>
        <rect x="72" y="82" width="136" height="8" rx="3" fill="#0d0d22" stroke={line} strokeWidth="0.8"/>
        <line x1="60" y1="98" x2="220" y2="98" stroke={line} strokeWidth="0.8"/>
        <rect x="96" y="118" width="88" height="22" rx="4" fill="#0d0d22" stroke={line} strokeWidth="1"/>
        <circle cx="140" cy="129" r="8" fill={body} stroke={line} strokeWidth="1.2"/>
        <circle cx="140" cy="129" r="3" fill="#333"/>
        <rect x="38" y="142" width="204" height="192" rx="4" fill={body} stroke={color} strokeWidth="1" strokeOpacity="0.3"/>
        <line x1="140" y1="142" x2="140" y2="334" stroke={line} strokeWidth="1"/>
        {[3,5,7,9,11].map(i => (
          <line key={i} x1="38" y1={142 + i * 16} x2="242" y2={142 + i * 16} stroke={stripe} strokeWidth="0.7"/>
        ))}
        <path d="M42,334 Q140,342 238,334 L238,354 Q140,362 42,354 Z" fill="#111122" stroke={line} strokeWidth="0.8"/>
        <rect x="42" y="316" width="32" height="16" rx="2" fill="rgba(255,50,50,0.45)"/>
        <rect x="206" y="316" width="32" height="16" rx="2" fill="rgba(255,50,50,0.45)"/>
        {[{ cx: 44, cy: 82 }, { cx: 236, cy: 82 }].map((w, i) => (
          <g key={i}>
            <ellipse cx={w.cx} cy={w.cy} rx="14" ry="22" fill={wheel} stroke="rgba(240,237,232,0.18)" strokeWidth="1.5"/>
            <ellipse cx={w.cx} cy={w.cy} rx="7" ry="11" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8"/>
          </g>
        ))}
        {[
          { cx: 28, cy: 252, rx: 12, ry: 20 }, { cx: 28, cy: 268, rx: 12, ry: 20 },
          { cx: 252, cy: 252, rx: 12, ry: 20 }, { cx: 252, cy: 268, rx: 12, ry: 20 },
          { cx: 22, cy: 278, rx: 12, ry: 20 }, { cx: 22, cy: 294, rx: 12, ry: 20 },
          { cx: 258, cy: 278, rx: 12, ry: 20 }, { cx: 258, cy: 294, rx: 12, ry: 20 },
        ].map((w, i) => (
          <ellipse key={i} cx={w.cx} cy={w.cy} rx={w.rx} ry={w.ry}
            fill={wheel} stroke="rgba(240,237,232,0.14)" strokeWidth="1.2"/>
        ))}
      </g>
    );

    // ── BUS — existant conservé
    case 'bus': return (
      <g>
        <rect x="50" y="10" width="180" height="340" rx="18" fill="rgba(0,0,0,0.14)"/>
        <path d="M60,16 Q140,6 220,16 L228,46 L228,320 L224,344 Q140,356 56,344 L52,320 L52,46 Z"
          fill={body} stroke={color} strokeWidth="1.2" strokeOpacity="0.35"/>
        <rect x="64" y="16" width="152" height="40" rx="8" fill={body2}/>
        <path d="M70,48 L66,88 L214,88 L210,48 Z" fill={glass} stroke="rgba(100,160,255,0.3)" strokeWidth="1"/>
        <rect x="66" y="20" width="38" height="20" rx="4" fill="rgba(255,240,160,0.22)" stroke="rgba(255,240,160,0.35)" strokeWidth="1"/>
        <rect x="176" y="20" width="38" height="20" rx="4" fill="rgba(255,240,160,0.22)" stroke="rgba(255,240,160,0.35)" strokeWidth="1"/>
        <rect x="104" y="18" width="72" height="22" rx="3" fill="rgba(20,20,60,0.6)" stroke={line} strokeWidth="0.8"/>
        <rect x="58" y="88" width="164" height="196" rx="4" fill={body2}/>
        {[96,130,164,198,232].map(y => (
          <rect key={y} x="34" y={y} width="24" height="28" rx="3" fill={glass} stroke="rgba(100,160,255,0.2)" strokeWidth="0.8"/>
        ))}
        {[96,130,164,198,232].map(y => (
          <rect key={y} x="222" y={y} width="24" height="28" rx="3" fill={glass} stroke="rgba(100,160,255,0.2)" strokeWidth="0.8"/>
        ))}
        <rect x="20" y="86" width="18" height="54" rx="3" fill="rgba(80,120,200,0.12)" stroke="rgba(80,120,200,0.3)" strokeWidth="1.5"/>
        <rect x="20" y="216" width="18" height="54" rx="3" fill="rgba(80,120,200,0.12)" stroke="rgba(80,120,200,0.3)" strokeWidth="1.5"/>
        <rect x="20" y="148" width="240" height="6" fill={`${color}30`}/>
        <path d="M70,284 L66,314 L214,314 L210,284 Z" fill={glass} stroke="rgba(100,160,255,0.25)" strokeWidth="1"/>
        <rect x="64" y="314" width="152" height="34" rx="6" fill={body2}/>
        <rect x="58" y="296" width="36" height="16" rx="3" fill="rgba(255,50,50,0.4)"/>
        <rect x="186" y="296" width="36" height="16" rx="3" fill="rgba(255,50,50,0.4)"/>
        {[{ cx: 36, cy: 106 }, { cx: 244, cy: 106 }, { cx: 36, cy: 278 }, { cx: 244, cy: 278 }].map((w, i) => (
          <g key={i}>
            <ellipse cx={w.cx} cy={w.cy} rx="15" ry="24" fill={wheel} stroke="rgba(240,237,232,0.18)" strokeWidth="1.5"/>
            <ellipse cx={w.cx} cy={w.cy} rx="7" ry="12" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8"/>
          </g>
        ))}
      </g>
    );

    // ── TRAM / TRAIN — existant conservé
    case 'tram':
    case 'train': return (
      <g>
        <line x1="110" y1="0" x2="110" y2="400" stroke="rgba(150,120,80,0.2)" strokeWidth="4"/>
        <line x1="170" y1="0" x2="170" y2="400" stroke="rgba(150,120,80,0.2)" strokeWidth="4"/>
        {[0,30,60,90,120,150,180,210,240,270,300,330,360].map(y => (
          <line key={y} x1="108" y1={y} x2="172" y2={y} stroke="rgba(150,120,80,0.25)" strokeWidth="3"/>
        ))}
        <path d="M56,14 Q140,4 224,14 L232,44 L232,348 L226,372 Q140,382 54,372 L48,348 L48,44 Z"
          fill={body} stroke={color} strokeWidth="1.3" strokeOpacity="0.4"/>
        <path d="M58,14 Q140,4 222,14 L228,52 L52,52 Z" fill={body2} stroke={line} strokeWidth="0.8"/>
        <path d="M70,22 Q140,12 210,22 L218,50 L62,50 Z" fill={glass} stroke="rgba(100,160,255,0.35)" strokeWidth="1"/>
        {[62,98,134,170,206,242,278].map(y => (
          <rect key={y} x="30" y={y} width="26" height="34" rx="4" fill={glass} stroke="rgba(100,160,255,0.18)" strokeWidth="0.8"/>
        ))}
        {[62,98,134,170,206,242,278].map(y => (
          <rect key={y} x="224" y={y} width="26" height="34" rx="4" fill={glass} stroke="rgba(100,160,255,0.18)" strokeWidth="0.8"/>
        ))}
        <rect x="50" y="164" width="180" height="18" rx="3" fill="#0a0a1a" stroke={line} strokeWidth="1"/>
        <rect x="56" y="52" width="168" height="110" rx="3" fill={body2}/>
        <rect x="56" y="182" width="168" height="130" rx="3" fill={body2}/>
        {[70, 210].map(y => (
          <g key={y}>
            <rect x="22" y={y} width="26" height="48" rx="3" fill="rgba(80,120,200,0.1)" stroke="rgba(80,120,200,0.3)" strokeWidth="1.5"/>
            <rect x="232" y={y} width="26" height="48" rx="3" fill="rgba(80,120,200,0.1)" stroke="rgba(80,120,200,0.3)" strokeWidth="1.5"/>
          </g>
        ))}
        <rect x="22" y="150" width="236" height="8" fill={`${color}35`}/>
        <path d="M58,330 L52,354 L228,354 L222,330 Z" fill={body2} stroke={line} strokeWidth="0.8"/>
        <path d="M62,336 L56,354 L224,354 L218,336 Z" fill={glass} stroke="rgba(100,160,255,0.25)" strokeWidth="1"/>
        {[{ y: 100 }, { y: 256 }].map((b, i) => (
          <g key={i}>
            <rect x="90" y={b.y - 12} width="100" height="24" rx="4" fill="#0a0a18" stroke={line} strokeWidth="1"/>
            {[{ cx: 100 }, { cx: 140 }, { cx: 180 }].map((w, j) => (
              <ellipse key={j} cx={w.cx} cy={b.y} rx="12" ry="10" fill={wheel} stroke="rgba(240,237,232,0.15)" strokeWidth="1.2"/>
            ))}
          </g>
        ))}
      </g>
    );

    // ── PIÉTON — existant conservé
    case 'pedestrian': return (
      <g>
        <ellipse cx="140" cy="200" rx="62" ry="185" fill="rgba(0,0,0,0.14)"/>
        <circle cx="140" cy="52" r="38" fill={body} stroke="rgba(240,237,232,0.18)" strokeWidth="1.5"/>
        <circle cx="140" cy="52" r="28" fill={body2}/>
        <rect x="130" y="88" width="20" height="16" rx="4" fill={body} stroke={line} strokeWidth="0.8"/>
        <path d="M80,106 Q100,96 130,102 L130,118 Q100,114 80,124 Z" fill={body} stroke={line} strokeWidth="1"/>
        <path d="M200,106 Q180,96 150,102 L150,118 Q180,114 200,124 Z" fill={body} stroke={line} strokeWidth="1"/>
        <path d="M104,102 Q140,92 176,102 L180,196 Q140,208 100,196 Z" fill={body} stroke="rgba(240,237,232,0.16)" strokeWidth="1.2"/>
        <path d="M108,110 Q140,100 172,110 L170,170 Q140,180 110,170 Z" fill={body2}/>
        <line x1="140" y1="104" x2="140" y2="196" stroke={stripe} strokeWidth="1.5"/>
        <path d="M80,124 Q62,142 60,182 Q58,218 66,250 L88,250 Q82,218 84,182 Q86,148 100,124 Z" fill={body} stroke={line} strokeWidth="1"/>
        <path d="M200,124 Q218,142 220,182 Q222,218 214,250 L192,250 Q198,218 196,182 Q194,148 180,124 Z" fill={body} stroke={line} strokeWidth="1"/>
        <ellipse cx="76" cy="254" rx="14" ry="18" fill={body2} stroke={line} strokeWidth="0.8"/>
        <ellipse cx="204" cy="254" rx="14" ry="18" fill={body2} stroke={line} strokeWidth="0.8"/>
        <rect x="102" y="196" width="76" height="14" rx="4" fill="#111130" stroke={line} strokeWidth="0.8"/>
        <path d="M100,208 Q118,200 138,206 L136,268 Q118,276 100,268 Z" fill={body} stroke={line} strokeWidth="1"/>
        <path d="M180,208 Q162,200 142,206 L144,268 Q162,276 180,268 Z" fill={body} stroke={line} strokeWidth="1"/>
        <path d="M100,268 Q96,296 98,342 L122,342 Q124,296 130,268 Z" fill={body} stroke={line} strokeWidth="1"/>
        <path d="M180,268 Q184,296 182,342 L158,342 Q156,296 150,268 Z" fill={body} stroke={line} strokeWidth="1"/>
        <ellipse cx="110" cy="308" rx="13" ry="10" fill={body2} stroke={line} strokeWidth="0.8"/>
        <ellipse cx="170" cy="308" rx="13" ry="10" fill={body2} stroke={line} strokeWidth="0.8"/>
        <path d="M96,340 Q88,348 84,362 L126,362 L126,340 Z" fill={body2} stroke={line} strokeWidth="0.8"/>
        <path d="M184,340 Q192,348 196,362 L154,362 L154,340 Z" fill={body2} stroke={line} strokeWidth="0.8"/>
      </g>
    );

    // ── QUAD / OTHER ─────────────────────────────────────────
    default: return (
      <g>
        <ellipse cx="140" cy="200" rx="100" ry="195" fill="rgba(0,0,0,0.14)"/>
        <path d="M82,20 Q140,8 198,20 L212,60 L218,140 L218,260 L208,310 Q140,324 72,310 L62,260 L62,140 L68,60 Z"
          fill={body} stroke={color} strokeWidth="1.2" strokeOpacity="0.35"/>
        <path d="M84,18 Q140,8 196,18 L204,60 L76,60 Z" fill={body2} stroke={line} strokeWidth="0.8"/>
        <path d="M84,60 L76,90 L204,90 L196,60 Z" fill={glass} stroke="rgba(100,160,255,0.3)" strokeWidth="1"/>
        <rect x="76" y="90" width="128" height="120" rx="4" fill={body2}/>
        <path d="M82,210 L76,240 L204,240 L198,210 Z" fill={glass} stroke="rgba(100,160,255,0.25)" strokeWidth="1"/>
        <path d="M84,240 Q140,252 196,240 L202,300 Q140,316 78,300 Z" fill={body2} stroke={line} strokeWidth="0.8"/>
        {[{ cx: 46, cy: 126 }, { cx: 234, cy: 126 }, { cx: 46, cy: 244 }, { cx: 234, cy: 244 }].map((w, i) => (
          <g key={i}>
            <ellipse cx={w.cx} cy={w.cy} rx="22" ry="34" fill={wheel} stroke="rgba(240,237,232,0.2)" strokeWidth="1.5"/>
            <ellipse cx={w.cx} cy={w.cy} rx="11" ry="17" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8"/>
          </g>
        ))}
        <rect x="78" y="94" width="6" height="116" rx="2" fill="rgba(240,237,232,0.12)"/>
        <rect x="196" y="94" width="6" height="116" rx="2" fill="rgba(240,237,232,0.12)"/>
      </g>
    );
  }
}
