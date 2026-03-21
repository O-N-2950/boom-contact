// ============================================================
// boom.contact — Shared Types
// ============================================================

export type SessionStatus = 'waiting' | 'active' | 'signing' | 'completed' | 'expired';

// ── Types de véhicules exhaustifs ─────────────────────────────
export type VehicleType =
  // Véhicules à moteur légers
  | 'car'              // Voiture, SUV, berline, break, citadine
  | 'motorcycle'       // Moto, motocyclette
  | 'scooter'          // Scooter, cyclomoteur (<50cm3)
  | 'moped'            // Vélomoteur, 2 roues <45km/h
  | 'escooter'         // Trottinette électrique, EDPM
  // Véhicules utilitaires / lourds
  | 'truck'            // Camion, poids lourd, semi-remorque
  | 'van'              // Fourgonnette, camionnette, utilitaire léger
  | 'construction'     // Engin de chantier (tractopelle, grue...)
  | 'tractor'          // Tracteur agricole
  // Transport en commun
  | 'bus'              // Bus, autocar, minibus
  | 'tram'             // Tramway
  | 'train'            // Train, RER, métro
  // Cycles
  | 'bicycle'          // Vélo, vélo électrique (VAE)
  | 'cargo_bike'       // Vélo cargo, bakfiets
  // Piéton / autre
  | 'pedestrian'       // Piéton
  | 'quad'             // Quad, buggy
  | 'boat'             // Bateau, embarcation
  | 'other';           // Autre / non listé

// Groupe pour le croquis SVG
export type VehicleShapeGroup =
  | 'car'        // Voiture standard
  | 'moto'       // 2 roues motorisé
  | 'truck'      // Poids lourd / bus
  | 'bicycle'    // Vélo / trottinette
  | 'pedestrian' // Piéton
  | 'rail'       // Tram / train
  | 'other';     // Quad / autre

export function getShapeGroup(type: VehicleType): VehicleShapeGroup {
  switch (type) {
    case 'car':                        return 'car';
    case 'motorcycle': case 'scooter':
    case 'moped': case 'escooter':     return 'moto';
    case 'truck': case 'van':
    case 'bus': case 'construction':
    case 'tractor':                    return 'truck';
    case 'bicycle': case 'cargo_bike': return 'bicycle';
    case 'pedestrian':                 return 'pedestrian';
    case 'tram': case 'train':         return 'rail';
    default:                           return 'other';
  }
}

// ── Données véhicule ─────────────────────────────────────────
export interface VehicleData {
  vehicleType?: VehicleType;
  licensePlate: string;
  brand: string;
  model: string;
  year?: string;
  color?: string;
  vin?: string;
  category?: string;               // catégorie permis
}

// ── Blessures ─────────────────────────────────────────────────
export interface InjuryData {
  hasInjuries: boolean;
  description?: string;
  ambulance?: boolean;
  hospitalized?: boolean;
  selfReported?: string;
  severity?: 'minor' | 'moderate' | 'serious';
}

// ── Conducteur ────────────────────────────────────────────────
export interface DriverData {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  postalCode?: string;
  country: string;
  phone: string;
  email?: string;
  licenseNumber: string;
  licenseExpiry?: string;
}

// ── Assurance ─────────────────────────────────────────────────
export interface InsuranceData {
  company: string;
  policyNumber: string;
  agentName?: string;
  agentPhone?: string;
  agentEmail?: string;
  address?: string;
  greenCardNumber?: string;
  greenCardExpiry?: string;
}

// ── OCR ───────────────────────────────────────────────────────
export interface LowConfidenceField {
  field: string;
  value: string;
  confidence: number;
}

export interface OCRResult {
  type: 'vehicle_registration' | 'green_card' | 'drivers_license' | 'insurance_certificate' | 'unknown';
  confidence: number;
  country?: string;
  language?: string;
  vehicle?: Partial<VehicleData>;
  driver?: Partial<DriverData>;
  insurance?: Partial<InsuranceData>;
  lowConfidenceFields: LowConfidenceField[];
  warnings: string[];
  rawText: string;
}

// ── Photo de scène ────────────────────────────────────────────
export type PhotoCategory =
  | 'scene'      // Lieu du sinistre, vue générale
  | 'vehicleA'   // Dommages véhicule A
  | 'vehicleB'   // Dommages véhicule B
  | 'injury'     // Blessures
  | 'document'   // Document, plaque, papier
  | 'other';     // Autre

export interface ScenePhoto {
  id: string;
  category: PhotoCategory;
  base64: string;       // JPEG compressé
  caption?: string;
  takenAt: string;      // ISO timestamp
}

// ── Participant ───────────────────────────────────────────────
// Rôle conducteur — A = initiateur, B-E = rejoignants
// Multi-véhicules : chaque conducteur supplémentaire reçoit B, C, D, E...
export type ParticipantRole = 'A' | 'B' | 'C' | 'D' | 'E';

export interface ParticipantData {
  role: ParticipantRole;
  vehicle: Partial<VehicleData>;
  driver: Partial<DriverData>;
  insurance: Partial<InsuranceData>;
  damagedZones: string[];
  circumstances: string[];
  signature?: string;
  signedAt?: Date;
  language: string;
}

// ── Localisation ──────────────────────────────────────────────
export interface AccidentLocation {
  address: string;
  city: string;
  country: string;
  lat?: number;
  lng?: number;
}

// ── Données accident ──────────────────────────────────────────
export interface AccidentData {
  date: string;
  time: string;
  location: Partial<AccidentLocation>;
  photos?: ScenePhoto[];           // Photos de la scène (max 10)
  sketchImage?: string;            // Croquis base64 PNG
  description?: string;
  faultDeclaration?: ParticipantRole | 'shared' | 'unknown';
  witnesses?: string;
  policeReport?: boolean;
  policeRef?: string;
  injuries?: boolean;
  injuryDetails?: InjuryData;
  thirdPartyDamage?: boolean;
  vehicleCount?: number;
}

// ── Session ───────────────────────────────────────────────────
export interface ConstatSession {
  id: string;
  status: SessionStatus;
  createdAt: Date;
  expiresAt: Date;
  accident: Partial<AccidentData>;
  participantA: Partial<ParticipantData>;
  participantB?: Partial<ParticipantData>;
  // Multi-véhicules : participants C, D, E stockés ici
  participantC?: Partial<ParticipantData>;
  participantD?: Partial<ParticipantData>;
  participantE?: Partial<ParticipantData>;
  vehicleCount?: number;   // Nombre de véhicules déclarés par A (défaut: 2)
  pdfUrl?: string;
}
