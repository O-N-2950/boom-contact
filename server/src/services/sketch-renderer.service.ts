/**
 * boom.contact — sketch-renderer.service.ts  (Session 12)
 * Puppeteer Chrome headless — rendu Canvas HTML5 qualité maximale
 * sketch-engine embarqué inline — aucune dépendance fichier externe
 */

import puppeteer, { Browser } from 'puppeteer-core';
import { logger } from '../logger.js';

let _browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.connected) return _browser;
  const exe =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    '/usr/bin/chromium-browser';
  logger.info(`[sketch] Lancement Chrome: ${exe}`);
  _browser = await puppeteer.launch({
    executablePath: exe,
    headless: true,
    args: [
      '--no-sandbox','--disable-setuid-sandbox',
      '--disable-dev-shm-usage','--disable-gpu',
      '--no-first-run','--single-process','--no-zygote',
    ],
  });
  _browser.on('disconnected', () => { _browser = null; });
  logger.info('[sketch] ✅ Chrome prêt');
  return _browser;
}

export interface SketchInput {
  scenario:          string;
  trafficSide:       'right' | 'left';
  vehicleAType:      string;
  vehicleAColor:     string;
  vehicleADirection: string;
  vehicleAImpactZone:string;
  vehicleAMoving:    boolean;
  vehicleAReversing?: boolean;
  vehicleABrand?:    string;
  vehicleAModel?:    string;
  vehicleAPlate?:    string;
  vehicleBType:      string;
  vehicleBColor:     string;
  vehicleBDirection: string;
  vehicleBImpactZone:string;
  vehicleBMoving:    boolean;
  vehicleBReversing?: boolean;
  vehicleBBrand?:    string;
  vehicleBModel?:    string;
  vehicleBPlate?:    string;
  mapImageBase64?:   string;
  width?:  number;
  height?: number;
}

export async function renderSketch(input: SketchInput): Promise<string> {
  const W = input.width  || 900;
  const H = input.height || 650;

  const b = await getBrowser();
  const page = await b.newPage();

  try {
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });

    // Capturer les erreurs JS dans la page
    page.on('pageerror', (err) => logger.warn('[sketch] page error:', err.message.slice(0,200)));
    page.on('console', (msg) => {
      const t = msg.type();
      if (t === 'error') logger.warn('[sketch] console error:', msg.text().slice(0,200));
      else if (t === 'log')  logger.info('[sketch] page log:', msg.text().slice(0,200));
    });

    const html = buildHtml(input, W, H);
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 20000 });

    // Attendre la fin du rendu (max 30s)
    await page.waitForFunction(
      () => (window as any).__done === true || (window as any).__err != null,
      { timeout: 30000 }
    );

    const err = await page.evaluate(() => (window as any).__err);
    if (err) throw new Error('Canvas render error: ' + err);

    const canvas = await page.$('#c');
    if (!canvas) throw new Error('Canvas #c introuvable');

    const shot = await canvas.screenshot({ type: 'png' });
    logger.info('[sketch] ✅ PNG généré');
    return Buffer.from(shot).toString('base64');

  } finally {
    await page.close();
  }
}

