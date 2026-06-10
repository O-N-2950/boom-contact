// Polyfill requis par le moteur de shaping indien de fontkit (machine à états des syllabes).
import 'regenerator-runtime/runtime.js';
import { renderSketch } from './sketch-renderer.service.js';
import { fetchAccidentMap, fetchAccidentMapWithVehicles, geocodeAddress } from './osm-map.service.js';
import { logger } from '../logger.js';
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  determineLangs, getBilingualLabels, getLabels, countryToLang,
  type PdfLang, type PdfLabels,
} from './pdf.labels.js';
import type { ConstatSession } from '../../../shared/types';

// ── RTL / Unicode font support ───────────────────────────────
// Resolve fonts directory — works in both dev (tsx) and production (esbuild bundle).
// Dev:  server/src/services/fonts/
// Prod: dist/server/fonts/ (copied by build-server.mjs)
const __fontDir = (() => {
  const candidates: string[] = [];
  try {
    const thisFile = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url);
    const thisDir = dirname(thisFile);
    // Dev layout: this file is at server/src/services/pdf.service.ts, fonts at server/src/services/fonts/
    candidates.push(join(thisDir, 'fonts'));
    // Production layout: dist/server/index.js → dist/server/fonts/
    candidates.push(join(thisDir, 'fonts'));
  } catch { /* ignore */ }
  // Fallback: cwd-relative paths
  candidates.push(join(process.cwd(), 'server', 'src', 'services', 'fonts'));
  candidates.push(join(process.cwd(), 'dist', 'server', 'fonts'));

  // Return first candidate that actually exists
  for (const dir of candidates) {
    try {
      if (existsSync(dir) && statSync(dir).isDirectory()) return dir;
    } catch { /* skip */ }
  }
  // Fallback to first candidate — loadFontBytes will log if files not found
  return candidates[0] ?? join(process.cwd(), 'server', 'src', 'services', 'fonts');
})();

// Lazy-load font bytes (cached after first read)
const _fontCache: Record<string, Uint8Array> = {};
function loadFontBytes(filename: string): Uint8Array {
  if (!_fontCache[filename]) {
    try {
      const buf = readFileSync(join(__fontDir, filename));
      _fontCache[filename] = new Uint8Array(buf);
      logger.info(`[PDF] Loaded font: ${filename} (${buf.length} bytes)`);
    } catch (e) {
      logger.warn(`[PDF] Font not found: ${filename} in ${__fontDir}`, { error: String(e) });
      throw e;
    }
  }
  return _fontCache[filename];
}

// ── Script detection helpers ─────────────────────────────────
const ARABIC_RE  = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const HEBREW_RE  = /[\u0590-\u05FF\uFB1D-\uFB4F]/;
const RTL_RE     = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFB4F\uFB50-\uFDFF\uFE70-\uFEFF]/;

// Scripts nécessitant une police Noto dédiée (le latin/cyrillique/grec sont couverts par NotoSans).
// Scripts rendus correctement sans moteur de shaping (alphabétiques + CJK idéographique).
// Les scripts indiens (devanagari, bengali, tamoul…) nécessitent du shaping HarfBuzz → non activés ici.
const SCRIPT_RANGES: { key: string; re: RegExp }[] = [
  { key: 'cjk',        re: /[\u3000-\u303F\u3040-\u30FF\u31F0-\u31FF\u3400-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/ },
  { key: 'thai',       re: /[\u0E00-\u0E7F]/ },
  { key: 'devanagari', re: /[\u0900-\u097F]/ },
  { key: 'bengali',    re: /[\u0980-\u09FF]/ },
  { key: 'tamil',      re: /[\u0B80-\u0BFF]/ },
  { key: 'telugu',     re: /[\u0C00-\u0C7F]/ },
  { key: 'kannada',    re: /[\u0C80-\u0CFF]/ },
  { key: 'malayalam',  re: /[\u0D00-\u0D7F]/ },
  { key: 'gujarati',   re: /[\u0A80-\u0AFF]/ },
  { key: 'ethiopic',   re: /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF]/ },
  { key: 'georgian',   re: /[\u10A0-\u10FF\u1C90-\u1CBF]/ },
  { key: 'armenian',   re: /[\u0530-\u058F\uFB13-\uFB17]/ },
];

const SCRIPT_FONT_FILES: Record<string, { file: string; subset: boolean }> = {
  cjk:        { file: 'NotoSansSC-Regular.ttf',          subset: false }, // CJK : pas de subset (bug pdf-lib sur grosses polices)
  thai:       { file: 'NotoSansThai-Regular.ttf',        subset: true },
  devanagari: { file: 'NotoSansDevanagari-Regular.ttf',  subset: true },
  bengali:    { file: 'NotoSansBengali-Regular.ttf',     subset: true },
  tamil:      { file: 'NotoSansTamil-Regular.ttf',       subset: true },
  telugu:     { file: 'NotoSansTelugu-Regular.ttf',      subset: true },
  kannada:    { file: 'NotoSansKannada-Regular.ttf',     subset: true },
  malayalam:  { file: 'NotoSansMalayalam-Regular.ttf',   subset: true },
  gujarati:   { file: 'NotoSansGujarati-Regular.ttf',    subset: true },
  ethiopic:   { file: 'NotoSansEthiopic-Regular.ttf',    subset: true },
  georgian:   { file: 'NotoSansGeorgian-Regular.ttf',    subset: true },
  armenian:   { file: 'NotoSansArmenian-Regular.ttf',    subset: true },
};

type ScriptType = 'arabic' | 'hebrew' | 'latin';

function detectScript(text: string): ScriptType {
  if (ARABIC_RE.test(text)) return 'arabic';
  if (HEBREW_RE.test(text)) return 'hebrew';
  return 'latin';
}

// Script d'un caractère unique (clé de SCRIPT_FONT_FILES) ou 'latin'.
function charScriptKey(ch: string): string {
  for (const sc of SCRIPT_RANGES) if (sc.re.test(ch)) return sc.key;
  return 'latin';
}

// Quels scripts dédiés sont présents dans un texte ?
function scriptsPresent(text: string): string[] {
  const out: string[] = [];
  for (const sc of SCRIPT_RANGES) if (sc.re.test(text)) out.push(sc.key);
  return out;
}

// Concatène les textes rendus (données + libellés) pour décider quelles polices embarquer.
function collectRenderText(session: any, labels?: any): string {
  const parts: string[] = [];
  const add = (v: any) => { if (typeof v === 'string' && v) parts.push(v); };
  for (const r of ['A', 'B', 'C', 'D', 'E']) {
    const pt: any = session?.['participant' + r];
    if (!pt) continue;
    const d = pt.driver || {}; add(d.firstName); add(d.lastName); add(d.address); add(d.city);
    const v = pt.vehicle || {}; add(v.brand); add(v.model); add(v.color); add(v.licensePlate);
    const ins = pt.insurance || {}; add(ins.company); add(ins.companyName); add(ins.agentName); add(ins.address);
    (pt.circumstances || []).forEach(add); (pt.damagedZones || []).forEach(add);
  }
  const a: any = session?.accident || {};
  add(a.description); add(a.witnesses); add(a.policeRef);
  const loc = a.location || {}; add(loc.address); add(loc.city); add(loc.countryName);
  if (labels) { try { parts.push(JSON.stringify(labels)); } catch { /* noop */ } }
  return parts.join(' ');
}

function isRTL(text: string): boolean {
  return RTL_RE.test(text);
}

/**
 * Reverse the visual order of RTL text for pdf-lib rendering.
 * pdf-lib draws glyphs left-to-right; for RTL scripts we reverse
 * the character order so the visual result reads right-to-left.
 */
