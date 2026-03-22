import { logger } from '../logger.js';
import Anthropic from '@anthropic-ai/sdk';
import type { OCRResult, VehicleData, DriverData, InsuranceData } from '../../../shared/types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an expert OCR system specialized in vehicle and insurance documents from ANY country worldwide.

DOCUMENT TYPES AND THEIR INSURANCE CONTENT:

VEHICLE REGISTRATION documents — insurance info availability:
- CH Permis de circulation: field 09 = INSURER NAME ONLY (e.g. "emmental", "AXA") — NEVER contains policy number
- FR Carte grise / Certificat d'immatriculation: NO insurer, NO policy number
- DE Zulassungsbescheinigung: NO insurer, NO policy number  
- BE Certificat d'immatriculation DIV: NO insurer, NO policy number
- IT Carta di circolazione: NO insurer, NO policy number
- ES Permiso de circulación: NO insurer, NO policy number
- GB V5C: NO insurer, NO policy number
- ALL other countries: registration ≠ insurance, do not invent insurance data

INSURANCE documents — always contain insurer + policy number:
- International Green Card / Carte Verte / Grüne Karte (IMIC system, 46 countries):
  * Field 4: "CC / NNN / POLICYNUM" — extract POLICY NUMBER = everything after the second slash
  * Example: "CH / 066 / 50194120" → policyNumber = "50194120"
  * Field 9: policyholder name and address
  * Field 10: insurer name and full address  
  * Field 3: validity dates (from / to)
- UK Certificate of Motor Insurance: insurer name + policy number + dates
- US/CA Insurance ID Card / Proof of Insurance: insurer + policy + vehicle + dates
- Any local RC auto certificate: insurer + policy + dates

CRITICAL RULES:
1. Respond ONLY with valid JSON — no markdown, no backticks, no explanation
2. NEVER invent or hallucinate a policy number — if not explicitly visible, set to null
3. Swiss Permis de circulation field 09 = insurer name ONLY, policyNumber MUST be null
4. Green Card field 4: parse "CH / 066 / 50194120" → policyNumber = "50194120"
5. If document is a registration (carte grise, Zulassung, V5C, etc.): insurance.policyNumber = null
6. Confidence 0.0 = field not present on this document type (not just unreadable)

JSON SCHEMA:
{
  "documentType": "vehicle_registration" | "green_card" | "insurance_certificate" | "drivers_license" | "unknown",
  "country": "ISO 2-letter code or null",
  "language": "ISO language code",
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
    "company":          { "value": string|null, "confidence": 0.0-1.0 },
    "policyNumber":     { "value": string|null, "confidence": 0.0-1.0 },
    "greenCardNumber":  { "value": string|null, "confidence": 0.0-1.0 },
    "validFrom":        { "value": string|null, "confidence": 0.0-1.0 },
    "validUntil":       { "value": string|null, "confidence": 0.0-1.0 },
    "coveredCountries": { "value": string|null, "confidence": 0.0-1.0 }
  },
  "rawText": "complete verbatim text from document",
  "warnings": ["issues: blur, expired, partial visibility, etc."]
}`;

function getUserPrompt(documentType: string): string {
  if (documentType === 'vehicle_registration') {
    return `Extract all information from this VEHICLE REGISTRATION document.
Remember: registration documents do NOT contain policy numbers (except Swiss Permis de circulation field 09 which has INSURER NAME only).
Set insurance.policyNumber to null for any registration document.`;
  }
  if (documentType === 'green_card') {
    return `Extract all information from this INTERNATIONAL INSURANCE CARD (Green Card/Carte Verte/Grüne Karte).
CRITICAL: Field 4 format is "COUNTRY / INSURER_CODE / POLICY_NUMBER" — extract the policy number (everything after the second slash).
Extract insurer from field 10, policyholder from field 9, validity dates from field 3.`;
  }
  if (documentType === 'insurance_certificate') {
    return `Extract all information from this INSURANCE DOCUMENT.
This document MUST contain insurer name and policy number — extract both with high precision.`;
  }
  return `Identify this document type, then extract all fields.