function buildHtml(inp: SketchInput, W: number, H: number): string {
  const mapSrc = inp.mapImageBase64
    ? `data:image/png;base64,${inp.mapImageBase64}`
    : '';

  const labelA = [inp.vehicleABrand, inp.vehicleAModel].filter(Boolean).join(' ') || 'Véhicule A';
  const labelB = [inp.vehicleBBrand, inp.vehicleBModel].filter(Boolean).join(' ') || 'Véhicule B';

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>*{margin:0;padding:0}body{background:#12121f;overflow:hidden}</style>
</head><body>
<canvas id="c" width="${W}" height="${H}"></canvas>
<script>
window.__done = false;
window.__err  = null;

// ── sketch-engine (inline) ──────────────────────────────────
// boom.contact — sketch-engine-final.js — Session 12
// Fonctions de rendu véhicules (extrait de render_v2.js validé)

function drawCar(ctx, cx, cy, W, H, color, label, angle) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
  const w=W, h=H;
  ctx.shadowColor='rgba(0,0,0,0.6)'; ctx.shadowBlur=10; ctx.shadowOffsetX=3; ctx.shadowOffsetY=3;
  ctx.fillStyle=color; ctx.beginPath(); ctx.roundRect(-w/2,-h/2,w,h,h*0.2); ctx.fill();
  ctx.shadowBlur=0; ctx.shadowOffsetX=0; ctx.shadowOffsetY=0;
  ctx.strokeStyle='rgba(0,0,0,0.4)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.roundRect(-w/2,-h/2,w,h,h*0.2); ctx.stroke();
  ctx.fillStyle=color==='#F5F5F0'?'#d8d8d0':'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.roundRect(-w*0.28,-h/2-h*0.55,w*0.56,h*0.6,h*0.15); ctx.fill();
  ctx.fillStyle='rgba(150,200,255,0.4)'; ctx.strokeStyle='rgba(0,0,0,0.2)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.roundRect(w*0.18,-h*0.42,w*0.1,h*0.35,3); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-w*0.28,-h*0.42,w*0.1,h*0.35,3); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#ffffcc'; ctx.shadowColor='#ffff88'; ctx.shadowBlur=8;
  ctx.beginPath(); ctx.ellipse(w/2-5,-h*0.28,5,4,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(w/2-5, h*0.28,5,4,0,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0; ctx.fillStyle='#ff4444';
  ctx.beginPath(); ctx.ellipse(-w/2+5,-h*0.28,4,3,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-w/2+5, h*0.28,4,3,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#222'; ctx.strokeStyle='#555'; ctx.lineWidth=1;
  [[w*0.28,-h/2],[w*0.28,h/2],[-w*0.28,-h/2],[-w*0.28,h/2]].forEach(([wx,wy])=>{
    ctx.beginPath(); ctx.ellipse(wx,wy,h*0.18,h*0.14,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#666'; ctx.beginPath(); ctx.ellipse(wx,wy,h*0.08,h*0.06,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#222';
  });
  ctx.fillStyle='#fff'; ctx.font=\`bold \${h*0.55}px sans-serif\`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.shadowColor='rgba(0,0,0,0.8)'; ctx.shadowBlur=4;
  ctx.fillText(label,0,0); ctx.shadowBlur=0; ctx.restore();
}

function drawSUV(ctx, cx, cy, W, H, color, label, angle) {
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(angle);
  const w=W*1.05, h=H*1.15;
  ctx.shadowColor='rgba(0,0,0,0.6)'; ctx.shadowBlur=12;
  ctx.fillStyle=color; ctx.beginPath(); ctx.roundRect(-w/2,-h/2,w,h,h*0.15); ctx.fill();
  ctx.shadowBlur=0; ctx.strokeStyle='rgba(0,0,0,0.4)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.roundRect(-w/2,-h/2,w,h,h*0.15); ctx.stroke();
  ctx.fillStyle='rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.roundRect(-w*0.32,-h/2-h*0.5,w*0.64,h*0.55,h*0.1); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(-w*0.25,-h/2-h*0.22); ctx.lineTo(w*0.25,-h/2-h*0.22); ctx.stroke();
  ctx.fillStyle='rgba(150,200,255,0.35)';
  ctx.beginPath(); ctx.roundRect(w*0.2,-h*0.4,w*0.1,h*0.8,2); ctx.fill();
  ctx.beginPath(); ctx.roundRect(-w*0.3,-h*0.4,w*0.1,h*0.8,2); ctx.fill();
  ctx.fillStyle='#ffffcc'; ctx.shadowColor='#ffff88'; ctx.shadowBlur=6;
  ctx.beginPath(); ctx.ellipse(w/2-4,-h*0.3,6,5,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(w/2-4, h*0.3,6,5,0,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0; ctx.fillStyle='#ff3333';
  ctx.beginPath(); ctx.ellipse(-w/2+4,-h*0.3,5,4,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-w/2+4, h*0.3,5,4,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#1a1a1a'; ctx.strokeStyle='#444'; ctx.lineWidth=1.5;
  [[w*0.28,-h/2],[w*0.28,h/2],[-w*0.28,-h/2],[-w*0.28,h/2]].forEach(([wx,wy])=>{
    ctx.beginPath(); ctx.ellipse(wx,wy,h*0.2,h*0.16,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#777'; ctx.beginPath(); ctx.ellipse(wx,wy,h*0.09,h*0.07,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#1a1a1a';
  });
  ctx.fillStyle='#fff'; ctx.font=\`bold \${h*0.5}px sans-serif\`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.shadowColor='rgba(0,0,0,0.8)'; ctx.shadowBlur=4;
  ctx.fillText(label,0,0); ctx.shadowBlur=0; ctx.restore();
}

function drawMotorcycle(ctx, cx, cy, W, H, color, label, angle) {
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(angle);
  const w=W, h=H;
  ctx.shadowColor='rgba(0,0,0,0.5)'; ctx.shadowBlur=8;
  ctx.fillStyle='#111'; ctx.strokeStyle='#444'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.ellipse(-w*0.35,0,h*0.48,h*0.48,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#666'; ctx.beginPath(); ctx.ellipse(-w*0.35,0,h*0.22,h*0.22,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#111'; ctx.beginPath(); ctx.ellipse(w*0.35,0,h*0.48,h*0.48,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#666'; ctx.beginPath(); ctx.ellipse(w*0.35,0,h*0.22,h*0.22,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=color; ctx.shadowBlur=6;
  ctx.beginPath(); ctx.ellipse(0,0,w*0.32,h*0.38,0,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0; ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.ellipse(0,0,w*0.32,h*0.38,0,0,Math.PI*2); ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,0.2)';
  ctx.beginPath(); ctx.ellipse(0,-h*0.12,w*0.15,h*0.12,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#333'; ctx.lineWidth=h*0.12;
  ctx.beginPath(); ctx.moveTo(w*0.25,-h*0.35); ctx.lineTo(w*0.25,h*0.35); ctx.stroke();
  ctx.fillStyle='#ffffaa'; ctx.shadowColor='#ffff88'; ctx.shadowBlur=6;
  ctx.beginPath(); ctx.ellipse(w*0.46,0,h*0.14,h*0.12,0,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0; ctx.fillStyle='#ff2222';
  ctx.beginPath(); ctx.ellipse(-w*0.46,0,h*0.1,h*0.08,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff'; ctx.font=\`bold \${h*0.4}px sans-serif\`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.shadowColor='rgba(0,0,0,0.9)'; ctx.shadowBlur=3;
  ctx.fillText(label,0,0); ctx.shadowBlur=0; ctx.restore();
}

function drawTruck(ctx, cx, cy, W, H, color, label, angle) {
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(angle);
  const w=W, h=H;
  ctx.shadowColor='rgba(0,0,0,0.5)'; ctx.shadowBlur=12;
  ctx.fillStyle='#778899'; ctx.beginPath(); ctx.roundRect(-w*0.5,-h/2,w*0.65,h,4); ctx.fill();
  ctx.shadowBlur=0; ctx.strokeStyle='#556677'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.roundRect(-w*0.5,-h/2,w*0.65,h,4); ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=1;
  for(let i=1;i<4;i++){const rx=-w*0.5+(w*0.65/4)*i;ctx.beginPath();ctx.moveTo(rx,-h/2);ctx.lineTo(rx,h/2);ctx.stroke();}
  ctx.shadowColor='rgba(0,0,0,0.5)'; ctx.shadowBlur=8;
  ctx.fillStyle=color; ctx.beginPath(); ctx.roundRect(w*0.15,-h/2*1.1,w*0.36,h*1.1,6); ctx.fill();
  ctx.shadowBlur=0; ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.roundRect(w*0.15,-h/2*1.1,w*0.36,h*1.1,6); ctx.stroke();
  ctx.fillStyle='rgba(150,200,255,0.5)';
  ctx.beginPath(); ctx.roundRect(w*0.38,-h*0.38,w*0.1,h*0.76,3); ctx.fill();
  ctx.fillStyle='#ffffcc'; ctx.shadowColor='#ffff88'; ctx.shadowBlur=6;
  ctx.beginPath(); ctx.ellipse(w*0.49,-h*0.3,6,5,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(w*0.49, h*0.3,6,5,0,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0; ctx.fillStyle='#ff2222';
  ctx.beginPath(); ctx.ellipse(-w*0.49,-h*0.3,5,4,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-w*0.49, h*0.3,5,4,0,0,Math.PI*2); ctx.fill();
  [[-w*0.35,-h/2],[w*0.25,-h/2],[-w*0.35,h/2],[w*0.25,h/2],[w*0.43,-h/2],[w*0.43,h/2]].forEach(([wx,wy])=>{
    ctx.fillStyle='#1a1a1a'; ctx.strokeStyle='#444'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.ellipse(wx,wy,h*0.22,h*0.17,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#777'; ctx.beginPath(); ctx.ellipse(wx,wy,h*0.1,h*0.08,0,0,Math.PI*2); ctx.fill();
  });
  ctx.fillStyle='#fff'; ctx.font=\`bold \${h*0.45}px sans-serif\`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.shadowColor='rgba(0,0,0,0.8)'; ctx.shadowBlur=4;
  ctx.fillText(label,w*0.28,0); ctx.shadowBlur=0; ctx.restore();
}

function drawTram(ctx, cx, cy, W, H, color, label, angle) {
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(angle);
  const w=W, h=H;
  ctx.shadowColor='rgba(0,0,0,0.5)'; ctx.shadowBlur=10;
  ctx.fillStyle=color; ctx.beginPath(); ctx.roundRect(-w/2,-h/2,w,h,5); ctx.fill();
  ctx.shadowBlur=0; ctx.strokeStyle='rgba(0,0,0,0.4)'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.roundRect(-w/2,-h/2,w,h,5); ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,0.3)';
  ctx.beginPath(); ctx.roundRect(-w/2,-h*0.12,w,h*0.08,2); ctx.fill();
  ctx.beginPath(); ctx.roundRect(-w/2,h*0.04,w,h*0.08,2); ctx.fill();
  for(let i=0;i<5;i++){
    const fx=-w/2+w*0.1+i*(w*0.17);
    ctx.fillStyle='rgba(160,215,255,0.5)';
    ctx.beginPath(); ctx.roundRect(fx,-h*0.4,w*0.13,h*0.8,2); ctx.fill();
    ctx.strokeStyle='rgba(120,180,230,0.4)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.roundRect(fx,-h*0.4,w*0.13,h*0.8,2); ctx.stroke();
  }
  ctx.fillStyle='rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.roundRect(-w*0.22,-h/2,w*0.04,h,0); ctx.fill();
  ctx.beginPath(); ctx.roundRect( w*0.18,-h/2,w*0.04,h,0); ctx.fill();
  ctx.strokeStyle='#888'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(-w*0.3,-h/2); ctx.lineTo(-w*0.3,-h/2-h*0.4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo( w*0.3,-h/2); ctx.lineTo( w*0.3,-h/2-h*0.4); ctx.stroke();
  ctx.strokeStyle='#aaa'; ctx.lineWidth=1.5; ctx.setLineDash([8,4]);
  ctx.beginPath(); ctx.moveTo(-w*0.3,-h/2-h*0.4); ctx.lineTo(w*0.3,-h/2-h*0.4); ctx.stroke();
  ctx.setLineDash([]);
  [[-w*0.38,-h/2],[-w*0.38,h/2],[0,-h/2],[0,h/2],[w*0.38,-h/2],[w*0.38,h/2]].forEach(([bx,by])=>{
    ctx.fillStyle='#111'; ctx.strokeStyle='#333'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.roundRect(bx-h*0.15,by-h*0.07,h*0.3,h*0.14,3); ctx.fill(); ctx.stroke();
  });
  ctx.fillStyle='#ffffcc'; ctx.shadowColor='#ffff88'; ctx.shadowBlur=5;
  ctx.beginPath(); ctx.rect(w/2-4,-h*0.3,4,h*0.22); ctx.fill();
  ctx.beginPath(); ctx.rect(w/2-4, h*0.08,4,h*0.22); ctx.fill();
  ctx.shadowBlur=0; ctx.fillStyle='#ff2222';
  ctx.beginPath(); ctx.rect(-w/2,-h*0.3,4,h*0.22); ctx.fill();
  ctx.beginPath(); ctx.rect(-w/2, h*0.08,4,h*0.22); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.9)';
  ctx.beginPath(); ctx.roundRect(-w/2+2,-h*0.38,w*0.1,h*0.3,2); ctx.fill();
  ctx.fillStyle=color; ctx.font=\`bold \${h*0.28}px sans-serif\`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(label,-w/2+2+w*0.05,-h*0.23);
  ctx.fillStyle='#fff'; ctx.font=\`bold \${h*0.45}px sans-serif\`;
  ctx.shadowColor='rgba(0,0,0,0.8)'; ctx.shadowBlur=4;
  ctx.fillText('T',0,0); ctx.shadowBlur=0; ctx.restore();
}

function drawBicycle(ctx, cx, cy, W, _H, color, label, angle) {
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(angle);
  const w=W, r=w*0.22;
  ctx.shadowColor='rgba(0,0,0,0.4)'; ctx.shadowBlur=6;
  ctx.strokeStyle='#1a1a1a'; ctx.lineWidth=r*0.22;
  ctx.beginPath(); ctx.arc(-w*0.3,0,r,0,Math.PI*2); ctx.stroke();
  ctx.strokeStyle='#444'; ctx.lineWidth=1;
  for(let a=0;a<Math.PI*2;a+=Math.PI/4){ctx.beginPath();ctx.moveTo(-w*0.3,0);ctx.lineTo(-w*0.3+r*Math.cos(a),r*Math.sin(a));ctx.stroke();}
  ctx.fillStyle='#888'; ctx.beginPath(); ctx.arc(-w*0.3,0,r*0.18,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#1a1a1a'; ctx.lineWidth=r*0.22;
  ctx.beginPath(); ctx.arc(w*0.3,0,r,0,Math.PI*2); ctx.stroke();
  ctx.strokeStyle='#444'; ctx.lineWidth=1;
  for(let a=0;a<Math.PI*2;a+=Math.PI/4){ctx.beginPath();ctx.moveTo(w*0.3,0);ctx.lineTo(w*0.3+r*Math.cos(a),r*Math.sin(a));ctx.stroke();}
  ctx.fillStyle='#888'; ctx.beginPath(); ctx.arc(w*0.3,0,r*0.18,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0;
  ctx.strokeStyle=color; ctx.lineWidth=r*0.18; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(-w*0.3,0); ctx.lineTo(0,-r*0.8); ctx.lineTo(w*0.3,0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-w*0.3,0); ctx.lineTo(0,r*0.1); ctx.lineTo(w*0.3,0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0,-r*0.8); ctx.lineTo(0,r*0.1); ctx.stroke();
  ctx.fillStyle='#333'; ctx.beginPath(); ctx.roundRect(-r*0.4,-r*1.05,r*0.8,r*0.22,r*0.1); ctx.fill();
  ctx.strokeStyle='#444'; ctx.lineWidth=r*0.14;
  ctx.beginPath(); ctx.moveTo(w*0.24,-r*0.6); ctx.lineTo(w*0.36,-r*0.6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w*0.3,-r*0.6); ctx.lineTo(w*0.3,0); ctx.stroke();
  ctx.fillStyle='#555'; ctx.beginPath(); ctx.arc(0,r*0.1,r*0.2,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff'; ctx.font=\`bold \${r*0.7}px sans-serif\`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.shadowColor='rgba(0,0,0,0.9)'; ctx.shadowBlur=3;
  ctx.fillText(label,0,r*0.1); ctx.shadowBlur=0; ctx.restore();
}

function drawPedestrian(ctx, cx, cy, _W, H, _color, label, angle) {
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(angle);
  const h=H;
  ctx.shadowColor='rgba(0,0,0,0.4)'; ctx.shadowBlur=6;
  ctx.strokeStyle='#1a3a5c'; ctx.lineWidth=h*0.1; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(-h*0.1,h*0.18); ctx.lineTo(-h*0.15,h*0.48); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(h*0.1,h*0.18); ctx.lineTo(h*0.15,h*0.48); ctx.stroke();
  ctx.fillStyle='#333';
  ctx.beginPath(); ctx.ellipse(-h*0.17,h*0.5,h*0.1,h*0.05,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(h*0.17,h*0.5,h*0.1,h*0.05,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#2255cc'; ctx.shadowBlur=4;
  ctx.beginPath(); ctx.roundRect(-h*0.18,-h*0.12,h*0.36,h*0.32,h*0.06); ctx.fill();
  ctx.shadowBlur=0;
  ctx.strokeStyle='#2255cc'; ctx.lineWidth=h*0.09;
  ctx.beginPath(); ctx.moveTo(-h*0.18,0); ctx.lineTo(-h*0.3,h*0.16); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(h*0.18,0); ctx.lineTo(h*0.3,h*0.16); ctx.stroke();
  ctx.fillStyle='#e8c49a'; ctx.beginPath(); ctx.roundRect(-h*0.07,-h*0.22,h*0.14,h*0.12,h*0.03); ctx.fill();
  ctx.fillStyle='#f5d5a0'; ctx.shadowColor='rgba(0,0,0,0.4)'; ctx.shadowBlur=4;
  ctx.beginPath(); ctx.arc(0,-h*0.38,h*0.22,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0; ctx.strokeStyle='#d4a870'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.arc(0,-h*0.38,h*0.22,0,Math.PI*2); ctx.stroke();
  ctx.fillStyle='#4a3020';
  ctx.beginPath(); ctx.arc(-h*0.07,-h*0.42,h*0.04,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(h*0.07,-h*0.42,h*0.04,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#8b4513'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.arc(0,-h*0.32,h*0.07,0.2,Math.PI-0.2); ctx.stroke();
  ctx.fillStyle='#4a3020'; ctx.beginPath(); ctx.arc(0,-h*0.38,h*0.22,Math.PI,0); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.92)'; ctx.beginPath(); ctx.arc(0,-h*0.05,h*0.15,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#ff6600'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(0,-h*0.05,h*0.15,0,Math.PI*2); ctx.stroke();
  ctx.fillStyle='#cc4400'; ctx.font=\`bold \${h*0.18}px sans-serif\`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(label,0,-h*0.05); ctx.restore();
}

// ── COLOR MAP ──────────────────────────────────────────────
const COLOR_MAP = {
  blanc:'#F5F5F0',white:'#F5F5F0',weiss:'#F5F5F0',bianco:'#F5F5F0',
  noir:'#1a1a2e',black:'#111118',schwarz:'#1a1a2e',nero:'#111118',
  gris:'#7a7a8a',grey:'#7a7a8a',gray:'#7a7a8a',grau:'#888890',
  rouge:'#cc2222',red:'#cc2222',rot:'#cc2222',rosso:'#cc2222',
  bleu:'#2255cc',blue:'#2255cc',blau:'#2255cc',azzurro:'#3366cc',
  vert:'#228833',green:'#228833',grün:'#228833',verde:'#228833',
  jaune:'#ddaa00',yellow:'#ddaa00',gelb:'#ddaa00',giallo:'#ddaa00',
  orange:'#dd6600',argent:'#aab0bb',silver:'#aab0bb',silber:'#aab0bb',
  beige:'#c8b880',marron:'#8b5e3c',brown:'#8b5e3c',bordeaux:'#8b1a2a',
  violet:'#6633aa',rose:'#cc5588',
};

function parseColor(colorStr) {
  if (!colorStr) return '#4466aa';
  const lower = colorStr.toLowerCase().trim();
  for (const [key, val] of Object.entries(COLOR_MAP)) {
    if (lower.includes(key)) return val;
  }
  if (lower.match(/^#[0-9a-f]{3,6}$/)) return colorStr;
  return '#4466aa';
}

// ── Sélecteur de véhicule ──────────────────────────────────
function drawVehicle(ctx, cx, cy, angle, vehicleData, label) {
  const VW = 32, VH = 15;
  const color = parseColor(vehicleData.color);
  const type = vehicleData.vehicleType || 'car';
  switch (type) {
    case 'suv':        drawSUV(ctx,cx,cy,VW,VH,color,label,angle); break;
    case 'truck':      drawTruck(ctx,cx,cy,VW,VH,color,label,angle); break;
    case 'van':        drawVan(ctx,cx,cy,VW,VH,color,label,angle); break;
    case 'motorcycle': drawMotorcycle(ctx,cx,cy,VW,VH,color,label,angle); break;
    case 'scooter':    drawMotorcycle(ctx,cx,cy,VW*0.8,VH*0.8,color,label,angle); break;
    case 'bicycle':    drawBicycle(ctx,cx,cy,VW,VH,color,label,angle); break;
    case 'pedestrian': drawPedestrian(ctx,cx,cy,VW,VH,color,label,angle); break;
    case 'tram':       drawTram(ctx,cx,cy,VW*1.6,VH,color,label,angle); break;
    case 'bus':        drawTruck(ctx,cx,cy,VW*1.2,VH,'#2255aa',label,angle); break;
    default:           drawCar(ctx,cx,cy,VW,VH,color,label,angle);
  }
}

// ── Trajectoire ────────────────────────────────────────────
function drawTrajectoryArrow(ctx, fromX, fromY, toX, toY, color, isReversing) {
  const len = Math.sqrt((toX-fromX)**2 + (toY-fromY)**2);
  if (len < 10) return;
  const angle = Math.atan2(toY-fromY, toX-fromX);
  const headLen = 10;
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineWidth = 2; ctx.globalAlpha = 0.85; ctx.setLineDash([8,5]);
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX - Math.cos(angle)*headLen, toY - Math.sin(angle)*headLen);
  ctx.stroke();
  ctx.setLineDash([]); ctx.globalAlpha = 1;
  const tip = isReversing ? {x:fromX,y:fromY} : {x:toX,y:toY};
  const a = isReversing ? angle + Math.PI : angle;
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(tip.x - headLen*Math.cos(a-0.4), tip.y - headLen*Math.sin(a-0.4));
  ctx.lineTo(tip.x - headLen*Math.cos(a+0.4), tip.y - headLen*Math.sin(a+0.4));
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// ── Fond de route selon scénario ──────────────────────────
function drawRoadScene(ctx, W, H, scenario, trafficSide) {
  const cx = W/2, cy = H/2;
  const ROAD = 'rgba(60,65,80,0.92)';
  const LINE = 'rgba(255,255,200,0.5)';
  const DASH = 'rgba(255,255,200,0.3)';
  const CURB = 'rgba(180,170,150,0.4)';
  const GRASS = 'rgba(30,55,30,0.2)';
  const LANE = 55;

  // Fond herbe/trottoir
  ctx.fillStyle = 'rgba(20,28,20,0.3)';
  ctx.fillRect(0,0,W,H);

  function road_h() {
    ctx.fillStyle = ROAD;
    ctx.fillRect(0, cy-LANE, W, LANE*2);
    ctx.fillStyle = CURB;
    ctx.fillRect(0, cy-LANE-4, W, 4);
    ctx.fillRect(0, cy+LANE, W, 4);
    ctx.strokeStyle = LINE; ctx.lineWidth=2.5; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(0,cy-LANE); ctx.lineTo(W,cy-LANE); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,cy+LANE); ctx.lineTo(W,cy+LANE); ctx.stroke();
    ctx.strokeStyle = DASH; ctx.lineWidth=2; ctx.setLineDash([16,12]);
    ctx.beginPath(); ctx.moveTo(0,cy); ctx.lineTo(W,cy); ctx.stroke();
    ctx.setLineDash([]);
  }
  function road_v() {
    ctx.fillStyle = ROAD;
    ctx.fillRect(cx-LANE, 0, LANE*2, H);
    ctx.fillStyle = CURB;
    ctx.fillRect(cx-LANE-4, 0, 4, H);
    ctx.fillRect(cx+LANE, 0, 4, H);
    ctx.strokeStyle = LINE; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.moveTo(cx-LANE,0); ctx.lineTo(cx-LANE,H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx+LANE,0); ctx.lineTo(cx+LANE,H); ctx.stroke();
    ctx.strokeStyle = DASH; ctx.lineWidth=2; ctx.setLineDash([16,12]);
    ctx.beginPath(); ctx.moveTo(cx,0); ctx.lineTo(cx,H); ctx.stroke();
    ctx.setLineDash([]);
  }

  switch(scenario) {
    case 'intersection_cross':
      road_h(); road_v();
      ctx.fillStyle = ROAD;
      ctx.fillRect(cx-LANE, cy-LANE, LANE*2, LANE*2);
      // Stop lines
      ctx.strokeStyle = 'rgba(255,255,180,0.6)'; ctx.lineWidth=3; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(cx-LANE,cy-LANE); ctx.lineTo(cx+LANE,cy-LANE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx-LANE,cy+LANE); ctx.lineTo(cx+LANE,cy+LANE); ctx.stroke();
      break;
    case 'intersection_t':
      road_h();
      ctx.fillStyle = ROAD;
      ctx.fillRect(cx-LANE, cy, LANE*2, H-cy);
      ctx.fillRect(cx-LANE, cy-LANE, LANE*2, LANE);
      ctx.strokeStyle = LINE; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.moveTo(cx-LANE,cy); ctx.lineTo(cx-LANE,H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx+LANE,cy); ctx.lineTo(cx+LANE,H); ctx.stroke();
      break;
    case 'roundabout': {
      const r = 90;
      ctx.fillStyle = ROAD;
      ctx.fillRect(0, cy-LANE, cx-r+10, LANE*2);
      ctx.fillRect(cx+r-10, cy-LANE, W-cx-r+10, LANE*2);
      ctx.fillRect(cx-LANE, 0, LANE*2, cy-r+10);
      ctx.fillRect(cx-LANE, cy+r-10, LANE*2, H-cy-r+10);
      ctx.beginPath(); ctx.arc(cx,cy,r+LANE,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = GRASS;
      ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
      // Sens circulation (antihoraire FR)
      ctx.strokeStyle = 'rgba(255,255,180,0.4)'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(cx,cy,r+LANE/2,0,Math.PI*2); ctx.stroke();
      break;
    }
    case 'parking':
    case 'parking_forward':
    case 'parking_reverse':
      road_h();
      ctx.fillStyle = 'rgba(50,52,65,0.8)';
      ctx.fillRect(0, 0, W, cy-LANE);
      ctx.strokeStyle = 'rgba(190,180,140,0.4)'; ctx.lineWidth=1.5;
      for (let i=0; i<=6; i++) {
        const x = (W/6)*i;
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,cy-LANE); ctx.stroke();
      }
      ctx.strokeStyle = CURB; ctx.lineWidth=4;
      ctx.beginPath(); ctx.moveTo(0,cy-LANE); ctx.lineTo(W,cy-LANE); ctx.stroke();
      break;
    case 'overtaking':
      road_h();
      ctx.strokeStyle = 'rgba(255,165,0,0.6)'; ctx.lineWidth=3; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(0,cy); ctx.lineTo(W,cy); ctx.stroke();
      break;
    default: // straight
      road_h();
      break;
  }
}

// ── Calcul positions véhicules ─────────────────────────────
function calcVehiclePositions(scenario, trafficSide, W, H) {
  const cx = W/2, cy = H/2, L = 20;
  const side = trafficSide === 'left' ? -1 : 1;

  switch(scenario) {
    case 'parking':
    case 'parking_forward':
    case 'parking_reverse':
      return {
        posA: { x:cx-80, y:cy-L*1.5, angle:Math.PI/2 },
        posB: { x:cx+90, y:cy-L*0.4*side, angle:Math.PI },
        impactX: cx-10, impactY: cy-L*0.6,
      };
    case 'roundabout':
      return {
        posA: { x:cx-140, y:cy-L*0.4*side, angle:0 },
        posB: { x:cx+L*0.4*side, y:cy-120, angle:Math.PI/2 },
        impactX: cx-60, impactY: cy-60,
      };
    case 'straight_rear':
      return {
        posA: { x:cx-100, y:cy-L*0.4*side, angle:0 },
        posB: { x:cx+80, y:cy-L*0.4*side, angle:0 },
        impactX: cx, impactY: cy-L*0.4*side,
      };
    case 'overtaking':
    case 'straight_head':
      return {
        posA: { x:cx-120, y:cy-L*0.4*side, angle:0 },
        posB: { x:cx+120, y:cy+L*0.4*side, angle:Math.PI },
        impactX: cx, impactY: cy,
      };
    case 'intersection_cross':
    case 'intersection_t':
    default:
      return {
        posA: { x:cx-130, y:cy-L*0.4*side, angle:0 },
        posB: { x:cx+L*0.4*side, y:cy+130, angle:-Math.PI/2 },
        impactX: cx, impactY: cy,
      };
  }
}


// ── Rendu ─────────────────────────────────────────────────
(async function() {
  try {
    const canvas = document.getElementById('c');
    const ctx    = canvas.getContext('2d');
    const W = ${W}, H = ${H};

    // Fond
    ${mapSrc ? `
    await new Promise((res) => {
      const img = new Image();
      img.onload  = () => { ctx.drawImage(img,0,0,W,H); res(); };
      img.onerror = () => { ctx.fillStyle='#1a2535'; ctx.fillRect(0,0,W,H); res(); };
      img.src = '` + mapSrc + `';
    });
    ` : `ctx.fillStyle='#12121f'; ctx.fillRect(0,0,W,H);`}

    // Positions
    const {posA, posB, impactX, impactY} = calcVehiclePositions(
      '${inp.scenario}', '${inp.trafficSide}', W, H
    );

    const vA = { vehicleType:'${inp.vehicleAType}', color:'${inp.vehicleAColor}' };
    const vB = { vehicleType:'${inp.vehicleBType}', color:'${inp.vehicleBColor}' };

    // Trajectoires
    ${inp.vehicleAMoving ? `drawTrajectoryArrow(ctx, posA.x - Math.cos(posA.angle)*100, posA.y - Math.sin(posA.angle)*100, posA.x, posA.y, '#4488ff', ${inp.vehicleAReversing || false});` : ''}
    ${inp.vehicleBMoving ? `drawTrajectoryArrow(ctx, posB.x - Math.cos(posB.angle)*100, posB.y - Math.sin(posB.angle)*100, posB.x, posB.y, '#ff8833', ${inp.vehicleBReversing || false});` : ''}

    // Véhicules
    drawVehicle(ctx, posA.x, posA.y, posA.angle, vA, 'A');
    drawVehicle(ctx, posB.x, posB.y, posB.angle, vB, 'B');

    // Impact
    ctx.save();
    ctx.shadowColor='#ef4444'; ctx.shadowBlur=25;
    ctx.fillStyle='#ef4444';
    ctx.beginPath(); ctx.arc(impactX,impactY,7,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    ctx.strokeStyle='#fff'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(impactX-9,impactY-9); ctx.lineTo(impactX+9,impactY+9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(impactX+9,impactY-9); ctx.lineTo(impactX-9,impactY+9); ctx.stroke();
    ctx.restore();
    ctx.fillStyle='#ef4444'; ctx.font='bold 10px monospace';
    ctx.textAlign='center'; ctx.fillText('IMPACT',impactX,impactY+26);

    // Labels marque/modèle
    function tag(x, y, txt, col) {
      ctx.font='bold 12px sans-serif';
      const tw = ctx.measureText(txt).width;
      ctx.fillStyle='rgba(0,0,0,0.75)';
      ctx.beginPath(); ctx.roundRect(x-tw/2-7,y-15,tw+14,20,5); ctx.fill();
      ctx.fillStyle=col; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(txt,x,y-5);
    }
    tag(posA.x, posA.y-22, '${labelA}', '#4488ff');
    tag(posB.x, posB.y-22, '${labelB}', '#ff8833');

    // Plaques
    function plate(x, y, num) {
      if (!num) return;
      ctx.font='bold 10px monospace';
      const tw=ctx.measureText(num).width;
      ctx.fillStyle='#FFFFDD'; ctx.strokeStyle='#888'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.roundRect(x-tw/2-5,y-9,tw+10,16,3); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#111'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(num,x,y);
    }
    plate(posA.x, posA.y+65, '${inp.vehicleAPlate || ''}');
    plate(posB.x, posB.y+65, '${inp.vehicleBPlate || ''}');

    // Barre inférieure
    ctx.fillStyle='rgba(0,0,0,0.65)';
    ctx.fillRect(0,H-28,W,28);
    ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font='10px monospace';
    ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText('● Impact  → Trajectoire A  → Trajectoire B', 14, H-14);
    ctx.textAlign='right'; ctx.fillStyle='rgba(255,255,255,0.25)';
    ctx.fillText('boom.contact · Croquis IA', W-14, H-14);

    window.__done = true;
    console.log('SKETCH_DONE');

  } catch(e) {
    window.__err = e.message || String(e);
    console.error('SKETCH_ERROR', window.__err);
    window.__done = true;
  }
})();
</script></body></html>`;
}

export async function closeBrowser(): Promise<void> {
  if (_browser) { await _browser.close(); _browser = null; }
}