function reverseRTLSegments(text: string): string {
  if (!isRTL(text)) return text;
  // Split into RTL and LTR runs, reverse RTL runs
  const segments: { text: string; rtl: boolean }[] = [];
  let current = '';
  let currentRtl = false;
  for (const char of text) {
    const charRtl = RTL_RE.test(char);
    if (current.length === 0) {
      current = char;
      currentRtl = charRtl;
    } else if (charRtl === currentRtl || char === ' ') {
      current += char;
    } else {
      segments.push({ text: current, rtl: currentRtl });
      current = char;
      currentRtl = charRtl;
    }
  }
  if (current) segments.push({ text: current, rtl: currentRtl });

  // Reverse RTL segments' characters, then reverse overall segment order
  const reversed = segments.map(s =>
    s.rtl ? { ...s, text: [...s.text].reverse().join('') } : s
  );
  reversed.reverse();
  return reversed.map(s => s.text).join('');
}

// ── Format de date selon le pays ──────────────────────────────
// ISO input: YYYY-MM-DD → format local
function formatDateForCountry(isoDate: string, countryCode?: string): string {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate;

  const country = (countryCode || '').toUpperCase();

  // USA, Canada (anglophone), Philippines
  if (['US', 'PH'].includes(country)) return `${m}/${d}/${y}`;

  // Chine, Corée, Hongrie, Lituanie, Iran
  if (['CN', 'KR', 'HU', 'LT', 'IR'].includes(country)) return `${y}.${m}.${d}`;

  // Japon
  if (country === 'JP') return `${y}/${m}/${d}`;

  // UK, Irlande, Australie, NZ, Inde, Afrique du Sud, Kenya, HK, SG, MY, IN
  if (['GB', 'IE', 'AU', 'NZ', 'ZA', 'KE', 'TZ', 'HK', 'SG', 'MY', 'IN'].includes(country)) {
    return `${d}/${m}/${y}`;
  }

  // Europe continentale (défaut) + Suisse, France, Allemagne, Russie, etc.
  return `${d}.${m}.${y}`;
}


// ─────────────────────────────────────────────────────────────
// Colors
// ─────────────────────────────────────────────────────────────
const C = {
  boom:     rgb(1, 0.208, 0),       // #FF3500
  black:    rgb(0.039, 0.039, 0.055), // #0A0A0E
  dark:     rgb(0.12, 0.12, 0.18),
  mid:      rgb(0.45, 0.45, 0.5),
  light:    rgb(0.85, 0.83, 0.82),
  white:    rgb(1, 1, 1),
  green:    rgb(0.133, 0.773, 0.369),
  border:   rgb(0.88, 0.86, 0.84),
  section:  rgb(0.96, 0.95, 0.93),
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
/**
 * Sanitize text for WinAnsi (Helvetica) rendering.
 * Only used for Latin-script text drawn with StandardFonts.
 * Arabic/Hebrew text bypasses this and uses embedded Noto fonts.
 */
function sanitizeForWinAnsi(text: string): string {
  return text
    .replace(/[\u0100-\uFFFF]/g, (c) => {
      const map: Record<string, string> = {
        '\u00e9': 'e', '\u00e8': 'e', '\u00ea': 'e', '\u00eb': 'e',
        '\u00e0': 'a', '\u00e2': 'a', '\u00e4': 'a',
        '\u00f9': 'u', '\u00fb': 'u', '\u00fc': 'u',
        '\u00f4': 'o', '\u00f6': 'o',
        '\u00ee': 'i', '\u00ef': 'i',
        '\u00e7': 'c',
        '\u00c9': 'E', '\u00c8': 'E', '\u00ca': 'E',
        '\u00c0': 'A', '\u00c2': 'A',
        '\u00d9': 'U', '\u00db': 'U',
        '\u00d4': 'O', '\u00ce': 'I',
        '\u00c7': 'C',
        '\u2019': "'", '\u2018': "'", '\u201c': '"', '\u201d': '"',
        '\u2013': '-', '\u2014': '-', '\u2026': '...',
        '\u00ab': '<<', '\u00bb': '>>',
      };
      return map[c] ?? ' ';
    });
}

/**
 * Draw text on a PDF page with automatic script detection.
 * - Latin text: uses the provided font (Helvetica) with WinAnsi sanitization
 * - Arabic text: uses embedded Noto Sans Arabic with RTL reordering
 * - Hebrew text: uses embedded Noto Sans Hebrew with RTL reordering
 *
 * The optional `rtlFonts` parameter provides embedded Unicode fonts.
 * If not available, falls back to Helvetica with transliteration.
 */
function drawText(
  page: PDFPage, text: string, x: number, y: number,
  font: PDFFont, size: number, color = C.black,
  rtlFonts?: RtlFonts
) {
  if (!text) return;

  const script = detectScript(text);

  try {
    if (script === 'arabic' && rtlFonts?.arabic) {
      // Arabic: use Noto Sans Arabic + RTL visual reordering
      const reordered = reverseRTLSegments(text);
      // Right-align: calculate text width and draw from right edge
      const textWidth = rtlFonts.arabic.widthOfTextAtSize(reordered, size);
      const rtlX = x + textWidth; // For RTL, we shift x to place text correctly
      page.drawText(reordered, { x, y, font: rtlFonts.arabic, size, color });
    } else if (script === 'hebrew' && rtlFonts?.hebrew) {
      // Hebrew: use Noto Sans Hebrew + RTL visual reordering
      const reordered = reverseRTLSegments(text);
      page.drawText(reordered, { x, y, font: rtlFonts.hebrew, size, color });
    } else {
      // LTR : NotoSans (latin/latin-étendu/cyrillique/grec) + polices Noto par script.
      const sf = rtlFonts?.scriptFonts;
      const isNoto = font === rtlFonts?.notoRegular || font === rtlFonts?.notoBold;
      const present = sf ? scriptsPresent(text) : [];
      if (present.length === 0) {
        // Chemin rapide : aucun script dédié (cas le plus fréquent)
        if (isNoto) {
          page.drawText(text, { x, y, font, size, color });
        // eslint-disable-next-line no-control-regex -- détection non-ASCII volontaire (moteur multi-script)
        } else if (rtlFonts?.notoRegular && /[^\x00-\x7F]/.test(text)) {
          page.drawText(text, { x, y, font: rtlFonts.notoRegular, size, color });
        } else {
          page.drawText(sanitizeForWinAnsi(text), { x, y, font, size, color });
        }
      } else {
        // Découpage en segments par script : chaque segment rendu avec sa police.
        const baseFont = isNoto ? font : (rtlFonts?.notoRegular || font);
        let cx = x, run = '', runKey = 'latin';
        const flush = () => {
          if (!run) return;
          const f = runKey === 'latin' ? baseFont : (sf![runKey] || baseFont);
          try {
            page.drawText(run, { x: cx, y, font: f, size, color });
            cx += f.widthOfTextAtSize(run, size);
          } catch {
            const safe = sanitizeForWinAnsi(run);
            try { page.drawText(safe, { x: cx, y, font: baseFont, size, color }); cx += baseFont.widthOfTextAtSize(safe, size); } catch { /* skip */ }
          }
          run = '';
        };
        for (const ch of text) {
          // ZWJ/ZWNJ : liants de conjointes — rester dans le segment courant
          if (run && (ch === '\u200C' || ch === '\u200D')) { run += ch; continue; }
          const k = charScriptKey(ch);
          if (run && k !== runKey) flush();
          if (!run) runKey = k;
          run += ch;
        }
        flush();
      }
    }
  } catch (e) {
    // Fallback: strip everything non-ASCII if font embedding fails
    logger.warn('[PDF] drawText fallback for script=' + script, { error: String(e), text: text.slice(0, 50) });
    try {
      const safe = text.replace(/[^\x20-\x7E]/g, '?');
      if (safe.trim()) page.drawText(safe, { x, y, font, size, color });
    } catch {
      // Complete failure — silently skip this text
    }
  }
}

function drawRect(
  page: PDFPage, x: number, y: number, w: number, h: number,
  fill = C.white, borderColor = C.border, borderWidth = 0.5
) {
  page.drawRectangle({ x, y, width: w, height: h, color: fill,
    borderColor, borderWidth });
}

function drawLine(page: PDFPage, x1: number, y1: number, x2: number, y2: number, color = C.border, thickness = 0.5) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, color, thickness });
}

