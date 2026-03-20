// ============================================================
// boom.contact — Shared Types
// ============================================================

export type SessionStatus = 'waiting' | 'active' | 'signing' | 'completed' | 'expired';

export interface VehicleData {
  licensePlate: string;
  brand: string;
  model: string;
  year?: string;
  color?: string;
  vin?: string;
}

export interface DriverData {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
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

export interface ParticipantData {
  role: 'A' | 'B';
  vehicle: Partial<VehicleData>;
  driver: Partial<DriverData>;
  insurance: Partial<InsuranceData>;
  damagedZones: string[];       // e.g. ['front', 'front-left', 'left']
  circumstances: string[];      // CEA checkboxes
  signature?: string;           // base64 PNG
  signedAt?: Date;
  language: string;             // ISO language code
}

export interface AccidentData {
  date: string;
  time: string;
  location: {
    address: string;
    city: string;
    country: string;
    lat?: number;
    lng?: number;
  };
  sketchImage?: string;         // base64 PNG
  description?: string;
  faultDeclaration?: 'A' | 'B' | 'shared' | 'unknown';
  witnesses?: string;
  policeReport?: boolean;
  policeRef?: string;
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

export interface OCRResult {
  type: 'vehicle_registration' | 'green_card' | 'id' | 'unknown';
  confidence: number;
  vehicle?: Partial<VehicleData>;
  driver?: Partial<DriverData>;
  insurance?: Partial<InsuranceData>;
  rawText: string;
}
