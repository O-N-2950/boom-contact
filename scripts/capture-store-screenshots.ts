/**
 * scripts/capture-store-screenshots.ts
 *
 * Capture automatique des screenshots stores via Playwright sur la prod live.
 * Lance le mode marketing de /visual-qa pour chaque écran × chaque viewport.
 *
 * Pré-requis :
 *   npm install --save-dev playwright
 *   npx playwright install chromium   # télécharge le binaire ~150 MB (une fois)
 *
 * Usage :
 *   npm run capture:screenshots                                # contre prod (https://www.boom.contact)
 *   BASE_URL=http://localhost:5173 npm run capture:screenshots # contre serveur local
 *   FORMATS=iphone67,android npm run capture:screenshots       # restreindre les formats
 *   SCREENS=intro,qr,signature npm run capture:screenshots     # restreindre les écrans
 *
 * Sortie : artifacts/store-screenshots/<viewport>/<screen>.png
 * Les PNG ne sont PAS commités (cf. .gitignore).
 *
 * Aucune donnée réelle. Le mode screenshot de /visual-qa utilise des données fictives
 * (Camille Martin / Luca Rossi / VD 000 000 / Assurance Démo / demo@boom.contact / Lausanne).
 */

import { chromium, type Browser, type Page } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

type Viewport = { name: string; width: number; height: number; deviceScaleFactor?: number };
type ScreenKey = 'intro' | 'qr' | 'voice' | 'photo' | 'signature' | 'pdf' | 'done' | 'emergency' | 'store';

const ALL_VIEWPORTS: Viewport[] = [
  // Priorité
  { name: 'iphone67',     width: 1290, height: 2796, deviceScaleFactor: 1 }, // iPhone 15/16 Pro Max
  { name: 'android-phone', width: 1080, height: 1920, deviceScaleFactor: 1 }, // Google Play phone min
  // Secondaires (si demandés)
  { name: 'iphone65',     width: 1284, height: 2778, deviceScaleFactor: 1 }, // iPhone 13 Pro Max
  { name: 'iphone61',     width: 1179, height: 2556, deviceScaleFactor: 1 }, // iPhone 15
  { name: 'android-tab',  width: 1440, height: 2560, deviceScaleFactor: 1 }, // Android phablet/tab
];

const ALL_SCREENS: ScreenKey[] = ['intro', 'qr', 'voice', 'photo', 'signature', 'pdf', 'done', 'emergency', 'store'];

const BASE_URL = (process.env.BASE_URL || 'https://www.boom.contact').replace(/\/$/, '');
const OUT_DIR  = join(process.cwd(), 'artifacts', 'store-screenshots');

const allowedFormats = (process.env.FORMATS || '').split(',').map((s) => s.trim()).filter(Boolean);
const allowedScreens = (process.env.SCREENS || '').split(',').map((s) => s.trim()).filter(Boolean) as ScreenKey[];

const viewports = allowedFormats.length ? ALL_VIEWPORTS.filter((v) => allowedFormats.includes(v.name)) : ALL_VIEWPORTS;
const screens   = allowedScreens.length ? ALL_SCREENS.filter((s) => allowedScreens.includes(s)) : ALL_SCREENS;

async function captureScreen(browser: Browser, vp: Viewport, key: ScreenKey) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.deviceScaleFactor ?? 1,
    locale: 'fr-CH',
    timezoneId: 'Europe/Zurich',
    reducedMotion: 'reduce',
  });
  const page: Page = await context.newPage();
  const url = `${BASE_URL}/visual-qa?screenshot=${key}`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
  // Laisser les polices se charger + le layout se stabiliser
  await page.evaluate(() => (document as any).fonts?.ready);
  await page.waitForTimeout(400);

  const dir = join(OUT_DIR, vp.name);
  await mkdir(dir, { recursive: true });
  const out = join(dir, `${key}.png`);
  await page.screenshot({ path: out, type: 'png', fullPage: false });
  await context.close();
  return out;
}

async function captureDesignPreview(browser: Browser) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 2200 },
    locale: 'fr-CH',
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE_URL}/design-preview`, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.evaluate(() => (document as any).fonts?.ready);
  await page.waitForTimeout(400);
  const dir = join(OUT_DIR, 'desktop');
  await mkdir(dir, { recursive: true });
  const out = join(dir, 'design-preview.png');
  await page.screenshot({ path: out, type: 'png', fullPage: true });
  await ctx.close();
  return out;
}

async function main() {
  console.log(`▶ BASE_URL = ${BASE_URL}`);
  console.log(`▶ ${viewports.length} viewport(s) × ${screens.length} écran(s) = ${viewports.length * screens.length} captures + 1 design-preview`);
  console.log(`▶ Sortie  : ${OUT_DIR}\n`);

  const browser = await chromium.launch({ headless: true });
  const started = Date.now();
  let ok = 0, ko = 0;

  try {
    for (const vp of viewports) {
      console.log(`📱 ${vp.name} (${vp.width}×${vp.height})`);
      for (const key of screens) {
        try {
          const file = await captureScreen(browser, vp, key);
          ok++;
          console.log(`   ✓ ${key.padEnd(10)} → ${file}`);
        } catch (e: any) {
          ko++;
          console.error(`   ✗ ${key.padEnd(10)} ÉCHEC: ${e?.message || e}`);
        }
      }
    }
    try {
      const file = await captureDesignPreview(browser);
      ok++;
      console.log(`\n🖥  desktop\n   ✓ design-preview → ${file}`);
    } catch (e: any) {
      ko++;
      console.error(`\n   ✗ design-preview ÉCHEC: ${e?.message || e}`);
    }
  } finally {
    await browser.close();
  }

  const dur = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\n═══ Terminé en ${dur}s — ${ok} OK · ${ko} ÉCHEC ═══`);
  if (ko > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
