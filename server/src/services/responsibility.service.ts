// server/src/services/responsibility.service.ts
// Estimation de responsabilité IDA/IRSA via Claude
// Barème suisse de répartition de responsabilité — usage non contractuel

import { z } from 'zod';
import { logger } from '../logger.js';
import { anthropic } from './anthropic.client.js';

// ── Types ─────────────────────────────────────────────────────
export interface ResponsibilityEstimate {
  percentA: number;         // 0-100
  percentB: number;         // 0-100 (= 100 - percentA)
  confidence: 'low' | 'medium' | 'high';
  reasoning: string;        // explication concise en langue détectée
  disclaimer: string;       // toujours en français + langue détectée
  language: string;
  appliedRules: string[];   // règles IDA/IRSA appliquées
}

// ── Zod schema for AI response ────────────────────────────────
const ResponsibilityResponseSchema = z.object({
  percentA: z.number().min(0).max(100),
  percentB: z.number().min(0).max(100),
  confidence: z.enum(['low', 'medium', 'high']),
  reasoning: z.string(),
  disclaimer: z.string(),
  language: z.string(),
  appliedRules: z.array(z.string()),
}).passthrough();

// ── Prompt système IDA/IRSA ───────────────────────────────────
const SYSTEM_PROMPT = `You are a Swiss accident liability estimation expert applying the IDA/IRSA scale (Indemnisation Directe des Assurés / Indemnisation Rapide et Sans frais de l'Assurance).

CRITICAL RULES:
1. Respond ONLY with valid JSON — zero markdown, zero preamble
2. Detect the language from the description/context and use it for reasoning
3. ALWAYS include a disclaimer in BOTH French and the detected language
4. percentA + percentB MUST equal 100
5. Round to nearest 5 (0, 5, 10, 15... 95, 100)

IDA/IRSA RULES (apply in order of priority):
- c16 (Feux rouges / Stop non respectés, priorité non respectée) → fautif: 100% responsable. Règle: "Non-respect feux/priorité — Art. 27 LCR"
- c15 (Priorité à droite non respectée) → venant de gauche: 75-100% responsable. Règle: "Priorité à droite — Art. 36 LCR"
- c13 (Recul / marche arrière) → qui recule: 75-100% responsable. Règle: "Manœuvre de recul — Art. 36 al. 4 LCR"
- c9 (Changement de voie) → qui change: 75-100% responsable. Règle: "Changement de voie — Art. 34 LCR"
- c10 (Dépassement) → qui dépasse: 50-75% responsable. Règle: "Dépassement — Art. 35 LCR"
- c2/c3 (Sortie/entrée parking) → qui sort/entre: 50-75% responsable. Règle: "Sortie de parking — Art. 36 al. 3 LCR"
- c11 (Virage à droite) / c12 (Virage à gauche) → qui tourne: 50-75% si coupe voie. Règle: "Virage — Art. 36 al. 1-2 LCR"
- c8 (Sens inverse, dépassement frontal) → dépasseur: 75-100%. Règle: "Circulation à contresens — Art. 34 LCR"
- c14 (Mauvais côté de route) → fautif: 75-100%. Règle: "Circulation à contresens — Art. 34 LCR"
- c4/c6 (Sortie terrain privé / entrée circulation) → qui sort: 50-75%. Règle: "Sortie voie privée — Art. 36 al. 4 LCR"
- c1 (Véhicule stationné) → parked: 0-25% max (victime). Règle: "Véhicule stationné — Art. 26 LCR"
- c7 (Même direction, même voie, choc arrière) → suiveur: 75-100%. Règle: "Choc arrière — Art. 34 al. 4 LCR"
- Vitesse excessive (fault context) → aggravation jusqu'à +25%
- Default (aucune règle spécifique) → 50/50 responsabilité partagée. Règle: "Responsabilité partagée — Art. 37 LCR"

CONFIDENCE LEVELS:
- high: ≥2 circumstance codes concordants, scénario clair
- medium: 1 code ou scénario partiel
- low: aucun code ou contradiction flagrante

DISCLAIMER TEXT (always bilingual French + detected language):
French: "Estimation indicative non contractuelle — ne constitue pas une décision juridique. Contactez votre assureur."
English: "Indicative non-binding estimate — not a legal decision. Contact your insurer."
German: "Unverbindliche Schätzung — keine rechtliche Entscheidung. Kontaktieren Sie Ihren Versicherer."
Italian: "Stima indicativa non vincolante — non costituisce decisione legale. Contattate il vostro assicuratore."
Other languages: translate accordingly.

OUTPUT JSON:
{
  "percentA": 0-100,
  "percentB": 0-100,
  "confidence": "low|medium|high",
  "reasoning": "concise explanation in detected language (2-3 sentences max)",
  "disclaimer": "French disclaimer + detected language disclaimer (if different from French)",
  "language": "fr|de|it|en|...",
  "appliedRules": ["Règle 1 — Art. X LCR", "Règle 2 — Art. Y LCR"]
}`;

// ── Estimation principale ─────────────────────────────────────
export async function estimateResponsibility(input: {
  circumstances: { A: string[]; B: string[] };
  fault?: string;
  scenario?: string;
  description?: string;
  language?: string;
}): Promise<ResponsibilityEstimate> {
  const { circumstances, fault, scenario, description, language } = input;

  const circA = circumstances.A ?? [];
  const circB = circumstances.B ?? [];

  const userMessage = `Estimate liability for this accident:

CIRCUMSTANCES A (declared by driver A): ${circA.length > 0 ? circA.join(', ') : 'none'}
CIRCUMSTANCES B (declared by driver B): ${circB.length > 0 ? circB.join(', ') : 'none'}
SCENARIO: ${scenario ?? 'unknown'}
FAULT (from AI analysis): ${fault ?? 'unknown'}
DESCRIPTION: ${description ? description.slice(0, 500) : 'none'}
DETECTED LANGUAGE: ${language ?? 'fr'}

Apply IDA/IRSA rules and return JSON estimate.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content.find(b => b.type === 'text')?.text ?? '{}';
    const clean = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(clean);
    const result = ResponsibilityResponseSchema.parse(parsed);

    // Normalise: ensure percentA + percentB = 100
    const total = result.percentA + result.percentB;
    if (total !== 100) {
      result.percentB = 100 - result.percentA;
    }

    logger.info('Responsibility estimate computed', {
      percentA: result.percentA,
      percentB: result.percentB,
      confidence: result.confidence,
      appliedRules: result.appliedRules,
    });

    return result as ResponsibilityEstimate;

  } catch (err) {
    logger.error('Responsibility estimation failed', {
      error: err instanceof Error ? err.message : String(err),
    });

    // Fallback conservative: 50/50 low confidence
    const lang = language ?? 'fr';
    return {
      percentA: 50,
      percentB: 50,
      confidence: 'low',
      reasoning: lang === 'fr'
        ? 'Données insuffisantes pour une estimation fiable.'
        : 'Insufficient data for a reliable estimate.',
      disclaimer: 'Estimation indicative non contractuelle — ne constitue pas une décision juridique. Contactez votre assureur.',
      language: lang,
      appliedRules: ['Responsabilité partagée par défaut — Art. 37 LCR'],
    };
  }
}
