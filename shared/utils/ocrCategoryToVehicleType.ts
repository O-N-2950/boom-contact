import type { VehicleType } from '../types/index';

/**
 * Map OCR-detected vehicle category strings to our VehicleType union.
 * Swiss vehicle registration says "Voiture de tourisme", "Motocycle", "Camion", etc.
 * Supports FR / DE / EN / IT variants.
 *
 * IMPORTANT: Order matters — more specific matches (autocar, motorcycle) must come
 * before generic ones (car) to avoid false positives.
 */
export function ocrCategoryToVehicleType(category?: string): VehicleType | null {
  if (!category) return null;
  const c = category.toLowerCase();
  // Bus/autocar BEFORE car (autocar contains 'car')
  if (c.includes('autocar') || c.includes('autobus') || c.includes('bus') || c.includes('reisebus')) return 'bus';
  // Motorcycle BEFORE car (some variants could overlap)
  if (c.includes('moto') || c.includes('motorcycle') || c.includes('motorrad') ||
      c.includes('motocycle')) return 'motorcycle';
  // Car — generic passenger vehicle
  if (c.includes('tourisme') || c.includes('automobile') || c.includes('personenwagen') ||
      c.includes('car') || c.includes('break') || c.includes('suv') || c.includes('berline') ||
      c.includes('voiture') || c.includes('pkw') || c.includes('1') || c === 'a') return 'car';
  if (c.includes('scooter') || c.includes('cyclom')) return 'scooter';
  if (c.includes('velom') || c.includes('vélom') || c.includes('mofa')) return 'moped';
  if (c.includes('camion') || c.includes('truck') || c.includes('lkw') ||
      c.includes('poids lourd')) return 'truck';
  if (c.includes('fourgon') || c.includes('van') || c.includes('utilitaire') ||
      c.includes('transporter')) return 'van';
  if (c.includes('quad') || c.includes('buggy')) return 'quad';
  if (c.includes('trottinette') || c.includes('edpm') || c.includes('e-scooter')) return 'escooter';
  return null;
}
