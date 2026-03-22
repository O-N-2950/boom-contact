import { logger } from '../logger.js';
import Anthropic from '@anthropic-ai/sdk';
import type { OCRResult, VehicleData, DriverData, InsuranceData } from '../../../shared/types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─────────────────────────────────────────────────────────────
// Prompt système — expert mondial documents véhicules & assurance
// Couvre 46 pays IMIC + formats hors-Europe
// ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are the world's best OCR system for vehicle registration documents and motor insurance documents.

## DOCUMENTS YOU RECOGNIZE

### 1. Vehicle Registration Documents (Permis de circulation / Carte grise / Zulassung / etc.)
- 🇨🇭 CH: "Permis de circulation" — Field 09 = insurer NAME only (e.g. "emmental", "AXA", "Zurich Insurance")
- 🇫🇷 FR: "Certificat d'immatriculation" (carte grise) — NO insurer field
- 🇩🇪 DE: "Zulassungsbescheinigung Teil I" — NO insurer field
- 🇧🇪 BE: "Certificat d'immatriculation DIV" — NO insurer field
- 🇮🇹 IT: "Carta di circolazione" — NO insurer field
- 🇪🇸 ES: "Permiso de circulación" — NO insurer field
- 🇬🇧 GB: "V5C" — NO insurer field
- Other countries: vehicle data only, NO insurer

### 2. International Insurance Cards — Green Card / Carte Verte / IMIC (46 countries)
The Green Card / IMIC (International Motor Insurance Certificate) is standardized worldwide.
- Field 4: "Ländercode / Versicherercode / Policennummer" → format "XX / NNN / XXXXXXXX"
  → Extract policyNumber = the part AFTER the second slash (e.g. "CH / 066 / 50194120" → policyNumber = "50194120")
  → Extract greenCardNumber = full field 4 value (e.g. "CH / 066 / 50194120")
- Field 9/10: Insurer name and address
- Field 3: Validity dates (from / to)
- Countries covered (list of 2-letter codes, crossed out = not covered)
- Valid for 46 countries: A, AL, AND, B, BG, BIH, BY, CH, CY, CZ, D, DK, E, EST, F, FIN, GB, GR, H, HR, IL, IR, IRL, IS, L, LT, LV, M, MA, MD, MK, MNE, N, NL, P, PL, RO, RUS, S, SK, SLO, SRB, TN, TR, UA

### 3. National Insurance Certificates (non-IMIC countries)
- 🇬🇧 UK: "Certificate of Motor Insurance" — insurer + policy number + validity
- 🇮🇪 IE: "Certificate of Motor Insurance" — same format as UK
- 🇺🇸 US: "Insurance ID Card" / "Proof of Insurance" — insurer + policy number
- 🇨🇦 CA: "Automobile Insurance Card" / "Pink Slip"
- 🇦🇺 AU: "Certificate of Insurance" / "Insurance Schedule"
- 🇯🇵 JP: "自動車損害賠償責任保険証明書" (Jibaiseki)
- 🇨🇳 CN: "机动车交通事故责任强制保险证" (Jiaogan)
- Other countries: local RC auto / third-party liability certificate

## CRITICAL RULES

1. **NEVER invent data** — if a field is not visible, return null
2. **NEVER extract policy number from registration documents** (except CH field 09 = insurer name ONLY)
3. For Swiss Permis de circulation field 09: extract ONLY the insurer name, set policyNumber = null
4. For Green Cards: extract policyNumber from field 4 (third element after second slash)
5. Respond ONLY with valid JSON — no markdown, no backticks, no explanation
6. Detect document type automatically from visual layout and text
7. If the document is a Green Card that shows BOTH ORIGINAL and COPY, read the ORIGINAL (top one)

## JSON SCHEMA (strictly follow)
{
  "documentType": "vehicle_registration" | "green_card" | "insurance_certificate" | "insurance_id_card" | "unknown",
  "country": "ISO 2-letter country code or null",
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
    "company":           { "value": string|null, "confidence": 0.0-1.0 },
    "policyNumber":      { "value": string|null, "confidence": 0.0-1.0 },
    "greenCardNumber":   { "value": string|null, "confidence": 0.0-1.0 },
    "validFrom":         { "value": string|null, "confidence": 0.0-1.0 },
    "validUntil":        { "value": string|null, "confidence": 0.0-1.0 },
    "coveredCountries":  { "value": string|null, "confidence": 0.0-1.0 }
  },
  "rawText": "complete verbatim text extracted",
  "warnings": ["list of issues: blur, partial visibility, expired document, etc."]
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
const CONFIDENCE_THRESHOLD = 0.65; // Légèrement abaissé pour les documents difficiles

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
    country:       extractValue(raw.driver?.country) ?? (raw.country ?? undefined),
    licenseNumber: extractValue(raw.driver?.licenseNumber),
  };

  const insurance: Partial<InsuranceData> = {
    company:         extractValue(raw.insurance?.company),
    policyNumber:    extractValue(raw.insurance?.policyNumber),
    greenCardNumber: extractValue(raw.insurance?.greenCardNumber),
    greenCardExpiry: extractValue(raw.insurance?.validUntil),
  };

  // Low-confidence fields needing human review
  const lowConfidenceFields: Array<{ field: string; value: string; confidence: number }> = [];
  const allFields = {
    ...Object.fromEntries(Object.entries(raw.vehicle  || {}).map(([k, v]) => [`vehicle.${k}`,   v])),
    ...Object.fromEntries(Object.entries(raw.driver   || {}).map(([k, v]) => [`driver.${k}`,    v])),
    ...Object.fromEntries(Object.entries(raw.insurance|| {}).map(([k, v]) => [`insurance.${k}`, v])),
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
    vehicle:    Object.keys(vehicle).some(k => vehicle[k as keyof VehicleData])   ? vehicle    : undefined,
    driver:     Object.keys(driver).some(k => driver[k as keyof DriverData])      ? driver     : undefined,
    insurance:  Object.keys(insurance).some(k => insurance[k as keyof InsuranceData]) ? insurance : undefined,
    lowConfidenceFields,
    warnings:   raw.warnings || [],
    rawText:    raw.rawText,
  };
}

