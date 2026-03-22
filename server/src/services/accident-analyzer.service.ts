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
const SYSTEM_PROMPT = `You are an expert accident reconstruction AI. Analyze the driver testimony and extract precise scene data.

CRITICAL RULES:
1. JSON only — no markdown
2. Detect testimony language automatically
3. Questions MUST be in the SAME LANGUAGE as testimony
4. Maximum 2 questions if confidence < 0.80
5. ALWAYS ask about reversing if "parking", "marche arrière", "reculons", "backward", "rückwärts" mentioned

TRAFFIC SIDE BY COUNTRY:
- right-hand traffic: CH, FR, DE, AT, BE, NL, LU, ES, IT, PT, PL, SE, NO, DK, FI, RU, UA, US, CA, AU (most of world)
- left-hand traffic: GB, UK, IE, JP, AU, NZ, IN, ZA, MY, SG, TH

SCENARIOS: intersection_cross, intersection_t, roundabout, straight_rear, straight_head, straight_side, parking_forward, parking_reverse, overtaking, lane_change, pedestrian, cyclist, tram, other

VEHICLE TYPES (extract from testimony if mentioned):
car, suv, van, truck, motorcycle, scooter, moped, bicycle, escooter, tram, bus, train, pedestrian

DIRECTIONS (movement direction before impact):
For right-hand traffic: vehicles travel on the RIGHT side
- north: upward on sketch
- south: downward  
- east: rightward
- west: leftward
- stopped: stationary
- reversing_north/south/east/west: reversing in that direction

IMPACT ZONES: front, front_left, front_right, left, right, rear, rear_left, rear_right

OUTPUT JSON SCHEMA:
{
  "scenario": "<ScenarioType>",
  "trafficSide": "right" | "left",
  "country": "CH" | "FR" | "DE" | etc,
  "vehicleA": {
    "direction": "<Direction>",
    "impactZone": "<ImpactZone>",
    "wasMoving": true,
    "isReversing": false,
    "vehicleType": "car",
    "speed": "slow" | "normal" | "fast"
  },
  "vehicleB": {
    "direction": "<Direction>",
    "impactZone": "<ImpactZone>",
    "wasMoving": true,
    "isReversing": false,
    "vehicleType": "car",
    "speed": "slow" | "normal" | "fast"
  },
  "confidence": 0.0-1.0,
  "fault": "A" | "B" | "shared" | "unknown",
  "circumstances": ["c2", "c15"],
  "description": "Brief summary in French",
  "language": "fr" | "de" | "en" | etc,
  "questions": [
    {
      "id": "q1",
      "question": "In testimony language",
      "options": [{"value": "val", "label": "In testimony language"}],
      "field": "vehicleA.isReversing"
    }
  ]
}

PARKING RULES:
- If "sortais d'une place", "quittait stationnement", "leaving parking" → scenario=parking_forward, ask if reversing
- If "reculons", "marche arrière", "backward", "rückwärts" → isReversing=true, scenario=parking_reverse
- In right-hand traffic parking: parked car exits to the LEFT to join traffic flow

IMPORTANT for PARKING scenarios:
- Vehicle A exiting parking: starts STOPPED, moves to join road
- Vehicle B on main road: travels on its side (right lane in right-hand traffic)
- Impact usually on front_right of A (if exiting rightward) or front of A`;

// ── Analyse principale ────────────────────────────────────────
export async function analyzeAccidentTranscript(
  transcript: string,
  previousAnswers?: Record<string, string>
): Promise<AccidentSceneAnalysis> {

  // Détecter marche arrière dans le témoignage pour enrichir le contexte
  const isReversing = /reculons|marche.arri[eè]re|en reculant|backing|rückwärts|marcha atr[aá]s|в обратном|倒车/i.test(transcript);
  const isParkingExit = /sortais?.*(place|parking|parc)|quittais|leaving.park|verlasse.Parkplatz/i.test(transcript);

  const contextHint = isReversing
    ? '\n\nCONTEXT: The driver explicitly mentions reversing/backing out. Vehicle A was moving BACKWARDS. Impact zone is likely REAR (rear, rear_left, or rear_right). Set wasMoving=true and direction accordingly.'
    : isParkingExit
    ? '\n\nCONTEXT: Driver was exiting a parking space. Consider both forward and reverse exit. Include rear impact options in questions.'
    : '';

  const userMessage = previousAnswers && Object.keys(previousAnswers).length > 0
    ? `TESTIMONY: "\${transcript}"\n\nCLARIFICATION ANSWERS: \${JSON.stringify(previousAnswers)}\n\nNow provide final analysis with higher confidence.`
    : `Analyze this accident testimony and extract scene data:\n\n"\${transcript}"\${contextHint}`;

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
