// server/src/services/accident-analyzer.service.ts
// Analyse IA du témoignage vocal → scénario d'accident structuré
// Claude Sonnet — rapide, précis, multilingue

import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../logger.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Types scène ───────────────────────────────────────────────
export type ScenarioType =
  | 'intersection_cross'    // Carrefour en croix
  | 'intersection_t'        // Intersection en T
  | 'roundabout'            // Rond-point
  | 'straight_rear'         // Ligne droite — choc arrière
  | 'straight_head'         // Ligne droite — choc frontal
  | 'straight_side'         // Ligne droite — dépassement/choc latéral
  | 'parking'               // Parking / manœuvre
  | 'overtaking'            // Dépassement
  | 'lane_change'           // Changement de voie
  | 'pedestrian'            // Piéton
  | 'other';                // Autre

export type Direction = 'north' | 'south' | 'east' | 'west' | 'stopped';
export type ImpactZone = 'front' | 'front_left' | 'front_right' | 'left' | 'right' | 'rear' | 'rear_left' | 'rear_right' | 'unknown';

export interface VehicleSceneData {
  direction: Direction;       // Direction de déplacement avant impact
  impactZone: ImpactZone;    // Zone touchée sur CE véhicule
  wasMoving: boolean;
  speed?: 'slow' | 'normal' | 'fast';
}

export interface AccidentSceneAnalysis {
  scenario: ScenarioType;
  vehicleA: VehicleSceneData;
  vehicleB: VehicleSceneData;
  confidence: number;          // 0-1
  fault?: 'A' | 'B' | 'shared' | 'unknown';
  circumstances: string[];     // codes circonstances (c1-c17)
  description: string;         // Résumé en FR
  language: string;            // Langue détectée du témoignage
  // Questions de clarification si confidence < 0.80
  questions?: ClarifyQuestion[];
}

export interface ClarifyQuestion {
  id: string;
  question: string;            // Question dans la langue du conducteur
  options: { value: string; label: string }[];
  field: string;               // Champ à clarifier
}

// ── Prompt système ────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert accident reconstruction AI for an international accident report app.

Your job: analyze a driver's verbal testimony about a car accident and extract structured scene data.

RULES:
1. Respond ONLY with valid JSON — no markdown, no explanation
2. Detect the testimony language automatically
3. Be conservative — if unsure, lower confidence and add clarifying questions
4. Maximum 2 clarifying questions — only for truly ambiguous elements
5. The questions must be in the SAME LANGUAGE as the testimony
6. Circumstances codes: c1=parked, c2=leaving park, c3=parking, c4=exiting private, c5=entering park, c6=entering road, c7=same lane same direction, c8=same lane diff direction, c9=changing lane, c10=overtaking, c11=turning right, c12=turning left, c13=reversing, c14=wrong side, c15=coming from right, c16=failed priority/red light, c17=other

SCENARIOS:
- intersection_cross: crossroads accident
- intersection_t: T-junction accident  
- roundabout: roundabout accident
- straight_rear: rear-end collision
- straight_head: head-on collision
- straight_side: side collision on straight road
- parking: parking maneuver accident
- overtaking: overtaking accident
- lane_change: lane change accident
- pedestrian: pedestrian involved
- other: anything else

DIRECTIONS (vehicle travel direction before impact):
- north: going upward/forward on the sketch
- south: going downward/backward
- east: going right
- west: going left
- stopped: vehicle was stationary

IMPACT ZONES: front, front_left, front_right, left, right, rear, rear_left, rear_right, unknown

OUTPUT JSON SCHEMA:
{
  "scenario": "<ScenarioType>",
  "vehicleA": {
    "direction": "<Direction>",
    "impactZone": "<ImpactZone>",
    "wasMoving": true,
    "speed": "normal"
  },
  "vehicleB": {
    "direction": "<Direction>",
    "impactZone": "<ImpactZone>",
    "wasMoving": true,
    "speed": "normal"
  },
  "confidence": 0.0-1.0,
  "fault": "A|B|shared|unknown",
  "circumstances": ["c15", "c16"],
  "description": "Brief summary in French",
  "language": "fr|de|it|en|es|ru|zh|...",
  "questions": [
    {
      "id": "q1",
      "question": "Question in testimony language",
      "options": [
        {"value": "right", "label": "Label in testimony language"},
        {"value": "left", "label": "Label in testimony language"}
      ],
      "field": "vehicleB.direction"
    }
  ]
}

IMPORTANT: questions array should be empty [] if confidence >= 0.80`;

// ── Analyse principale ────────────────────────────────────────
export async function analyzeAccidentTranscript(
  transcript: string,
  previousAnswers?: Record<string, string>
): Promise<AccidentSceneAnalysis> {

  const userMessage = previousAnswers && Object.keys(previousAnswers).length > 0
    ? `TESTIMONY: "${transcript}"\n\nCLARIFICATION ANSWERS: ${JSON.stringify(previousAnswers)}\n\nNow provide final analysis with higher confidence.`
    : `Analyze this accident testimony and extract scene data:\n\n"${transcript}"`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',  // Rapide + précis — pas besoin d'Opus ici
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content.find(b => b.type === 'text')?.text ?? '{}';
    const clean = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const result: AccidentSceneAnalysis = JSON.parse(clean);

    logger.info('Accident analysis success', {
      scenario: result.scenario,
      confidence: result.confidence,
      fault: result.fault,
      language: result.language,
      questionsCount: result.questions?.length ?? 0,
    });

    return result;

  } catch (err) {
    logger.error('Accident analysis failed', { error: err instanceof Error ? err.message : String(err) });
    // Fallback — retourner un résultat minimal pour ne pas bloquer l'utilisateur
    return {
      scenario: 'other',
      vehicleA: { direction: 'north', impactZone: 'unknown', wasMoving: true },
      vehicleB: { direction: 'south', impactZone: 'unknown', wasMoving: true },
      confidence: 0,
      fault: 'unknown',
      circumstances: ['c17'],
      description: transcript.slice(0, 200),
      language: 'fr',
      questions: [],
    };
  }
}
