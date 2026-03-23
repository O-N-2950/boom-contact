import { logger } from '../logger.js';

// ── Types ────────────────────────────────────────────────────
export interface AssistanceResult {
  insurer: string;
  country?: string;
  assistanceNumber?: string;
  claimsNumber?: string;
  website?: string;
  note?: string;
  source: 'db' | 'ai' | 'not_found';
  confidence: 'high' | 'medium' | 'low';
}

// ── Global insurer database ──────────────────────────────────
// Format: key = normalized insurer name (lowercase, no spaces/accents)
// Multiple aliases map to the same entry via ALIASES map

interface InsuranceEntry {
  name: string;          // Display name
  countries: string[];   // ISO country codes
  assistance: string;    // 24h roadside assistance number
  claims?: string;       // Claims declaration number
  website?: string;
  note?: string;
}

const INSURANCE_DB: Record<string, InsuranceEntry> = {
  // ── SUISSE ────────────────────────────────────────────────
  'axa': {
    name: 'AXA', countries: ['CH','FR','BE','DE','GB','US','AU'],
    assistance: '0800 809 809', claims: '0800 809 809',
    website: 'axa.ch', note: 'Numéro CH — varie par pays',
  },
  'axach': { name: 'AXA Suisse', countries: ['CH'], assistance: '0800 809 809', claims: '0800 809 809' },
  'axafr': { name: 'AXA France', countries: ['FR'], assistance: '0 800 200 200', claims: '0 800 200 200' },
  'allianz': {
    name: 'Allianz', countries: ['CH','DE','FR','IT','ES','GB','AU','US'],
    assistance: '0800 800 801', claims: '0800 800 801',
    website: 'allianz.com', note: 'Numéro CH — varie par pays',
  },
  'allianzch': { name: 'Allianz Suisse', countries: ['CH'], assistance: '0800 800 801' },
  'allianzde': { name: 'Allianz Deutschland', countries: ['DE'], assistance: '0800 4 100 400', claims: '0800 4 100 400' },
  'allianzfr': { name: 'Allianz France', countries: ['FR'], assistance: '0800 000 632' },
  'mobiliere': {
    name: 'Mobilière / Die Mobiliar', countries: ['CH'],
    assistance: '0800 111 110', claims: '0800 111 110',
    website: 'mobiliere.ch',
  },
  'helvetia': {
    name: 'Helvetia', countries: ['CH','DE','ES','IT','AT'],
    assistance: '058 280 10 00', claims: '058 280 10 00',
    website: 'helvetia.com',
  },
  'baloise': {
    name: 'Baloise / Bâloise', countries: ['CH','DE','BE','LU'],
    assistance: '0800 24 800 800', claims: '0800 24 800 800',
    website: 'baloise.com',
  },
  'helsana': { name: 'Helsana', countries: ['CH'], assistance: '0800 80 80 80' },
  'zurichconnect': { name: 'Zurich Connect', countries: ['CH'], assistance: '0800 80 8080', claims: '0800 80 8080' },
  'zurich': {
    name: 'Zurich Insurance', countries: ['CH','DE','GB','US','AU'],
    assistance: '0800 80 8080', claims: '0800 80 8080',
    website: 'zurich.com',
  },
  'generali': {
    name: 'Generali', countries: ['CH','FR','IT','DE','AT','BE'],
    assistance: '022 704 00 00', claims: '022 704 00 00',
    website: 'generali.com',
  },
  'vaudoise': { name: 'Vaudoise', countries: ['CH'], assistance: '0800 31 32 33', claims: '0800 31 32 33' },
  'smile': { name: 'Smile.direct (Helvetia)', countries: ['CH'], assistance: '058 280 10 00' },
  'simpego': { name: 'Simpego', countries: ['CH'], assistance: '+41 58 521 11 11', claims: '+41 58 521 11 11' },
  'emmental': { name: 'emmental versicherung', countries: ['CH'], assistance: '031 790 24 24', claims: '031 790 31 11', note: 'Dépannage/remorquage 24h' },
  'tcs': { name: 'TCS', countries: ['CH'], assistance: '0800 140 140', note: 'Touring Club Suisse — membres' },
  'acs': { name: 'ACS', countries: ['CH'], assistance: '044 283 33 77', note: 'Automobile Club Suisse' },
  'postfinance': { name: 'PostFinance Assurance', countries: ['CH'], assistance: '0800 140 140', note: 'Via TCS' },
  // ── FRANCE ───────────────────────────────────────────────
  'macif': { name: 'MACIF', countries: ['FR'], assistance: '0 800 004 003', claims: '0 800 004 003' },
  'maif': { name: 'MAIF', countries: ['FR'], assistance: '0 800 20 22 20', claims: '0 800 20 22 20' },
  'mma': { name: 'MMA', countries: ['FR'], assistance: '0 800 010 010' },
  'maaf': { name: 'MAAF', countries: ['FR'], assistance: '0 800 500 147', claims: '0 800 500 147' },
  'groupama': { name: 'Groupama', countries: ['FR'], assistance: '0800 000 845' },
  'matmut': { name: 'Matmut', countries: ['FR'], assistance: '02 35 03 67 00', claims: '02 35 03 67 00' },
  'aviva': { name: 'Aviva', countries: ['FR','GB'], assistance: '0800 290 112', note: 'France & Monaco' },
  'areaassur': { name: 'Aréas Assurances', countries: ['FR'], assistance: '01 44 01 16 16' },
  'pacifica': { name: 'Pacifica (Crédit Agricole)', countries: ['FR'], assistance: '3400' },
  // ── BELGIQUE ─────────────────────────────────────────────
  'ag': { name: 'AG Insurance', countries: ['BE'], assistance: '02 664 81 11', claims: '02 664 81 11' },
  'aginsurance': { name: 'AG Insurance', countries: ['BE'], assistance: '02 664 81 11' },
  'ethias': { name: 'Ethias', countries: ['BE'], assistance: '04 220 30 30' },
  'touring': { name: 'Touring Assurances', countries: ['BE'], assistance: '070 344 777', note: 'Touring Club Belgique' },
  'vab': { name: 'VAB', countries: ['BE'], assistance: '0800 82 000', note: 'Vlaams Autorijdersverbond' },
  'federale': { name: 'La Fédérale', countries: ['BE'], assistance: '02 509 04 11' },
  // ── LUXEMBOURG ───────────────────────────────────────────
  'foyer': { name: 'Foyer Assurances', countries: ['LU'], assistance: '437 437', claims: '437 437' },
  'laluxembourgeoise': { name: 'La Luxembourgeoise', countries: ['LU'], assistance: '4761 1' },
  'acl': { name: 'ACL Assistance', countries: ['LU'], assistance: '26 000', note: 'Automobile Club Luxembourg' },
  // ── ALLEMAGNE ────────────────────────────────────────────
  'adac': { name: 'ADAC', countries: ['DE'], assistance: '0800 5 10 11 12', note: 'Membre requis' },
  'huk': { name: 'HUK-Coburg', countries: ['DE'], assistance: '0800 2153153' },
  'hukcoburg': { name: 'HUK-Coburg', countries: ['DE'], assistance: '0800 2153153' },
  'ergo': { name: 'ERGO', countries: ['DE'], assistance: '0211 477 73 00' },
  'devk': { name: 'DEVK', countries: ['DE'], assistance: '0800 382 30 00' },
  // ── ROYAUME-UNI ──────────────────────────────────────────
  'aa': { name: 'AA', countries: ['GB'], assistance: '0800 887 766' },
  'rac': { name: 'RAC', countries: ['GB','AU'], assistance: '0800 828 282' },
  'greenflag': { name: 'Green Flag', countries: ['GB'], assistance: '0800 400 600' },
  'admiral': { name: 'Admiral', countries: ['GB'], assistance: '0333 220 2000' },
  'avivagb': { name: 'Aviva UK', countries: ['GB'], assistance: '0800 0155 755' },
  'directline': { name: 'Direct Line', countries: ['GB'], assistance: '0800 756 5000' },
  // ── ITALIE ───────────────────────────────────────────────
  'aci': { name: 'ACI', countries: ['IT'], assistance: '803 116', note: 'Automobile Club Italia' },
  'unipol': { name: 'Unipol SAI', countries: ['IT'], assistance: '800 893 893' },
  'generaliit': { name: 'Generali Italia', countries: ['IT'], assistance: '800 100 966' },
  // ── ESPAGNE ──────────────────────────────────────────────
  'mutua': { name: 'Mutua Madrileña', countries: ['ES'], assistance: '900 33 33 33' },
  'mapfre': { name: 'MAPFRE', countries: ['ES','BR','MX'], assistance: '900 33 47 47' },
  'race': { name: 'RACE', countries: ['ES'], assistance: '900 100 992' },
  // ── PAYS-BAS ─────────────────────────────────────────────
  'anwb': { name: 'ANWB', countries: ['NL'], assistance: '0800 0888' },
  'centraal': { name: 'Centraal Beheer', countries: ['NL'], assistance: '0800 6767 700' },
  // ── AUTRICHE ─────────────────────────────────────────────
  'oeamtc': { name: 'ÖAMTC', countries: ['AT'], assistance: '120' },
  'arboe': { name: 'ARBÖ', countries: ['AT'], assistance: '123' },
  // ── ÉTATS-UNIS ───────────────────────────────────────────
  'aaa': { name: 'AAA', countries: ['US','CA'], assistance: '1-800-222-4357', note: 'American Automobile Association' },
  'statefarm': { name: 'State Farm', countries: ['US'], assistance: '1-800-732-5246', claims: '1-800-732-5246' },
  'geico': { name: 'GEICO', countries: ['US'], assistance: '1-800-841-3000', claims: '1-800-841-3000' },
  'progressive': { name: 'Progressive', countries: ['US'], assistance: '1-800-776-4737', claims: '1-800-776-4737' },
  'allstate': { name: 'Allstate', countries: ['US'], assistance: '1-800-255-7828', claims: '1-800-255-7828' },
  'liberty': { name: 'Liberty Mutual', countries: ['US'], assistance: '1-800-426-9898' },
  'nationwide': { name: 'Nationwide', countries: ['US'], assistance: '1-800-421-3535' },
  'farmers': { name: 'Farmers Insurance', countries: ['US'], assistance: '1-800-435-7764' },
  'usaa': { name: 'USAA', countries: ['US'], assistance: '1-800-531-8722', note: 'Militaires uniquement' },
  // ── CANADA ───────────────────────────────────────────────
  'caa': { name: 'CAA', countries: ['CA'], assistance: '1-800-222-4357', note: 'Canadian Automobile Association' },
  'intact': { name: 'Intact Assurance', countries: ['CA'], assistance: '1-866-464-2424' },
  'desjardins': { name: 'Desjardins Assurances', countries: ['CA'], assistance: '1-800-463-7830' },
  // ── AUSTRALIE ────────────────────────────────────────────
  'nrma': { name: 'NRMA', countries: ['AU'], assistance: '13 11 22' },
  'racq': { name: 'RACQ', countries: ['AU'], assistance: '13 1905' },
  'racv': { name: 'RACV', countries: ['AU'], assistance: '13 11 11' },
  'racwa': { name: 'RAC WA', countries: ['AU'], assistance: '13 17 03' },
  'raa': { name: 'RAA SA', countries: ['AU'], assistance: '8202 4600' },
  'nrmains': { name: 'NRMA Insurance', countries: ['AU'], assistance: '132 132' },
  'suncorp': { name: 'Suncorp', countries: ['AU'], assistance: '13 11 55' },
  'guildhall': { name: 'GIO (Suncorp)', countries: ['AU'], assistance: '13 10 10' },
  // ── RUSSIE ───────────────────────────────────────────────
  'rosgosstrakh': { name: 'Росгосстрах / Rosgosstrakh', countries: ['RU'], assistance: '8 800 200 00 00', note: 'Gratuit depuis mobile' },
  'ramc': { name: 'RAMC Russian AutoMotoClub', countries: ['RU'], assistance: '+7 495 623 0503' },
  'ingosstrakh': { name: 'Ингосстрах / Ingosstrakh', countries: ['RU'], assistance: '+7 495 956 55 55' },
  'sogaz': { name: 'СОГАЗ / SOGAZ', countries: ['RU'], assistance: '+7 800 333 0 888', note: 'Gratuit' },
  // ── INDE ─────────────────────────────────────────────────
  'marutisuzuki': { name: 'Maruti Suzuki', countries: ['IN'], assistance: '1800 102 1800', note: 'RSA 24h' },
  'hyundai': { name: 'Hyundai India', countries: ['IN','KR'], assistance: '1800 102 4645' },
  'tata': { name: 'Tata Motors', countries: ['IN'], assistance: '1800 209 7979' },
  'honda': { name: 'Honda India', countries: ['IN','JP'], assistance: '1800 103 3121' },
  'bajaj': { name: 'Bajaj Allianz', countries: ['IN'], assistance: '1800 209 0144' },
  'newIndia': { name: 'New India Assurance', countries: ['IN'], assistance: '1800 209 1415' },
  // ── JAPON ────────────────────────────────────────────────
  'jaf': { name: 'JAF', countries: ['JP'], assistance: '0570-00-8139', note: 'Japan Automobile Federation' },
  'sompo': { name: 'Sompo Japan', countries: ['JP'], assistance: '0120-919-110' },
  'tokio': { name: 'Tokio Marine', countries: ['JP'], assistance: '0120-078-999' },
  // ── CHINE ────────────────────────────────────────────────
  'pingancn': { name: 'Ping An Insurance', countries: ['CN'], assistance: '95511' },
  'cpic': { name: 'CPIC / China Pacific', countries: ['CN'], assistance: '95585' },
  'picc': { name: 'PICC', countries: ['CN'], assistance: '95518' },
  // ── EMIRATS / MOYEN-ORIENT ───────────────────────────────
  'oman': { name: 'Oman Insurance (UAE)', countries: ['AE'], assistance: '800 4746', claims: '800 4746' },
  'aig': { name: 'AIG', countries: ['US','GB','AE','SG','AU'], assistance: '1-800-244-0088' },
  // ── AFRIQUE DU SUD ───────────────────────────────────────
  'outsurance': { name: 'OUTsurance', countries: ['ZA'], assistance: '0800 01 01 01' },
  'santam': { name: 'Santam', countries: ['ZA'], assistance: '0860 444 444' },
  'miway': { name: 'MiWay', countries: ['ZA'], assistance: '0860 64 64 64' },
  // ── MAROC ────────────────────────────────────────────────
  'wafa': { name: 'Wafa Assurance', countries: ['MA'], assistance: '0522 54 55 55' },
  'atlanta': { name: 'Atlanta Assurance (Maroc)', countries: ['MA'], assistance: '05 22 20 02 00' },
  // ── BRÉSIL ──────────────────────────────────────────────
  'porto': { name: 'Porto Seguro', countries: ['BR'], assistance: '0800 727 4741' },
  'bradesco': { name: 'Bradesco Seguros', countries: ['BR'], assistance: '0800 722 0109' },
  'itau': { name: 'Itaú Seguros', countries: ['BR'], assistance: '0800 728 0728' },
};

