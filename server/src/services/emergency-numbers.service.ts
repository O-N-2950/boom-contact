import { logger } from '../logger.js';

// ── Types ─────────────────────────────────────────────────────
export interface CountryEmergencyResult {
  countryCode: string;
  countryName: string;
  police: string;
  ambulance: string;
  fire: string;
  universal?: string;      // 112 or 911 if available
  roadside?: string;       // National roadside assistance
  roadsideNote?: string;
  source: 'db' | 'ai' | 'not_found';
  confidence: 'high' | 'medium' | 'low';
}

// ── Local DB — verified numbers for 60+ countries ────────────
// Sources: Wikipedia List of emergency telephone numbers + official govt sites
const EMERGENCY_DB: Record<string, Omit<CountryEmergencyResult, 'source' | 'confidence'>> = {
  // ── Europe francophone ────────────────────────────────────
  CH: { countryCode:'CH', countryName:'Suisse', police:'117', ambulance:'144', fire:'118', universal:'112', roadside:'0800 140 140', roadsideNote:'TCS 24h/7j' },
  FR: { countryCode:'FR', countryName:'France', police:'17', ambulance:'15', fire:'18', universal:'112', roadside:'0 800 200 200', roadsideNote:'AXA Assistance' },
  BE: { countryCode:'BE', countryName:'Belgique', police:'101', ambulance:'100', fire:'100', universal:'112', roadside:'0800 82 000', roadsideNote:'VAB Assistance' },
  LU: { countryCode:'LU', countryName:'Luxembourg', police:'113', ambulance:'112', fire:'112', universal:'112', roadside:'26 000', roadsideNote:'ACL' },
  // ── Europe ────────────────────────────────────────────────
  DE: { countryCode:'DE', countryName:'Deutschland', police:'110', ambulance:'112', fire:'112', universal:'112', roadside:'0800 5 10 11 12', roadsideNote:'ADAC' },
  AT: { countryCode:'AT', countryName:'Österreich', police:'133', ambulance:'144', fire:'122', universal:'112', roadside:'120', roadsideNote:'ÖAMTC' },
  IT: { countryCode:'IT', countryName:'Italia', police:'112', ambulance:'118', fire:'115', universal:'112', roadside:'803 116', roadsideNote:'ACI' },
  ES: { countryCode:'ES', countryName:'España', police:'112', ambulance:'112', fire:'112', universal:'112', roadside:'900 100 992', roadsideNote:'RACE' },
  PT: { countryCode:'PT', countryName:'Portugal', police:'112', ambulance:'112', fire:'112', universal:'112', roadside:'21 942 50 95', roadsideNote:'ACP' },
  GB: { countryCode:'GB', countryName:'United Kingdom', police:'999', ambulance:'999', fire:'999', universal:'112', roadside:'0800 887 766', roadsideNote:'AA' },
  IE: { countryCode:'IE', countryName:'Ireland', police:'999', ambulance:'999', fire:'999', universal:'112', roadside:'1800 667 788', roadsideNote:'AA Ireland' },
  NL: { countryCode:'NL', countryName:'Nederland', police:'112', ambulance:'112', fire:'112', universal:'112', roadside:'0800 0888', roadsideNote:'ANWB' },
  SE: { countryCode:'SE', countryName:'Sverige', police:'112', ambulance:'112', fire:'112', universal:'112', roadside:'020-912 912', roadsideNote:'Assistancekåren' },
  NO: { countryCode:'NO', countryName:'Norge', police:'112', ambulance:'113', fire:'110', universal:'112', roadside:'08505', roadsideNote:'NAF' },
  DK: { countryCode:'DK', countryName:'Danmark', police:'112', ambulance:'112', fire:'112', universal:'112', roadside:'70 10 20 30', roadsideNote:'Falck' },
  FI: { countryCode:'FI', countryName:'Suomi', police:'112', ambulance:'112', fire:'112', universal:'112', roadside:'0200 8080', roadsideNote:'Autoliiton tiepalvelu' },
  PL: { countryCode:'PL', countryName:'Polska', police:'997', ambulance:'999', fire:'998', universal:'112', roadside:'196', roadsideNote:'PZM' },
  CZ: { countryCode:'CZ', countryName:'Česká republika', police:'158', ambulance:'155', fire:'150', universal:'112' },
  HU: { countryCode:'HU', countryName:'Magyarország', police:'107', ambulance:'104', fire:'105', universal:'112' },
  RO: { countryCode:'RO', countryName:'România', police:'112', ambulance:'112', fire:'112', universal:'112' },
  GR: { countryCode:'GR', countryName:'Ελλάδα Greece', police:'100', ambulance:'166', fire:'199', universal:'112', roadside:'10400', roadsideNote:'ELPA' },
  HR: { countryCode:'HR', countryName:'Hrvatska', police:'192', ambulance:'194', fire:'193', universal:'112', roadside:'987', roadsideNote:'HAK' },
  RU: { countryCode:'RU', countryName:'Россия Russia', police:'102', ambulance:'103', fire:'101', universal:'112', roadside:'+7 495 623 0503', roadsideNote:'RAMC — Moscou' },
  TR: { countryCode:'TR', countryName:'Türkiye', police:'155', ambulance:'112', fire:'110', universal:'112', roadside:'444 1 444', roadsideNote:'TÜVTÜRK Kurtarma' },
  UA: { countryCode:'UA', countryName:'Україна Ukraine', police:'102', ambulance:'103', fire:'101', universal:'112' },
  // ── Amériques ─────────────────────────────────────────────
  US: { countryCode:'US', countryName:'United States', police:'911', ambulance:'911', fire:'911', universal:'911', roadside:'1-800-222-4357', roadsideNote:'AAA membres' },
  CA: { countryCode:'CA', countryName:'Canada', police:'911', ambulance:'911', fire:'911', universal:'911', roadside:'1-800-222-4357', roadsideNote:'CAA membres' },
  MX: { countryCode:'MX', countryName:'México', police:'911', ambulance:'911', fire:'911', universal:'911', roadside:'078', roadsideNote:'Ángeles Verdes — autoroutes' },
  BR: { countryCode:'BR', countryName:'Brasil', police:'190', ambulance:'192', fire:'193', universal:'112', roadside:'191', roadsideNote:'Polícia Rodoviária Federal' },
  AR: { countryCode:'AR', countryName:'Argentina', police:'911', ambulance:'911', fire:'911', universal:'911' },
  CL: { countryCode:'CL', countryName:'Chile', police:'133', ambulance:'131', fire:'132', universal:'112' },
  CO: { countryCode:'CO', countryName:'Colombia', police:'112', ambulance:'125', fire:'119', universal:'123' },
  PE: { countryCode:'PE', countryName:'Perú', police:'911', ambulance:'106', fire:'116', universal:'911' },
  // ── Asie-Pacifique ────────────────────────────────────────
  AU: { countryCode:'AU', countryName:'Australia', police:'000', ambulance:'000', fire:'000', universal:'112', roadside:'13 11 22', roadsideNote:'NRMA (NSW/ACT)' },
  NZ: { countryCode:'NZ', countryName:'New Zealand', police:'111', ambulance:'111', fire:'111', universal:'112', roadside:'0800 500 222', roadsideNote:'AA NZ' },
  JP: { countryCode:'JP', countryName:'日本 Japan', police:'110', ambulance:'119', fire:'119', universal:'112', roadside:'0570-00-8139', roadsideNote:'JAF' },
  CN: { countryCode:'CN', countryName:'中国 China', police:'110', ambulance:'120', fire:'119', universal:'112', roadside:'122', roadsideNote:'Traffic police accident' },
  KR: { countryCode:'KR', countryName:'대한민국 Korea', police:'112', ambulance:'119', fire:'119', universal:'112' },
  IN: { countryCode:'IN', countryName:'India', police:'112', ambulance:'108', fire:'101', universal:'112', roadside:'1033', roadsideNote:'NHAI autoroutes — gratuit 24h' },
  SG: { countryCode:'SG', countryName:'Singapore', police:'999', ambulance:'995', fire:'995', universal:'112', roadside:'1800 748 9911', roadsideNote:'AA Singapore' },
  MY: { countryCode:'MY', countryName:'Malaysia', police:'999', ambulance:'999', fire:'994', universal:'112', roadside:'1-800-88-0000', roadsideNote:'Covered under MIROS' },
  TH: { countryCode:'TH', countryName:'ประเทศไทย Thailand', police:'191', ambulance:'1669', fire:'199', universal:'112', roadside:'1193', roadsideNote:'Highway police' },
  ID: { countryCode:'ID', countryName:'Indonesia', police:'110', ambulance:'118', fire:'113', universal:'112' },
  PH: { countryCode:'PH', countryName:'Philippines', police:'911', ambulance:'911', fire:'911', universal:'911' },
  VN: { countryCode:'VN', countryName:'Việt Nam', police:'113', ambulance:'115', fire:'114', universal:'112' },
  // ── Moyen-Orient ─────────────────────────────────────────
  AE: { countryCode:'AE', countryName:'UAE / Dubai', police:'999', ambulance:'998', fire:'997', universal:'112', roadside:'800 9090', roadsideNote:'RTA Dubai' },
  SA: { countryCode:'SA', countryName:'Saudi Arabia', police:'999', ambulance:'997', fire:'998', universal:'112', roadside:'920008580', roadsideNote:'Saudi Aramco / insurers' },
  IL: { countryCode:'IL', countryName:'Israel', police:'100', ambulance:'101', fire:'102', universal:'112', roadside:'*3456', roadsideNote:'Shagrir' },
  TR2: { countryCode:'TR', countryName:'Türkiye', police:'155', ambulance:'112', fire:'110', universal:'112' },
  // ── Afrique ──────────────────────────────────────────────
  ZA: { countryCode:'ZA', countryName:'South Africa', police:'10111', ambulance:'10177', fire:'10177', universal:'112', roadside:'0800 01 01 01', roadsideNote:'AA South Africa' },
  MA: { countryCode:'MA', countryName:'Maroc', police:'19', ambulance:'15', fire:'15', universal:'112', roadside:'177', roadsideNote:'Gendarmerie Royale routes' },
  EG: { countryCode:'EG', countryName:'Egypt', police:'122', ambulance:'123', fire:'180', universal:'112' },
  NG: { countryCode:'NG', countryName:'Nigeria', police:'112', ambulance:'112', fire:'112', universal:'112' },
  KE: { countryCode:'KE', countryName:'Kenya', police:'999', ambulance:'999', fire:'999', universal:'112' },
  GH: { countryCode:'GH', countryName:'Ghana', police:'191', ambulance:'193', fire:'192', universal:'112' },
  TN: { countryCode:'TN', countryName:'Tunisie', police:'197', ambulance:'190', fire:'198', universal:'112' },
  DZ: { countryCode:'DZ', countryName:'Algérie', police:'17', ambulance:'14', fire:'14', universal:'1548', roadsideNote:'SSTF national highway' },
  // ── Autres ────────────────────────────────────────────────
  HK: { countryCode:'HK', countryName:'Hong Kong', police:'999', ambulance:'999', fire:'999', universal:'112' },
  TW: { countryCode:'TW', countryName:'Taiwan', police:'110', ambulance:'119', fire:'119', universal:'112' },
  BD: { countryCode:'BD', countryName:'Bangladesh', police:'999', ambulance:'999', fire:'199', universal:'112' },
  PK: { countryCode:'PK', countryName:'Pakistan', police:'15', ambulance:'115', fire:'16', universal:'112' },
};

