/**
 * boom.contact — sketch-renderer.service.ts
 * Rendu Puppeteer côté serveur — Chrome headless — Qualité maximale
 * Session 12 — 22 Mars 2026
 */

import puppeteer, { Browser } from 'puppeteer-core';
import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../logger.js';

// Singleton browser — réutilisé entre les rendus
let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browser && browser.connected) return browser;
  
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH 
    || '/usr/bin/chromium-browser'
    || '/usr/bin/chromium';

  logger.info(`[sketch-renderer] Lancement Chrome: ${executablePath}`);
  
  browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-extensions',
    ],
  });

  browser.on('disconnected', () => {
    logger.warn('[sketch-renderer] Browser déconnecté — prochain appel relancera Chrome');
    browser = null;
  });

  logger.info('[sketch-renderer] ✅ Chrome headless prêt');
  return browser;
}

export interface SketchRenderInput {
  // Scénario d'accident
  scenario: string;            // 'intersection_cross' | 'roundabout' | 'straight_rear' | etc.
  trafficSide: 'right' | 'left';
  
  // Véhicule A
  vehicleAType: string;        // 'car' | 'suv' | 'truck' | 'motorcycle' | etc.
  vehicleAColor: string;       // 'rouge' | 'bleu' | '#CC2222' etc.
  vehicleADirection: string;   // 'east' | 'west' | 'north' | 'south'
  vehicleAImpactZone: string;  // 'front' | 'rear' | 'side_left' etc.
  vehicleAMoving: boolean;
  vehicleAReversing?: boolean;
  vehicleABrand?: string;
  vehicleAModel?: string;
  vehicleAPlate?: string;
  
  // Véhicule B
  vehicleBType: string;
  vehicleBColor: string;
  vehicleBDirection: string;
  vehicleBImpactZone: string;
  vehicleBMoving: boolean;
  vehicleBReversing?: boolean;
  vehicleBBrand?: string;
  vehicleBModel?: string;
  vehicleBPlate?: string;
  
  // Carte OSM (optionnel — si fourni, superpose les véhicules sur la vraie carte)
  mapImageBase64?: string;     // PNG base64 de la carte OSM pré-rendue
  
  // Canvas
  width?: number;
  height?: number;
}

export async function renderSketch(input: SketchRenderInput): Promise<string> {
  const W = input.width || 900;
  const H = input.height || 650;
  
  const b = await getBrowser();
  const page = await b.newPage();
  
  try {
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
    
    // Lire le sketch-engine.js (bundlé dans le serveur)
    const sketchEngineJs = readFileSync(
      join(process.cwd(), 'server/src/assets/sketch-engine.js'), 
      'utf-8'
    );
    
    // HTML complet — tout embarqué, aucune dépendance externe
    const html = buildHtml(input, sketchEngineJs, W, H);
    
    // Capturer les erreurs JS dans la page pour diagnostic
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => { pageErrors.push(err.message); logger.error('[sketch-renderer] Page JS error:', err.message.slice(0,200)); });
    page.on('console', (msg) => { if (msg.type() === 'error') logger.warn('[sketch-renderer] Console error:', msg.text().slice(0,200)); });

    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 20000 });
    
    // Attendre que le Canvas soit rendu
    await page.waitForFunction(
      () => (window as any).__sketchDone === true || (window as any).__sketchError != null,
      { timeout: 30000 }
    );
    
    // Vérifier si erreur
    const sketchError = await page.evaluate(() => (window as any).__sketchError);
    if (sketchError) throw new Error('Sketch render error: ' + sketchError);
    logger.info('[sketch-renderer] ✅ Canvas rendu en succès');
    
    // Screenshot du canvas uniquement
    const canvasElement = await page.$('#sketch-canvas');
    if (!canvasElement) throw new Error('Canvas introuvable');
    
    const screenshot = await canvasElement.screenshot({ 
      type: 'png',
      omitBackground: false,
    });
    
    return Buffer.from(screenshot).toString('base64');
    
  } finally {
    await page.close();
  }
}

