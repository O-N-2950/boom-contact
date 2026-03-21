/**
 * boom.contact — Silhouettes vectorielles véhicules vue de dessus
 * Dessin technique précis — couleur réelle du véhicule appliquée
 */
import type { BodyStyle } from './vehicleMapper';

export type VehicleShape =
  | 'car' | 'motorcycle' | 'scooter' | 'escooter'
  | 'truck' | 'van' | 'bus' | 'tram' | 'train'
  | 'bicycle' | 'pedestrian' | 'quad' | 'other';

// Map BodyStyle → VehicleShape for SVG selection
export function bodyStyleToShape(bs?: BodyStyle): VehicleShape {
  if (!bs) return 'car';
  switch (bs) {
    case 'hatchback_3': case 'hatchback_5': case 'sedan':
    case 'coupe': case 'convertible': case 'estate':
    case 'suv_small': case 'suv_medium': case 'suv_large':
    case 'mpv': case 'minivan': case 'pickup': return 'car';
    case 'van_small': case 'van_medium': return 'van';
    case 'van_large': return 'truck';
    case 'moto_naked': case 'moto_sport': case 'moto_touring': return 'motorcycle';
    case 'scooter': case 'escooter': return 'scooter';
    case 'bicycle': return 'bicycle';
    case 'truck_rigid': case 'truck_semi': return 'truck';
    case 'bus': return 'bus';
    case 'tram': case 'train': return 'tram';
    case 'pedestrian': return 'pedestrian';
    default: return 'car';
  }
}

export interface DamageZone {
  id: string;
  label: string;
  // Polygon points ou rect {x,y,w,h} pour la hit zone
  type: 'rect' | 'polygon' | 'ellipse' | 'circle';
  // Pour rect:
  x?: number; y?: number; w?: number; h?: number;
  // Pour polygon:
  points?: string;
  // Pour ellipse/circle:
  cx?: number; cy?: number; rx?: number; ry?: number; r?: number;
}

// ────────────────────────────────────────────────────────────────
// VOITURE — vue dessus, front en haut
// ────────────────────────────────────────────────────────────────
export const CAR_ZONES: DamageZone[] = [
  { id: 'front',       label: 'Avant',         type: 'rect',    x: 88,  y: 8,   w: 104, h: 36 },
  { id: 'front-left',  label: 'Av. Gauche',    type: 'rect',    x: 38,  y: 14,  w: 54,  h: 44 },
  { id: 'front-right', label: 'Av. Droit',     type: 'rect',    x: 188, y: 14,  w: 54,  h: 44 },
  { id: 'hood',        label: 'Capot',         type: 'rect',    x: 84,  y: 44,  w: 112, h: 44 },
  { id: 'windshield',  label: 'Pare-brise',    type: 'rect',    x: 88,  y: 90,  w: 104, h: 30 },
  { id: 'mirror-l',    label: 'Rétro Gauche',  type: 'rect',    x: 50,  y: 94,  w: 36,  h: 24 },
  { id: 'mirror-r',    label: 'Rétro Droit',   type: 'rect',    x: 194, y: 94,  w: 36,  h: 24 },
  { id: 'door-fl',     label: 'Porte Av.G',    type: 'rect',    x: 32,  y: 122, w: 52,  h: 52 },
  { id: 'door-fr',     label: 'Porte Av.D',    type: 'rect',    x: 196, y: 122, w: 52,  h: 52 },
  { id: 'roof',        label: 'Toit',          type: 'rect',    x: 84,  y: 122, w: 112, h: 96 },
  { id: 'door-rl',     label: 'Porte Ar.G',    type: 'rect',    x: 32,  y: 178, w: 52,  h: 48 },
  { id: 'door-rr',     label: 'Porte Ar.D',    type: 'rect',    x: 196, y: 178, w: 52,  h: 48 },
  { id: 'rear-window', label: 'Lunette Ar.',   type: 'rect',    x: 88,  y: 220, w: 104, h: 28 },
  { id: 'trunk',       label: 'Coffre',        type: 'rect',    x: 84,  y: 248, w: 112, h: 44 },
  { id: 'rear',        label: 'Arrière',       type: 'rect',    x: 88,  y: 290, w: 104, h: 36 },
  { id: 'rear-left',   label: 'Ar. Gauche',    type: 'rect',    x: 38,  y: 280, w: 54,  h: 44 },
  { id: 'rear-right',  label: 'Ar. Droit',     type: 'rect',    x: 188, y: 280, w: 54,  h: 44 },
  { id: 'wheel-fl',    label: 'Roue Av.G',     type: 'ellipse', cx: 48,  cy: 138, rx: 18, ry: 26 },
  { id: 'wheel-fr',    label: 'Roue Av.D',     type: 'ellipse', cx: 232, cy: 138, rx: 18, ry: 26 },
  { id: 'wheel-rl',    label: 'Roue Ar.G',     type: 'ellipse', cx: 48,  cy: 210, rx: 18, ry: 26 },
  { id: 'wheel-rr',    label: 'Roue Ar.D',     type: 'ellipse', cx: 232, cy: 210, rx: 18, ry: 26 },
];

// ────────────────────────────────────────────────────────────────
// MOTO — vue dessus, front en haut
// ────────────────────────────────────────────────────────────────
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

// ────────────────────────────────────────────────────────────────
// SCOOTER / TROTTINETTE ÉLECTRIQUE — vue dessus
// ────────────────────────────────────────────────────────────────
export const SCOOTER_ZONES: DamageZone[] = [
  { id: 'front-wheel',   label: 'Roue avant',       type: 'ellipse', cx: 140, cy: 50,  rx: 18, ry: 30 },
  { id: 'handlebar-l',   label: 'Guidon Gauche',    type: 'rect',    x: 62,  y: 86,  w: 64,  h: 20 },
  { id: 'handlebar-r',   label: 'Guidon Droit',     type: 'rect',    x: 154, y: 86,  w: 64,  h: 20 },
  { id: 'front-panel',   label: 'Tablier avant',    type: 'rect',    x: 104, y: 86,  w: 72,  h: 56 },
  { id: 'footboard',     label: 'Plancher',         type: 'rect',    x: 100, y: 150, w: 80,  h: 100},
  { id: 'seat',          label: 'Selle',            type: 'rect',    x: 106, y: 250, w: 68,  h: 50 },
  { id: 'storage',       label: 'Coffre',           type: 'rect',    x: 104, y: 300, w: 72,  h: 36 },
  { id: 'rear-wheel',    label: 'Roue arrière',     type: 'ellipse', cx: 140, cy: 356, rx: 18, ry: 30 },
];

