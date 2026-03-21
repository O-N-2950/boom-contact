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
function drawText(
  page: PDFPage, text: string, x: number, y: number,
  font: PDFFont, size: number, color = C.black
) {
  if (!text) return;
  page.drawText(text, { x, y, font, size, color });
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
  drawText(page, value || '—', x + 4, y - 22, valueFont, 9, C.black);
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
  drawText(page, 'EUROPEAN ACCIDENT STATEMENT · CEA STANDARD', margin, height - 44, normal, 6.5, rgb(1, 0.7, 0.65));

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
  drawText(page, '① ACCIDENT', margin + 6, y - 10, bold, 8, C.boom);

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
  drawText(page, locationStr || '—', margin + 6, y - 18, bold, 9, C.black);
  y -= 28;

  // ── VEHICLES HEADER ────────────────────────────────────────
  y -= 6;
  // Column A header
  page.drawRectangle({ x: margin, y: y - 22, width: colW, height: 22, color: C.black });
  drawText(page, 'VÉHICULE A', margin + 6, y - 8, bold, 8, C.white);
  drawText(page, `Conducteur : ${A?.driver?.firstName ?? ''} ${A?.driver?.lastName ?? ''}`.trim() || '—',
    margin + 6, y - 17, normal, 7, C.light);

  // Column B header
  page.drawRectangle({ x: margin + colW + 8, y: y - 22, width: colW, height: 22, color: C.dark });
  drawText(page, 'VÉHICULE B', margin + colW + 14, y - 8, bold, 8, C.white);
  drawText(page, `Conducteur : ${B?.driver?.firstName ?? ''} ${B?.driver?.lastName ?? ''}`.trim() || '—',
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
  drawText(page, '② CONDUCTEURS', margin + 4, y - 9, bold, 7.5, C.boom);
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
  drawText(page, '③ ASSURANCES', margin + 4, y - 9, bold, 7.5, C.boom);
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
  drawText(page, '④ CIRCONSTANCES', margin + 4, y - 9, bold, 7.5, C.boom);
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
    drawText(page, `${inA ? '✓A ' : '   '}${inB ? '✓B ' : '   '}${CIRC_LABELS[id] ?? id}`, cx + 4, cy - 10, normal, 7, C.black);
  });

  y -= Math.ceil(circItems.length / circCols) * 14 + 8;

  // ── DAMAGED ZONES ─────────────────────────────────────────
  page.drawRectangle({ x: margin, y: y - 14, width: width - margin * 2, height: 14, color: rgb(0.94, 0.93, 0.91) });
  drawText(page, '⑤ ZONES ENDOMMAGÉES', margin + 4, y - 9, bold, 7.5, C.boom);
  y -= 18;

  const zonesA = (A?.damagedZones ?? []).join(', ') || '—';
  const zonesB = (B?.damagedZones ?? []).join(', ') || '—';
  drawRect(page, margin, y - 22, colW, 26, C.white, C.border);
  drawText(page, 'VÉHICULE A', margin + 4, y - 8, normal, 6, C.mid);
  drawText(page, zonesA, margin + 4, y - 18, bold, 8, C.black);
  drawRect(page, margin + colW + 8, y - 22, colW, 26, C.white, C.border);
  drawText(page, 'VÉHICULE B', margin + colW + 12, y - 8, normal, 6, C.mid);
  drawText(page, zonesB, margin + colW + 12, y - 18, bold, 8, C.black);
  y -= 30;

  // ── FAULT DECLARATION ──────────────────────────────────────
  if (acc.faultDeclaration) {
    const faultMap: Record<string, string> = {
      A: 'Le conducteur A se déclare responsable',
      B: 'Le conducteur B se déclare responsable',
      shared: 'Responsabilité partagée',
      unknown: 'Responsabilité non déterminée',
    };
    drawRect(page, margin, y - 22, width - margin * 2, 26, C.white, C.border);
    drawText(page, '⑥ DÉCLARATION DE RESPONSABILITÉ', margin + 4, y - 8, bold, 7, C.boom);
    drawText(page, faultMap[acc.faultDeclaration] ?? '—', margin + 4, y - 18, bold, 9, C.black);
    y -= 30;
  }

  // ── DESCRIPTION ────────────────────────────────────────────
  if (acc.description) {
    drawRect(page, margin, y - 36, width - margin * 2, 40, C.white, C.border);
    drawText(page, '⑦ OBSERVATIONS', margin + 4, y - 8, bold, 7, C.boom);
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
  drawText(page, '⑧ SIGNATURES', margin + 4, y - 9, bold, 7.5, C.boom);
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
  const signedAtA = A?.signedAt ? new Date(A.signedAt).toLocaleString('fr-CH') : '—';
  const signedAtB = B?.signedAt ? new Date(B.signedAt).toLocaleString('fr-CH') : '—';
  drawText(page, `Signé le : ${signedAtA}`, margin + 4, y - sigH + 4, normal, 7, C.mid);
  drawText(page, `Signé le : ${signedAtB}`, margin + colW + 12, y - sigH + 4, normal, 7, C.mid);

  y -= sigH + 28;

  // ── FOOTER ─────────────────────────────────────────────────
  drawLine(page, margin, 48, width - margin, 48, C.border);
  drawText(page, 'boom.contact — Constat amiable numérique mondial · boom-contact-production.up.railway.app', margin, 38, normal, 7, C.mid);
  drawText(page, `Session ID: ${session.id} · Généré le ${new Date().toLocaleString('fr-CH')} · PEP\'s Swiss SA — Groupe NEUKOMM`,
    margin, 28, mono, 6.5, C.mid);
  drawText(page, 'Standard CEA (Comité Européen des Assurances) · Valable dans tous les pays membres',
    margin, 18, normal, 6.5, C.mid);

  // Red corner accent
  page.drawRectangle({ x: width - 40, y: 0, width: 40, height: 10, color: C.boom });
  drawText(page, '💥', width - 28, 2, bold, 8, C.white);

  return doc.save();
}