// ── Aliases — common OCR variations → canonical key ─────────
const ALIASES: Record<string, string> = {
  'axa suisse': 'axach', 'axa versicherungen': 'axach', 'axa switzerland': 'axach',
  'axa assurances': 'axafr', 'axa france': 'axafr',
  'allianz suisse': 'allianzch', 'allianz switzerland': 'allianzch', 'allianz versicherungen': 'allianzch',
  'allianz france': 'allianzfr', 'allianz deutschland': 'allianzde',
  'die mobiliar': 'mobiliere', 'mobiliar': 'mobiliere', 'la mobilière': 'mobiliere',
  'la mobiliere': 'mobiliere', 'mobiliare': 'mobiliere',
  'baloise': 'baloise', 'bâloise': 'baloise', 'basler': 'baloise',
  'huk coburg': 'hukcoburg', 'huk-coburg': 'hukcoburg',
  'ag insurance': 'ag', 'ageas': 'ag',
  'la luxembourgeoise': 'laluxembourgeoise',
  'touringclub': 'touring', 'touring club': 'touring',
  'state farm': 'statefarm', 'liberty mutual': 'liberty',
  'green flag': 'greenflag', 'direct line': 'directline',
  'mutua madrileña': 'mutua', 'mutua madrilena': 'mutua',
  'centraal beheer': 'centraal',
  'rosgosstrakh': 'rosgosstrakh', 'росгосстрах': 'rosgosstrakh',
  'ingosstrakh': 'ingosstrakh', 'ингосстрах': 'ingosstrakh',
  'ping an': 'pingancn', 'ping an insurance': 'pingancn',
  'china pacific': 'cpic', 'china pacific insurance': 'cpic',
  'tokio marine': 'tokio', 'tokio marine nichido': 'tokio',
  'porto seguro': 'porto', 'porto': 'porto',
  'new india': 'newIndia', 'new india assurance': 'newIndia',
  'bajaj allianz': 'bajaj',
  'maruti': 'marutisuzuki', 'maruti suzuki': 'marutisuzuki',
  'tata motors': 'tata',
  'oman insurance': 'oman',
  'wafa': 'wafa', 'wafa assurances': 'wafa',
  'desjardins': 'desjardins', 'desjardins assurances': 'desjardins',
  'intact': 'intact', 'intact assurance': 'intact',
  'outsurance': 'outsurance', 'out insurance': 'outsurance',
  'emmental versicherung': 'emmental', 'emmental assurance': 'emmental',
};