// ────────────────────────────────────────────────────────────────
// VÉLO — vue dessus
// ────────────────────────────────────────────────────────────────
export const BICYCLE_ZONES: DamageZone[] = [
  { id: 'front-wheel',   label: 'Roue avant',       type: 'ellipse', cx: 140, cy: 54,  rx: 20, ry: 40 },
  { id: 'handlebar-l',   label: 'Guidon Gauche',    type: 'rect',    x: 62,  y: 96,  w: 70,  h: 18 },
  { id: 'handlebar-r',   label: 'Guidon Droit',     type: 'rect',    x: 148, y: 96,  w: 70,  h: 18 },
  { id: 'stem',          label: 'Potence / Fourche', type: 'rect',   x: 126, y: 96,  w: 28,  h: 50 },
  { id: 'frame-top',     label: 'Cadre haut',       type: 'rect',    x: 120, y: 146, w: 40,  h: 90 },
  { id: 'frame-l',       label: 'Cadre Gauche',     type: 'rect',    x: 90,  y: 176, w: 40,  h: 48 },
  { id: 'frame-r',       label: 'Cadre Droit',      type: 'rect',    x: 150, y: 176, w: 40,  h: 48 },
  { id: 'saddle',        label: 'Selle',            type: 'rect',    x: 118, y: 238, w: 44,  h: 28 },
  { id: 'rear-wheel',    label: 'Roue arrière',     type: 'ellipse', cx: 140, cy: 316, rx: 20, ry: 40 },
];

// ────────────────────────────────────────────────────────────────
// CAMION — vue dessus (cabine + remorque)
// ────────────────────────────────────────────────────────────────
export const TRUCK_ZONES: DamageZone[] = [
  // Cabine
  { id: 'cab-front',     label: 'Pare-choc avant',  type: 'rect',    x: 72,  y: 8,   w: 136, h: 32 },
  { id: 'cab-left',      label: 'Cabine Gauche',    type: 'rect',    x: 30,  y: 36,  w: 46,  h: 80 },
  { id: 'cab-right',     label: 'Cabine Droite',    type: 'rect',    x: 204, y: 36,  w: 46,  h: 80 },
  { id: 'windshield',    label: 'Pare-brise',       type: 'rect',    x: 78,  y: 36,  w: 124, h: 36 },
  { id: 'cab-roof',      label: 'Toit Cabine',      type: 'rect',    x: 78,  y: 74,  w: 124, h: 44 },
  // Attelage
  { id: 'coupling',      label: 'Attelage / Col de cygne', type: 'rect', x: 92, y: 120, w: 96, h: 28 },
  // Remorque / caisse
  { id: 'cargo-left',    label: 'Flanc Gauche',     type: 'rect',    x: 26,  y: 150, w: 42,  h: 176},
  { id: 'cargo-right',   label: 'Flanc Droit',      type: 'rect',    x: 212, y: 150, w: 42,  h: 176},
  { id: 'cargo-roof',    label: 'Toit Caisse',      type: 'rect',    x: 68,  y: 150, w: 144, h: 176},
  { id: 'cargo-rear',    label: 'Hayon / Arrière',  type: 'rect',    x: 68,  y: 328, w: 144, h: 40 },
  { id: 'rear-bumper',   label: 'Pare-choc Arrière',type: 'rect',    x: 72,  y: 366, w: 136, h: 26 },
  // Roues cabine
  { id: 'wheel-fl',      label: 'Roue Av.G',        type: 'ellipse', cx: 46,  cy: 80,  rx: 14, ry: 26 },
  { id: 'wheel-fr',      label: 'Roue Av.D',        type: 'ellipse', cx: 234, cy: 80,  rx: 14, ry: 26 },
  // Roues remorque
  { id: 'wheel-rl',      label: 'Essieu Ar.G',      type: 'rect',    x: 14,  y: 260, w: 26,  h: 60 },
  { id: 'wheel-rr',      label: 'Essieu Ar.D',      type: 'rect',    x: 240, y: 260, w: 26,  h: 60 },
];

// ────────────────────────────────────────────────────────────────
// BUS — vue dessus
// ────────────────────────────────────────────────────────────────
export const BUS_ZONES: DamageZone[] = [
  { id: 'front',         label: 'Face avant',       type: 'rect',    x: 68,  y: 8,   w: 144, h: 36 },
  { id: 'front-left',    label: 'Av. Gauche',       type: 'rect',    x: 24,  y: 14,  w: 48,  h: 52 },
  { id: 'front-right',   label: 'Av. Droit',        type: 'rect',    x: 208, y: 14,  w: 48,  h: 52 },
  { id: 'windshield',    label: 'Pare-brise',       type: 'rect',    x: 74,  y: 44,  w: 132, h: 30 },
  { id: 'side-left',     label: 'Flanc Gauche',     type: 'rect',    x: 14,  y: 68,  w: 48,  h: 224},
  { id: 'side-right',    label: 'Flanc Droit',      type: 'rect',    x: 218, y: 68,  w: 48,  h: 224},
  { id: 'roof',          label: 'Toit',             type: 'rect',    x: 62,  y: 68,  w: 156, h: 224},
  { id: 'door-front',    label: 'Porte avant',      type: 'rect',    x: 14,  y: 78,  w: 48,  h: 60 },
  { id: 'door-rear',     label: 'Porte arrière',    type: 'rect',    x: 14,  y: 188, w: 48,  h: 60 },
  { id: 'rear-window',   label: 'Lunette arrière',  type: 'rect',    x: 74,  y: 288, w: 132, h: 28 },
  { id: 'rear',          label: 'Face arrière',     type: 'rect',    x: 68,  y: 318, w: 144, h: 36 },
  { id: 'rear-left',     label: 'Ar. Gauche',       type: 'rect',    x: 24,  y: 294, w: 48,  h: 52 },
  { id: 'rear-right',    label: 'Ar. Droit',        type: 'rect',    x: 208, y: 294, w: 48,  h: 52 },
  { id: 'wheel-fl',      label: 'Roue Av.G',        type: 'ellipse', cx: 36,  cy: 100, rx: 14, ry: 22 },
  { id: 'wheel-fr',      label: 'Roue Av.D',        type: 'ellipse', cx: 244, cy: 100, rx: 14, ry: 22 },
  { id: 'wheel-rl',      label: 'Roue Ar.G',        type: 'ellipse', cx: 36,  cy: 268, rx: 14, ry: 22 },
  { id: 'wheel-rr',      label: 'Roue Ar.D',        type: 'ellipse', cx: 244, cy: 268, rx: 14, ry: 22 },
];

