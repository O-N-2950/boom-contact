import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';
import type { ConstatSession } from '../../../shared/types';

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
export async function generateConstatPDF(session: ConstatSession): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle('Constat Amiable — boom.contact');
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
  const acc = session.accident;
  const margin = 28;
  const colW = (width - margin * 2 - 8) / 2;

  let y = height - margin;

  // ── HEADER ─────────────────────────────────────────────────
  // Red header band
  page.drawRectangle({ x: 0, y: height - 52, width, height: 52, color: C.boom });

  // Logo / title
  drawText(page, 'boom.contact', margin, height - 20, bold, 20, C.white);
  drawText(page, 'CONSTAT AMIABLE D\'ACCIDENT', margin, height - 34, normal, 9, rgb(1, 0.8, 0.75));
  drawText(page, 'BOOM.CONTACT · ACCIDENT REPORT · DIGITAL CERTIFIED', margin, height - 44, normal, 6.5, rgb(1, 0.7, 0.65));

  // Session info top right
  const sessionText = `Session: ${session.id}`;
  const sessionW = mono.widthOfTextAtSize(sessionText, 7);
  drawText(page, sessionText, width - margin - sessionW, height - 18, mono, 7, C.white);
  const dateStr = acc.date && acc.time ? `${acc.date} ${acc.time}` : new Date(session.createdAt).toLocaleString('fr-CH');
  const dateW = normal.widthOfTextAtSize(dateStr, 7);
  drawText(page, dateStr, width - margin - dateW, height - 30, normal, 7, rgb(1, 0.85, 0.8));

  y = height - 64;

  // ── ACCIDENT SECTION ───────────────────────────────────────
  drawRect(page, margin, y - 38, width - margin * 2, 42, C.section, C.border);
  drawText(page, '1. ACCIDENT', margin + 6, y - 10, bold, 8, C.boom);

  const fieldW = (width - margin * 2 - 16) / 4;

  labelValue(page, 'DATE', acc.date ?? '', margin + 4, y - 12, fieldW, normal, bold);
  labelValue(page, 'HEURE', acc.time ?? '', margin + 4 + fieldW + 4, y - 12, fieldW, normal, bold);
  labelValue(page, 'PAYS', acc.location?.country ?? '', margin + 4 + (fieldW + 4) * 2, y - 12, fieldW, normal, bold);
  labelValue(page, 'BLESSÉS ?', acc.injuries ? 'OUI' : 'NON', margin + 4 + (fieldW + 4) * 3, y - 12, fieldW, normal, bold);

  y -= 42;

  // Location full width
  drawRect(page, margin, y - 22, width - margin * 2, 26, C.white, C.border);
  drawText(page, 'LIEU DE L\'ACCIDENT', margin + 4, y - 8, normal, 6, C.mid);
  const locationStr = [acc.location?.address, acc.location?.city, acc.location?.country].filter(Boolean).join(', ');
  drawText(page, locationStr || '-', margin + 6, y - 18, bold, 9, C.black);
  y -= 28;

  // ── VEHICLES HEADER ────────────────────────────────────────
  y -= 6;
  // Column A header
  page.drawRectangle({ x: margin, y: y - 22, width: colW, height: 22, color: C.black });
  drawText(page, 'VÉHICULE A', margin + 6, y - 8, bold, 8, C.white);
  drawText(page, `Conducteur : ${A?.driver?.firstName ?? ''} ${A?.driver?.lastName ?? ''}`.trim() || '-',
    margin + 6, y - 17, normal, 7, C.light);

  // Column B header
  page.drawRectangle({ x: margin + colW + 8, y: y - 22, width: colW, height: 22, color: C.dark });
  drawText(page, 'VÉHICULE B', margin + colW + 14, y - 8, bold, 8, C.white);
  drawText(page, `Conducteur : ${B?.driver?.firstName ?? ''} ${B?.driver?.lastName ?? ''}`.trim() || '-',
    margin + colW + 14, y - 17, normal, 7, C.light);
  y -= 28;

  // ── VEHICLE DATA (side by side) ────────────────────────────
  const drawSideBySide = (labelA: string, valA: string, labelB: string, valB: string, rowH = 26) => {
    labelValue(page, labelA, valA, margin, y, colW, normal, bold);
    labelValue(page, labelB, valB, margin + colW + 8, y, colW, normal, bold);
    y -= rowH;
  };

  drawSideBySide(
    'IMMATRICULATION', A?.vehicle?.licensePlate ?? '',
    'IMMATRICULATION', B?.vehicle?.licensePlate ?? ''
  );
  drawSideBySide(
    'MARQUE / MODÈLE', `${A?.vehicle?.brand ?? ''} ${A?.vehicle?.model ?? ''}`.trim(),
    'MARQUE / MODÈLE', `${B?.vehicle?.brand ?? ''} ${B?.vehicle?.model ?? ''}`.trim()
  );
  drawSideBySide(
    'ANNÉE / COULEUR', `${A?.vehicle?.year ?? ''} ${A?.vehicle?.color ?? ''}`.trim(),
    'ANNÉE / COULEUR', `${B?.vehicle?.year ?? ''} ${B?.vehicle?.color ?? ''}`.trim()
  );

  y -= 4;

  // ── DRIVER DATA ────────────────────────────────────────────
  page.drawRectangle({ x: margin, y: y - 14, width: width - margin * 2, height: 14, color: rgb(0.94, 0.93, 0.91) });
  drawText(page, '2. CONDUCTEURS', margin + 4, y - 9, bold, 7.5, C.boom);
  y -= 18;

  drawSideBySide(
    'NOM COMPLET', `${A?.driver?.firstName ?? ''} ${A?.driver?.lastName ?? ''}`.trim(),
    'NOM COMPLET', `${B?.driver?.firstName ?? ''} ${B?.driver?.lastName ?? ''}`.trim()
  );
  drawSideBySide(
    'ADRESSE', `${A?.driver?.address ?? ''} ${A?.driver?.city ?? ''}`.trim(),
    'ADRESSE', `${B?.driver?.address ?? ''} ${B?.driver?.city ?? ''}`.trim()
  );
  drawSideBySide(
    'TÉLÉPHONE', A?.driver?.phone ?? '',
    'TÉLÉPHONE', B?.driver?.phone ?? ''
  );
  drawSideBySide(
    'N° PERMIS DE CONDUIRE', A?.driver?.licenseNumber ?? '',
    'N° PERMIS DE CONDUIRE', B?.driver?.licenseNumber ?? ''
  );

  y -= 4;

  // ── INSURANCE DATA ─────────────────────────────────────────
  page.drawRectangle({ x: margin, y: y - 14, width: width - margin * 2, height: 14, color: rgb(0.94, 0.93, 0.91) });
  drawText(page, '3. ASSURANCES', margin + 4, y - 9, bold, 7.5, C.boom);
  y -= 18;

  drawSideBySide(
    'COMPAGNIE', A?.insurance?.company ?? '',
    'COMPAGNIE', B?.insurance?.company ?? ''
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
  drawText(page, '4. CIRCONSTANCES', margin + 4, y - 9, bold, 7.5, C.boom);
  y -= 18;

  const circA = A?.circumstances ?? [];
  const circB = B?.circumstances ?? [];
  const allCirc = Array.from(new Set([...circA, ...circB]));

  const CIRC_LABELS: Record<string, string> = {
    c1: 'En stationnement / arrêt', c2: 'Quittait un stationnement',
    c3: 'Prenait un stationnement', c4: 'Sortait d\'un parking/lieu privé',
    c5: 'S\'engageait dans un parking', c6: 'S\'engageait dans une voie',
    c7: 'Même sens, même file', c8: 'Même sens, file différente',
    c9: 'Changeait de file', c10: 'Doublait',
    c11: 'Prenait la droite (bifurcation)', c12: 'Prenait la gauche (bifurcation)',
    c13: 'Reculait', c14: 'Empiétait sur voie inverse',
    c15: 'Venait de droite (carrefour)', c16: 'N\'avait pas respecté priorité/feu rouge',
    c17: 'Autre (voir observations)',
  };

  const circCols = 2;
  const circItems = allCirc.slice(0, 8); // show first 8 in page
  circItems.forEach((id, i) => {
    const col = i % circCols;
    const row = Math.floor(i / circCols);
    const cx = margin + col * ((width - margin * 2) / circCols);
    const cy = y - row * 14;
    const inA = circA.includes(id);
    const inB = circB.includes(id);
    drawText(page, `${inA ? '[A] ' : '   '}${inB ? '[B] ' : '   '}${CIRC_LABELS[id] ?? id}`, cx + 4, cy - 10, normal, 7, C.black);
  });

  y -= Math.ceil(circItems.length / circCols) * 14 + 8;

  // ── DAMAGED ZONES ─────────────────────────────────────────
  page.drawRectangle({ x: margin, y: y - 14, width: width - margin * 2, height: 14, color: rgb(0.94, 0.93, 0.91) });
  drawText(page, '5. ZONES ENDOMMAGEES', margin + 4, y - 9, bold, 7.5, C.boom);
  y -= 18;

  const zonesA = (A?.damagedZones ?? []).join(', ') || '-';
  const zonesB = (B?.damagedZones ?? []).join(', ') || '-';
  drawRect(page, margin, y - 22, colW, 26, C.white, C.border);
  drawText(page, 'VÉHICULE A', margin + 4, y - 8, normal, 6, C.mid);
  drawText(page, zonesA, margin + 4, y - 18, bold, 8, C.black);
  drawRect(page, margin + colW + 8, y - 22, colW, 26, C.white, C.border);
  drawText(page, 'VÉHICULE B', margin + colW + 12, y - 8, normal, 6, C.mid);
  drawText(page, zonesB, margin + colW + 12, y - 18, bold, 8, C.black);
  y -= 30;

  // ── WITNESSES ─────────────────────────────────────────────
  if (acc.witnesses) {
    page.drawRectangle({ x: margin, y: y - 14, width: width - margin * 2, height: 14, color: rgb(0.94, 0.93, 0.91) });
    drawText(page, 'TEMOINS', margin + 4, y - 9, bold, 7.5, C.boom);
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
    drawText(page, 'DEGATS MATERIELS A DES TIERS', margin + 4, y - 8, normal, 6, C.mid);
    drawText(page, acc.thirdPartyDamage ? 'OUI - Dommages à des tiers signalés' : 'NON', margin + 4, y - 18, bold, 9, C.black);
    y -= 30;
  }

  // ── FAULT DECLARATION ──────────────────────────────────────
  if (acc.faultDeclaration) {
    const faultMap: Record<string, string> = {
      A: 'Le conducteur A se déclare responsable',
      B: 'Le conducteur B se déclare responsable',
      shared: 'Responsabilité partagée',
      unknown: 'Responsabilité non déterminée',
    };
    drawRect(page, margin, y - 22, width - margin * 2, 26, C.white, C.border);
    drawText(page, '6. DECLARATION DE RESPONSABILITE', margin + 4, y - 8, bold, 7, C.boom);
    drawText(page, faultMap[acc.faultDeclaration] ?? '-', margin + 4, y - 18, bold, 9, C.black);
    y -= 30;
  }

  // ── DESCRIPTION ────────────────────────────────────────────
  if (acc.description) {
    drawRect(page, margin, y - 36, width - margin * 2, 40, C.white, C.border);
    drawText(page, '7. OBSERVATIONS', margin + 4, y - 8, bold, 7, C.boom);
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
  drawText(page, '8. SIGNATURES', margin + 4, y - 9, bold, 7.5, C.boom);
  y -= 18;

  const sigH = 60;
  drawRect(page, margin, y - sigH, colW, sigH + 20, C.white, C.border);
  drawText(page, 'SIGNATURE CONDUCTEUR A', margin + 4, y - 8, normal, 6.5, C.mid);

  drawRect(page, margin + colW + 8, y - sigH, colW, sigH + 20, C.white, C.border);
  drawText(page, 'SIGNATURE CONDUCTEUR B', margin + colW + 12, y - 8, normal, 6.5, C.mid);

  // Embed signatures if available
  for (const [participant, xOff] of [[A, margin], [B, margin + colW + 8]] as const) {
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
  drawText(page, `Signé le : ${signedAtA}`, margin + 4, y - sigH + 4, normal, 7, C.mid);
  drawText(page, `Signé le : ${signedAtB}`, margin + colW + 12, y - sigH + 4, normal, 7, C.mid);

  y -= sigH + 28;

  // ── SKETCH (Section 13) ────────────────────────────────────
  if (acc.sketchImage) {
    try {
      // New page for sketch
      const sketchPage = doc.addPage([595, 842]);
      sketchPage.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(1, 1, 1) });
      drawText(sketchPage, 'SECTION 13 - CROQUIS DE L\'ACCIDENT', margin, 820, bold, 10, C.boom);
      drawText(sketchPage, `Session: ${session.id}`, margin, 808, mono, 7, C.mid);
      const sketchBytes = Buffer.from(acc.sketchImage, 'base64');
      const sketchImg = await doc.embedPng(sketchBytes);
      const maxW = 595 - margin * 2;
      const maxH = 700;
      const scale = Math.min(maxW / sketchImg.width, maxH / sketchImg.height, 1);
      sketchPage.drawImage(sketchImg, {
        x: margin,
        y: 820 - 10 - sketchImg.height * scale,
        width: sketchImg.width * scale,
        height: sketchImg.height * scale,
      });
      drawText(sketchPage, 'boom.contact - Croquis accident - Document numerique certifie', margin, 18, normal, 7, C.mid);
    } catch { /* sketch embed failed */ }
  }

  // ── PHOTOS (Section scene) ─────────────────────────────────
  if (acc.photos && acc.photos.length > 0) {
    try {
      const photoPage = doc.addPage([595, 842]);
      photoPage.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(1, 1, 1) });
      drawText(photoPage, 'PHOTOS DE LA SCENE', margin, 820, bold, 10, C.boom);
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
      drawText(photoPage, 'boom.contact - Photos de scene - Document numerique certifie', margin, 18, normal, 7, C.mid);
    } catch { /* photos page failed */ }
  }

  // ── FOOTER ─────────────────────────────────────────────────
  drawLine(page, margin, 48, width - margin, 48, C.border);
  drawText(page, 'boom.contact - Constat amiable numerique mondial - boom-contact-production.up.railway.app', margin, 38, normal, 7, C.mid);
  drawText(page, `Session ID: ${session.id} - Genere le ${new Date().toLocaleString('fr-CH')} - PEP's Swiss SA - Groupe NEUKOMM`,
    margin, 28, mono, 6.5, C.mid);
  drawText(page, 'boom.contact by PEP\'s Swiss SA · Document numérique certifié · Valable mondialement',
    margin, 18, normal, 6.5, C.mid);

  // Red corner accent
  page.drawRectangle({ x: width - 40, y: 0, width: 40, height: 10, color: C.boom });
  // emoji removed (WinAnsi incompatible)

  return doc.save();
}
