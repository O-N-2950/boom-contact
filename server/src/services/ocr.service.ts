import Anthropic from '@anthropic-ai/sdk';
import type { OCRResult, VehicleData, DriverData, InsuranceData } from '../../../shared/types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─────────────────────────────────────────────────────────────
// Prompt système — expert documents véhicules mondial
// ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert OCR system specialized in vehicle and insurance documents from ANY country worldwide.

You can read and understand:
- Vehicle registration documents (Permis de circulation CH, Carte grise FR, Zulassungsbescheinigung DE, Libretto IT, RC Book IN, 行驶证 CN, V5C UK, etc.)
- International Green Cards / Cartes vertes / Grüne Karte
- Driver's licenses (for name/address extraction only)
- Insurance certificates

RULES:
1. Respond ONLY with valid JSON — no markdown, no explanation, no backticks
2. For each field, also provide a confidence score (0.0 to 1.0)
3. If a field is not visible or unreadable, use null
4. Detect the document type and country automatically
5. For license plates: include country prefix if visible (e.g. "VD 123456" for Vaud CH, "AB-123-CD" for France)

JSON SCHEMA (strictly follow this):
{
  "documentType": "vehicle_registration" | "green_card" | "drivers_license" | "insurance_certificate" | "unknown",
  "country": "ISO country code or null",
  "language": "ISO language code of the document",
  "overallConfidence": 0.0-1.0,
  "vehicle": {
    "licensePlate":  { "value": string|null, "confidence": 0.0-1.0 },
    "brand":         { "value": string|null, "confidence": 0.0-1.0 },
    "model":         { "value": string|null, "confidence": 0.0-1.0 },
    "year":          { "value": string|null, "confidence": 0.0-1.0 },
    "color":         { "value": string|null, "confidence": 0.0-1.0 },
    "vin":           { "value": string|null, "confidence": 0.0-1.0 },
    "category":      { "value": string|null, "confidence": 0.0-1.0 }
  },
  "driver": {
    "firstName":     { "value": string|null, "confidence": 0.0-1.0 },
    "lastName":      { "value": string|null, "confidence": 0.0-1.0 },
    "address":       { "value": string|null, "confidence": 0.0-1.0 },
    "city":          { "value": string|null, "confidence": 0.0-1.0 },
    "postalCode":    { "value": string|null, "confidence": 0.0-1.0 },
    "country":       { "value": string|null, "confidence": 0.0-1.0 },
    "licenseNumber": { "value": string|null, "confidence": 0.0-1.0 }
  },
  "insurance": {
    "company":           { "value": string|null, "confidence": 0.0-1.0 },
    "policyNumber":      { "value": string|null, "confidence": 0.0-1.0 },
    "greenCardNumber":   { "value": string|null, "confidence": 0.0-1.0 },
    "validFrom":         { "value": string|null, "confidence": 0.0-1.0 },
    "validUntil":        { "value": string|null, "confidence": 0.0-1.0 },
    "coveredCountries":  { "value": string|null, "confidence": 0.0-1.0 }
  },
  "rawText": "complete verbatim text extracted from the document",
  "warnings": ["list of any issues: blur, partial visibility, expired document, etc."]
}`;

// ─────────────────────────────────────────────────────────────
// Types internes
// ─────────────────────────────────────────────────────────────
interface FieldWithConfidence {
  value: string | null;
  confidence: number;
}

interface RawOCRResponse {
  documentType: string;
  country: string | null;
  language: string;
  overallConfidence: number;
  vehicle: Record<string, FieldWithConfidence>;
  driver: Record<string, FieldWithConfidence>;
  insurance: Record<string, FieldWithConfidence>;
  rawText: string;
  warnings: string[];
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const CONFIDENCE_THRESHOLD = 0.75;

function extractValue(field: FieldWithConfidence | undefined): string | undefined {
  if (!field || field.value === null) return undefined;
  return field.confidence >= CONFIDENCE_THRESHOLD ? field.value : undefined;
}

function extractLowConf(field: FieldWithConfidence | undefined): { value: string; confidence: number } | undefined {
  if (!field || field.value === null) return undefined;
  if (field.confidence < CONFIDENCE_THRESHOLD) return { value: field.value, confidence: field.confidence };
  return undefined;
}

function mapToOCRResult(raw: RawOCRResponse): OCRResult {
  const vehicle: Partial<VehicleData> = {
    licensePlate: extractValue(raw.vehicle?.licensePlate),
    brand:        extractValue(raw.vehicle?.brand),
    model:        extractValue(raw.vehicle?.model),
    year:         extractValue(raw.vehicle?.year),
    color:        extractValue(raw.vehicle?.color),
    vin:          extractValue(raw.vehicle?.vin),
  };

  const driver: Partial<DriverData> = {
    firstName:     extractValue(raw.driver?.firstName),
    lastName:      extractValue(raw.driver?.lastName),
    address:       extractValue(raw.driver?.address),
    city:          extractValue(raw.driver?.city),
    country:       extractValue(raw.driver?.country),
    licenseNumber: extractValue(raw.driver?.licenseNumber),
  };

  const insurance: Partial<InsuranceData> = {
    company:          extractValue(raw.insurance?.company),
    policyNumber:     extractValue(raw.insurance?.policyNumber),
    greenCardNumber:  extractValue(raw.insurance?.greenCardNumber),
    greenCardExpiry:  extractValue(raw.insurance?.validUntil),
  };

  // Collect low-confidence fields that need human review
  const lowConfidenceFields: Array<{ field: string; value: string; confidence: number }> = [];
  const allFields = {
    ...Object.fromEntries(Object.entries(raw.vehicle || {}).map(([k, v]) => [`vehicle.${k}`, v])),
    ...Object.fromEntries(Object.entries(raw.driver || {}).map(([k, v]) => [`driver.${k}`, v])),
    ...Object.fromEntries(Object.entries(raw.insurance || {}).map(([k, v]) => [`insurance.${k}`, v])),
  };

  for (const [field, fieldData] of Object.entries(allFields)) {
    const lowConf = extractLowConf(fieldData as FieldWithConfidence);
    if (lowConf) lowConfidenceFields.push({ field, ...lowConf });
  }

  return {
    type: raw.documentType as OCRResult['type'],
    confidence: raw.overallConfidence,
    country: raw.country ?? undefined,
    language: raw.language,
    vehicle: Object.keys(vehicle).some(k => vehicle[k as keyof VehicleData]) ? vehicle : undefined,
    driver: Object.keys(driver).some(k => driver[k as keyof DriverData]) ? driver : undefined,
    insurance: Object.keys(insurance).some(k => insurance[k as keyof InsuranceData]) ? insurance : undefined,
    lowConfidenceFields,
    warnings: raw.warnings || [],
    rawText: raw.rawText,
  };
}

// ─────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────
export async function scanDocument(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg',
  hint?: { documentType?: string; country?: string }
): Promise<OCRResult> {
  const hintText = hint
    ? `Hint: document type is likely "${hint.documentType ?? 'auto'}", country is likely "${hint.country ?? 'auto'}".`
    : '';

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          },
          {
            type: 'text',
            text: `Extract all information from this vehicle document. ${hintText}`,
          },
        ],
      }],
    });

    const text = response.content.find(b => b.type === 'text')?.text ?? '{}';

    // Strip any accidental markdown fences
    const clean = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const raw: RawOCRResponse = JSON.parse(clean);
    return mapToOCRResult(raw);

  } catch (err) {
    // Fallback: return empty result with error warning
    return {
      type: 'unknown',
      confidence: 0,
      rawText: '',
      warnings: [`OCR failed: ${err instanceof Error ? err.message : String(err)}`],
      lowConfidenceFields: [],
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Batch: scan both docs at once and merge results
// ─────────────────────────────────────────────────────────────
export async function scanDocumentPair(
  registrationBase64: string,
  greenCardBase64: string,
): Promise<{ registration: OCRResult; greenCard: OCRResult; merged: Partial<OCRResult> }> {
  const [registration, greenCard] = await Promise.all([
    scanDocument(registrationBase64, 'image/jpeg', { documentType: 'vehicle_registration' }),
    scanDocument(greenCardBase64, 'image/jpeg', { documentType: 'green_card' }),
  ]);

  // Merge: registration wins for vehicle data, green card wins for insurance
  const merged: Partial<OCRResult> = {
    vehicle:   registration.vehicle ?? greenCard.vehicle,
    driver:    registration.driver  ?? greenCard.driver,
    insurance: greenCard.insurance  ?? registration.insurance,
    lowConfidenceFields: [
      ...(registration.lowConfidenceFields ?? []),
      ...(greenCard.lowConfidenceFields ?? []),
    ],
    warnings: [...(registration.warnings ?? []), ...(greenCard.warnings ?? [])],
  };

  return { registration, greenCard, merged };
}