function labelValue(
  page: PDFPage, label: string, value: string,
  x: number, y: number, w: number,
  labelFont: PDFFont, valueFont: PDFFont,
  rtlFonts?: RtlFonts
) {
  drawRect(page, x, y - 18, w, 22, C.white, C.border, 0.5);
  drawText(page, label, x + 4, y - 13, labelFont, 6, C.mid, rtlFonts);
  drawText(page, value || '-', x + 4, y - 22, valueFont, 9, C.black, rtlFonts);
}

// ─────────────────────────────────────────────────────────────
// PDF context shared across sub-functions
// ─────────────────────────────────────────────────────────────
interface PartyBStatus {
  reason: string; reasonLabel: string;
  plateNumber?: string; platePhoto?: string;
  vehicleDescription?: string; policeReportRef?: string;
  notes?: string; recordedAt: string;
}

interface RtlFonts {
  arabic?: PDFFont;
  hebrew?: PDFFont;
  notoRegular?: PDFFont;
  notoBold?: PDFFont;
  // Polices Noto par script (embarquées à la demande selon le contenu du constat)
  scriptFonts?: Record<string, PDFFont>;
}

interface PdfContext {
  doc: PDFDocument;
  page: PDFPage;
  bold: PDFFont;
  normal: PDFFont;
  mono: PDFFont;
  rtlFonts: RtlFonts;
  session: ConstatSession;
  A: ConstatSession['participantA'];
  B: ConstatSession['participantB'];
  L: PdfLabels;
  acc: ConstatSession['accident'];
  margin: number;
  colW: number;
  width: number;
  height: number;
  isUnilateral: boolean;
  partyBStatus: PartyBStatus | undefined;
  formattedDate: string;
  y: number;
}

// ── Sub-function: Header ────────────────────────────────────
function buildHeader(ctx: PdfContext): void {
  const { page, bold, normal, mono, rtlFonts, margin, width, height, isUnilateral, L, session, acc, formattedDate } = ctx;

  const headerColor = isUnilateral ? rgb(0.6, 0.35, 0.0) : C.boom;
  page.drawRectangle({ x: 0, y: height - 52, width, height: 52, color: headerColor });

  drawText(page, 'boom.contact', margin, height - 20, bold, 20, C.white, rtlFonts);
  const pdfTitle = isUnilateral ? 'Declaration Unilaterale de Sinistre' : L.title;
  const pdfSubtitle = isUnilateral
    ? 'Dossier d\'accident numerique horodate — a transmettre a votre assureur'
    : L.subtitle;
  drawText(page, pdfTitle, margin, height - 34, normal, 9, rgb(1, 0.9, 0.7), rtlFonts);
  drawText(page, pdfSubtitle, margin, height - 44, normal, 6.5, rgb(1, 0.85, 0.6), rtlFonts);

  const sessionText = `Session: ${session.id}`;
  const sessionW = mono.widthOfTextAtSize(sessionText, 7);
  drawText(page, sessionText, width - margin - sessionW, height - 18, mono, 7, C.white, rtlFonts);
  const dateStr = acc.date && acc.time ? `${formattedDate} ${acc.time}` : new Date(session.createdAt).toLocaleString('fr-CH');
  const dateW = normal.widthOfTextAtSize(dateStr, 7);
  drawText(page, dateStr, width - margin - dateW, height - 30, normal, 7, rgb(1, 0.85, 0.8), rtlFonts);

  ctx.y = height - 64;
}

// ── Sub-function: Unilateral banner ─────────────────────────
async function buildUnilateralBanner(ctx: PdfContext): Promise<void> {
  const { doc, page, bold, normal, rtlFonts, margin, width, isUnilateral, partyBStatus } = ctx;
  if (!isUnilateral || !partyBStatus) return;
  const y = ctx.y;

  page.drawRectangle({
    x: margin, y: y - 62, width: width - margin * 2, height: 62,
    color: rgb(0.18, 0.12, 0.0),
    borderColor: rgb(0.6, 0.4, 0.0),
    borderWidth: 1,
  });

  drawText(page, 'DECLARATION UNILATERALE DE SINISTRE', margin + 8, y - 12, bold, 9, rgb(0.95, 0.72, 0.1), rtlFonts);
  drawText(page,
    `Raison : ${partyBStatus.reasonLabel}  |  Enregistre le : ${new Date(partyBStatus.recordedAt).toLocaleString('fr-CH')}`,
    margin + 8, y - 24, normal, 7.5, rgb(0.9, 0.75, 0.4), rtlFonts
  );

  if (partyBStatus.plateNumber) {
    drawText(page, `Plaque partie B : ${partyBStatus.plateNumber}`, margin + 8, y - 36, bold, 8, rgb(0.95, 0.72, 0.1), rtlFonts);
  }
  if (partyBStatus.vehicleDescription) {
    drawText(page, `Vehicule B : ${partyBStatus.vehicleDescription}`, margin + 8, y - 46, normal, 7, rgb(0.85, 0.7, 0.4), rtlFonts);
  }
  if (partyBStatus.policeReportRef) {
    drawText(page, `Ref. police : ${partyBStatus.policeReportRef}`, margin + 240, y - 36, normal, 7, rgb(0.85, 0.7, 0.4), rtlFonts);
  }
  if (partyBStatus.notes) {
    const notesShort = partyBStatus.notes.length > 80 ? partyBStatus.notes.slice(0, 80) + '...' : partyBStatus.notes;
    drawText(page, `Observations : ${notesShort}`, margin + 8, y - 56, normal, 6.5, rgb(0.75, 0.62, 0.35), rtlFonts);
  }

  if (partyBStatus.platePhoto) {
    try {
      const plateBytes = Buffer.from(partyBStatus.platePhoto, 'base64');
      let plateImg;
      try { plateImg = await doc.embedJpg(plateBytes); } catch { plateImg = await doc.embedPng(plateBytes); }
      const plateH = 52;
      const plateW = Math.min(90, plateImg.width * plateH / plateImg.height);
      page.drawImage(plateImg, {
        x: width - margin - plateW - 4, y: y - 60,
        width: plateW, height: plateH,
      });
      page.drawRectangle({
        x: width - margin - plateW - 4, y: y - 60,
        width: plateW, height: plateH,
        borderColor: rgb(0.6, 0.4, 0.0), borderWidth: 0.5,
        color: undefined as any,
      });
    } catch (e) { logger.warn('[PDF] Plate photo embed failed', { error: String(e) }); }
  }

  ctx.y = y - 72;
}