function buildHtml(input: SketchRenderInput, sketchJs: string, W: number, H: number): string {
  const mapBg = input.mapImageBase64 
    ? `data:image/png;base64,${input.mapImageBase64}` 
    : null;

  const vehicleALabel = `${input.vehicleABrand || ''} ${input.vehicleAModel || ''}`.trim() || 'A';
  const vehicleBLabel = `${input.vehicleBBrand || ''} ${input.vehicleBModel || ''}`.trim() || 'B';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#12121f; overflow:hidden; }
  canvas { display:block; }
</style>
</head>
<body>
<canvas id="sketch-canvas" width="${W}" height="${H}"></canvas>
<script>
// ── sketch-engine.js ──────────────────────────────────────────
${sketchJs}

// ── Rendu principal ───────────────────────────────────────────
window.__sketchDone = false;
  window.__sketchError = null;

(async function() {
  const canvas = document.getElementById('sketch-canvas');
  const ctx = canvas.getContext('2d');
  const W = ${W}, H = ${H};

  // 1. Fond carte OSM ou fond sombre
  ${mapBg ? `
  await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { ctx.drawImage(img, 0, 0, W, H); resolve(); };
    img.onerror = () => { ctx.fillStyle='#1a2535'; ctx.fillRect(0,0,W,H); resolve(); };
    img.src = '${mapBg}';
  });
  ` : `
  ctx.fillStyle = '#12121f';
  ctx.fillRect(0, 0, W, H);
  `}

  // 2. Construire l'objet SceneAnalysis compatible avec renderAccidentSketch
  const analysis = {
    scenario: '${input.scenario}',
    trafficSide: '${input.trafficSide}',
    vehicleA: {
      direction: '${input.vehicleADirection}',
      impactZone: '${input.vehicleAImpactZone}'.replace('-','_'),
      wasMoving: ${input.vehicleAMoving},
      isReversing: ${input.vehicleAReversing || false},
      vehicleType: '${input.vehicleAType}',
      color: '${input.vehicleAColor}',
    },
    vehicleB: {
      direction: '${input.vehicleBDirection}',
      impactZone: '${input.vehicleBImpactZone}'.replace('-','_'),
      wasMoving: ${input.vehicleBMoving},
      isReversing: ${input.vehicleBReversing || false},
      vehicleType: '${input.vehicleBType}',
      color: '${input.vehicleBColor}',
    },
    confidence: 0.9,
    circumstances: [],
    description: '',
    language: 'fr',
  };

  // 3. Sur carte OSM: dessiner la route en superposition transparente
  ${mapBg ? `
  // Sur vraie carte, on skipe le drawRoadScene (la carte est déjà là)
  // Mais on dessine une légère transparence sur les routes pour les trajectoires
  ctx.globalAlpha = 0.35;
  drawRoadScene(ctx, W, H, analysis.scenario, analysis.trafficSide);
  ctx.globalAlpha = 1.0;
  ` : `
  drawRoadScene(ctx, W, H, analysis.scenario, analysis.trafficSide);
  `}

  // 4. Positions & trajectoires & véhicules & impact
  const { posA, posB, impactX, impactY } = calcVehiclePositions(analysis, W, H);

  const trajLen = 100;
  if (analysis.vehicleA.wasMoving) {
    const fromX = posA.x - Math.cos(posA.angle) * trajLen;
    const fromY = posA.y - Math.sin(posA.angle) * trajLen;
    drawTrajectoryArrow(ctx, fromX, fromY, posA.x, posA.y, '#4488ff', false, analysis.vehicleA.isReversing);
  }
  if (analysis.vehicleB.wasMoving) {
    const fromX = posB.x - Math.cos(posB.angle) * trajLen;
    const fromY = posB.y - Math.sin(posB.angle) * trajLen;
    drawTrajectoryArrow(ctx, fromX, fromY, posB.x, posB.y, '#ff8833', false, analysis.vehicleB.isReversing);
  }

  drawVehicle(ctx, posA.x, posA.y, posA.angle, analysis.vehicleA, 'A', '#ef4444');
  drawVehicle(ctx, posB.x, posB.y, posB.angle, analysis.vehicleB, 'B', '#ef4444');

  // 5. Impact
  ctx.save();
  ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 25;
  ctx.fillStyle = '#ef4444';
  ctx.beginPath(); ctx.arc(impactX, impactY, 12, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(impactX-8,impactY-8); ctx.lineTo(impactX+8,impactY+8);
  ctx.moveTo(impactX+8,impactY-8); ctx.lineTo(impactX-8,impactY+8);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle='#ef4444'; ctx.font='bold 9px monospace';
  ctx.textAlign='center'; ctx.fillText('IMPACT',impactX,impactY+24);

  // 6. Étiquettes véhicules
  function vehicleLabel(x, y, text, color) {
    ctx.save();
    const tw = ctx.measureText(text).width;
    ctx.fillStyle='rgba(0,0,0,0.75)';
    ctx.beginPath(); ctx.roundRect(x-tw/2-6,y-13,tw+12,18,4); ctx.fill();
    ctx.fillStyle=color; ctx.font='bold 11px sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(text,x,y-4);
    ctx.restore();
  }
  vehicleLabel(posA.x, posA.y - 45, '${vehicleALabel || 'Véhicule A'}', '#4488ff');
  vehicleLabel(posB.x, posB.y - 45, '${vehicleBLabel || 'Véhicule B'}', '#ff8833');

  // 7. Plaque immatriculation
  function drawPlate(x, y, plate) {
    if (!plate) return;
    ctx.save();
    const tw = ctx.measureText(plate).width;
    ctx.fillStyle='#FFFFDD'; ctx.strokeStyle='#888'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.roundRect(x-tw/2-4,y-8,tw+8,14,2); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#111'; ctx.font='bold 9px monospace';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(plate,x,y-1);
    ctx.restore();
  }
  drawPlate(posA.x, posA.y+55, '${input.vehicleAPlate || ''}');
  drawPlate(posB.x, posB.y+55, '${input.vehicleBPlate || ''}');

  // 8. Légende bas
  ctx.fillStyle='rgba(0,0,0,0.6)';
  ctx.beginPath(); ctx.roundRect(0,H-28,W,28,0); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.font='10px monospace';
  ctx.textAlign='left'; ctx.textBaseline='middle';
  ctx.fillText('● Point d\\'impact  →→ Trajectoire A  →→ Trajectoire B', 12, H-14);
  ctx.textAlign='right'; ctx.fillStyle='rgba(255,255,255,0.3)';
  ctx.fillText('boom.contact · Croquis IA · © OpenStreetMap', W-12, H-14);

  window.__sketchDone = true;
  console.log('[sketch] Done!');
})().catch(function(err) {
  window.__sketchError = err.message || String(err);
  console.error('[sketch] FATAL:', window.__sketchError);
  window.__sketchDone = true;  // débloquer waitForFunction
});
</script>
</body>
</html>`;
}

export async function closeBrowser(): Promise<void> {
  if (browser) { await browser.close(); browser = null; }
}