// ────────────────────────────────────────────────────────────────
// TRAM / TRAIN — vue dessus (articulé)
// ────────────────────────────────────────────────────────────────
export const TRAM_ZONES: DamageZone[] = [
  { id: 'cab-front',     label: 'Cabine avant',     type: 'rect',    x: 72,  y: 6,   w: 136, h: 52 },
  { id: 'section1-left', label: 'Section 1 Gauche', type: 'rect',    x: 20,  y: 58,  w: 56,  h: 88 },
  { id: 'section1-right',label: 'Section 1 Droite', type: 'rect',    x: 204, y: 58,  w: 56,  h: 88 },
  { id: 'section1-roof', label: 'Toit Section 1',   type: 'rect',    x: 76,  y: 58,  w: 128, h: 88 },
  { id: 'joint',         label: 'Soufflet / Joint', type: 'rect',    x: 60,  y: 148, w: 160, h: 28 },
  { id: 'section2-left', label: 'Section 2 Gauche', type: 'rect',    x: 20,  y: 178, w: 56,  h: 88 },
  { id: 'section2-right',label: 'Section 2 Droite', type: 'rect',    x: 204, y: 178, w: 56,  h: 88 },
  { id: 'section2-roof', label: 'Toit Section 2',   type: 'rect',    x: 76,  y: 178, w: 128, h: 88 },
  { id: 'cab-rear',      label: 'Cabine arrière',   type: 'rect',    x: 72,  y: 268, w: 136, h: 52 },
  { id: 'door-fl',       label: 'Porte 1 Gauche',   type: 'rect',    x: 20,  y: 88,  w: 56,  h: 44 },
  { id: 'door-fr',       label: 'Porte 1 Droite',   type: 'rect',    x: 204, y: 88,  w: 56,  h: 44 },
  { id: 'door-rl',       label: 'Porte 2 Gauche',   type: 'rect',    x: 20,  y: 200, w: 56,  h: 44 },
  { id: 'door-rr',       label: 'Porte 2 Droite',   type: 'rect',    x: 204, y: 200, w: 56,  h: 44 },
];

// ────────────────────────────────────────────────────────────────
// PIÉTON — silhouette humaine vue de dessus
// ────────────────────────────────────────────────────────────────
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

// ────────────────────────────────────────────────────────────────
// Résolution type → zones
// ────────────────────────────────────────────────────────────────
export function getZonesForType(type: VehicleShape): DamageZone[] {
  switch (type) {
    case 'car':                         return CAR_ZONES;
    case 'motorcycle':                  return MOTO_ZONES;
    case 'scooter':
    case 'moped':
    case 'escooter':                    return SCOOTER_ZONES;
    case 'bicycle':
    case 'cargo_bike':                  return BICYCLE_ZONES;
    case 'truck':                       return TRUCK_ZONES;
    case 'van':                         return [...TRUCK_ZONES.slice(0,6), ...TRUCK_ZONES.slice(6)];
    case 'bus':                         return BUS_ZONES;
    case 'tram':
    case 'train':                       return TRAM_ZONES;
    case 'pedestrian':                  return PEDESTRIAN_ZONES;
    default:                            return CAR_ZONES;
  }
}

// ────────────────────────────────────────────────────────────────
// Rendu SVG silhouette — dessin technique vue de dessus
// ────────────────────────────────────────────────────────────────
interface SilhouetteProps {
  type: VehicleShape;
  color: string;         // couleur de rôle (highlight zones)
  bodyColor?: string;    // couleur réelle du véhicule
  bodyColorDark?: string; // couleur assombrie pour détails
}