// ── Sub-function: Vehicle + Driver + Insurance sections ─────
function buildPartySection(ctx: PdfContext): void {
  const { page, bold, normal, rtlFonts, A, B, L, margin, width, colW } = ctx;
  let y = ctx.y;

  // Accident info
  drawRect(page, margin, y - 38, width - margin * 2, 42, C.section, C.border);
  drawText(page, L.s1, margin + 6, y - 10, bold, 8, C.boom, rtlFonts);

  const fieldW = (width - margin * 2 - 16) / 4;
  labelValue(page, L.date, ctx.formattedDate, margin + 4, y - 12, fieldW, normal, bold, rtlFonts);
  labelValue(page, L.time, ctx.acc.time ?? '', margin + 4 + fieldW + 4, y - 12, fieldW, normal, bold, rtlFonts);
  labelValue(page, L.country, ctx.acc.location?.country ?? '', margin + 4 + (fieldW + 4) * 2, y - 12, fieldW, normal, bold, rtlFonts);
  labelValue(page, L.injuries, ctx.acc.injuries ? L.yes : L.no, margin + 4 + (fieldW + 4) * 3, y - 12, fieldW, normal, bold, rtlFonts);
  y -= 42;

  // Location
  drawRect(page, margin, y - 22, width - margin * 2, 26, C.white, C.border);
  drawText(page, L.location, margin + 4, y - 8, normal, 6, C.mid, rtlFonts);
  const locationStr = [ctx.acc.location?.address, ctx.acc.location?.city, ctx.acc.location?.country].filter(Boolean).join(', ');
  drawText(page, locationStr || '-', margin + 6, y - 18, bold, 9, C.black, rtlFonts);
  y -= 28;

  // Vehicle headers
  y -= 6;
  page.drawRectangle({ x: margin, y: y - 22, width: colW, height: 22, color: C.black });
  drawText(page, L.vehicleA, margin + 6, y - 8, bold, 8, C.white, rtlFonts);
  drawText(page, `${L.driver} : ${A?.driver?.firstName ?? ''} ${A?.driver?.lastName ?? ''}`.trim() || '-',
    margin + 6, y - 17, normal, 7, C.light, rtlFonts);
  page.drawRectangle({ x: margin + colW + 8, y: y - 22, width: colW, height: 22, color: C.dark });
  drawText(page, L.vehicleB, margin + colW + 14, y - 8, bold, 8, C.white, rtlFonts);
  drawText(page, `${L.driver} : ${B?.driver?.firstName ?? ''} ${B?.driver?.lastName ?? ''}`.trim() || '-',
    margin + colW + 14, y - 17, normal, 7, C.light, rtlFonts);
  y -= 28;

  // Vehicle data side-by-side helper
  const drawSideBySide = (labelA: string, valA: string, labelB: string, valB: string, rowH = 26) => {
    labelValue(page, labelA, valA, margin, y, colW, normal, bold, rtlFonts);
    labelValue(page, labelB, valB, margin + colW + 8, y, colW, normal, bold, rtlFonts);
    y -= rowH;
  };

  drawSideBySide(L.plate, A?.vehicle?.licensePlate ?? '', L.plate, B?.vehicle?.licensePlate ?? '');
  drawSideBySide(L.brand, `${A?.vehicle?.brand ?? ''} ${A?.vehicle?.model ?? ''}`.trim(), L.brand, `${B?.vehicle?.brand ?? ''} ${B?.vehicle?.model ?? ''}`.trim());
  drawSideBySide('YEAR / COLOUR / JAHR / ANNO', `${A?.vehicle?.year ?? ''} ${A?.vehicle?.color ?? ''}`.trim(), 'YEAR / COLOUR / JAHR / ANNO', `${B?.vehicle?.year ?? ''} ${B?.vehicle?.color ?? ''}`.trim());
  y -= 4;

  // Driver data
  page.drawRectangle({ x: margin, y: y - 14, width: width - margin * 2, height: 14, color: rgb(0.94, 0.93, 0.91) });
  drawText(page, L.s2, margin + 4, y - 9, bold, 7.5, C.boom, rtlFonts);
  y -= 18;
  drawSideBySide(L.name, `${A?.driver?.firstName ?? ''} ${A?.driver?.lastName ?? ''}`.trim(), L.name, `${B?.driver?.firstName ?? ''} ${B?.driver?.lastName ?? ''}`.trim());
  drawSideBySide(L.address, `${A?.driver?.address ?? ''} ${A?.driver?.city ?? ''}`.trim(), L.address, `${B?.driver?.address ?? ''} ${B?.driver?.city ?? ''}`.trim());
  drawSideBySide('TEL', A?.driver?.phone ?? '', 'TEL', B?.driver?.phone ?? '');
  drawSideBySide('N° PERMIS DE CONDUIRE', A?.driver?.licenseNumber ?? '', 'N° PERMIS DE CONDUIRE', B?.driver?.licenseNumber ?? '');
  y -= 4;

  // Insurance data
  page.drawRectangle({ x: margin, y: y - 14, width: width - margin * 2, height: 14, color: rgb(0.94, 0.93, 0.91) });
  drawText(page, L.s3, margin + 4, y - 9, bold, 7.5, C.boom, rtlFonts);
  y -= 18;
  drawSideBySide(L.insurer, A?.insurance?.company ?? '', L.insurer, B?.insurance?.company ?? '');
  drawSideBySide('N° DE POLICE', A?.insurance?.policyNumber ?? '', 'N° DE POLICE', B?.insurance?.policyNumber ?? '');
  drawSideBySide('N° CARTE VERTE', A?.insurance?.greenCardNumber ?? '', 'N° CARTE VERTE', B?.insurance?.greenCardNumber ?? '');
  y -= 4;

  ctx.y = y;
}

// ── Sub-function: Circumstances, zones, witnesses, fault, description
function buildDetailsSection(ctx: PdfContext): void {
  const { page, bold, normal, mono, rtlFonts, A, B, L, acc, margin, width, colW } = ctx;
  let y = ctx.y;

  // Helper to get the best font for measuring text width (handles RTL fonts)
  const measureFont = (text: string, baseFont: PDFFont): PDFFont => {
    const script = detectScript(text);
    if (script === 'arabic' && rtlFonts.arabic) return rtlFonts.arabic;
    if (script === 'hebrew' && rtlFonts.hebrew) return rtlFonts.hebrew;
    return baseFont;
  };

  // Circumstances
  page.drawRectangle({ x: margin, y: y - 14, width: width - margin * 2, height: 14, color: rgb(0.94, 0.93, 0.91) });
  drawText(page, L.s4, margin + 4, y - 9, bold, 7.5, C.boom, rtlFonts);
  y -= 18;
  const circA = A?.circumstances ?? [];
  const circB = B?.circumstances ?? [];
  const allCirc = Array.from(new Set([...circA, ...circB]));
  const circItems = allCirc.slice(0, 8);
  circItems.forEach((id, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = margin + col * ((width - margin * 2) / 2);
    const cy = y - row * 14;
    const inA = circA.includes(id);
    const inB = circB.includes(id);
    drawText(page, `${inA ? '[A] ' : '   '}${inB ? '[B] ' : '   '}${L.circ[id] ?? id}`, cx + 4, cy - 10, normal, 7, C.black, rtlFonts);
  });
  y -= Math.ceil(circItems.length / 2) * 14 + 8;

  // Damaged zones
  page.drawRectangle({ x: margin, y: y - 14, width: width - margin * 2, height: 14, color: rgb(0.94, 0.93, 0.91) });
  drawText(page, L.s5, margin + 4, y - 9, bold, 7.5, C.boom, rtlFonts);
  y -= 18;
  const zonesA = (A?.damagedZones ?? []).join(', ') || '-';
  const zonesB = (B?.damagedZones ?? []).join(', ') || '-';
  drawRect(page, margin, y - 22, colW, 26, C.white, C.border);
  drawText(page, L.vehicleA, margin + 4, y - 8, normal, 6, C.mid, rtlFonts);
  drawText(page, zonesA, margin + 4, y - 18, bold, 8, C.black, rtlFonts);
  drawRect(page, margin + colW + 8, y - 22, colW, 26, C.white, C.border);
  drawText(page, L.vehicleB, margin + colW + 12, y - 8, normal, 6, C.mid, rtlFonts);
  drawText(page, zonesB, margin + colW + 12, y - 18, bold, 8, C.black, rtlFonts);
  y -= 30;

  // Witnesses
  if (acc.witnesses) {
    page.drawRectangle({ x: margin, y: y - 14, width: width - margin * 2, height: 14, color: rgb(0.94, 0.93, 0.91) });
    drawText(page, L.witnesses, margin + 4, y - 9, bold, 7.5, C.boom, rtlFonts);
    y -= 18;
    drawRect(page, margin, y - 26, width - margin * 2, 30, C.white, C.border);
    const wWords = acc.witnesses.split(' ');
    let wLine = '';
    let wY = y - 10;
    for (const word of wWords) {
      const test = wLine ? `${wLine} ${word}` : word;
      const mFont = measureFont(test, normal);
      if (mFont.widthOfTextAtSize(sanitizeForWinAnsi(test), 8) > width - margin * 2 - 12) {
        drawText(page, wLine, margin + 4, wY, normal, 8, C.black, rtlFonts);
        wLine = word; wY -= 10;
      } else { wLine = test; }
    }
    if (wLine) drawText(page, wLine, margin + 4, wY, normal, 8, C.black, rtlFonts);
    y -= 34;
  }

  // Third party damage
  if (acc.thirdPartyDamage !== undefined) {
    drawRect(page, margin, y - 22, width - margin * 2, 26, C.white, C.border);
    drawText(page, L.thirdParty, margin + 4, y - 8, normal, 6, C.mid, rtlFonts);
    drawText(page, acc.thirdPartyDamage ? L.thirdPartyYes : L.no, margin + 4, y - 18, bold, 9, C.black, rtlFonts);
    y -= 30;
  }

  // Fault declaration
  if (acc.faultDeclaration) {
    const faultMap: Record<string, string> = {
      A: L.fault_A, B: L.fault_B, shared: L.fault_shared, unknown: L.fault_unknown,
    };
    drawRect(page, margin, y - 22, width - margin * 2, 26, C.white, C.border);
    drawText(page, L.s6, margin + 4, y - 8, bold, 7, C.boom, rtlFonts);
    drawText(page, faultMap[acc.faultDeclaration] ?? '-', margin + 4, y - 18, bold, 9, C.black, rtlFonts);
    y -= 30;
  }

  // Description
  if (acc.description) {
    drawRect(page, margin, y - 36, width - margin * 2, 40, C.white, C.border);
    drawText(page, L.s7, margin + 4, y - 8, bold, 7, C.boom, rtlFonts);
    const words = acc.description.split(' ');
    let line = '';
    let lineY = y - 18;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      const mFont = measureFont(test, normal);
      if (mFont.widthOfTextAtSize(sanitizeForWinAnsi(test), 8) > width - margin * 2 - 12) {
        drawText(page, line, margin + 4, lineY, normal, 8, C.black, rtlFonts);
        line = word; lineY -= 11;
      } else { line = test; }
    }
    if (line) drawText(page, line, margin + 4, lineY, normal, 8, C.black, rtlFonts);
    y -= 44;
  }

  ctx.y = y;
}