function normalizeKey(name: string): string {
  return name.toLowerCase()
    .replace(/[àáâä]/g, 'a').replace(/[èéêë]/g, 'e').replace(/[îï]/g, 'i')
    .replace(/[ôö]/g, 'o').replace(/[ùûü]/g, 'u').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '');
}

function lookupDB(insurerName: string, country?: string): InsuranceEntry | null {
  const normalized = normalizeKey(insurerName);
  
  // Direct lookup
  if (INSURANCE_DB[normalized]) return INSURANCE_DB[normalized];
  
  // Alias lookup
  const alias = ALIASES[insurerName.toLowerCase().trim()];
  if (alias && INSURANCE_DB[alias]) return INSURANCE_DB[alias];
  
  // Partial match — find if normalized name is contained in a key or vice versa
  for (const [key, entry] of Object.entries(INSURANCE_DB)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      if (!country || entry.countries.includes(country)) return entry;
    }
    // Also check display name
    const entryNorm = normalizeKey(entry.name);
    if (normalized.includes(entryNorm) || entryNorm.includes(normalized)) {
      return entry;
    }
  }
  
  return null;
}

// ── AI fallback — Claude web search ─────────────────────────
async function searchWithAI(insurerName: string, country?: string): Promise<AssistanceResult> {
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) {
    return { insurer: insurerName, source: 'not_found', confidence: 'low' };
  }

  try {
    const countryText = country ? ` in ${country}` : '';
    const prompt = `What is the 24/7 roadside assistance phone number for the insurance company "${insurerName}"${countryText}? 
    Also provide the claims declaration number if different.
    Respond ONLY with a JSON object, no markdown, no explanation:
    {"assistance": "number or null", "claims": "number or null", "website": "domain or null", "note": "short note or null", "confidence": "high/medium/low"}`;

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
    
    // Extract text from response (may include tool_use blocks)
    const textBlock = data.content?.find((b: any) => b.type === 'text');
    if (!textBlock?.text) throw new Error('No text in response');

    // Clean and parse JSON
    const clean = textBlock.text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    logger.info('AI insurance lookup', { insurer: insurerName, country, result: parsed });

    return {
      insurer: insurerName,
      country,
      assistanceNumber: parsed.assistance || undefined,
      claimsNumber: parsed.claims || undefined,
      website: parsed.website || undefined,
      note: parsed.note || undefined,
      source: 'ai',
      confidence: parsed.confidence || 'medium',
    };
  } catch (err) {
    logger.warn('AI insurance lookup failed', { insurer: insurerName, error: String(err) });
    return { insurer: insurerName, source: 'not_found', confidence: 'low' };
  }
}

// ── Main export ───────────────────────────────────────────────
export async function getInsuranceAssistance(
  insurerName: string,
  country?: string
): Promise<AssistanceResult> {
  if (!insurerName?.trim()) {
    return { insurer: 'Inconnu', source: 'not_found', confidence: 'low' };
  }

  // 1. Try local DB first
  const dbResult = lookupDB(insurerName.trim(), country);
  if (dbResult) {
    logger.info('Insurance lookup (DB)', { insurer: insurerName, found: dbResult.name });
    return {
      insurer: dbResult.name,
      country,
      assistanceNumber: dbResult.assistance,
      claimsNumber: dbResult.claims,
      website: dbResult.website,
      note: dbResult.note,
      source: 'db',
      confidence: 'high',
    };
  }

  // 2. AI web search fallback
  logger.info('Insurance lookup (AI fallback)', { insurer: insurerName, country });
  return searchWithAI(insurerName, country);
}
