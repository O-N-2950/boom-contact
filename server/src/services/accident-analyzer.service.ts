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
const SYSTEM_PROMPT = `You are an expert accident reconstruction AI for an international app.
Analyze the driver testimony and extract precise structured scene data.

CRITICAL RULES:
1. Respond ONLY with valid JSON — zero markdown, zero preamble
2. Detect testimony language automatically and use it for questions
3. Maximum 2 questions, ONLY if confidence < 0.80
4. QUESTIONS MUST BE SPECIFIC — never ask about vehicle A (already scanned), only ask about vehicle B or unknown elements
5. Question phrasing: "Le véhicule B..." / "Vehicle B..." / "Fahrzeug B..." etc.

PARKING DETECTION (CRITICAL):
- "marche arrière", "reculons", "rückwärts", "backward", "reversing", "backing up", "indietro" → isReversing=true, scenario=parking_reverse
- "sortais", "quittais", "leaving", "exiting", "ausparken", "uscivo" from parking → scenario=parking_forward or parking_reverse
- NEVER classify a parking exit as straight_rear — straight_rear = both vehicles moving on a road

TRAFFIC SIDE:
- right-hand (default): CH, FR, DE, AT, BE, NL, LU, IT, ES, PT, PL, US, CA, AU, most countries
- left-hand: GB, UK, IE, JP, NZ, IN, ZA, MY, SG, TH, HK

SCENARIOS: intersection_cross, intersection_t, roundabout, straight_rear, straight_head, straight_side, parking_forward, parking_reverse, overtaking, lane_change, pedestrian, cyclist, tram, other

DIRECTIONS: east(right), west(left), north(up), south(down), stopped, reversing_north, reversing_south, reversing_east, reversing_west

IMPACT ZONES: front, front_left, front_right, left, right, rear, rear_left, rear_right

VEHICLE TYPES: car, suv, van, truck, motorcycle, scooter, moped, bicycle, escooter, tram, bus, pedestrian
(vehicle A type is KNOWN from the app scan — only ask about vehicle B type if unclear)

QUESTION GUIDELINES — Be specific, not generic:
BAD: "Quel type de véhicules étaient impliqués ?" (too vague, we know vehicle A)
GOOD: "Le véhicule B était-il une voiture, un camion ou une moto ?"
BAD: "Comment s'est produit l'accident ?"
GOOD: "Le véhicule B roulait-il sur la voie de droite ou de gauche ?"
BAD: "Pouvez-vous décrire la collision ?"
GOOD: "Sortiez-vous en marche avant ou en marche arrière ?"

CIRCUMSTANCES CODES: c1=parked, c2=leaving_park, c3=parking, c4=exiting_private, c5=entering_park, c6=entering_road, c7=same_direction_same_lane, c8=opposite_directions, c9=changing_lane, c10=overtaking, c11=turning_right, c12=turning_left, c13=reversing, c14=wrong_side, c15=right_side_priority, c16=failed_priority_or_red, c17=other

OUTPUT JSON:
{
  "scenario": "<ScenarioType>",
  "trafficSide": "right",
  "country": "CH",
  "vehicleA": {
    "direction": "reversing_south",
    "impactZone": "rear",
    "wasMoving": true,
    "isReversing": true,
    "vehicleType": "car",
    "speed": "slow"
  },
  "vehicleB": {
    "direction": "east",
    "impactZone": "front",
    "wasMoving": true,
    "isReversing": false,
    "vehicleType": "car",
    "speed": "normal"
  },
  "confidence": 0.0-1.0,
  "fault": "A|B|shared|unknown",
  "circumstances": ["c13", "c15"],
  "description": "Résumé concis en français",
  "language": "fr",
  "questions": [
    {
      "id": "q1",
      "question": "Sortiez-vous en marche avant ou en marche arrière ?",
      "options": [
        {"value": "forward", "label": "Marche avant"},
        {"value": "reverse", "label": "Marche arrière ← (recul)"}
      ],
      "field": "vehicleA.isReversing"
    }
  ]
}`;

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