// ── Sub-function: Signatures ────────────────────────────────
async function buildSignatureSection(ctx: PdfContext): Promise<void> {
  const { doc, page, bold, normal, rtlFonts, A, B, L, margin, colW, isUnilateral, partyBStatus } = ctx;
  let y = ctx.y;

  y -= 6;
  page.drawRectangle({ x: margin, y: y - 14, width: ctx.width - margin * 2, height: 14, color: rgb(0.94, 0.93, 0.91) });
  drawText(page, L.s8, margin + 4, y - 9, bold, 7.5, C.boom, rtlFonts);
  y -= 18;

  const sigH = 60;

  drawRect(page, margin, y - sigH, colW, sigH + 20, C.white, C.border);
  drawText(page, L.sigA, margin + 4, y - 8, normal, 6.5, C.mid, rtlFonts);

  if (isUnilateral && partyBStatus) {
    page.drawRectangle({
      x: margin + colW + 8, y: y - sigH, width: colW, height: sigH + 20,
      color: rgb(0.18, 0.12, 0.0), borderColor: rgb(0.6, 0.4, 0.0), borderWidth: 1,
    });
    drawText(page, 'Partie B — Non signataire', margin + colW + 12, y - 8, normal, 6.5, rgb(0.75, 0.55, 0.1), rtlFonts);
    drawText(page, partyBStatus.reasonLabel, margin + colW + 12, y - 22, bold, 8, rgb(0.95, 0.72, 0.1), rtlFonts);
    if (partyBStatus.plateNumber) {
      drawText(page, `Plaque : ${partyBStatus.plateNumber}`, margin + colW + 12, y - 34, normal, 7.5, rgb(0.85, 0.7, 0.4), rtlFonts);
    }
    drawText(page, `Enregistre : ${new Date(partyBStatus.recordedAt).toLocaleString('fr-CH')}`, margin + colW + 12, y - sigH + 4, normal, 6, rgb(0.65, 0.5, 0.2), rtlFonts);
  } else {
    drawRect(page, margin + colW + 8, y - sigH, colW, sigH + 20, C.white, C.border);
    drawText(page, L.sigB, margin + colW + 12, y - 8, normal, 6.5, C.mid, rtlFonts);
  }

  // Embed signatures
  const sigPairs: [typeof A | undefined, number][] = [[A, margin]];
  if (!isUnilateral) sigPairs.push([B, margin + colW + 8]);
  for (const [participant, xOff] of sigPairs) {
    if (participant?.signature) {
      try {
        const sigBytes = Buffer.from(participant.signature, 'base64');
        const sigImg = await doc.embedPng(sigBytes);
        const sigDims = sigImg.scale(Math.min(1, (colW - 10) / sigImg.width, (sigH - 6) / sigImg.height));
        page.drawImage(sigImg, { x: xOff + 4, y: y - sigH + 2, width: sigDims.width, height: sigDims.height });
      } catch (e) { logger.warn('[PDF] Signature embed failed', { error: String(e) }); }
    }
  }

  const signedAtA = A?.signedAt ? new Date(A.signedAt).toLocaleString('fr-CH') : '-';
  const signedAtB = B?.signedAt ? new Date(B.signedAt).toLocaleString('fr-CH') : '-';
  drawText(page, `${L.signedAt} : ${signedAtA}`, margin + 4, y - sigH + 4, normal, 7, C.mid, rtlFonts);
  if (!isUnilateral) {
    drawText(page, `${L.signedAt} : ${signedAtB}`, margin + colW + 12, y - sigH + 4, normal, 7, C.mid, rtlFonts);
  }

  ctx.y = y - sigH - 28;
}

