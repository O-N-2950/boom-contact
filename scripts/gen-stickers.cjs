// Autocollants & carte boîte à gants boom.contact — PDF print-ready (300dpi+, fond perdu 2mm, traits de coupe)
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const QRCode = require('qrcode');
const fs = require('fs');

const MM = 2.83465;
const BOOM = rgb(1, 0.208, 0);        // #FF3500
const AMBER = rgb(1, 0.702, 0);       // #FFB300
const NAVY = rgb(0.039, 0.039, 0.078); // #0a0a14
const WHITE = rgb(1, 1, 1);
const GREY = rgb(0.72, 0.75, 0.8);

async function qrPng(url) {
  return QRCode.toBuffer(url, { type: 'png', scale: 40, margin: 1, color: { dark: '#0a0a14', light: '#ffffff' } });
}

function cropMarks(page, bleed, W, H) {
  const L = 4 * MM, t = 0.35;
  for (const [x, y, dx, dy] of [
    [bleed, bleed, -1, 0], [bleed, bleed, 0, -1],
    [W - bleed, bleed, 1, 0], [W - bleed, bleed, 0, -1],
    [bleed, H - bleed, -1, 0], [bleed, H - bleed, 0, 1],
    [W - bleed, H - bleed, 1, 0], [W - bleed, H - bleed, 0, 1],
  ]) {
    page.drawLine({ start: { x, y }, end: { x: x + dx * L, y: y + dy * L }, thickness: t, color: rgb(0.5, 0.5, 0.5) });
  }
}

function brand(page, cx, y, sizePt, bold) {
  // "boom" blanc + ".contact" orange, centré sur cx
  const w1 = bold.widthOfTextAtSize('boom', sizePt);
  const w2 = bold.widthOfTextAtSize('.contact', sizePt);
  const x = cx - (w1 + w2) / 2;
  page.drawText('boom', { x, y, size: sizePt, font: bold, color: WHITE });
  page.drawText('.contact', { x: x + w1, y, size: sizePt, font: bold, color: BOOM });
}

async function main() {
  const doc = await PDFDocument.create();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const reg = await doc.embedFont(StandardFonts.Helvetica);

  const qrSticker = await doc.embedPng(await qrPng('https://www.boom.contact/?utm_source=sticker&utm_medium=print'));
  const qrPartner = await doc.embedPng(await qrPng('https://www.boom.contact/?utm_source=acs-rangiers&utm_medium=print'));

  const center = (page, font, text, size, y, color) => {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (page.getWidth() - w) / 2, y, size, font, color });
  };

  // ── Page 1 : autocollant 70×70 mm (fond perdu 2 mm) ──
  {
    const bleed = 2 * MM, side = 70 * MM, W = side + 2 * bleed, H = side + 2 * bleed;
    const p = doc.addPage([W, H]);
    p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: NAVY });
    p.drawRectangle({ x: 0, y: H - 5 * MM, width: W, height: 5 * MM, color: BOOM });
    brand(p, W / 2, H - 14 * MM, 17, bold);
    center(p, reg, 'Le constat, directement sur votre téléphone', 7.2, H - 19.5 * MM, GREY);
    const q = 30 * MM;
    p.drawRectangle({ x: (W - q) / 2 - 2 * MM, y: H - 25 * MM - q - 2 * MM, width: q + 4 * MM, height: q + 4 * MM, color: WHITE });
    p.drawImage(qrSticker, { x: (W - q) / 2, y: H - 25 * MM - q, width: q, height: q });
    center(p, bold, 'EN CAS D\u2019ACCIDENT : SCANNEZ', 9, 12.5 * MM, AMBER);
    center(p, bold, 'www.boom.contact', 9.5, 7 * MM, WHITE);
    cropMarks(p, bleed, W, H);
  }

  // ── Page 2 : carte boîte à gants 85×55 mm ──
  {
    const bleed = 2 * MM, W = 85 * MM + 2 * bleed, H = 55 * MM + 2 * bleed;
    const p = doc.addPage([W, H]);
    p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: NAVY });
    p.drawRectangle({ x: 0, y: 0, width: 3.5 * MM, height: H, color: BOOM });
    const q = 33 * MM, qx = W - q - 7 * MM, qy = (H - q) / 2 - 1.5 * MM;
    p.drawRectangle({ x: qx - 1.8 * MM, y: qy - 1.8 * MM, width: q + 3.6 * MM, height: q + 3.6 * MM, color: WHITE });
    p.drawImage(qrSticker, { x: qx, y: qy, width: q, height: q });
    const tx = 9 * MM;
    p.drawText('boom', { x: tx, y: H - 13 * MM, size: 14.5, font: bold, color: WHITE });
    p.drawText('.contact', { x: tx + bold.widthOfTextAtSize('boom', 14.5), y: H - 13 * MM, size: 14.5, font: bold, color: BOOM });
    p.drawText('Gardez cette carte', { x: tx, y: H - 20 * MM, size: 8.2, font: bold, color: AMBER });
    p.drawText('dans votre boîte à gants.', { x: tx, y: H - 24 * MM, size: 8.2, font: bold, color: AMBER });
    for (const [i, line] of ['Accident ? Scannez le code :', 'photos, croquis, signatures,', 'PDF envoyé à votre assureur.'].entries()) {
      p.drawText(line, { x: tx, y: H - 31 * MM - i * 4 * MM, size: 7.2, font: reg, color: GREY });
    }
    p.drawText('www.boom.contact', { x: tx, y: 7.5 * MM, size: 8.6, font: bold, color: WHITE });
    cropMarks(p, bleed, W, H);
  }

  // ── Page 3 : variante PARTENAIRE (zone logo réservée — maquette de discussion) ──
  {
    const bleed = 2 * MM, side = 70 * MM, W = side + 2 * bleed, H = side + 2 * bleed;
    const p = doc.addPage([W, H]);
    p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: NAVY });
    p.drawRectangle({ x: 0, y: H - 5 * MM, width: W, height: 5 * MM, color: BOOM });
    brand(p, W / 2, H - 13 * MM, 15, bold);
    const q = 30 * MM;
    p.drawRectangle({ x: (W - q) / 2 - 2 * MM, y: H - 20 * MM - q - 2 * MM, width: q + 4 * MM, height: q + 4 * MM, color: WHITE });
    p.drawImage(qrPartner, { x: (W - q) / 2, y: H - 20 * MM - q, width: q, height: q });
    center(p, bold, 'EN CAS D\u2019ACCIDENT : SCANNEZ', 8.2, 17.5 * MM, AMBER);
    // Bandeau co-branding : zone logo partenaire réservée
    const bw = 50 * MM, bh = 9 * MM, bx = (W - bw) / 2, by = 5 * MM;
    p.drawRectangle({ x: bx, y: by, width: bw, height: bh, borderColor: GREY, borderWidth: 0.6, borderDashArray: [3, 2.2], color: rgb(0.075, 0.075, 0.13) });
    center(p, reg, 'Recommandé par', 5.6, by + bh - 3.2 * MM, GREY);
    center(p, bold, '[ LOGO PARTENAIRE ]', 6.4, by + 1.8 * MM, WHITE);
    cropMarks(p, bleed, W, H);
  }

  const bytes = await doc.save();
  fs.writeFileSync('/mnt/user-data/outputs/boom-contact-autocollants-QR-print.pdf', bytes);
  console.log('PDF généré:', bytes.length, 'octets, 3 pages');
}
main().catch(e => { console.error(e); process.exit(1); });
