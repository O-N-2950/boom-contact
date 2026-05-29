import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Garde-fou : les langues EXPOSEES (getLangOrder = fr/de/it/en) doivent etre 100%
// du perimetre grand public (toutes les cles de fr.json sauf le namespace police B2G).
const DIR = path.join(process.cwd(), 'client/src/i18n/locales');
const EXPOSED = ['fr', 'de', 'it', 'en'];
const SKIP = new Set(['police']);

function flat(obj: unknown, prefix = '', out = new Set<string>()): Set<string> {
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const kp = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object') flat(v, kp, out);
      else out.add(kp);
    }
  }
  return out;
}
const load = (l: string) => JSON.parse(fs.readFileSync(path.join(DIR, `${l}.json`), 'utf8'));

describe('i18n — langues exposees completes (perimetre grand public)', () => {
  const ref = flat(load('fr'));
  const core = [...ref].filter(k => !SKIP.has(k.split('.')[0]));

  for (const lang of EXPOSED) {
    it(`${lang} couvre 100% du core (${core.length} cles)`, () => {
      const have = flat(load(lang));
      const missing = core.filter(k => !have.has(k));
      expect(missing, `manquantes en ${lang}: ${missing.slice(0, 8).join(', ')}`).toHaveLength(0);
    });
  }
});