// ── Sub-function: Sketch page ───────────────────────────────
async function buildSketchSection(ctx: PdfContext): Promise<void> {
  const { doc, session, A, B, L, acc, margin, mono, bold, normal, rtlFonts } = ctx;

  let finalSketchBase64 = acc.sketchImage || null;
  try {
    const hasParticipants = A && B;
    if (hasParticipants) {
      const circA = A.circumstances || [];
      const circB = B.circumstances || [];
      const allCirc = [...circA, ...circB];

      const scenario = allCirc.some(c => ['c6','c7'].includes(c)) ? 'roundabout'
        : allCirc.some(c => ['c13'].includes(c)) ? 'parking_reverse'
        : allCirc.some(c => ['c4','c5'].includes(c)) ? 'parking_forward'
        : allCirc.some(c => ['c7','c8','c9','c10'].includes(c)) ? 'straight_rear'
        : allCirc.some(c => ['c14'].includes(c)) ? 'straight_head'
        : 'intersection_cross';

      const trafficSide = ['AU','GB','JP','IN','ZA','NZ','IE','MT','CY','TH','MY','ID','SG','HK','MO','KE','TZ','UG','ZW','ZM'].includes(acc.location?.country || '') ? 'left' : 'right';
      const dirA = circA.includes('c12') ? 'west' : 'east';
      const dirB = 'west';

      logger.info('[pdf] Rendu sketch Puppeteer...');
      const puppeteerPng = await renderSketch({
        scenario, trafficSide,
        vehicleAType: (A.vehicle?.vehicleType || 'car') as string,
        vehicleAColor: A.vehicle?.color || 'bleu',
        vehicleADirection: dirA,
        vehicleAImpactZone: (A.damagedZones?.[0] || 'front').replace('-','_'),
        vehicleAMoving: true, vehicleAReversing: circA.includes('c13'),
        vehicleABrand: A.vehicle?.brand, vehicleAModel: A.vehicle?.model, vehicleAPlate: A.vehicle?.licensePlate,
        vehicleBType: (B.vehicle?.vehicleType || 'car') as string,
        vehicleBColor: B.vehicle?.color || 'rouge',
        vehicleBDirection: dirB,
        vehicleBImpactZone: (B.damagedZones?.[0] || 'rear').replace('-','_'),
        vehicleBMoving: true, vehicleBReversing: circB.includes('c13'),
        vehicleBBrand: B.vehicle?.brand, vehicleBModel: B.vehicle?.model, vehicleBPlate: B.vehicle?.licensePlate,
        // Voie B — véhicules additionnels présents (C/D/E) représentés dans la scène
        extraVehicles: (['C','D','E'] as const).flatMap((r) => {
          const p: any = (session as any)[`participant${r}`];
          const has = p && (p.vehicle?.licensePlate || p.vehicle?.brand || p.vehicle?.vehicleType || p.driver?.lastName);
          if (!has) return [];
          return [{
            label: `${r} · ${[p.vehicle?.brand, p.vehicle?.model].filter(Boolean).join(' ') || ('Véhicule ' + r)}`,
            type: (p.vehicle?.vehicleType || 'car') as string,
            color: p.vehicle?.color || 'gris',
            plate: p.vehicle?.licensePlate || '',
          }];
        }),
        mapImageBase64: await (async () => {
          const loc = acc.location as any;
          const lat = loc?.lat || loc?.latitude;
          const lng = loc?.lng || loc?.longitude || loc?.lon;
          if (lat && lng) {
            const vehicleAPos = (acc as any).vehicleAPos;
            const vehicleBPos = (B as any)?.vehicle?.mapPosition ?? null;
            const markers: import('./osm-map.service.js').VehicleMarker[] = [];
            if (vehicleAPos?.lat && vehicleAPos?.lng) {
              markers.push({ lat: vehicleAPos.lat, lng: vehicleAPos.lng, angle: vehicleAPos.angle || 0, label: 'A', color: '#1a44cc', vehicleType: A?.vehicle?.vehicleType as string });
            }
            if (vehicleBPos?.lat && vehicleBPos?.lng) {
              markers.push({ lat: vehicleBPos.lat, lng: vehicleBPos.lng, angle: vehicleBPos.angle || 0, label: 'B', color: '#cc3300', vehicleType: (B as any)?.vehicle?.vehicleType as string });
            }
            if (markers.length > 0) {
              try {
                const centerLat = markers.length >= 2 ? (markers[0].lat + markers[1].lat) / 2 : markers[0].lat;
                const centerLng = markers.length >= 2 ? (markers[0].lng + markers[1].lng) / 2 : markers[0].lng;
                return await fetchAccidentMapWithVehicles(centerLat, centerLng, markers);
              } catch (e) { logger.warn('[PDF] Map with vehicles failed', { error: String(e) }); }
            }
          }
          if (acc.sketchImage && acc.sketchImage.length > 1000) {
            return acc.sketchImage.replace(/^data:image\/[^;]+;base64,/, '');
          }
          if (lat && lng) {
            try {
              logger.info(`[pdf] Fetch carte OSM: ${lat},${lng}`);
              return await fetchAccidentMap(lat, lng, 900, 650, 18);
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : String(e);
              logger.warn('[pdf] OSM fetch failed:', msg as any);
            }
          }
          const addr = [loc?.address, loc?.city, loc?.country].filter(Boolean).join(', ');
          if (addr) {
            try {
              logger.info(`[pdf] Géocodage: ${addr}`);
              const coords = await geocodeAddress(addr);
              if (coords) return await fetchAccidentMap(coords.lat, coords.lng, 900, 650, 18);
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : String(e);
              logger.warn('[pdf] Geocode/OSM failed:', msg as any);
            }
          }
          return undefined;
        })(),
        width: 900, height: 650,
      });
      finalSketchBase64 = puppeteerPng;
      logger.info('[pdf] ✅ Sketch Puppeteer rendu');
    }
  } catch (sketchErr: unknown) {
    const msg = sketchErr instanceof Error ? sketchErr.message : String(sketchErr);
    logger.warn('[pdf] Sketch Puppeteer fallback:', msg as any);
  }

  if (finalSketchBase64) {
    try {
      const sketchPage = doc.addPage([595, 842]);
      sketchPage.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(1, 1, 1) });
      drawText(sketchPage, L.sketchTitle, margin, 820, bold, 10, C.boom, rtlFonts);
      drawText(sketchPage, `Position des véhicules A & B  ·  Session: ${session.id}`, margin, 808, mono, 7, C.mid, rtlFonts);
      drawText(sketchPage, '© OpenStreetMap contributors  |  IA BOOM.CONTACT', margin, 798, mono, 6, C.light, rtlFonts);
      const sketchBytes = Buffer.from(finalSketchBase64, 'base64');
      const isJpeg = sketchBytes[0] === 0xFF && sketchBytes[1] === 0xD8;
      const sketchImg = isJpeg ? await doc.embedJpg(sketchBytes) : await doc.embedPng(sketchBytes);
      const maxW = 595 - margin * 2;
      const maxH = 700;
      const scale = Math.min(maxW / sketchImg.width, maxH / sketchImg.height, 1);
      const sketchY = 820 - 10 - sketchImg.height * scale;
      sketchPage.drawImage(sketchImg, {
        x: margin, y: sketchY,
        width: sketchImg.width * scale, height: sketchImg.height * scale,
      });

      // ── Légende véhicules sous le croquis ────────────────
      const legendY = sketchY - 16;
      const participants = [
        { role: 'A', color: rgb(0.07, 0.27, 0.8), data: A },
        { role: 'B', color: rgb(0.8, 0.2, 0.0), data: B },
      ];

      let ly = legendY;
      for (const p of participants) {
        if (!p.data) continue;
        const v = p.data.vehicle;
        const d = p.data.driver;
        const vehicleDesc = [v?.brand, v?.model].filter(Boolean).join(' ') || `Véhicule ${p.role}`;
        const colorName = v?.color || '';
        const plate = v?.licensePlate || '';
        const driverName = [d?.firstName, d?.lastName].filter(Boolean).join(' ') || '';
        const vehicleType = v?.vehicleType || 'car';

        // Carré couleur
        const COLORS_MAP: Record<string, [number,number,number]> = {
          'Blanc': [0.95,0.95,0.94], 'Argent': [0.77,0.77,0.77], 'Gris': [0.53,0.53,0.53],
          'Noir': [0.1,0.09,0.09], 'Rouge': [0.8,0.07,0], 'Rouge vif': [0.93,0.13,0],
          'Bordeaux': [0.48,0.08,0.19], 'Bleu': [0.13,0.4,0.8], 'Bleu marine': [0.04,0.07,0.18],
          'Bleu foncé': [0.07,0.27,0.67], 'Vert': [0.1,0.4,0.13], 'Vert foncé': [0.07,0.27,0.07],
          'Jaune': [0.87,0.67,0], 'Orange': [0.87,0.4,0], 'Marron': [0.42,0.23,0.13],
          'Beige': [0.8,0.67,0.53], 'Blanc perle': [0.93,0.92,0.89], 'Gris anthracite': [0.24,0.24,0.24],
        };
        const cc = COLORS_MAP[colorName] || [0.5,0.5,0.5];

        // Carré couleur véhicule
        sketchPage.drawRectangle({ x: margin, y: ly - 3, width: 10, height: 10, color: rgb(cc[0], cc[1], cc[2]), borderColor: rgb(0.6,0.6,0.6), borderWidth: 0.5 });
        // Rôle (A/B) en gras coloré
        drawText(sketchPage, p.role, margin + 14, ly + 5, bold, 9, p.color, rtlFonts);
        // Description véhicule
        const desc = `${vehicleDesc}${colorName ? ` (${colorName})` : ''}${plate ? `  ·  ${plate}` : ''}${driverName ? `  —  ${driverName}` : ''}`;
        drawText(sketchPage, desc, margin + 26, ly + 5, normal, 8, C.dark, rtlFonts);
        ly -= 14;
      }

      drawText(sketchPage, L.footer, margin, 18, normal, 7, C.mid, rtlFonts);
    } catch (e) { logger.warn('[PDF] Sketch embed failed', { error: String(e) }); }
  }
}

