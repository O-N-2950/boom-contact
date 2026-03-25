import { renderSketch } from './sketch-renderer.service.js';
import { fetchAccidentMap, geocodeAddress } from './osm-map.service.js';
import { logger } from '../logger.js';
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';
import {
  determineLangs, getBilingualLabels, getLabels, countryToLang,
  type PdfLang, type PdfLabels,
} from './pdf.labels.js';
import type { ConstatSession } from '../../../shared/types';

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
function sanitize(text: string): string {
  // WinAnsi charset: replace chars outside latin-1 range with ASCII equivalents
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

function drawText(
  page: PDFPage, text: string, x: number, y: number,
  font: PDFFont, size: number, color = C.black
) {
  if (!text) return;
  try {
    page.drawText(sanitize(text), { x, y, font, size, color });
  } catch {
    // Fallback: strip everything non-ASCII
    const safe = text.replace(/[^\x20-\x7E]/g, '?');
    if (safe.trim()) page.drawText(safe, { x, y, font, size, color });
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
  labelFont: PDFFont, valueFont: PDFFont
) {
  drawRect(page, x, y - 18, w, 22, C.white, C.border, 0.5);
  drawText(page, label, x + 4, y - 13, labelFont, 6, C.mid);
  drawText(page, value || '-', x + 4, y - 22, valueFont, 9, C.black);
}

// ─────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────
// Génère le PDF pour un conducteur spécifique
// role 'A' → PDF dans la langue du conducteur A + langue du pays accident si différente
// role 'B' → PDF dans la langue du conducteur B + langue du pays accident si différente
export async function generateConstatPDF(
  session: ConstatSession,
  forRole: 'A' | 'B' = 'A'
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  // ── Détection mode unilatéral ────────────────────────────
  const acc = session.accident;
  const partyBStatus = (acc as any)?.partyBStatus as {
    reason: string; reasonLabel: string;
    plateNumber?: string; platePhoto?: string;
    vehicleDescription?: string; policeReportRef?: string;
    notes?: string; recordedAt: string;
  } | undefined;
  const isUnilateral = !!partyBStatus;

  const docTitle = isUnilateral
    ? 'Declaration Unilaterale de Sinistre — boom.contact'
    : 'Constat Amiable — boom.contact';
  doc.setTitle(docTitle);
  doc.setAuthor('boom.contact by PEP\'s Swiss SA');
  doc.setSubject(`Constat #${session.id}`);
  doc.setCreator('boom.contact');
  doc.setCreationDate(new Date());

  const page = doc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();

  const bold   = await doc.embedFont(StandardFonts.HelveticaBold);
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const mono   = await doc.embedFont(StandardFonts.Courier);

  const A = session.participantA;
  const B = session.participantB;

  // ── Détermination des langues ───────────────────────────────
  const { langA, langB, langAccident } = determineLangs(A, B, acc);
  const driverLang: PdfLang = forRole === 'A' ? langA : langB;
  const L: PdfLabels = getBilingualLabels(driverLang, langAccident);

  const margin = 28;
  const colW = (width - margin * 2 - 8) / 2;

  let y = height - margin;

  // ── HEADER ─────────────────────────────────────────────────
  // Bande header — rouge standard ou orange ambre si unilatéral
  const headerColor = isUnilateral ? rgb(0.6, 0.35, 0.0) : C.boom;
  page.drawRectangle({ x: 0, y: height - 52, width, height: 52, color: headerColor });

  // Logo / title
  drawText(page, 'boom.contact', margin, height - 20, bold, 20, C.white);
  const pdfTitle = isUnilateral ? 'Declaration Unilaterale de Sinistre' : L.title;
  const pdfSubtitle = isUnilateral
    ? 'Document valable aupres des assurances — Convention Europeenne 46 pays'
    : L.subtitle;
  drawText(page, pdfTitle, margin, height - 34, normal, 9, rgb(1, 0.9, 0.7));
  drawText(page, pdfSubtitle, margin, height - 44, normal, 6.5, rgb(1, 0.85, 0.6));

  // Session info top right
  const sessionText = `Session: ${session.id}`;
  const sessionW = mono.widthOfTextAtSize(sessionText, 7);
  drawText(page, sessionText, width - margin - sessionW, height - 18, mono, 7, C.white);
  const country = acc.location?.country;
  const formattedDate = formatDateForCountry(acc.date ?? '', country);
  const dateStr = acc.date && acc.time ? `${formattedDate} ${acc.time}` : new Date(session.createdAt).toLocaleString('fr-CH');
  const dateW = normal.widthOfTextAtSize(dateStr, 7);
  drawText(page, dateStr, width - margin - dateW, height - 30, normal, 7, rgb(1, 0.85, 0.8));

  y = height - 64;

  // ── BANNIÈRE DÉCLARATION UNILATÉRALE ───────────────────────
  if (isUnilateral && partyBStatus) {
    // Fond ambre
    page.drawRectangle({
      x: margin, y: y - 62, width: width - margin * 2, height: 62,
      color: rgb(0.18, 0.12, 0.0),
      borderColor: rgb(0.6, 0.4, 0.0),
      borderWidth: 1,
    });

    drawText(page, 'DECLARATION UNILATERALE DE SINISTRE', margin + 8, y - 12, bold, 9, rgb(0.95, 0.72, 0.1));
    drawText(page,
      `Raison : ${partyBStatus.reasonLabel}  |  Enregistre le : ${new Date(partyBStatus.recordedAt).toLocaleString('fr-CH')}`,
      margin + 8, y - 24, normal, 7.5, rgb(0.9, 0.75, 0.4)
    );

    if (partyBStatus.plateNumber) {
      drawText(page, `Plaque partie B : ${partyBStatus.plateNumber}`, margin + 8, y - 36, bold, 8, rgb(0.95, 0.72, 0.1));
    }
    if (partyBStatus.vehicleDescription) {
      drawText(page, `Vehicule B : ${partyBStatus.vehicleDescription}`, margin + 8, y - 46, normal, 7, rgb(0.85, 0.7, 0.4));
    }
    if (partyBStatus.policeReportRef) {
      drawText(page, `Ref. police : ${partyBStatus.policeReportRef}`, margin + 240, y - 36, normal, 7, rgb(0.85, 0.7, 0.4));
    }
    if (partyBStatus.notes) {
      const notesShort = partyBStatus.notes.length > 80 ? partyBStatus.notes.slice(0, 80) + '...' : partyBStatus.notes;
      drawText(page, `Observations : ${notesShort}`, margin + 8, y - 56, normal, 6.5, rgb(0.75, 0.62, 0.35));
    }

    // Embed photo plaque si disponible
    if (partyBStatus.platePhoto) {
      try {
        const plateBytes = Buffer.from(partyBStatus.platePhoto, 'base64');
        let plateImg;
        try { plateImg = await doc.embedJpg(plateBytes); } catch { plateImg = await doc.embedPng(plateBytes); }
        const plateH = 52;
        const plateW = Math.min(90, plateImg.width * plateH / plateImg.height);
        page.drawImage(plateImg, {
          x: width - margin - plateW - 4,
          y: y - 60,
          width: plateW,
          height: plateH,
        });
        page.drawRectangle({
          x: width - margin - plateW - 4, y: y - 60,
          width: plateW, height: plateH,
          borderColor: rgb(0.6, 0.4, 0.0), borderWidth: 0.5,
          color: undefined as any,
        });
      } catch { /* photo embed failed */ }
    }

    y -= 72;
  }

  // ── ACCIDENT SECTION ───────────────────────────────────────
  drawRect(page, margin, y - 38, width - margin * 2, 42, C.section, C.border);
  drawText(page, L.s1, margin + 6, y - 10, bold, 8, C.boom);

  const fieldW = (width - margin * 2 - 16) / 4;

  labelValue(page, L.date, formattedDate, margin + 4, y - 12, fieldW, normal, bold);
  labelValue(page, L.time, acc.time ?? '', margin + 4 + fieldW + 4, y - 12, fieldW, normal, bold);
  labelValue(page, L.country, acc.location?.country ?? '', margin + 4 + (fieldW + 4) * 2, y - 12, fieldW, normal, bold);
  labelValue(page, L.injuries, acc.injuries ? L.yes : L.no, margin + 4 + (fieldW + 4) * 3, y - 12, fieldW, normal, bold);

  y -= 42;

  // Location full width
  drawRect(page, margin, y - 22, width - margin * 2, 26, C.white, C.border);
  drawText(page, L.location, margin + 4, y - 8, normal, 6, C.mid);
  const locationStr = [acc.location?.address, acc.location?.city, acc.location?.country].filter(Boolean).join(', ');
  drawText(page, locationStr || '-', margin + 6, y - 18, bold, 9, C.black);
  y -= 28;

  // ── VEHICLES HEADER ────────────────────────────────────────
  y -= 6;
  // Column A header
  page.drawRectangle({ x: margin, y: y - 22, width: colW, height: 22, color: C.black });
  drawText(page, L.vehicleA, margin + 6, y - 8, bold, 8, C.white);
  drawText(page, `${L.driver} : ${A?.driver?.firstName ?? ''} ${A?.driver?.lastName ?? ''}`.trim() || '-',
    margin + 6, y - 17, normal, 7, C.light);

  // Column B header
  page.drawRectangle({ x: margin + colW + 8, y: y - 22, width: colW, height: 22, color: C.dark });
  drawText(page, L.vehicleB, margin + colW + 14, y - 8, bold, 8, C.white);
  drawText(page, `${L.driver} : ${B?.driver?.firstName ?? ''} ${B?.driver?.lastName ?? ''}`.trim() || '-',
    margin + colW + 14, y - 17, normal, 7, C.light);
  y -= 28;

  // ── VEHICLE DATA (side by side) ────────────────────────────
  const drawSideBySide = (labelA: string, valA: string, labelB: string, valB: string, rowH = 26) => {
    labelValue(page, labelA, valA, margin, y, colW, normal, bold);
    labelValue(page, labelB, valB, margin + colW + 8, y, colW, normal, bold);
    y -= rowH;
  };

  drawSideBySide(
    L.plate, A?.vehicle?.licensePlate ?? '',
    L.plate, B?.vehicle?.licensePlate ?? ''
  );
  drawSideBySide(
    L.brand, `${A?.vehicle?.brand ?? ''} ${A?.vehicle?.model ?? ''}`.trim(),
    L.brand, `${B?.vehicle?.brand ?? ''} ${B?.vehicle?.model ?? ''}`.trim()
  );
  drawSideBySide(
    'YEAR / COLOUR / JAHR / ANNO', `${A?.vehicle?.year ?? ''} ${A?.vehicle?.color ?? ''}`.trim(),
    'YEAR / COLOUR / JAHR / ANNO', `${B?.vehicle?.year ?? ''} ${B?.vehicle?.color ?? ''}`.trim()
  );

  y -= 4;

  // ── DRIVER DATA ────────────────────────────────────────────
  page.drawRectangle({ x: margin, y: y - 14, width: width - margin * 2, height: 14, color: rgb(0.94, 0.93, 0.91) });
  drawText(page, L.s2, margin + 4, y - 9, bold, 7.5, C.boom);
  y -= 18;

  drawSideBySide(
    L.name, `${A?.driver?.firstName ?? ''} ${A?.driver?.lastName ?? ''}`.trim(),
    L.name, `${B?.driver?.firstName ?? ''} ${B?.driver?.lastName ?? ''}`.trim()
  );
  drawSideBySide(
    L.address, `${A?.driver?.address ?? ''} ${A?.driver?.city ?? ''}`.trim(),
    L.address, `${B?.driver?.address ?? ''} ${B?.driver?.city ?? ''}`.trim()
  );
  drawSideBySide(
    'TEL', A?.driver?.phone ?? '',
    'TEL', B?.driver?.phone ?? ''
  );
  drawSideBySide(
    'N° PERMIS DE CONDUIRE', A?.driver?.licenseNumber ?? '',
    'N° PERMIS DE CONDUIRE', B?.driver?.licenseNumber ?? ''
  );

  y -= 4;

  // ── INSURANCE DATA ─────────────────────────────────────────
  page.drawRectangle({ x: margin, y: y - 14, width: width - margin * 2, height: 14, color: rgb(0.94, 0.93, 0.91) });
  drawText(page, L.s3, margin + 4, y - 9, bold, 7.5, C.boom);
  y -= 18;

  drawSideBySide(
    L.insurer, A?.insurance?.company ?? '',
    L.insurer, B?.insurance?.company ?? ''
  );
  drawSideBySide(
    'N° DE POLICE', A?.insurance?.policyNumber ?? '',
    'N° DE POLICE', B?.insurance?.policyNumber ?? ''
  );
  drawSideBySide(
    'N° CARTE VERTE', A?.insurance?.greenCardNumber ?? '',
    'N° CARTE VERTE', B?.insurance?.greenCardNumber ?? ''
  );

  y -= 4;

  // ── CIRCUMSTANCES ──────────────────────────────────────────
  page.drawRectangle({ x: margin, y: y - 14, width: width - margin * 2, height: 14, color: rgb(0.94, 0.93, 0.91) });
  drawText(page, L.s4, margin + 4, y - 9, bold, 7.5, C.boom);
  y -= 18;

  const circA = A?.circumstances ?? [];
  const circB = B?.circumstances ?? [];
  const allCirc = Array.from(new Set([...circA, ...circB]));

  const circCols = 2;
  const circItems = allCirc.slice(0, 8); // show first 8 in page
  circItems.forEach((id, i) => {
    const col = i % circCols;
    const row = Math.floor(i / circCols);
    const cx = margin + col * ((width - margin * 2) / circCols);
    const cy = y - row * 14;
    const inA = circA.includes(id);
    const inB = circB.includes(id);
    drawText(page, `${inA ? '[A] ' : '   '}${inB ? '[B] ' : '   '}${L.circ[id] ?? id}`, cx + 4, cy - 10, normal, 7, C.black);
  });

  y -= Math.ceil(circItems.length / circCols) * 14 + 8;

  // ── DAMAGED ZONES ─────────────────────────────────────────
  page.drawRectangle({ x: margin, y: y - 14, width: width - margin * 2, height: 14, color: rgb(0.94, 0.93, 0.91) });
  drawText(page, L.s5, margin + 4, y - 9, bold, 7.5, C.boom);
  y -= 18;

  const zonesA = (A?.damagedZones ?? []).join(', ') || '-';
  const zonesB = (B?.damagedZones ?? []).join(', ') || '-';
  drawRect(page, margin, y - 22, colW, 26, C.white, C.border);
  drawText(page, L.vehicleA, margin + 4, y - 8, normal, 6, C.mid);
  drawText(page, zonesA, margin + 4, y - 18, bold, 8, C.black);
  drawRect(page, margin + colW + 8, y - 22, colW, 26, C.white, C.border);
  drawText(page, L.vehicleB, margin + colW + 12, y - 8, normal, 6, C.mid);
  drawText(page, zonesB, margin + colW + 12, y - 18, bold, 8, C.black);
  y -= 30;

  // ── WITNESSES ─────────────────────────────────────────────
  if (acc.witnesses) {
    page.drawRectangle({ x: margin, y: y - 14, width: width - margin * 2, height: 14, color: rgb(0.94, 0.93, 0.91) });
    drawText(page, L.witnesses, margin + 4, y - 9, bold, 7.5, C.boom);
    y -= 18;
    drawRect(page, margin, y - 26, width - margin * 2, 30, C.white, C.border);
    const wWords = acc.witnesses.split(' ');
    let wLine = '';
    let wY = y - 10;
    for (const word of wWords) {
      const test = wLine ? `${wLine} ${word}` : word;
      if (normal.widthOfTextAtSize(test, 8) > width - margin * 2 - 12) {
        drawText(page, wLine, margin + 4, wY, normal, 8, C.black);
        wLine = word; wY -= 10;
      } else { wLine = test; }
    }
    if (wLine) drawText(page, wLine, margin + 4, wY, normal, 8, C.black);
    y -= 34;
  }

  // ── THIRD PARTY DAMAGE ────────────────────────────────────
  if (acc.thirdPartyDamage !== undefined) {
    drawRect(page, margin, y - 22, width - margin * 2, 26, C.white, C.border);
    drawText(page, L.thirdParty, margin + 4, y - 8, normal, 6, C.mid);
    drawText(page, acc.thirdPartyDamage ? L.thirdPartyYes : L.no, margin + 4, y - 18, bold, 9, C.black);
    y -= 30;
  }

  // ── FAULT DECLARATION ──────────────────────────────────────
  if (acc.faultDeclaration) {
    const faultMap: Record<string, string> = {
      A: L.fault_A,
      B: L.fault_B,
      shared: L.fault_shared,
      unknown: L.fault_unknown,
    };
    drawRect(page, margin, y - 22, width - margin * 2, 26, C.white, C.border);
    drawText(page, L.s6, margin + 4, y - 8, bold, 7, C.boom);
    drawText(page, faultMap[acc.faultDeclaration] ?? '-', margin + 4, y - 18, bold, 9, C.black);
    y -= 30;
  }

  // ── DESCRIPTION ────────────────────────────────────────────
  if (acc.description) {
    drawRect(page, margin, y - 36, width - margin * 2, 40, C.white, C.border);
    drawText(page, L.s7, margin + 4, y - 8, bold, 7, C.boom);
    // Wrap text
    const words = acc.description.split(' ');
    let line = '';
    let lineY = y - 18;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (normal.widthOfTextAtSize(test, 8) > width - margin * 2 - 12) {
        drawText(page, line, margin + 4, lineY, normal, 8, C.black);
        line = word;
        lineY -= 11;
      } else {
        line = test;
      }
    }
    if (line) drawText(page, line, margin + 4, lineY, normal, 8, C.black);
    y -= 44;
  }

  // ── SIGNATURES ─────────────────────────────────────────────
  y -= 6;
  page.drawRectangle({ x: margin, y: y - 14, width: width - margin * 2, height: 14, color: rgb(0.94, 0.93, 0.91) });
  drawText(page, L.s8, margin + 4, y - 9, bold, 7.5, C.boom);
  y -= 18;

  const sigH = 60;

  // Colonne A — toujours présente
  drawRect(page, margin, y - sigH, colW, sigH + 20, C.white, C.border);
  drawText(page, L.sigA, margin + 4, y - 8, normal, 6.5, C.mid);

  if (isUnilateral && partyBStatus) {
    // Colonne B — remplacée par encadré "Non signé — raison"
    page.drawRectangle({
      x: margin + colW + 8, y: y - sigH, width: colW, height: sigH + 20,
      color: rgb(0.18, 0.12, 0.0),
      borderColor: rgb(0.6, 0.4, 0.0),
      borderWidth: 1,
    });
    drawText(page, 'Partie B — Non signataire', margin + colW + 12, y - 8, normal, 6.5, rgb(0.75, 0.55, 0.1));
    drawText(page, partyBStatus.reasonLabel, margin + colW + 12, y - 22, bold, 8, rgb(0.95, 0.72, 0.1));
    if (partyBStatus.plateNumber) {
      drawText(page, `Plaque : ${partyBStatus.plateNumber}`, margin + colW + 12, y - 34, normal, 7.5, rgb(0.85, 0.7, 0.4));
    }
    drawText(page,
      `Enregistre : ${new Date(partyBStatus.recordedAt).toLocaleString('fr-CH')}`,
      margin + colW + 12, y - sigH + 4, normal, 6, rgb(0.65, 0.5, 0.2)
    );
  } else {
    // Colonne B normale
    drawRect(page, margin + colW + 8, y - sigH, colW, sigH + 20, C.white, C.border);
    drawText(page, L.sigB, margin + colW + 12, y - 8, normal, 6.5, C.mid);
  }

  // Embed signatures si disponibles
  const sigPairs: [any, number][] = [[A, margin]];
  if (!isUnilateral) sigPairs.push([B, margin + colW + 8]);
  for (const [participant, xOff] of sigPairs) {
    if (participant?.signature) {
      try {
        const sigBytes = Buffer.from(participant.signature, 'base64');
        const sigImg = await doc.embedPng(sigBytes);
        const sigDims = sigImg.scale(Math.min(1, (colW - 10) / sigImg.width, (sigH - 6) / sigImg.height));
        page.drawImage(sigImg, {
          x: xOff + 4,
          y: y - sigH + 2,
          width: sigDims.width,
          height: sigDims.height,
        });
      } catch { /* signature image failed to embed */ }
    }
  }

  // Signed/date fields
  const signedAtA = A?.signedAt ? new Date(A.signedAt).toLocaleString('fr-CH') : '-';
  const signedAtB = B?.signedAt ? new Date(B.signedAt).toLocaleString('fr-CH') : '-';
  drawText(page, `${L.signedAt} : ${signedAtA}`, margin + 4, y - sigH + 4, normal, 7, C.mid);
  if (!isUnilateral) {
    drawText(page, `${L.signedAt} : ${signedAtB}`, margin + colW + 12, y - sigH + 4, normal, 7, C.mid);
  }

  y -= sigH + 28;

  // ── SKETCH (Section 13) — Puppeteer Chrome + sketch-engine ─
  // Générer le rendu Puppeteer si les données de session sont disponibles
  let finalSketchBase64 = acc.sketchImage || null;
  try {
    const hasParticipants = A && B;
    if (hasParticipants) {
      // Déterminer le scénario depuis les circonstances
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

      const dirA = circA.includes('c12') ? 'west' : circA.includes('c11') ? 'east' : 'east';
      const dirB = 'west';

      logger.info('[pdf] Rendu sketch Puppeteer...');
      const puppeteerPng = await renderSketch({
        scenario,
        trafficSide,
        vehicleAType:     (A.vehicle?.vehicleType || 'car') as string,
        vehicleAColor:    A.vehicle?.color || 'bleu',
        vehicleADirection: dirA,
        vehicleAImpactZone: (A.damagedZones?.[0] || 'front').replace('-','_'),
        vehicleAMoving:   true,
        vehicleAReversing: circA.includes('c13'),
        vehicleABrand:    A.vehicle?.brand,
        vehicleAModel:    A.vehicle?.model,
        vehicleAPlate:    A.vehicle?.licensePlate,
        vehicleBType:     (B.vehicle?.vehicleType || 'car') as string,
        vehicleBColor:    B.vehicle?.color || 'rouge',
        vehicleBDirection: dirB,
        vehicleBImpactZone: (B.damagedZones?.[0] || 'rear').replace('-','_'),
        vehicleBMoving:   true,
        vehicleBReversing: circB.includes('c13'),
        vehicleBBrand:    B.vehicle?.brand,
        vehicleBModel:    B.vehicle?.model,
        vehicleBPlate:    B.vehicle?.licensePlate,
        mapImageBase64:   await (async () => {
          // Priorité 1: sketchImage du client (carte OSM déjà capturée)
          if (acc.sketchImage && acc.sketchImage.length > 1000) {
            // Extraire base64 pur si c'est un data URL
            const raw = acc.sketchImage.replace(/^data:image\/[^;]+;base64,/, '');
            return raw;
          }
          // Priorité 2: fetcher la carte OSM depuis les coordonnées GPS
          const loc = acc.location as any;
          const lat = loc?.lat || loc?.latitude;
          const lng = loc?.lng || loc?.longitude || loc?.lon;
          if (lat && lng) {
            try {
              logger.info(`[pdf] Fetch carte OSM: ${lat},${lng}`);
              return await fetchAccidentMap(lat, lng, 900, 650, 18);
            } catch (e: any) { logger.warn('[pdf] OSM fetch failed:', e.message); }
          }
          // Priorité 3: géocoder l'adresse
          const addr = [loc?.address, loc?.city, loc?.country].filter(Boolean).join(', ');
          if (addr) {
            try {
              logger.info(`[pdf] Géocodage: ${addr}`);
              const coords = await geocodeAddress(addr);
              if (coords) {
                return await fetchAccidentMap(coords.lat, coords.lng, 900, 650, 18);
              }
            } catch (e: any) { logger.warn('[pdf] Geocode/OSM failed:', e.message); }
          }
          return undefined;
        })(),
        width: 900,
        height: 650,
      });
      finalSketchBase64 = puppeteerPng;
      logger.info('[pdf] ✅ Sketch Puppeteer rendu');
    }
  } catch (sketchErr: any) {
    logger.warn('[pdf] Sketch Puppeteer fallback:', sketchErr.message);
    // Garder sketchImage original si dispo
  }

  if (finalSketchBase64) {
    try {
      // New page for sketch / carte
      const sketchPage = doc.addPage([595, 842]);
      sketchPage.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(1, 1, 1) });
      drawText(sketchPage, L.sketchTitle, margin, 820, bold, 10, C.boom);
      drawText(sketchPage, `Carte positionnée par le conducteur A  ·  Session: ${session.id}`, margin, 808, mono, 7, C.mid);
      drawText(sketchPage, '© OpenStreetMap contributors  |  IA BOOM.CONTACT', margin, 798, mono, 6, C.light);
      const sketchBytes = Buffer.from(finalSketchBase64!, 'base64');
      // Auto-detect JPEG (FF D8 FF) ou PNG (89 50 4E 47)
      const isJpeg = sketchBytes[0] === 0xFF && sketchBytes[1] === 0xD8;
      const sketchImg = isJpeg ? await doc.embedJpg(sketchBytes) : await doc.embedPng(sketchBytes);
      const maxW = 595 - margin * 2;
      const maxH = 700;
      const scale = Math.min(maxW / sketchImg.width, maxH / sketchImg.height, 1);
      sketchPage.drawImage(sketchImg, {
        x: margin,
        y: 820 - 10 - sketchImg.height * scale,
        width: sketchImg.width * scale,
        height: sketchImg.height * scale,
      });
      drawText(sketchPage, L.footer, margin, 18, normal, 7, C.mid);
    } catch { /* sketch embed failed */ }
  }

  // ── PHOTOS (Section scene) ─────────────────────────────────
  if (acc.photos && acc.photos.length > 0) {
    try {
      const photoPage = doc.addPage([595, 842]);
      photoPage.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(1, 1, 1) });
      drawText(photoPage, L.photosTitle, margin, 820, bold, 10, C.boom);
      drawText(photoPage, `${acc.photos.length} photo(s) - Session: ${session.id}`, margin, 808, mono, 7, C.mid);

      const cols = 2;
      const photoW = (595 - margin * 2 - 10) / cols;
      const photoH = 180;
      let px = margin;
      let py = 795;

      for (let i = 0; i < acc.photos.length; i++) {
        const photo = acc.photos[i];
        try {
          const imgBytes = Buffer.from(photo.base64, 'base64');
          const img = await doc.embedJpg(imgBytes);
          const scale = Math.min(photoW / img.width, photoH / img.height, 1);
          const iw = img.width * scale;
          const ih = img.height * scale;
          photoPage.drawImage(img, { x: px + (photoW - iw) / 2, y: py - photoH + (photoH - ih), width: iw, height: ih });
          // Caption
          const catLabel = photo.category.toUpperCase();
          drawText(photoPage, catLabel, px + 2, py - photoH - 8, bold, 7, C.boom);
          if (photo.caption) drawText(photoPage, photo.caption, px + 2, py - photoH - 18, normal, 7, C.black);
          // Border
          photoPage.drawRectangle({ x: px, y: py - photoH, width: photoW, height: photoH, borderColor: rgb(0.85, 0.85, 0.85), borderWidth: 0.5, color: undefined as any });
        } catch { /* photo embed failed */ }

        if (i % cols === cols - 1) {
          px = margin;
          py -= photoH + 30;
        } else {
          px += photoW + 10;
        }
      }
      drawText(photoPage, L.footer, margin, 18, normal, 7, C.mid);
    } catch { /* photos page failed */ }
  }

  // ── FOOTER ─────────────────────────────────────────────────
  drawLine(page, margin, 48, width - margin, 48, C.border);
  const footerLine1 = isUnilateral
    ? 'boom.contact - Declaration unilaterale de sinistre - Document legalement valable - 46 pays'
    : 'boom.contact - Constat amiable numerique mondial - boom-contact-production.up.railway.app';
  drawText(page, footerLine1, margin, 38, normal, 7, C.mid);
  drawText(page, `Session ID: ${session.id} - Genere le ${new Date().toLocaleString('fr-CH')} - PEP's Swiss SA - CHE-476.484.632`,
    margin, 28, mono, 6.5, C.mid);
  const footerLine3 = isUnilateral
    ? `boom.contact by PEP's Swiss SA · Declaration unilaterale certifiee · Convention Europeenne Assurances`
    : `boom.contact by PEP's Swiss SA · Document numerique certifie · Valable mondialement`;
  drawText(page, footerLine3, margin, 18, normal, 6.5, C.mid);

  // Red corner accent
  page.drawRectangle({ x: width - 40, y: 0, width: 40, height: 10, color: C.boom });
  // emoji removed (WinAnsi incompatible)

  return doc.save();
}