// ── AI fallback for unknown countries ─────────────────────────
async function lookupWithAI(countryCode: string, countryName?: string): Promise<CountryEmergencyResult> {
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) {
    return { countryCode, countryName: countryName || countryCode, police:'112', ambulance:'112', fire:'112', source:'not_found', confidence:'low' };
  }

  try {
    const prompt = `What are the official emergency phone numbers for ${countryName || countryCode} (country code: ${countryCode})?
Also include a national roadside assistance or breakdown service number if one exists.
Respond ONLY with a JSON object, no markdown:
{"police":"number","ambulance":"number","fire":"number","universal":"112 or 911 or null","roadside":"number or null","roadsideNote":"org name or null","countryName":"full country name","confidence":"high/medium/low"}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json() as any;
    const textBlock = data.content?.find((b: any) => b.type === 'text');
    if (!textBlock?.text) throw new Error('No text');

    const clean = textBlock.text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    logger.info('AI emergency lookup', { countryCode, result: parsed });

    return {
      countryCode,
      countryName: parsed.countryName || countryName || countryCode,
      police: parsed.police || '112',
      ambulance: parsed.ambulance || '112',
      fire: parsed.fire || '112',
      universal: parsed.universal || undefined,
      roadside: parsed.roadside || undefined,
      roadsideNote: parsed.roadsideNote || undefined,
      source: 'ai',
      confidence: parsed.confidence || 'medium',
    };
  } catch (err) {
    logger.warn('AI emergency lookup failed', { countryCode, error: String(err) });
    return {
      countryCode,
      countryName: countryName || countryCode,
      police: '112',
      ambulance: '112',
      fire: '112',
      universal: '112',
      source: 'not_found',
      confidence: 'low',
    };
  }
}

// ── Main export ───────────────────────────────────────────────
export async function getCountryEmergencyNumbers(
  countryCode: string,
  countryName?: string
): Promise<CountryEmergencyResult> {
  const code = countryCode.toUpperCase().trim();

  // 1. Local DB
  const dbResult = EMERGENCY_DB[code];
  if (dbResult) {
    return { ...dbResult, source: 'db', confidence: 'high' };
  }

  // 2. AI web search fallback
  logger.info('Emergency numbers AI fallback', { countryCode: code });
  return lookupWithAI(code, countryName);
}

export { EMERGENCY_DB };