// ── Sub-function: Photos page ───────────────────────────────
async function buildPhotosSection(ctx: PdfContext): Promise<void> {
  const { doc, session, acc, L, margin, bold, mono, normal, rtlFonts } = ctx;

  if (!acc.photos || acc.photos.length === 0) return;
  try {
    let photoPage = doc.addPage([595, 842]);
    photoPage.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(1, 1, 1) });
    drawText(photoPage, L.photosTitle, margin, 820, bold, 10, C.boom, rtlFonts);
    drawText(photoPage, `${acc.photos.length} photo(s) - Session: ${session.id}`, margin, 808, mono, 7, C.mid, rtlFonts);

    const cols = 2;
    const photoW = (595 - margin * 2 - 10) / cols;
    const photoH = 180;
    let px = margin;
    let py = 795;
    let pageIndex = 1;

    const newPhotoPage = () => {
      const p = doc.addPage([595, 842]);
      p.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(1, 1, 1) });
      pageIndex++;
      drawText(p, `${L.photosTitle} (${pageIndex})`, margin, 820, bold, 10, C.boom, rtlFonts);
      drawText(p, `Session: ${session.id}`, margin, 808, mono, 7, C.mid, rtlFonts);
      drawText(p, L.footer, margin, 18, normal, 7, C.mid, rtlFonts);
      return p;
    };

    for (let i = 0; i < acc.photos.length; i++) {
      // M8 — saut de page si la ligne suivante déborde (libellé + marge inclus)
      if (i % cols === 0 && py - photoH - 30 < 40) {
        photoPage = newPhotoPage();
        px = margin;
        py = 795;
      }
      const photo = acc.photos[i];
      try {
        const imgBytes = Buffer.from(photo.base64, 'base64');
        let img;
        try { img = await doc.embedJpg(imgBytes); }
        catch { img = await doc.embedPng(imgBytes); } // fallback PNG (capture d'écran, etc.)
        const scale = Math.min(photoW / img.width, photoH / img.height, 1);
        const iw = img.width * scale;
        const ih = img.height * scale;
        photoPage.drawImage(img, { x: px + (photoW - iw) / 2, y: py - photoH + (photoH - ih), width: iw, height: ih });
        const catLabel = photo.category.toUpperCase();
        drawText(photoPage, catLabel, px + 2, py - photoH - 8, bold, 7, C.boom, rtlFonts);
        if (photo.caption) drawText(photoPage, photo.caption, px + 2, py - photoH - 18, normal, 7, C.black, rtlFonts);
        photoPage.drawRectangle({ x: px, y: py - photoH, width: photoW, height: photoH, borderColor: rgb(0.85, 0.85, 0.85), borderWidth: 0.5, color: undefined as any });
      } catch (e) { logger.warn('[PDF] Photo embed failed', { index: i, error: String(e) }); }

      if (i % cols === cols - 1) { px = margin; py -= photoH + 30; }
      else { px += photoW + 10; }
    }
    drawText(photoPage, L.footer, margin, 18, normal, 7, C.mid, rtlFonts);
  } catch (e) { logger.warn('[PDF] Photos page failed', { error: String(e) }); }
}

// ── Sub-function: Footer ────────────────────────────────────
function buildFooter(ctx: PdfContext): void {
  const { page, normal, mono, rtlFonts, session, margin, width, isUnilateral } = ctx;

  drawLine(page, margin, 56, width - margin, 56, C.border);
  const footerLine1 = isUnilateral
    ? 'boom.contact - Declaration unilaterale de sinistre - Dossier numerique horodate'
    : 'boom.contact - Constat amiable numerique - www.boom.contact';
  drawText(page, footerLine1, margin, 46, normal, 7, C.mid, rtlFonts);
  drawText(page, `Session ID: ${session.id} - Genere le ${new Date().toLocaleString('fr-CH')} - PEP's Swiss SA - CHE-476.484.632`,
    margin, 36, mono, 6.5, C.mid, rtlFonts);
  const footerLine3 = isUnilateral
    ? `boom.contact by PEP's Swiss SA · Declaration unilaterale · Horodatage cryptographique`
    : `boom.contact by PEP's Swiss SA · Dossier numerique horodate`;
  drawText(page, footerLine3, margin, 26, normal, 6.5, C.mid, rtlFonts);
  // Blockchain timestamping badge
  drawText(page, 'Horodatage cryptographique SHA-256 -- OpenTimestamps (ancrage Bitcoin)',
    margin, 16, mono, 5.5, C.green, rtlFonts);
  page.drawRectangle({ x: width - 40, y: 0, width: 40, height: 10, color: C.boom });
}