export function VehicleSilhouetteSVG({ type, color, bodyColor, bodyColorDark }: SilhouetteProps) {
  // Use actual vehicle color or fall back to dark scheme
  const body  = bodyColor     ?? '#1C1C32';
  const body2 = bodyColorDark ?? '#14142A';
  const glass  = 'rgba(100,160,255,0.18)';
  const wheel  = '#0a0a18';
  const stripe = `rgba(240,237,232,0.07)`;
  const line   = `rgba(240,237,232,0.12)`;

  switch (type) {
    // ── CAR ────────────────────────────────────────────────────
    case 'car': return (
      <g>
        {/* Shadow */}
        <ellipse cx="140" cy="200" rx="108" ry="210" fill="rgba(0,0,0,0.18)"/>
        {/* Body outer */}
        <path d="M88,18 Q140,6 192,18 L216,44 L222,120 L222,230 L214,300 Q140,320 66,300 L58,230 L58,120 L64,44 Z"
          fill={body} stroke={color} strokeWidth="1.2" strokeOpacity="0.35"/>
        {/* Hood */}
        <path d="M90,42 Q140,32 190,42 L204,88 L76,88 Z"
          fill={body2} stroke={line} strokeWidth="0.8"/>
        {/* Hood crease lines */}
        <line x1="140" y1="36" x2="140" y2="88" stroke={stripe} strokeWidth="1.5"/>
        <line x1="116" y1="40" x2="104" y2="88" stroke={stripe} strokeWidth="0.8"/>
        <line x1="164" y1="40" x2="176" y2="88" stroke={stripe} strokeWidth="0.8"/>
        {/* Windshield */}
        <path d="M90,88 L80,116 L200,116 L190,88 Z" fill={glass} stroke="rgba(100,160,255,0.3)" strokeWidth="1"/>
        {/* A-pillars */}
        <line x1="90" y1="88" x2="80" y2="116" stroke="rgba(240,237,232,0.2)" strokeWidth="2.5"/>
        <line x1="190" y1="88" x2="200" y2="116" stroke="rgba(240,237,232,0.2)" strokeWidth="2.5"/>
        {/* Roof */}
        <rect x="80" y="116" width="120" height="108" rx="4" fill={body2}/>
        {/* Roof sunroof detail */}
        <rect x="100" y="130" width="80" height="60" rx="6" fill="rgba(0,0,0,0.3)" stroke={stripe} strokeWidth="0.8"/>
        {/* B-pillars */}
        <rect x="78" y="158" width="6" height="22" fill="rgba(240,237,232,0.15)" rx="1"/>
        <rect x="196" y="158" width="6" height="22" fill="rgba(240,237,232,0.15)" rx="1"/>
        {/* Rear window */}
        <path d="M80,224 L90,252 L190,252 L200,224 Z" fill={glass} stroke="rgba(100,160,255,0.3)" strokeWidth="1"/>
        {/* Trunk */}
        <path d="M90,252 Q140,268 190,252 L200,292 Q140,310 80,292 Z"
          fill={body2} stroke={line} strokeWidth="0.8"/>
        {/* Trunk crease */}
        <line x1="140" y1="256" x2="140" y2="296" stroke={stripe} strokeWidth="1.2"/>
        {/* Rear bumper */}
        <path d="M80,292 Q140,312 200,292 L204,308 Q140,326 76,308 Z"
          fill="#111122" stroke={line} strokeWidth="0.8"/>
        {/* Rear lights */}
        <rect x="80" y="294" width="26" height="12" rx="2" fill="rgba(255,60,60,0.5)"/>
        <rect x="174" y="294" width="26" height="12" rx="2" fill="rgba(255,60,60,0.5)"/>
        {/* Front lights */}
        <rect x="82" y="30" width="24" height="10" rx="2" fill="rgba(255,240,180,0.5)"/>
        <rect x="174" y="30" width="24" height="10" rx="2" fill="rgba(255,240,180,0.5)"/>
        {/* Side mirrors */}
        <path d="M64,106 L50,100 L50,122 L64,116 Z" fill={body} stroke={line} strokeWidth="0.8"/>
        <path d="M216,106 L230,100 L230,122 L216,116 Z" fill={body} stroke={line} strokeWidth="0.8"/>
        {/* Door lines */}
        <line x1="66" y1="156" x2="80" y2="156" stroke={line} strokeWidth="1"/>
        <line x1="200" y1="156" x2="214" y2="156" stroke={line} strokeWidth="1"/>
        <line x1="66" y1="220" x2="80" y2="220" stroke={line} strokeWidth="1"/>
        <line x1="200" y1="220" x2="214" y2="220" stroke={line} strokeWidth="1"/>
        {/* Door handles */}
        <rect x="62" y="172" width="8" height="4" rx="1" fill={line}/>
        <rect x="210" y="172" width="8" height="4" rx="1" fill={line}/>
        <rect x="62" y="192" width="8" height="4" rx="1" fill={line}/>
        <rect x="210" y="192" width="8" height="4" rx="1" fill={line}/>
        {/* Wheels */}
        {[{cx:48,cy:138},{cx:232,cy:138},{cx:48,cy:210},{cx:232,cy:210}].map((w,i)=>(
          <g key={i}>
            <ellipse cx={w.cx} cy={w.cy} rx="17" ry="26" fill={wheel} stroke="rgba(240,237,232,0.18)" strokeWidth="1.5"/>
            <ellipse cx={w.cx} cy={w.cy} rx="9" ry="15" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8"/>
            {/* Wheel bolts */}
            {[0,72,144,216,288].map(a=>(
              <circle key={a} cx={w.cx + Math.sin(a*Math.PI/180)*5.5} cy={w.cy - Math.cos(a*Math.PI/180)*9} r="1.2" fill="rgba(255,255,255,0.2)"/>
            ))}
          </g>
        ))}
        {/* Wheel arches */}
        <path d="M32,110 Q14,138 32,166" fill="none" stroke="rgba(240,237,232,0.12)" strokeWidth="2.5"/>
        <path d="M248,110 Q266,138 248,166" fill="none" stroke="rgba(240,237,232,0.12)" strokeWidth="2.5"/>
        <path d="M32,182 Q14,210 32,238" fill="none" stroke="rgba(240,237,232,0.12)" strokeWidth="2.5"/>
        <path d="M248,182 Q266,210 248,238" fill="none" stroke="rgba(240,237,232,0.12)" strokeWidth="2.5"/>
      </g>
    );

    // ── MOTORCYCLE ─────────────────────────────────────────────
    case 'motorcycle': return (
      <g>
        <ellipse cx="140" cy="190" rx="60" ry="195" fill="rgba(0,0,0,0.15)"/>
        {/* Front wheel */}
        <ellipse cx="140" cy="54" rx="24" ry="40" fill={wheel} stroke="rgba(240,237,232,0.2)" strokeWidth="1.5"/>
        <ellipse cx="140" cy="54" rx="12" ry="20" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8"/>
        {/* Front fork */}
        <path d="M134,92 L128,118 L152,118 L146,92 Z" fill={body} stroke={line} strokeWidth="0.8"/>
        {/* Fairing / Headlight */}
        <path d="M116,108 Q140,96 164,108 L168,128 Q140,140 112,128 Z"
          fill={body2} stroke={line} strokeWidth="1"/>
        <ellipse cx="140" cy="116" rx="14" ry="8" fill="rgba(255,240,160,0.2)" stroke="rgba(255,240,160,0.4)" strokeWidth="0.8"/>
        {/* Handlebars */}
        <path d="M64,112 Q100,102 116,108" fill="none" stroke="rgba(240,237,232,0.35)" strokeWidth="4" strokeLinecap="round"/>
        <path d="M164,108 Q180,102 216,112" fill="none" stroke="rgba(240,237,232,0.35)" strokeWidth="4" strokeLinecap="round"/>
        <circle cx="66" cy="112" r="5" fill={body2} stroke={line} strokeWidth="1"/>
        <circle cx="214" cy="112" r="5" fill={body2} stroke={line} strokeWidth="1"/>
        {/* Fuel tank */}
        <path d="M112,136 Q140,126 168,136 L170,188 Q140,200 110,188 Z"
          fill={body} stroke={line} strokeWidth="1"/>
        <path d="M118,142 Q140,134 162,142 L160,180 Q140,190 120,180 Z"
          fill={body2}/>
        {/* Frame sides */}
        <path d="M88,156 L96,230 Q104,250 112,256" fill="none" stroke="rgba(240,237,232,0.2)" strokeWidth="3"/>
        <path d="M192,156 L184,230 Q176,250 168,256" fill="none" stroke="rgba(240,237,232,0.2)" strokeWidth="3"/>
        {/* Seat */}
        <path d="M110,192 Q140,182 170,192 L168,254 Q140,268 112,254 Z"
          fill="#1a1428" stroke={line} strokeWidth="0.8"/>
        {/* Seat texture */}
        {[200,212,224,240].map(y=>(
          <line key={y} x1="118" y1={y} x2="162" y2={y} stroke={stripe} strokeWidth="1.2"/>
        ))}
        {/* Exhaust pipes */}
        <path d="M88,210 Q72,220 68,246 Q66,272 72,290" fill="none" stroke="rgba(160,120,60,0.4)" strokeWidth="5" strokeLinecap="round"/>
        <path d="M192,210 Q208,220 212,246 Q214,272 208,290" fill="none" stroke="rgba(160,120,60,0.4)" strokeWidth="5" strokeLinecap="round"/>
        {/* Rear swingarm */}
        <path d="M118,256 Q128,296 134,312" fill="none" stroke="rgba(240,237,232,0.18)" strokeWidth="2.5"/>
        <path d="M162,256 Q152,296 146,312" fill="none" stroke="rgba(240,237,232,0.18)" strokeWidth="2.5"/>
        {/* Rear wheel */}
        <ellipse cx="140" cy="322" rx="24" ry="40" fill={wheel} stroke="rgba(240,237,232,0.2)" strokeWidth="1.5"/>
        <ellipse cx="140" cy="322" rx="12" ry="20" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8"/>
        {/* Chain */}
        <path d="M148,312 L152,280" fill="none" stroke="rgba(100,80,40,0.3)" strokeWidth="2" strokeDasharray="3,2"/>
      </g>
    );

    // ── SCOOTER / E-SCOOTER ─────────────────────────────────────
    case 'scooter':
    case 'moped':
    case 'escooter': return (
      <g>
        <ellipse cx="140" cy="200" rx="52" ry="195" fill="rgba(0,0,0,0.14)"/>
        {/* Front wheel */}
        <ellipse cx="140" cy="52" rx="20" ry="34" fill={wheel} stroke="rgba(240,237,232,0.2)" strokeWidth="1.5"/>
        <ellipse cx="140" cy="52" rx="10" ry="17" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8"/>
        {/* Fork */}
        <path d="M134,84 L130,104 L150,104 L146,84 Z" fill={body} stroke={line} strokeWidth="0.8"/>
        {/* Handlebars */}
        <path d="M68,96 Q104,88 120,100" fill="none" stroke="rgba(240,237,232,0.3)" strokeWidth="4.5" strokeLinecap="round"/>
        <path d="M160,100 Q176,88 212,96" fill="none" stroke="rgba(240,237,232,0.3)" strokeWidth="4.5" strokeLinecap="round"/>
        <circle cx="68" cy="97" r="6" fill={body2} stroke={line} strokeWidth="1"/>
        <circle cx="212" cy="97" r="6" fill={body2} stroke={line} strokeWidth="1"/>
        {/* Front panel (tablier) */}
        <path d="M108,100 Q140,90 172,100 L176,156 Q140,168 104,156 Z"
          fill={body} stroke={line} strokeWidth="1"/>
        {/* Headlight */}
        <ellipse cx="140" cy="108" rx="16" ry="9" fill="rgba(255,240,160,0.18)" stroke="rgba(255,240,160,0.35)" strokeWidth="0.8"/>
        {/* Storage box under panel */}
        <rect x="112" y="158" width="56" height="34" rx="6" fill={body2} stroke={line} strokeWidth="0.8"/>
        {/* Footboard */}
        <path d="M96,192 L184,192 L186,252 L94,252 Z" fill={body} stroke={line} strokeWidth="1"/>
        <line x1="100" y1="210" x2="180" y2="210" stroke={stripe} strokeWidth="1"/>
        <line x1="100" y1="228" x2="180" y2="228" stroke={stripe} strokeWidth="1"/>
        {/* Seat */}
        <path d="M108,252 Q140,242 172,252 L170,306 Q140,318 110,306 Z"
          fill="#1a1428" stroke={line} strokeWidth="0.8"/>
        {/* Storage/rear */}
        <path d="M112,308 Q140,296 168,308 L166,340 Q140,352 114,340 Z"
          fill={body2} stroke={line} strokeWidth="0.8"/>
        {/* Rear wheel */}
        <ellipse cx="140" cy="362" rx="20" ry="34" fill={wheel} stroke="rgba(240,237,232,0.2)" strokeWidth="1.5"/>
        <ellipse cx="140" cy="362" rx="10" ry="17" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8"/>
      </g>
    );

    // ── BICYCLE ────────────────────────────────────────────────
    case 'bicycle':
    case 'cargo_bike': return (
      <g>
        {/* Front wheel */}
        <ellipse cx="140" cy="54" rx="22" ry="42" fill={wheel} stroke="rgba(240,237,232,0.2)" strokeWidth="1.5"/>
        <ellipse cx="140" cy="54" rx="11" ry="21" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8"/>
        {/* Spokes front */}
        {[0,45,90,135,180,225,270,315].map(a=>(
          <line key={a} x1="140" y1="54" x2={140+Math.sin(a*Math.PI/180)*18} y2={54-Math.cos(a*Math.PI/180)*36}
            stroke="rgba(255,255,255,0.08)" strokeWidth="0.8"/>
        ))}
        {/* Fork */}
        <path d="M136,94 L132,116 L148,116 L144,94 Z" fill={body} stroke={line} strokeWidth="0.8"/>
        {/* Handlebars */}
        <path d="M70,104 Q104,96 124,108" fill="none" stroke="rgba(240,237,232,0.28)" strokeWidth="4" strokeLinecap="round"/>
        <path d="M156,108 Q176,96 210,104" fill="none" stroke="rgba(240,237,232,0.28)" strokeWidth="4" strokeLinecap="round"/>
        {/* Stem */}
        <rect x="133" y="106" width="14" height="28" rx="3" fill={body2} stroke={line} strokeWidth="0.8"/>
        {/* Top tube */}
        <path d="M136,134 L124,230" fill="none" stroke="rgba(240,237,232,0.22)" strokeWidth="5" strokeLinecap="round"/>
        <path d="M144,134 L156,230" fill="none" stroke="rgba(240,237,232,0.22)" strokeWidth="5" strokeLinecap="round"/>
        {/* Down tube */}
        <path d="M134,134 L122,244" fill="none" stroke="rgba(240,237,232,0.18)" strokeWidth="4" strokeLinecap="round"/>
        {/* Seat tube */}
        <rect x="132" y="162" width="16" height="68" rx="3" fill={body2} stroke={line} strokeWidth="1"/>
        {/* Saddle */}
        <path d="M116,236 Q140,226 164,236 L164,248 Q140,258 116,248 Z"
          fill="#1a1428" stroke={line} strokeWidth="0.8"/>
        {/* Seat post */}
        <rect x="134" y="228" width="12" height="16" rx="2" fill={body2}/>
        {/* Chain stays */}
        <path d="M128,232 Q116,262 124,302" fill="none" stroke="rgba(240,237,232,0.16)" strokeWidth="3.5"/>
        <path d="M152,232 Q164,262 156,302" fill="none" stroke="rgba(240,237,232,0.16)" strokeWidth="3.5"/>
        {/* Bottom bracket */}
        <circle cx="140" cy="238" r="10" fill={body} stroke={line} strokeWidth="1"/>
        <circle cx="140" cy="238" r="5" fill={body2}/>
        {/* Chain */}
        <path d="M148,244 Q156,272 156,302" fill="none" stroke="rgba(100,80,40,0.25)" strokeWidth="2" strokeDasharray="3,2"/>
        {/* Rear wheel */}
        <ellipse cx="140" cy="318" rx="22" ry="42" fill={wheel} stroke="rgba(240,237,232,0.2)" strokeWidth="1.5"/>
        <ellipse cx="140" cy="318" rx="11" ry="21" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8"/>
        {[0,45,90,135,180,225,270,315].map(a=>(
          <line key={a} x1="140" y1="318" x2={140+Math.sin(a*Math.PI/180)*18} y2={318-Math.cos(a*Math.PI/180)*36}
            stroke="rgba(255,255,255,0.08)" strokeWidth="0.8"/>
        ))}
      </g>
    );

    // ── TRUCK ──────────────────────────────────────────────────
    case 'truck':
    case 'van': return (
      <g>
        {/* Cab shadow */}
        <rect x="56" y="10" width="168" height="110" rx="10" fill="rgba(0,0,0,0.15)"/>
        {/* CABINE */}
        <path d="M68,12 Q140,4 212,12 L220,50 L220,118 L60,118 L60,50 Z"
          fill={body} stroke={color} strokeWidth="1.2" strokeOpacity="0.4"/>
        {/* Front bumper chrome */}
        <path d="M68,10 Q140,2 212,10" fill="none" stroke="rgba(200,200,200,0.3)" strokeWidth="3" strokeLinecap="round"/>
        {/* Headlights */}
        <rect x="68" y="14" width="34" height="16" rx="3" fill="rgba(255,240,160,0.25)" stroke="rgba(255,240,160,0.4)" strokeWidth="1"/>
        <rect x="178" y="14" width="34" height="16" rx="3" fill="rgba(255,240,160,0.25)" stroke="rgba(255,240,160,0.4)" strokeWidth="1"/>
        {/* Grille */}
        <rect x="104" y="14" width="72" height="22" rx="2" fill="rgba(0,0,0,0.3)" stroke={line} strokeWidth="0.8"/>
        {[0,1,2,3].map(i=>(
          <line key={i} x1={110+i*14} y1="14" x2={110+i*14} y2="36" stroke={stripe} strokeWidth="1.2"/>
        ))}
        {/* Windshield */}
        <path d="M66,48 L70,86 L210,86 L214,48 Z" fill={glass} stroke="rgba(100,160,255,0.3)" strokeWidth="1"/>
        <line x1="140" y1="48" x2="140" y2="86" stroke="rgba(240,237,232,0.12)" strokeWidth="1"/>
        {/* Roof cab */}
        <rect x="68" y="86" width="144" height="30" rx="4" fill={body2}/>
        {/* Air deflector (spoiler) */}
        <rect x="72" y="82" width="136" height="8" rx="3" fill="#0d0d22" stroke={line} strokeWidth="0.8"/>
        {/* Doors line */}
        <line x1="60" y1="98" x2="220" y2="98" stroke={line} strokeWidth="0.8"/>
        {/* ATTELAGE / coupling */}
        <rect x="96" y="118" width="88" height="22" rx="4" fill="#0d0d22" stroke={line} strokeWidth="1"/>
        <circle cx="140" cy="129" r="8" fill={body} stroke={line} strokeWidth="1.2"/>
        <circle cx="140" cy="129" r="3" fill="#333"/>
        {/* CAISSE / cargo */}
        <rect x="38" y="142" width="204" height="192" rx="4"
          fill={body} stroke={color} strokeWidth="1" strokeOpacity="0.3"/>
        {/* Cargo door vertical lines */}
        <line x1="140" y1="142" x2="140" y2="334" stroke={line} strokeWidth="1"/>
        {[3,5,7,9,11].map(i=>(
          <line key={i} x1="38" y1={142+i*16} x2="242" y2={142+i*16} stroke={stripe} strokeWidth="0.7"/>
        ))}
        {/* Rear bumper */}
        <path d="M42,334 Q140,342 238,334 L238,354 Q140,362 42,354 Z"
          fill="#111122" stroke={line} strokeWidth="0.8"/>
        {/* Rear lights */}
        <rect x="42" y="316" width="32" height="16" rx="2" fill="rgba(255,50,50,0.45)"/>
        <rect x="206" y="316" width="32" height="16" rx="2" fill="rgba(255,50,50,0.45)"/>
        {/* Cab wheels */}
        {[{cx:44,cy:82},{cx:236,cy:82}].map((w,i)=>(
          <g key={i}>
            <ellipse cx={w.cx} cy={w.cy} rx="14" ry="22" fill={wheel} stroke="rgba(240,237,232,0.18)" strokeWidth="1.5"/>
            <ellipse cx={w.cx} cy={w.cy} rx="7" ry="11" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8"/>
          </g>
        ))}
        {/* Dual rear wheels */}
        {[
          {cx:28,cy:252,rx:12,ry:20},{cx:28,cy:268,rx:12,ry:20},
          {cx:252,cy:252,rx:12,ry:20},{cx:252,cy:268,rx:12,ry:20},
          {cx:22,cy:278,rx:12,ry:20},{cx:22,cy:294,rx:12,ry:20},
          {cx:258,cy:278,rx:12,ry:20},{cx:258,cy:294,rx:12,ry:20},
        ].map((w,i)=>(
          <ellipse key={i} cx={w.cx} cy={w.cy} rx={w.rx} ry={w.ry}
            fill={wheel} stroke="rgba(240,237,232,0.14)" strokeWidth="1.2"/>
        ))}
      </g>
    );

    // ── BUS ────────────────────────────────────────────────────
    case 'bus': return (
      <g>
        <rect x="50" y="10" width="180" height="340" rx="18" fill="rgba(0,0,0,0.14)"/>
        {/* Body */}
        <path d="M60,16 Q140,6 220,16 L228,46 L228,320 L224,344 Q140,356 56,344 L52,320 L52,46 Z"
          fill={body} stroke={color} strokeWidth="1.2" strokeOpacity="0.35"/>
        {/* Front face */}
        <rect x="64" y="16" width="152" height="40" rx="8" fill={body2}/>
        {/* Windshield front */}
        <path d="M70,48 L66,88 L214,88 L210,48 Z" fill={glass} stroke="rgba(100,160,255,0.3)" strokeWidth="1"/>
        <line x1="140" y1="48" x2="140" y2="88" stroke="rgba(240,237,232,0.1)" strokeWidth="1"/>
        {/* Headlights */}
        <rect x="66" y="20" width="38" height="20" rx="4" fill="rgba(255,240,160,0.22)" stroke="rgba(255,240,160,0.35)" strokeWidth="1"/>
        <rect x="176" y="20" width="38" height="20" rx="4" fill="rgba(255,240,160,0.22)" stroke="rgba(255,240,160,0.35)" strokeWidth="1"/>
        {/* Destination board */}
        <rect x="104" y="18" width="72" height="22" rx="3" fill="rgba(20,20,60,0.6)" stroke={line} strokeWidth="0.8"/>
        {/* Roof line */}
        <rect x="58" y="88" width="164" height="196" rx="4" fill={body2}/>
        {/* Windows left side */}
        {[96,130,164,198,232].map(y=>(
          <rect key={y} x="34" y={y} width="24" height="28" rx="3" fill={glass} stroke="rgba(100,160,255,0.2)" strokeWidth="0.8"/>
        ))}
        {/* Windows right side */}
        {[96,130,164,198,232].map(y=>(
          <rect key={y} x="222" y={y} width="24" height="28" rx="3" fill={glass} stroke="rgba(100,160,255,0.2)" strokeWidth="0.8"/>
        ))}
        {/* Door left (front) */}
        <rect x="20" y="86" width="18" height="54" rx="3" fill="rgba(80,120,200,0.12)" stroke="rgba(80,120,200,0.3)" strokeWidth="1.5"/>
        {/* Door left (rear) */}
        <rect x="20" y="216" width="18" height="54" rx="3" fill="rgba(80,120,200,0.12)" stroke="rgba(80,120,200,0.3)" strokeWidth="1.5"/>
        {/* Side stripe */}
        <rect x="20" y="148" width="240" height="6" fill={`${color}30`}/>
        {/* Rear windshield */}
        <path d="M70,284 L66,314 L214,314 L210,284 Z" fill={glass} stroke="rgba(100,160,255,0.25)" strokeWidth="1"/>
        {/* Rear face */}
        <rect x="64" y="314" width="152" height="34" rx="6" fill={body2}/>
        {/* Tail lights */}
        <rect x="58" y="296" width="36" height="16" rx="3" fill="rgba(255,50,50,0.4)"/>
        <rect x="186" y="296" width="36" height="16" rx="3" fill="rgba(255,50,50,0.4)"/>
        {/* Wheels */}
        {[{cx:36,cy:106},{cx:244,cy:106},{cx:36,cy:278},{cx:244,cy:278}].map((w,i)=>(
          <g key={i}>
            <ellipse cx={w.cx} cy={w.cy} rx="15" ry="24" fill={wheel} stroke="rgba(240,237,232,0.18)" strokeWidth="1.5"/>
            <ellipse cx={w.cx} cy={w.cy} rx="7" ry="12" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8"/>
          </g>
        ))}
      </g>
    );

    // ── TRAM / TRAIN ───────────────────────────────────────────
    case 'tram':
    case 'train': return (
      <g>
        {/* Rails */}
        <line x1="110" y1="0" x2="110" y2="400" stroke="rgba(150,120,80,0.2)" strokeWidth="4"/>
        <line x1="170" y1="0" x2="170" y2="400" stroke="rgba(150,120,80,0.2)" strokeWidth="4"/>
        {[0,30,60,90,120,150,180,210,240,270,300,330,360].map(y=>(
          <line key={y} x1="108" y1={y} x2="172" y2={y} stroke="rgba(150,120,80,0.25)" strokeWidth="3"/>
        ))}
        {/* Body */}
        <path d="M56,14 Q140,4 224,14 L232,44 L232,348 L226,372 Q140,382 54,372 L48,348 L48,44 Z"
          fill={body} stroke={color} strokeWidth="1.3" strokeOpacity="0.4"/>
        {/* Front cab */}
        <path d="M58,14 Q140,4 222,14 L228,52 L52,52 Z" fill={body2} stroke={line} strokeWidth="0.8"/>
        {/* Front window */}
        <path d="M70,22 Q140,12 210,22 L218,50 L62,50 Z" fill={glass} stroke="rgba(100,160,255,0.35)" strokeWidth="1"/>
        {/* Pantograph */}
        <line x1="96" y1="22" x2="140" y2="8" stroke="rgba(240,237,232,0.3)" strokeWidth="1.5"/>
        <line x1="184" y1="22" x2="140" y2="8" stroke="rgba(240,237,232,0.3)" strokeWidth="1.5"/>
        <line x1="116" y1="8" x2="164" y2="8" stroke="rgba(240,237,232,0.4)" strokeWidth="2.5" strokeLinecap="round"/>
        {/* Windows left */}
        {[62,98,134,170,206,242,278].map(y=>(
          <rect key={y} x="30" y={y} width="26" height="34" rx="4" fill={glass} stroke="rgba(100,160,255,0.18)" strokeWidth="0.8"/>
        ))}
        {/* Windows right */}
        {[62,98,134,170,206,242,278].map(y=>(
          <rect key={y} x="224" y={y} width="26" height="34" rx="4" fill={glass} stroke="rgba(100,160,255,0.18)" strokeWidth="0.8"/>
        ))}
        {/* Section divider */}
        <rect x="50" y="164" width="180" height="18" rx="3" fill="#0a0a1a" stroke={line} strokeWidth="1"/>
        {/* Roof section 1 */}
        <rect x="56" y="52" width="168" height="110" rx="3" fill={body2}/>
        {/* Roof section 2 */}
        <rect x="56" y="182" width="168" height="130" rx="3" fill={body2}/>
        {/* Doors */}
        {[70,210].map(y=>(
          <g key={y}>
            <rect key={`dl-${y}`} x="22" y={y} width="26" height="48" rx="3" fill="rgba(80,120,200,0.1)" stroke="rgba(80,120,200,0.3)" strokeWidth="1.5"/>
            <rect key={`dr-${y}`} x="232" y={y} width="26" height="48" rx="3" fill="rgba(80,120,200,0.1)" stroke="rgba(80,120,200,0.3)" strokeWidth="1.5"/>
          </g>
        ))}
        {/* Stripe */}
        <rect x="22" y="150" width="236" height="8" fill={`${color}35`}/>
        {/* Rear cab */}
        <path d="M58,330 L52,354 L228,354 L222,330 Z" fill={body2} stroke={line} strokeWidth="0.8"/>
        <path d="M62,336 L56,354 L224,354 L218,336 Z" fill={glass} stroke="rgba(100,160,255,0.25)" strokeWidth="1"/>
        {/* Bogies */}
        {[{y:100},{y:256}].map((b,i)=>(
          <g key={i}>
            <rect x="90" y={b.y-12} width="100" height="24" rx="4" fill="#0a0a18" stroke={line} strokeWidth="1"/>
            {[{cx:100},{cx:140},{cx:180}].map((w,j)=>(
              <ellipse key={j} cx={w.cx} cy={b.y} rx="12" ry="10" fill={wheel} stroke="rgba(240,237,232,0.15)" strokeWidth="1.2"/>
            ))}
          </g>
        ))}
      </g>
    );

    // ── PEDESTRIAN ─────────────────────────────────────────────
    case 'pedestrian': return (
      <g>
        {/* Shadow */}
        <ellipse cx="140" cy="200" rx="62" ry="185" fill="rgba(0,0,0,0.14)"/>
        {/* Head */}
        <circle cx="140" cy="52" r="38" fill={body} stroke="rgba(240,237,232,0.18)" strokeWidth="1.5"/>
        {/* Face */}
        <circle cx="140" cy="52" r="28" fill={body2}/>
        <ellipse cx="128" cy="46" rx="5" ry="5.5" fill="rgba(255,255,255,0.08)"/>
        <ellipse cx="152" cy="46" rx="5" ry="5.5" fill="rgba(255,255,255,0.08)"/>
        {/* Neck */}
        <rect x="130" y="88" width="20" height="16" rx="4" fill={body} stroke={line} strokeWidth="0.8"/>
        {/* Shoulders */}
        <path d="M80,106 Q100,96 130,102 L130,118 Q100,114 80,124 Z"
          fill={body} stroke={line} strokeWidth="1"/>
        <path d="M200,106 Q180,96 150,102 L150,118 Q180,114 200,124 Z"
          fill={body} stroke={line} strokeWidth="1"/>
        {/* Torso */}
        <path d="M104,102 Q140,92 176,102 L180,196 Q140,208 100,196 Z"
          fill={body} stroke="rgba(240,237,232,0.16)" strokeWidth="1.2"/>
        {/* Chest detail */}
        <path d="M108,110 Q140,100 172,110 L170,170 Q140,180 110,170 Z" fill={body2}/>
        {/* Zipper/shirt line */}
        <line x1="140" y1="104" x2="140" y2="196" stroke={stripe} strokeWidth="1.5"/>
        {/* Arms */}
        <path d="M80,124 Q62,142 60,182 Q58,218 66,250 L88,250 Q82,218 84,182 Q86,148 100,124 Z"
          fill={body} stroke={line} strokeWidth="1"/>
        <path d="M200,124 Q218,142 220,182 Q222,218 214,250 L192,250 Q198,218 196,182 Q194,148 180,124 Z"
          fill={body} stroke={line} strokeWidth="1"/>
        {/* Hands */}
        <ellipse cx="76" cy="254" rx="14" ry="18" fill={body2} stroke={line} strokeWidth="0.8"/>
        <ellipse cx="204" cy="254" rx="14" ry="18" fill={body2} stroke={line} strokeWidth="0.8"/>
        {/* Belt / hips */}
        <rect x="102" y="196" width="76" height="14" rx="4" fill="#111130" stroke={line} strokeWidth="0.8"/>
        {/* Hips */}
        <path d="M100,208 Q118,200 138,206 L136,268 Q118,276 100,268 Z" fill={body} stroke={line} strokeWidth="1"/>
        <path d="M180,208 Q162,200 142,206 L144,268 Q162,276 180,268 Z" fill={body} stroke={line} strokeWidth="1"/>
        {/* Legs */}
        <path d="M100,268 Q96,296 98,342 L122,342 Q124,296 130,268 Z"
          fill={body} stroke={line} strokeWidth="1"/>
        <path d="M180,268 Q184,296 182,342 L158,342 Q156,296 150,268 Z"
          fill={body} stroke={line} strokeWidth="1"/>
        {/* Knees */}
        <ellipse cx="110" cy="308" rx="13" ry="10" fill={body2} stroke={line} strokeWidth="0.8"/>
        <ellipse cx="170" cy="308" rx="13" ry="10" fill={body2} stroke={line} strokeWidth="0.8"/>
        {/* Feet */}
        <path d="M96,340 Q88,348 84,362 L126,362 L126,340 Z" fill={body2} stroke={line} strokeWidth="0.8"/>
        <path d="M184,340 Q192,348 196,362 L154,362 L154,340 Z" fill={body2} stroke={line} strokeWidth="0.8"/>
      </g>
    );

    // ── QUAD / OTHER ───────────────────────────────────────────
    default: return (
      <g>
        <ellipse cx="140" cy="200" rx="100" ry="195" fill="rgba(0,0,0,0.14)"/>
        {/* Body */}
        <path d="M82,20 Q140,8 198,20 L212,60 L218,140 L218,260 L208,310 Q140,324 72,310 L62,260 L62,140 L68,60 Z"
          fill={body} stroke={color} strokeWidth="1.2" strokeOpacity="0.35"/>
        {/* Hood */}
        <path d="M84,18 Q140,8 196,18 L204,60 L76,60 Z" fill={body2} stroke={line} strokeWidth="0.8"/>
        {/* Windshield */}
        <path d="M84,60 L76,90 L204,90 L196,60 Z" fill={glass} stroke="rgba(100,160,255,0.3)" strokeWidth="1"/>
        {/* Roof */}
        <rect x="76" y="90" width="128" height="120" rx="4" fill={body2}/>
        {/* Rear window */}
        <path d="M82,210 L76,240 L204,240 L198,210 Z" fill={glass} stroke="rgba(100,160,255,0.25)" strokeWidth="1"/>
        {/* Trunk */}
        <path d="M84,240 Q140,252 196,240 L202,300 Q140,316 78,300 Z" fill={body2} stroke={line} strokeWidth="0.8"/>
        {/* Wheels — oversized for quad */}
        {[{cx:46,cy:126},{cx:234,cy:126},{cx:46,cy:244},{cx:234,cy:244}].map((w,i)=>(
          <g key={i}>
            <ellipse cx={w.cx} cy={w.cy} rx="22" ry="34" fill={wheel} stroke="rgba(240,237,232,0.2)" strokeWidth="1.5"/>
            <ellipse cx={w.cx} cy={w.cy} rx="11" ry="17" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8"/>
            {/* Tread pattern */}
            {[-20,-8,4,16].map(d=>(
              <line key={d} x1={w.cx-18} y1={w.cy+d} x2={w.cx+18} y2={w.cy+d}
                stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"/>
            ))}
          </g>
        ))}
        {/* Roll bars */}
        <rect x="78" y="94" width="6" height="116" rx="2" fill="rgba(240,237,232,0.12)"/>
        <rect x="196" y="94" width="6" height="116" rx="2" fill="rgba(240,237,232,0.12)"/>
      </g>
    );
  }
}
