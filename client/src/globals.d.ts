// Global type declarations for boom-contact client

interface BoomVehicleData {
  make?: string;
  model?: string;
  licensePlate?: string;
  color?: string;
  vehicleType?: string;
  bodyStyle?: string;
  [key: string]: unknown;
}

interface BoomVehiclePos {
  x: number;
  y: number;
  angle: number;
}

declare global {
  interface Window {
    // Google Analytics
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
    // Boom vehicle data (cross-component communication)
    __boomVehicleA?: BoomVehicleData;
    __boomVehicleB?: BoomVehicleData;
    __boomVehicleAPos?: BoomVehiclePos;
  }
}

export {};