- If Green Card (IMIC): field 4 = country/insurer_code/POLICY_NUMBER — extract policy number
- If Swiss Permis de circulation: field 09 = insurer name ONLY (no policy number)  
- If registration (carte grise/Zulassung/V5C/etc.): no insurance data expected`;
}

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

const CONFIDENCE_THRESHOLD = 0.70;

function extractValue(field: FieldWithConfidence | undefined): string | undefined {
  if (!field || field.value === null) return undefined;
  return field.confidence >= CONFIDENCE_THRESHOLD ? field.value : undefined;
}

function extractLowConf(field: FieldWithConfidence | undefined): { value: string; confidence: number } | undefined {
  if (!field || field.value === null) return undefined;
  if (field.confidence < CONFIDENCE_THRESHOLD && field.confidence > 0.3) {
    return { value: field.value, confidence: field.confidence };
  }
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
    company:         extractValue(raw.insurance?.company),
    policyNumber:    extractValue(raw.insurance?.policyNumber),
    greenCardNumber: extractValue(raw.insurance?.greenCardNumber),
    greenCardExpiry: extractValue(raw.insurance?.validUntil),
  };

  const lowConfidenceFields: Array<{ field: string; value: string; confidence: number }> = [];
  const allFields = {
    ...Object.fromEntries(Object.entries(raw.vehicle   || {}).map(([k, v]) => [`vehicle.${k}`, v])),
    ...Object.fromEntries(Object.entries(raw.driver    || {}).map(([k, v]) => [`driver.${k}`, v])),
    ...Object.fromEntries(Object.entries(raw.insurance || {}).map(([k, v]) => [`insurance.${k}`, v])),
  };
  for (const [field, fieldData] of Object.entries(allFields)) {
    const lowConf = extractLowConf(fieldData as FieldWithConfidence);
    if (lowConf) lowConfidenceFields.push({ field, ...lowConf });
  }

  return {
    type:       raw.documentType as OCRResult['type'],
    confidence: raw.overallConfidence,
    country:    raw.country ?? undefined,
    language:   raw.language,
    vehicle:    Object.keys(vehicle).some(k => vehicle[k as keyof VehicleData]) ? vehicle : undefined,
    driver:     Object.keys(driver).some(k => driver[k as keyof DriverData]) ? driver : undefined,
    insurance:  Object.keys(insurance).some(k => insurance[k as keyof InsuranceData]) ? insurance : undefined,
    lowConfidenceFields,
    warnings: raw.warnings || [],
    rawText:  raw.rawText,
  };
}

export async function scanDocument(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg',
  hint?: { documentType?: string; country?: string }
): Promise<OCRResult> {
  const docType    = hint?.documentType ?? 'auto';
  const userPrompt = getUserPrompt(docType);

  try {
    const response = await anthropic.messages.create({
      model:      'claude-opus-4-6',
      max_tokens: 1500,
      system:     SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
          { type: 'text', text: userPrompt },
        ],
      }],
    });

    const text  = response.content.find(b => b.type === 'text')?.text ?? '{}';
    const clean = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const raw: RawOCRResponse = JSON.parse(clean);

    logger.info('OCR scan completed', {
      docType:    raw.documentType,
      country:    raw.country,
      confidence: raw.overallConfidence,
      hasInsurer: !!raw.insurance?.company?.value,
      hasPolicy:  !!raw.insurance?.policyNumber?.value,
    });

    return mapToOCRResult(raw);

  } catch (err) {
    logger.error('OCR scan failed', { error: err instanceof Error ? err.message : String(err) });
    return {
      type: 'unknown', confidence: 0, rawText: '',
      warnings: [`OCR failed: ${err instanceof Error ? err.message : String(err)}`],
      lowConfidenceFields: [],
    };
  }
}

export async function scanDocumentPair(
  registrationBase64: string,
  insuranceDocBase64: string,
): Promise<{ registration: OCRResult; greenCard: OCRResult; merged: Partial<OCRResult> }> {

  const [registration, greenCard] = await Promise.all([
    scanDocument(registrationBase64, 'image/jpeg', { documentType: 'vehicle_registration' }),
    scanDocument(insuranceDocBase64, 'image/jpeg', { documentType: 'green_card' }),
  ]);

  const merged: Partial<OCRResult> = {
    vehicle:   registration.vehicle ?? greenCard.vehicle,
    driver:    registration.driver  ?? greenCard.driver,
    // Insurance data comes from the insurance document, not the registration
    insurance: greenCard.insurance  ?? registration.insurance,
    lowConfidenceFields: [
      ...(registration.lowConfidenceFields ?? []),
      ...(greenCard.lowConfidenceFields    ?? []),
    ],
    warnings: [...(registration.warnings ?? []), ...(greenCard.warnings ?? [])],
  };

  logger.info('OCR pair scan completed', {
    regType: registration.type, insType: greenCard.type,
    hasInsurer: !!merged.insurance?.company, hasPolicy: !!merged.insurance?.policyNumber,
  });

  return { registration, greenCard, merged };
}
