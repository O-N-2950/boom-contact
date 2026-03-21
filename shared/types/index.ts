// ============================================================
// boom.contact — Shared Types
// ============================================================

export type SessionStatus = 'waiting' | 'active' | 'signing' | 'completed' | 'expired';

// Types de véhicules — boom.contact
export type VehicleType = 'car' | 'motorcycle' | 'truck' | 'bicycle' | 'pedestrian' | 'other';

export interface VehicleData {
  vehicleType?: VehicleType;       // type de véhicule impliqué
  licensePlate: string;
  brand: string;
  model: string;
  year?: string;
  color?: string;
  vin?: string;
  category?: string;               // catégorie permis
}

// Blessures — pour piétons et conducteurs blessés
export interface InjuryData {
  hasInjuries: boolean;
  description?: string;            // localisation des douleurs, blessures visibles
  ambulance?: boolean;             // prise en charge par ambulance
  hospitalized?: boolean;          // hospitalisation
  selfReported?: string;           // déclaration libre du blessé
  severity?: 'minor' | 'moderate' | 'serious'; // léger / moyen / grave
}

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

export interface LowConfidenceField {
  field: string;    // e.g. "vehicle.licensePlate"
  value: string;    // the uncertain value
  confidence: number; // 0.0–0.74
}

export interface OCRResult {
  type: 'vehicle_registration' | 'green_card' | 'drivers_license' | 'insurance_certificate' | 'unknown';
  confidence: number;             // overall 0.0–1.0
  country?: string;               // ISO code e.g. "CH", "FR"
  language?: string;              // ISO code e.g. "fr", "de"
  vehicle?: Partial<VehicleData>;
  driver?: Partial<DriverData>;
  insurance?: Partial<InsuranceData>;
  lowConfidenceFields: LowConfidenceField[]; // fields needing human review
  warnings: string[];             // expired doc, blurry, partial view, etc.
  rawText: string;
}

export interface ParticipantData {
  role: 'A' | 'B';
  vehicle: Partial<VehicleData>;
  driver: Partial<DriverData>;
  insurance: Partial<InsuranceData>;
  damagedZones: string[];         // e.g. ['front', 'front-left']
  circumstances: string[];        // accident circumstances checkboxes
  signature?: string;             // base64 PNG
  signedAt?: Date;
  language: string;               // ISO language code
}

export interface AccidentLocation {
  address: string;
  city: string;
  country: string;
  lat?: number;
  lng?: number;
}

export interface AccidentData {
  date: string;
  time: string;
  location: Partial<AccidentLocation>;
  sketchImage?: string;           // base64 PNG
  description?: string;
  faultDeclaration?: 'A' | 'B' | 'shared' | 'unknown';
  witnesses?: string;
  policeReport?: boolean;
  policeRef?: string;
  injuries?: boolean;
  injuryDetails?: InjuryData;     // détails blessures si injuries=true
  thirdPartyDamage?: boolean;     // dégâts à d'autres véhicules/biens
  vehicleCount?: number;          // nb de véhicules impliqués
}

export interface ConstatSession {
  id: string;
  status: SessionStatus;
  createdAt: Date;
  expiresAt: Date;
  accident: Partial<AccidentData>;
  participantA: Partial<ParticipantData>;
  participantB?: Partial<ParticipantData>;
  pdfUrl?: string;
}
