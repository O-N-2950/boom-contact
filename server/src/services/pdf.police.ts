// server/src/services/pdf.police.ts
// Générateur PDF "Rapport d'Intervention" — Module Police
// Template modulaire par pays (CH pour l'instant, FR/BE/LU à venir)
// IMPORTANT: pdf-lib / WinAnsi — pas de ①②③✓ ni de caractères hors latin-1

import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';
import type { ConstatSession } from '../../../shared/types';
import type { AnnotationData } from './police.service.js';

// ── Couleurs officielles ─────────────────────────────────────
const C = {
  black:   rgb(0.05, 0.05, 0.10),
  dark:    rgb(0.15, 0.15, 0.22),
  mid:     rgb(0.45, 0.45, 0.50),
  light:   rgb(0.90, 0.90, 0.92),
  white:   rgb(1, 1, 1),
  border:  rgb(0.78, 0.78, 0.82),
  header:  rgb(0.12, 0.18, 0.32),   // bleu marine institutionnel
  section: rgb(0.93, 0.94, 0.96),
  red:     rgb(0.80, 0.10, 0.10),
};

// ── Sanitize WinAnsi ─────────────────────────────────────────
function san(text: string): string {
  if (!text) return '';
  return text
    .replace(/[éèêë]/g, 'e').replace(/[àâä]/g, 'a')
    .replace(/[ùûü]/g, 'u').replace(/[ôö]/g, 'o')
    .replace(/[îï]/g, 'i').replace(/ç/g, 'c')
    .replace(/[ÉÈÊË]/g, 'E').replace(/[ÀÂÄ]/g, 'A')
    .replace(/[ÙÛÜ]/g, 'U').replace(/[ÔÖ]/g, 'O')
    .replace(/[ÎÏ]/g, 'I').replace(/Ç/g, 'C')
    .replace(/['']/g, "'").replace(/[""]/g, '"')
    .replace(/[–—]/g, '-').replace(/…/g, '...')
    .replace(/«/g, '<<').replace(/»/g, '>>')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');
}

function tx(page: PDFPage, text: string, x: number, y: number,
  font: PDFFont, size: number, color = C.black) {
  if (!text) return;
  try { page.drawText(san(text), { x, y, font, size, color }); }
  catch { page.drawText(text.replace(/[^\x20-\x7E]/g, '?'), { x, y, font, size, color }); }
}

function rect(page: PDFPage, x: number, y: number, w: number, h: number,
  fill = C.white, borderColor = C.border, bw = 0.5) {
  page.drawRectangle({ x, y, width: w, height: h, color: fill, borderColor, borderWidth: bw });
}

function line(page: PDFPage, x1: number, y1: number, x2: number, y2: number,
  color = C.border, t = 0.5) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, color, thickness: t });
}

function field(page: PDFPage, label: string, value: string,
  x: number, y: number, w: number, lf: PDFFont, vf: PDFFont) {
  rect(page, x, y - 20, w, 24, C.white, C.border, 0.5);
  tx(page, label, x + 4, y - 8, lf, 6, C.mid);
  tx(page, value || '-', x + 4, y - 17, vf, 9);
}