// ─────────────────────────────────────────────────────────────
// Hint par type de document pour guider Claude
// ─────────────────────────────────────────────────────────────
function buildUserPrompt(hint?: { documentType?: string; country?: string }): string {
  if (!hint?.documentType || hint.documentType === 'auto') {
    return `Extract all information from this motor vehicle or insurance document. 
Identify the document type automatically.
- If it's a Green Card / Carte Verte / IMIC: extract insurer from field 10, policyNumber from field 4 (third part after second slash).
- If it's a Swiss Permis de circulation: extract insurer name from field 09, set policyNumber to null.
- If it's a registration document from any other country: set insurance.company and insurance.policyNumber to null.`;
  }

  if (hint.documentType === 'vehicle_registration') {
    const countryNote = hint.country === 'CH'
      ? 'This is a Swiss Permis de circulation. Extract insurer NAME from field 09. Set policyNumber to null — it is NOT on this document.'
      : `This is a vehicle registration document from ${hint.country ?? 'unknown country'}. Insurance data is NOT on registration documents (except Switzerland). Set insurance fields to null.`;
    return `Extract all vehicle and owner information. ${countryNote}`;
  }

  if (hint.documentType === 'green_card') {
    return `Extract all information from this Green Card / Carte Verte / IMIC (International Motor Insurance Certificate).
Field 4 format: "XX / NNN / XXXXXXXX" → extract policyNumber = ONLY the last part (after second slash).
Field 9 or 10: extract insurer name and address.
Field 3: extract validity dates (from/to).
Extract covered countries (list of 2-letter codes that are NOT crossed out).`;
  }

  if (hint.documentType === 'insurance_certificate' || hint.documentType === 'insurance_id_card') {
    return `Extract all information from this motor insurance certificate/card.
Extract: insurer name, policy number, validity dates, vehicle plate, policyholder name.`;
  }

  return `Extract all information from this document. Hint: type=${hint.documentType}, country=${hint.country ?? 'unknown'}.`;
}

// ─────────────────────────────────────────────────────────────
// Main export — scan single document
// ─────────────────────────────────────────────────────────────
export async function scanDocument(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg',
  hint?: { documentType?: string; country?: string }
): Promise<OCRResult> {
  const userPrompt = buildUserPrompt(hint);

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
            text: userPrompt,
          },
        ],
      }],
    });

    const text = response.content.find(b => b.type === 'text')?.text ?? '{}';
    const clean = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const raw: RawOCRResponse = JSON.parse(clean);

    logger.info('OCR scan success', {
      docType: raw.documentType,
      country: raw.country,
      confidence: raw.overallConfidence,
      hasInsurance: !!(raw.insurance?.company?.value),
      hasPolicyNumber: !!(raw.insurance?.policyNumber?.value),
    });

    return mapToOCRResult(raw);

  } catch (err) {
    logger.error('OCR scan failed', { error: err instanceof Error ? err.message : String(err) });
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
// Batch: scan registration + insurance document simultaneously
// Registration → vehicle + driver (+ insurer if CH)
// Insurance doc → insurance data (company + policy number)
// ─────────────────────────────────────────────────────────────
export async function scanDocumentPair(
  registrationBase64: string,
  insuranceDocBase64: string,
): Promise<{ registration: OCRResult; greenCard: OCRResult; merged: Partial<OCRResult> }> {
  const [registration, insuranceDoc] = await Promise.all([
    scanDocument(registrationBase64, 'image/jpeg', { documentType: 'vehicle_registration' }),
    scanDocument(insuranceDocBase64,  'image/jpeg', { documentType: 'auto' }), // auto-detect: green card, cert, ID card, etc.
  ]);

  // Merge strategy:
  // - Vehicle data: registration wins
  // - Driver data: registration wins
  // - Insurance data: insurance doc wins (it has the complete data)
  //   Exception: if registration is Swiss and has insurer name, keep it if insurance doc has no company
  const mergedInsurance = {
    ...insuranceDoc.insurance,
    company: insuranceDoc.insurance?.company
      ?? (registration.country === 'CH' ? registration.insurance?.company : undefined),
  };

  const merged: Partial<OCRResult> = {
    vehicle:   registration.vehicle  ?? insuranceDoc.vehicle,
    driver:    registration.driver   ?? insuranceDoc.driver,
    insurance: Object.keys(mergedInsurance || {}).some(k => (mergedInsurance as any)[k])
      ? mergedInsurance
      : registration.insurance,
    lowConfidenceFields: [
      ...(registration.lowConfidenceFields ?? []),
      ...(insuranceDoc.lowConfidenceFields ?? []),
    ],
    warnings: [...(registration.warnings ?? []), ...(insuranceDoc.warnings ?? [])],
  };

  logger.info('OCR pair scan success', {
    registrationCountry: registration.country,
    registrationDocType: registration.type,
    insuranceDocType:    insuranceDoc.type,
    hasCompany:          !!mergedInsurance?.company,
    hasPolicyNumber:     !!mergedInsurance?.policyNumber,
  });

  return { registration, greenCard: insuranceDoc, merged };
}
