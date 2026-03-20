import Anthropic from '@anthropic-ai/sdk';
import type { OCRResult } from '../../../shared/types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an expert OCR system specialized in vehicle documents worldwide.
Analyze the image and extract ALL visible information.
Respond ONLY with valid JSON, no markdown, no explanation.

JSON structure:
{
  "type": "vehicle_registration" | "green_card" | "id" | "unknown",
  "confidence": 0.0-1.0,
  "vehicle": {
    "licensePlate": "",
    "brand": "",
    "model": "",
    "year": "",
    "color": "",
    "vin": ""
  },
  "driver": {
    "firstName": "",
    "lastName": "",
    "address": "",
    "city": "",
    "country": "",
    "licenseNumber": ""
  },
  "insurance": {
    "company": "",
    "policyNumber": "",
    "greenCardNumber": "",
    "greenCardExpiry": ""
  },
  "rawText": "full extracted text"
}`;

export async function scanDocument(
  imageBase64: string,
  documentType: string = 'auto',
  country: string = 'auto'
): Promise<OCRResult> {
  const hint = documentType !== 'auto'
    ? `Document type hint: ${documentType}. Country hint: ${country}.`
    : '';

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: imageBase64,
          },
        },
        {
          type: 'text',
          text: `${hint}\nExtract all information from this vehicle document.`,
        },
      ],
    }],
    system: SYSTEM_PROMPT,
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';

  try {
    return JSON.parse(text) as OCRResult;
  } catch {
    return { type: 'unknown', confidence: 0, rawText: text };
  }
}