// Wrap long text into lines of max `maxW` chars
function wrapText(text: string, maxW: number): string[] {
  if (!text) return ['-'];
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    if ((current + ' ' + w).trim().length > maxW) {
      if (current) lines.push(current);
      current = w;
    } else {
      current = (current + ' ' + w).trim();
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : ['-'];
}

// ── TEMPLATE CH — Rapport d'intervention (Suisse) ────────────
export async function generatePoliceReport(
  session: ConstatSession,
  annotations: AnnotationData,
  agent: { firstName: string; lastName: string; badgeNumber?: string; stationName: string; canton?: string },
  country: string = 'CH'
): Promise<Uint8Array> {

  const doc = await PDFDocument.create();
  const W = 595, H = 842; // A4

  // Fonts
  const bold   = await doc.embedFont(StandardFonts.HelveticaBold);
  const normal = await doc.embedFont(StandardFonts.Helvetica);

  // ── Page 1 : En-tête + Incident + Conducteurs ────────────────
  const p1 = doc.addPage([W, H]);
  let y = H - 20;

  // ── En-tête institutionnel ────────────────────────────────────
  rect(p1, 0, y - 50, W, 52, C.header, C.header, 0);
  tx(p1, 'RAPPORT D\'INTERVENTION', 20, y - 18, bold, 14, C.white);
  const countryLabel = country === 'CH' ? 'Confederation Helvetique' :
                       country === 'FR' ? 'Republique Francaise' :
                       country === 'BE' ? 'Royaume de Belgique' : 'Grand-Duche de Luxembourg';
  tx(p1, countryLabel, 20, y - 33, normal, 8, rgb(0.7, 0.75, 0.85));
  tx(p1, 'CONFIDENTIEL - USAGE OFFICIEL', W - 20, y - 18, bold, 8, rgb(0.7, 0.75, 0.85));
  tx(p1, 'Ne pas diffuser aux parties', W - 20, y - 30, normal, 7, rgb(0.6, 0.65, 0.75));

  // Right-align helper
  const rTx = (text: string, rightX: number, yy: number, f: PDFFont, s: number, col = C.black) => {
    try {
      const w = f.widthOfTextAtSize(san(text), s);
      tx(p1, text, rightX - w, yy, f, s, col);
    } catch { tx(p1, text, rightX - text.length * s * 0.5, yy, f, s, col); }
  };

  y -= 60;

  // Numéro de rapport et date
  const reportDate = new Date().toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const reportTime = new Date().toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });

  const accidentObj = (session.accident as any) || {};
  const accDate = accidentObj.date || '-';
  const accTime = accidentObj.time || '-';
  const loc = accidentObj.location || {};
  const address = [loc.address, loc.city, loc.country].filter(Boolean).join(', ') || '-';

  // Bloc numéro PV
  rect(p1, 20, y - 28, 260, 32, C.section, C.border, 0.5);
  tx(p1, 'N\xB0 DE RAPPORT', 26, y - 8, normal, 7, C.mid);
  tx(p1, annotations.reportNumber || '(non attribue)', 26, y - 20, bold, 11);

  rect(p1, 290, y - 28, 285, 32, C.section, C.border, 0.5);
  tx(p1, 'DATE DE REDACTION', 296, y - 8, normal, 7, C.mid);
  tx(p1, `${reportDate} a ${reportTime}`, 296, y - 20, normal, 10);

  y -= 42;

  // ── Section 1 : Incident ────────────────────────────────────
  rect(p1, 20, y - 14, W - 40, 17, C.header, C.header, 0);
  tx(p1, '1. CIRCONSTANCES DE L\'ACCIDENT', 25, y - 11, bold, 9, C.white);
  y -= 22;

  // Ligne 1 : date + heure
  field(p1, 'DATE DE L\'ACCIDENT', accDate, 20, y, 180, normal, bold);
  field(p1, 'HEURE', accTime, 205, y, 100, normal, bold);
  field(p1, 'BLESSES', (session.accident as any)?.injuries ? 'OUI' : 'NON', 310, y, 100, normal, bold);
  field(p1, 'NB VEHICULES', String((session as any).vehicleCount || 2), 415, y, 160, normal, bold);
  y -= 30;

  // Ligne 2 : lieu
  field(p1, 'LIEU DE L\'ACCIDENT', address, 20, y, W - 40, normal, bold);
  y -= 30;

  // GPS si disponible
  if (loc.lat && loc.lng) {
    field(p1, 'COORDONNEES GPS', `${(loc.lat as number).toFixed(6)}, ${(loc.lng as number).toFixed(6)}`, 20, y, W - 40, normal, bold);
    y -= 30;
  }

  y -= 8;

  // ── Section 2 : Conducteur A ────────────────────────────────
  rect(p1, 20, y - 14, (W - 50) / 2, 17, C.dark, C.dark, 0);
  tx(p1, 'CONDUCTEUR A', 25, y - 11, bold, 9, C.white);
  y -= 22;

  const pA = (session.participantA as any) || {};
  const dA = pA.driver || {};
  const vA = pA.vehicle || {};
  const iA = pA.insurance || {};
  const colW = (W - 50) / 2;

  field(p1, 'NOM / PRENOM', `${dA.lastName || ''} ${dA.firstName || ''}`.trim() || '-', 20, y, colW, normal, bold);
  field(p1, 'DATE DE NAISSANCE', dA.birthDate || '-', 25 + colW, y, colW - 5, normal, bold);
  y -= 30;
  field(p1, 'ADRESSE', dA.address || '-', 20, y, W - 40, normal, bold);
  y -= 30;
  field(p1, 'PLAQUE', vA.plate || '-', 20, y, 160, normal, bold);
  field(p1, 'MARQUE / MODELE', `${vA.brand || ''} ${vA.model || ''}`.trim() || '-', 185, y, 200, normal, bold);
  field(p1, 'COULEUR', vA.color || '-', 390, y, 185, normal, bold);
  y -= 30;
  field(p1, 'ASSUREUR', iA.company || '-', 20, y, 200, normal, bold);
  field(p1, 'N\xB0 POLICE', iA.policyNumber || '-', 225, y, 350, normal, bold);
  y -= 35;

  // ── Section 2b : Conducteur B ────────────────────────────────
  const pB = (session.participantB as any) || {};
  const hasB = pB && Object.keys(pB).length > 0;

  rect(p1, 20, y - 14, (W - 50) / 2, 17, C.dark, C.dark, 0);
  tx(p1, 'CONDUCTEUR B', 25, y - 11, bold, 9, C.white);
  y -= 22;

  if (hasB) {
    const dB = pB.driver || {};
    const vB = pB.vehicle || {};
    const iB = pB.insurance || {};
    field(p1, 'NOM / PRENOM', `${dB.lastName || ''} ${dB.firstName || ''}`.trim() || '-', 20, y, colW, normal, bold);
    field(p1, 'DATE DE NAISSANCE', dB.birthDate || '-', 25 + colW, y, colW - 5, normal, bold);
    y -= 30;
    field(p1, 'ADRESSE', dB.address || '-', 20, y, W - 40, normal, bold);
    y -= 30;
    field(p1, 'PLAQUE', vB.plate || '-', 20, y, 160, normal, bold);
    field(p1, 'MARQUE / MODELE', `${vB.brand || ''} ${vB.model || ''}`.trim() || '-', 185, y, 200, normal, bold);
    field(p1, 'COULEUR', vB.color || '-', 390, y, 185, normal, bold);
    y -= 30;
    field(p1, 'ASSUREUR', iB.company || '-', 20, y, 200, normal, bold);
    field(p1, 'N\xB0 POLICE', iB.policyNumber || '-', 225, y, 350, normal, bold);
    y -= 35;
  } else {
    rect(p1, 20, y - 24, W - 40, 28, C.section, C.border, 0.5);
    tx(p1, 'Conducteur B non encore enregistre dans la session', 26, y - 16, normal, 9, C.mid);
    y -= 38;
  }

  // ── Pied de page p1 ──────────────────────────────────────────
  line(p1, 20, 35, W - 20, 35, C.border, 0.5);
  tx(p1, `Redige par : ${san(agent.firstName)} ${san(agent.lastName)}${agent.badgeNumber ? ' | Badge: ' + agent.badgeNumber : ''} | ${san(agent.stationName)}`, 20, 22, normal, 7, C.mid);
  tx(p1, 'boom.contact - Module Police | police.boom.contact', W / 2, 22, normal, 7, C.mid);
  tx(p1, 'Page 1 / 2', W - 60, 22, normal, 7, C.mid);

  // ── Page 2 : Annotations agent ───────────────────────────────
  const p2 = doc.addPage([W, H]);
  y = H - 20;

  // En-tête page 2
  rect(p2, 0, y - 50, W, 52, C.header, C.header, 0);
  tx(p2, 'RAPPORT D\'INTERVENTION - SUITE', 20, y - 18, bold, 14, C.white);
  tx(p2, annotations.reportNumber || '(non attribue)', W - 20, y - 18, bold, 10, rgb(0.8, 0.82, 0.95));
  tx(p2, 'Annotations de l\'agent - CONFIDENTIEL', 20, y - 33, normal, 8, rgb(0.7, 0.75, 0.85));

  y -= 60;

  // ── Section 3 : Infractions ──────────────────────────────────
  rect(p2, 20, y - 14, W - 40, 17, C.header, C.header, 0);
  tx(p2, '3. INFRACTIONS CONSTATEES', 25, y - 11, bold, 9, C.white);
  y -= 22;

  if (annotations.infractions?.length > 0) {
    // Header row
    rect(p2, 20, y - 14, W - 40, 16, C.section, C.border, 0.5);
    tx(p2, 'CODE', 25, y - 11, bold, 8, C.mid);
    tx(p2, 'DESCRIPTION', 100, y - 11, bold, 8, C.mid);
    tx(p2, 'PARTIE', W - 80, y - 11, bold, 8, C.mid);
    y -= 16;

    for (const inf of annotations.infractions) {
      rect(p2, 20, y - 18, W - 40, 20, C.white, C.border, 0.5);
      tx(p2, san(inf.code), 25, y - 13, normal, 9);
      const descLines = wrapText(san(inf.description), 65);
      tx(p2, descLines[0], 100, y - 13, normal, 9);
      tx(p2, inf.party === 'both' ? 'A + B' : inf.party, W - 70, y - 13, bold, 9);
      y -= 20;
    }
  } else {
    rect(p2, 20, y - 22, W - 40, 26, C.section, C.border, 0.5);
    tx(p2, 'Aucune infraction constatee', 26, y - 14, normal, 9, C.mid);
    y -= 30;
  }

  y -= 10;

  // ── Section 4 : Mesures prises ───────────────────────────────
  rect(p2, 20, y - 14, W - 40, 17, C.header, C.header, 0);
  tx(p2, '4. MESURES PRISES', 25, y - 11, bold, 9, C.white);
  y -= 22;

  const MEASURE_LABELS: Record<string, string> = {
    alcotest:       'Alcotest',
    drug_test:      'Test stupefiants',
    licence_seized: 'Permis saisi',
    vehicle_towed:  'Vehicule deplace / evacue',
    pv_issued:      'PV dresse',
    warning:        'Avertissement verbal',
    other:          'Autre mesure',
  };

  if (annotations.measures?.length > 0) {
    for (const m of annotations.measures) {
      rect(p2, 20, y - 20, W - 40, 22, C.white, C.border, 0.5);
      const label = MEASURE_LABELS[m.type] || m.type;
      tx(p2, `[x] ${san(label)}`, 26, y - 14, bold, 9);
      if (m.description) {
        const d = wrapText(san(m.description), 70);
        tx(p2, d[0], 180, y - 14, normal, 9, C.mid);
      }
      if (m.party) tx(p2, `Partie ${m.party}`, W - 80, y - 14, normal, 8, C.mid);
      y -= 22;
    }
  } else {
    rect(p2, 20, y - 22, W - 40, 26, C.section, C.border, 0.5);
    tx(p2, 'Aucune mesure prise', 26, y - 14, normal, 9, C.mid);
    y -= 30;
  }

  y -= 10;

  // ── Section 5 : Temoins ──────────────────────────────────────
  rect(p2, 20, y - 14, W - 40, 17, C.header, C.header, 0);
  tx(p2, '5. TEMOINS', 25, y - 11, bold, 9, C.white);
  y -= 22;

  if (annotations.witnesses?.length > 0) {
    for (const w of annotations.witnesses) {
      const boxH = w.statement ? 60 : 38;
      rect(p2, 20, y - boxH, W - 40, boxH + 2, C.white, C.border, 0.5);
      tx(p2, san(w.name), 26, y - 10, bold, 10);
      if (w.address) tx(p2, san(w.address), 26, y - 22, normal, 8, C.mid);
      if (w.phone)   tx(p2, `Tel: ${san(w.phone)}`, 300, y - 22, normal, 8, C.mid);
      if (w.statement) {
        tx(p2, 'Declaration:', 26, y - 34, normal, 7, C.mid);
        const lines = wrapText(san(w.statement), 90);
        tx(p2, lines[0], 26, y - 44, normal, 8);
        if (lines[1]) tx(p2, lines[1], 26, y - 54, normal, 8);
      }
      y -= boxH + 8;
    }
  } else {
    rect(p2, 20, y - 22, W - 40, 26, C.section, C.border, 0.5);
    tx(p2, 'Aucun temoin enregistre', 26, y - 14, normal, 9, C.mid);
    y -= 30;
  }

  y -= 10;

  // ── Section 6 : Observations libres ─────────────────────────
  rect(p2, 20, y - 14, W - 40, 17, C.header, C.header, 0);
  tx(p2, '6. OBSERVATIONS DE L\'AGENT', 25, y - 11, bold, 9, C.white);
  y -= 22;

  const obsText = annotations.observations || '(aucune observation)';
  const obsLines = wrapText(san(obsText), 92);
  const obsH = Math.max(40, obsLines.length * 14 + 16);
  rect(p2, 20, y - obsH, W - 40, obsH, C.white, C.border, 0.5);
  let obsY = y - 14;
  for (const l of obsLines.slice(0, 8)) {
    tx(p2, l, 26, obsY, normal, 9);
    obsY -= 13;
  }
  y -= obsH + 14;

  // ── Section 7 : Signature agent ─────────────────────────────
  y = Math.min(y, 160);
  line(p2, 20, y, W - 20, y, C.border, 0.5);
  y -= 15;

  rect(p2, 20, y - 50, 260, 54, C.white, C.border, 0.5);
  tx(p2, 'AGENT REDACTEUR', 26, y - 10, normal, 7, C.mid);
  tx(p2, `${san(agent.firstName)} ${san(agent.lastName)}`, 26, y - 22, bold, 10);
  if (agent.badgeNumber) tx(p2, `Badge: ${san(agent.badgeNumber)}`, 26, y - 34, normal, 8, C.mid);
  tx(p2, san(agent.stationName), 26, y - 45, normal, 8, C.mid);

  rect(p2, 300, y - 50, 275, 54, C.white, C.border, 0.5);
  tx(p2, 'SIGNATURE ET CACHET OFFICIEL', 306, y - 10, normal, 7, C.mid);
  tx(p2, '(signature manuscrite requise)', 306, y - 34, normal, 7, C.light);

  // Pied de page p2
  line(p2, 20, 35, W - 20, 35, C.border, 0.5);
  tx(p2, `Document genere le ${reportDate} a ${reportTime} | Session: ${session.id}`, 20, 22, normal, 7, C.mid);
  tx(p2, 'Ce document est confidentiel et a usage interne exclusivement', W / 2, 22, normal, 7, C.mid);
  tx(p2, 'Page 2 / 2', W - 60, 22, normal, 7, C.mid);

  const bytes = await doc.save();
  return bytes;
}