// ── Sub-function: Additional participants (C / D / E) ───────
// Voie B — page annexe single-column pour les véhicules 3+ (C/D/E).
// 100% additif : ne touche PAS au rendu A/B (constat principal inchangé).
async function buildAdditionalParticipantsSection(ctx: PdfContext): Promise<void> {
  const { doc, bold, normal, rtlFonts, L, session } = ctx;
  const extras: { role: string; p: any }[] = [];
  for (const role of ['C', 'D', 'E'] as const) {
    const p = (session as any)[`participant${role}`];
    const hasData = p && (p.driver?.firstName || p.driver?.lastName || p.vehicle?.licensePlate ||
      (p.vehicle as any)?.plate || p.vehicle?.brand || p.signature || (p.isPedestrian === true));
    if (hasData) extras.push({ role, p });
  }
  if (extras.length === 0) return; // aucun C/D/E → page annexe non créée

  const W = 595, H = 842, margin = 28;
  let page = doc.addPage([W, H]);
  page.drawRectangle({ x: 0, y: H - 52, width: W, height: 52, color: C.boom });
  drawText(page, 'boom.contact', margin, H - 20, bold, 20, C.white, rtlFonts);
  drawText(page, 'Participants additionnels — Additional parties', margin, H - 38, normal, 9, C.white, rtlFonts);
  let y = H - 72;

  for (const { role, p } of extras) {
    if (y < 180) { page = doc.addPage([W, H]); y = H - 48; }

    page.drawRectangle({ x: margin, y: y - 22, width: W - margin * 2, height: 22, color: C.black });
    drawText(page, `${L.vehicleA?.replace(/A$/, '').trim() || 'VEHICULE'} ${role}`, margin + 6, y - 8, bold, 9, C.white, rtlFonts);
    drawText(page, `${p.isPedestrian ? 'Pieton / Pedestrian' : (L.driver || 'Conducteur')} : ${p?.driver?.firstName ?? ''} ${p?.driver?.lastName ?? ''}`.trim(),
      margin + 6, y - 18, normal, 7, C.light, rtlFonts);
    y -= 30;

    const fullW = W - margin * 2;
    const half = (fullW - 8) / 2;
    labelValue(page, L.plate || 'PLAQUE', p?.vehicle?.licensePlate ?? (p?.vehicle as any)?.plate ?? '', margin, y, half, normal, bold, rtlFonts);
    labelValue(page, L.brand || 'MARQUE / MODELE', `${p?.vehicle?.brand ?? ''} ${p?.vehicle?.model ?? ''}`.trim(), margin + half + 8, y, half, normal, bold, rtlFonts);
    y -= 26;
    labelValue(page, L.name || 'NOM', `${p?.driver?.firstName ?? ''} ${p?.driver?.lastName ?? ''}`.trim(), margin, y, half, normal, bold, rtlFonts);
    labelValue(page, 'TEL', p?.driver?.phone ?? '', margin + half + 8, y, half, normal, bold, rtlFonts);
    y -= 26;
    labelValue(page, L.address || 'ADRESSE', `${p?.driver?.address ?? ''} ${p?.driver?.city ?? ''}`.trim(), margin, y, fullW, normal, bold, rtlFonts);
    y -= 26;
    labelValue(page, L.insurer || 'ASSUREUR', p?.insurance?.company ?? '', margin, y, half, normal, bold, rtlFonts);
    labelValue(page, 'N° DE POLICE', p?.insurance?.policyNumber ?? '', margin + half + 8, y, half, normal, bold, rtlFonts);
    y -= 28;

    const circ = Array.isArray(p?.circumstances) ? p.circumstances.filter(Boolean) : [];
    if (circ.length) {
      drawText(page, L.s4 || 'Circonstances', margin + 2, y - 4, bold, 7.5, C.boom, rtlFonts);
      y -= 14;
      for (const c of circ.slice(0, 12)) {
        drawText(page, `• ${String(c)}`, margin + 6, y, normal, 7.5, C.black, rtlFonts);
        y -= 12;
      }
      y -= 4;
    }

    // Signature du participant
    const sigH = 56;
    drawRect(page, margin, y - sigH, fullW, sigH + 18, C.white, C.border);
    drawText(page, `${L.signedAt || 'Signe le'} : ${p?.signedAt ? new Date(p.signedAt).toLocaleString('fr-CH') : '-'}`,
      margin + 4, y - 8, normal, 6.5, C.mid, rtlFonts);
    if (p?.signature) {
      try {
        const sigBytes = Buffer.from(p.signature, 'base64');
        const sigImg = await doc.embedPng(sigBytes);
        const sigDims = sigImg.scale(Math.min(1, (fullW - 20) / sigImg.width, (sigH - 6) / sigImg.height));
        page.drawImage(sigImg, { x: margin + 8, y: y - sigH + 2, width: sigDims.width, height: sigDims.height });
      } catch (e) { logger.warn('[PDF] Signature C/D/E embed failed', { role, error: String(e) }); }
    }
    y -= sigH + 34;
  }
}

// ─────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────
export async function generateConstatPDF(
  session: ConstatSession,
  forRole: 'A' | 'B' | 'C' | 'D' | 'E' = 'A'
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  // Register fontkit to enable custom font embedding (Arabic, Hebrew, etc.)
  doc.registerFontkit(fontkit);

  const acc = session.accident;
  const partyBStatus = (acc as any)?.partyBStatus as PartyBStatus | undefined;
  const isUnilateral = !!partyBStatus;

  const docTitle = isUnilateral
    ? 'Declaration Unilaterale de Sinistre — boom.contact'
    : 'Constat Amiable — boom.contact';
  doc.setTitle(docTitle);
  doc.setAuthor('boom.contact by PEP\'s Swiss SA');
  doc.setSubject(`Constat #${session.id}`);
  doc.setCreator('boom.contact');
  doc.setCreationDate(new Date());

  const page = doc.addPage([595, 842]);
  const { width, height } = page.getSize();

  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const helv     = await doc.embedFont(StandardFonts.Helvetica);
  const mono     = await doc.embedFont(StandardFonts.Courier);

  // ── Embed RTL / Unicode fonts ──────────────────────────────
  // These fonts enable native Arabic and Hebrew text rendering in the PDF.
  // They are loaded lazily and cached in memory after first use.
  const rtlFonts: RtlFonts = {};
  try {
    const arabicBytes = loadFontBytes('NotoSansArabic-Regular.ttf');
    rtlFonts.arabic = await doc.embedFont(arabicBytes, { subset: true });
    logger.info('[PDF] Embedded Noto Sans Arabic font');
  } catch (e) {
    logger.warn('[PDF] Could not embed Arabic font — Arabic text will be transliterated', { error: String(e) });
  }
  try {
    const hebrewBytes = loadFontBytes('NotoSansHebrew-Regular.ttf');
    rtlFonts.hebrew = await doc.embedFont(hebrewBytes, { subset: true });
    logger.info('[PDF] Embedded Noto Sans Hebrew font');
  } catch (e) {
    logger.warn('[PDF] Could not embed Hebrew font — Hebrew text will be transliterated', { error: String(e) });
  }
  try {
    const notoRegularBytes = loadFontBytes('NotoSans-Regular.ttf');
    rtlFonts.notoRegular = await doc.embedFont(notoRegularBytes, { subset: true });
    const notoBoldBytes = loadFontBytes('NotoSans-Bold.ttf');
    rtlFonts.notoBold = await doc.embedFont(notoBoldBytes, { subset: true });
    logger.info('[PDF] Embedded Noto Sans Regular/Bold fonts');
  } catch (e) {
    logger.warn('[PDF] Could not embed Noto Sans fonts', { error: String(e) });
  }

  // Police de base = NotoSans (latin + latin-étendu + cyrillique + grec) ;
  // répare polonais/russe/ukrainien/diacritiques. Helvetica en repli si Noto absent.
  const normal = rtlFonts.notoRegular || helv;
  const bold   = rtlFonts.notoBold   || helvBold;

  const A = session.participantA;
  const B = session.participantB;

  const { langA, langB, langAccident } = determineLangs(A as any, B as any, acc);
  const roleParticipant = (session as any)[`participant${forRole}`];
  const roleLang = (roleParticipant?.language as PdfLang) || undefined;
  const driverLang: PdfLang = forRole === 'A' ? langA : (roleLang || langB);
  const L: PdfLabels = getBilingualLabels(driverLang, langAccident);

  // ── Polices Noto par script présentes dans le constat (données + libellés) ──
  // Embarquées à la demande : un constat fr/de/it/en/ru/pl… n'embarque aucune police lourde.
  rtlFonts.scriptFonts = {};
  try {
    const needed = new Set(scriptsPresent(collectRenderText(session, L)));
    for (const key of needed) {
      const spec = SCRIPT_FONT_FILES[key];
      if (!spec) continue;
      try {
        rtlFonts.scriptFonts[key] = await doc.embedFont(loadFontBytes(spec.file), { subset: spec.subset });
        logger.info(`[PDF] Embedded script font: ${key} (${spec.file})`);
      } catch (e) {
        logger.warn(`[PDF] Could not embed script font ${key}`, { error: String(e) });
      }
    }
  } catch (e) {
    logger.warn('[PDF] script font scan failed', { error: String(e) });
  }

  const margin = 28;
  const colW = (width - margin * 2 - 8) / 2;
  const country = acc.location?.country;
  const formattedDate = formatDateForCountry(acc.date ?? '', country);

  const ctx: PdfContext = {
    doc, page, bold, normal, mono, rtlFonts, session, A, B, L, acc, margin, colW,
    width, height, isUnilateral, partyBStatus, formattedDate,
    y: height - margin,
  };

  // ── Build PDF sections ─────────────────────────────────────
  buildHeader(ctx);
  await buildUnilateralBanner(ctx);
  buildPartySection(ctx);
  buildDetailsSection(ctx);
  await buildSignatureSection(ctx);
  await buildSketchSection(ctx);
  await buildPhotosSection(ctx);
  await buildAdditionalParticipantsSection(ctx);
  buildFooter(ctx);

  return doc.save();
}

