/**
 * QR-facture suisse — payable par virement bancaire (Raiffeisen, QR-IBAN).
 *
 * Flux (OPTION A — réconciliation manuelle, décidé avec Olivier) :
 *   1. Le client choisit « Payer par facture » à la commande (CHF uniquement)
 *      → createInvoice() : n° séquentiel, référence QRR unique, PDF QR-bill conforme,
 *        email au client avec la facture en pièce jointe. Statut 'pending'.
 *   2. Olivier voit le virement sur son e-banking (la référence QRR y figure)
 *      → back-office admin « marquer payée » → markInvoicePaid() : crédite le compte
 *        (créé au besoin), statut 'paid', email de confirmation au client.
 *
 * La référence QRR (27 chiffres) est LA clé de réconciliation : elle encode le n° de
 * facture et revient telle quelle dans le relevé bancaire. Elle rend possible plus
 * tard la réconciliation semi-automatique camt.054 sans rien réécrire.
 *
 * Pas de TVA (PEP's Swiss SA non assujettie — en dessous du seuil CHF 100k).
 */
import crypto from 'crypto';
import { eq, desc } from 'drizzle-orm';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { SwissQRBill } from 'swissqrbill/svg';
import { calculateQRReferenceChecksum } from 'swissqrbill/utils';
import { db } from '../db/index.js';
import { invoices, users } from '../db/schema.js';
import { PACKAGES, getPrice, formatPrice, type PackageId } from './stripe.service.js';
import { getResendClient } from './email.service.js';
import { logger } from '../logger.js';

// ── Coordonnées créancier (PEP's Swiss SA — compte Raiffeisen) ───────────────
const CREDITOR = {
  account: 'CH2630808004706611151', // QR-IBAN (≠ IBAN classique) — création de factures QR
  name: "PEP's Swiss SA",
  address: 'Bellevue 7',
  zip: 2950,
  city: 'Courgenay',
  country: 'CH',
} as const;

type InvoiceLang = 'fr' | 'de' | 'it' | 'en';
const QR_LANG: Record<InvoiceLang, 'FR' | 'DE' | 'IT' | 'EN'> = { fr: 'FR', de: 'DE', it: 'IT', en: 'EN' };

function pickLang(l?: string): InvoiceLang {
  const s = (l || 'fr').slice(0, 2).toLowerCase();
  return (['fr', 'de', 'it', 'en'] as const).includes(s as InvoiceLang) ? (s as InvoiceLang) : 'fr';
}

function nanoid(len = 20): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  const bytes = crypto.randomBytes(len);
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

/** Référence QRR 27 chiffres : année (4) + n° de facture paddé (22) + checksum (1). */
export function buildQrReference(invoiceNumber: number, year = new Date().getFullYear()): string {
  const base26 = `${year}${String(invoiceNumber).padStart(22, '0')}`;
  if (base26.length !== 26) throw new Error(`QRR base invalide (${base26.length} ≠ 26)`);
  return base26 + calculateQRReferenceChecksum(base26);
}

/** N° d'affichage lisible : 2026-000042 */
export function displayNumber(invoiceNumber: number, createdAt: Date): string {
  return `${createdAt.getFullYear()}-${String(invoiceNumber).padStart(6, '0')}`;
}

// ── Génération du PDF facture + QR-bill conforme ─────────────────────────────
const L = {
  fr: { invoice: 'FACTURE', number: 'Facture n°', date: 'Date', dueIn: 'Payable sous 30 jours par virement bancaire (QR-facture ci-dessous)', item: 'Désignation', qty: 'Qté', amount: 'Montant', credits: (n: number, p: string) => `${p} — ${n} crédit(s) constat boom.contact`, noVat: 'TVA non applicable (non assujetti).', thanks: 'Merci de votre confiance. Les crédits seront activés dès réception du paiement.' },
  de: { invoice: 'RECHNUNG', number: 'Rechnung Nr.', date: 'Datum', dueIn: 'Zahlbar innert 30 Tagen per Banküberweisung (QR-Rechnung unten)', item: 'Bezeichnung', qty: 'Menge', amount: 'Betrag', credits: (n: number, p: string) => `${p} — ${n} boom.contact Unfallbericht-Guthaben`, noVat: 'Keine MwSt. (nicht mehrwertsteuerpflichtig).', thanks: 'Vielen Dank für Ihr Vertrauen. Die Guthaben werden nach Zahlungseingang aktiviert.' },
  it: { invoice: 'FATTURA', number: 'Fattura n.', date: 'Data', dueIn: 'Pagabile entro 30 giorni tramite bonifico bancario (QR-fattura sotto)', item: 'Descrizione', qty: 'Qtà', amount: 'Importo', credits: (n: number, p: string) => `${p} — ${n} crediti constat boom.contact`, noVat: 'IVA non applicabile (non assoggettato).', thanks: 'Grazie per la fiducia. I crediti saranno attivati alla ricezione del pagamento.' },
  en: { invoice: 'INVOICE', number: 'Invoice no.', date: 'Date', dueIn: 'Payable within 30 days by bank transfer (Swiss QR-bill below)', item: 'Description', qty: 'Qty', amount: 'Amount', credits: (n: number, p: string) => `${p} — ${n} boom.contact report credit(s)`, noVat: 'No VAT (not subject to VAT).', thanks: 'Thank you for your trust. Credits are activated upon receipt of payment.' },
} as const;

export async function generateInvoicePdf(inv: {
  invoiceNumber: number; email: string; packageId: string; credits: number;
  amountCents: number; currency: string; qrReference: string; language: string; createdAt: Date;
}): Promise<Buffer> {
  const lang = pickLang(inv.language);
  const t = L[lang];
  const amount = inv.amountCents / 100;

  // 1) QR-bill SVG conforme (récépissé + section paiement), langue du client
  const qr = new SwissQRBill({
    currency: inv.currency as 'CHF' | 'EUR',
    amount,
    reference: inv.qrReference,
    creditor: { ...CREDITOR },
    message: `boom.contact ${displayNumber(inv.invoiceNumber, inv.createdAt)}`,
  }, { language: QR_LANG[lang] });
  const svg = qr.toString();

  // 2) SVG → PNG net (sharp), largeur A4 à ~200 dpi
  const { default: sharp } = await import('sharp');
  const qrPng = await sharp(Buffer.from(svg), { density: 200 }).resize({ width: 1654 }).png().toBuffer();

  // 3) Page A4 pdf-lib : en-tête facture + QR-bill collé en bas (format officiel 210×105 mm)
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4 pt
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.07, 0.23, 0.35);
  const grey = rgb(0.36, 0.42, 0.49);

  // Émetteur
  page.drawText('boom.contact', { x: 50, y: 790, size: 20, font: bold, color: navy });
  page.drawText(`${CREDITOR.name} — Groupe NEUKOMM`, { x: 50, y: 772, size: 10, font, color: grey });
  page.drawText(`${CREDITOR.address}, ${CREDITOR.zip} ${CREDITOR.city}, Suisse · CHE-476.484.632`, { x: 50, y: 759, size: 9, font, color: grey });

  // Titre + méta
  page.drawText(t.invoice, { x: 50, y: 715, size: 16, font: bold, color: navy });
  const num = displayNumber(inv.invoiceNumber, inv.createdAt);
  page.drawText(`${t.number} ${num}`, { x: 50, y: 695, size: 11, font, color: navy });
  page.drawText(`${t.date}: ${inv.createdAt.toLocaleDateString('fr-CH')}`, { x: 50, y: 680, size: 11, font, color: navy });
  page.drawText(inv.email, { x: 380, y: 695, size: 11, font, color: navy });

  // Tableau (1 ligne)
  const pkg = PACKAGES[inv.packageId as PackageId];
  const label = pkg ? pkg.label : inv.packageId;
  page.drawLine({ start: { x: 50, y: 650 }, end: { x: 545, y: 650 }, thickness: 0.8, color: navy });
  page.drawText(t.item, { x: 50, y: 636, size: 10, font: bold, color: navy });
  page.drawText(t.amount, { x: 480, y: 636, size: 10, font: bold, color: navy });
  page.drawLine({ start: { x: 50, y: 628 }, end: { x: 545, y: 628 }, thickness: 0.5, color: grey });
  page.drawText(t.credits(inv.credits, label), { x: 50, y: 612, size: 10.5, font, color: navy });
  page.drawText(formatPrice(inv.amountCents, inv.currency as any), { x: 480, y: 612, size: 10.5, font: bold, color: navy });
  page.drawLine({ start: { x: 50, y: 598 }, end: { x: 545, y: 598 }, thickness: 0.8, color: navy });

  // Mentions
  page.drawText(t.noVat, { x: 50, y: 575, size: 9, font, color: grey });
  page.drawText(t.dueIn, { x: 50, y: 561, size: 9, font, color: grey });
  page.drawText(t.thanks, { x: 50, y: 547, size: 9, font, color: grey });

  // QR-bill en bas de page — format officiel : 210 mm × 105 mm = 595.28 × 297.64 pt
  const png = await pdf.embedPng(qrPng);
  const qrH = 297.64;
  page.drawImage(png, { x: 0, y: 0, width: 595.28, height: qrH });

  return Buffer.from(await pdf.save());
}

// ── Création de facture (à la commande) ──────────────────────────────────────
export async function createInvoice(params: {
  email: string; packageId: string; language?: string; userId?: string;
}): Promise<{ id: string; invoiceNumber: number; displayNumber: string; qrReference: string; amountCents: number; currency: string }> {
  const pkg = PACKAGES[params.packageId as PackageId];
  if (!pkg) throw new Error('INVALID_PACKAGE');
  const currency = 'CHF'; // QR-facture = virement suisse uniquement
  const amountCents = getPrice(params.packageId as PackageId, currency);
  const email = params.email.trim().toLowerCase();
  const language = pickLang(params.language);
  const id = nanoid();

  // Insert → récupère le n° séquentiel → calcule et pose la référence QRR
  const [row] = await db.insert(invoices).values({
    id, email, userId: params.userId ?? null, packageId: params.packageId,
    credits: pkg.credits, amountCents, currency, language, status: 'pending',
  }).returning({ invoiceNumber: invoices.invoiceNumber, createdAt: invoices.createdAt });

  const qrReference = buildQrReference(row.invoiceNumber, row.createdAt.getFullYear());
  await db.update(invoices).set({ qrReference, updatedAt: new Date() }).where(eq(invoices.id, id));

  // PDF + email (l'échec d'email n'annule pas la facture — loggé, renvoyable)
  try {
    const pdfBuffer = await generateInvoicePdf({
      invoiceNumber: row.invoiceNumber, email, packageId: params.packageId, credits: pkg.credits,
      amountCents, currency, qrReference, language, createdAt: row.createdAt,
    });
    await sendInvoiceEmail(email, language, pdfBuffer, {
      number: displayNumber(row.invoiceNumber, row.createdAt),
      amount: formatPrice(amountCents, currency), credits: pkg.credits,
    });
  } catch (e: unknown) {
    logger.error('Invoice email failed (facture créée, email à renvoyer)', { id, error: e instanceof Error ? e.message : String(e) });
  }

  logger.info('Invoice created', { id, number: row.invoiceNumber, amountCents });
  return { id, invoiceNumber: row.invoiceNumber, displayNumber: displayNumber(row.invoiceNumber, row.createdAt), qrReference, amountCents, currency };
}

// ── Réconciliation manuelle (admin) ──────────────────────────────────────────
export async function markInvoicePaid(invoiceId: string, adminEmail: string): Promise<{ ok: true; credited: number; email: string }> {
  const inv = await db.query.invoices.findFirst({ where: eq(invoices.id, invoiceId) });
  if (!inv) throw new Error('INVOICE_NOT_FOUND');
  if (inv.status === 'paid') throw new Error('ALREADY_PAID');
  if (inv.status === 'cancelled') throw new Error('INVOICE_CANCELLED');

  // Upsert utilisateur par email + crédit (même logique que le webhook Stripe)
  const existing = await db.query.users.findFirst({ where: eq(users.email, inv.email) });
  if (existing) {
    await db.update(users).set({ credits: (existing.credits ?? 0) + inv.credits }).where(eq(users.id, existing.id));
  } else {
    await db.insert(users).values({ id: nanoid(), email: inv.email, role: 'customer', credits: inv.credits });
  }

  await db.update(invoices).set({ status: 'paid', paidAt: new Date(), paidByAdmin: adminEmail, updatedAt: new Date() }).where(eq(invoices.id, invoiceId));
  logger.info('Invoice marked paid', { invoiceId, by: adminEmail, credits: inv.credits });

  try { await sendInvoicePaidEmail(inv.email, pickLang(inv.language), { credits: inv.credits, number: displayNumber(inv.invoiceNumber, inv.createdAt) }); }
  catch (e: unknown) { logger.warn('Invoice paid email failed', { invoiceId, error: e instanceof Error ? e.message : String(e) }); }

  return { ok: true, credited: inv.credits, email: inv.email };
}

export async function listInvoices(limit = 100) {
  return db.query.invoices.findMany({ orderBy: [desc(invoices.createdAt)], limit });
}

// ── Emails (4 langues exposées, cohérent avec l'app) ─────────────────────────
const M = {
  fr: { subj: (n: string) => `🧾 Votre facture boom.contact ${n}`, body: (a: string) => `Votre facture (${a}) est en pièce jointe. Payez-la par virement depuis votre e-banking en scannant le QR-code suisse — vos crédits seront activés dès réception du paiement.`, paidSubj: '✅ Paiement reçu — vos crédits boom.contact sont actifs', paidBody: (c: number) => `Nous avons bien reçu votre paiement. ${c} crédit(s) constat ont été ajoutés à votre compte. Merci !` },
  de: { subj: (n: string) => `🧾 Ihre boom.contact Rechnung ${n}`, body: (a: string) => `Ihre Rechnung (${a}) finden Sie im Anhang. Bezahlen Sie per Banküberweisung, indem Sie den Schweizer QR-Code in Ihrem E-Banking scannen — Ihre Guthaben werden nach Zahlungseingang aktiviert.`, paidSubj: '✅ Zahlung erhalten — Ihre boom.contact Guthaben sind aktiv', paidBody: (c: number) => `Wir haben Ihre Zahlung erhalten. ${c} Guthaben wurden Ihrem Konto gutgeschrieben. Danke!` },
  it: { subj: (n: string) => `🧾 La sua fattura boom.contact ${n}`, body: (a: string) => `La sua fattura (${a}) è in allegato. La paghi tramite bonifico scansionando il QR-code svizzero nel suo e-banking — i crediti saranno attivati alla ricezione del pagamento.`, paidSubj: '✅ Pagamento ricevuto — i suoi crediti boom.contact sono attivi', paidBody: (c: number) => `Abbiamo ricevuto il suo pagamento. ${c} crediti sono stati aggiunti al suo conto. Grazie!` },
  en: { subj: (n: string) => `🧾 Your boom.contact invoice ${n}`, body: (a: string) => `Your invoice (${a}) is attached. Pay by bank transfer by scanning the Swiss QR code in your e-banking — your credits will be activated upon receipt of payment.`, paidSubj: '✅ Payment received — your boom.contact credits are active', paidBody: (c: number) => `We have received your payment. ${c} credit(s) have been added to your account. Thank you!` },
} as const;

function emailShell(title: string, body: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;background:#F4F6F9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:24px 0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;overflow:hidden">
<tr><td style="background:#123A5A;padding:18px 26px"><span style="font-size:20px">💥</span> <span style="color:#fff;font-weight:800;font-size:17px">boom.contact</span></td></tr>
<tr><td style="padding:28px 26px"><h1 style="margin:0 0 12px;color:#123A5A;font-size:19px">${title}</h1>
<p style="margin:0;color:#5D6B7C;line-height:1.6;font-size:15px">${body}</p></td></tr>
<tr><td style="padding:16px 26px;border-top:1px solid #E7EBF0;color:#8A93A6;font-size:12px">PEP's Swiss SA · Bellevue 7, 2950 Courgenay · privacy@boom.contact</td></tr>
</table></td></tr></table></body></html>`;
}

async function sendInvoiceEmail(to: string, lang: InvoiceLang, pdf: Buffer, p: { number: string; amount: string; credits: number }) {
  const resend = await getResendClient();
  const m = M[lang];
  const { error } = await resend.emails.send({
    from: 'boom.contact <contact@boom.contact>', to,
    subject: m.subj(p.number),
    html: emailShell(m.subj(p.number).replace('🧾 ', ''), m.body(p.amount)),
    attachments: [{ filename: `facture-${p.number}.pdf`, content: pdf }],
  });
  if (error) throw new Error(error.message);
  logger.email('sent', to, `invoice ${p.number}`);
}

async function sendInvoicePaidEmail(to: string, lang: InvoiceLang, p: { credits: number; number: string }) {
  const resend = await getResendClient();
  const m = M[lang];
  const { error } = await resend.emails.send({
    from: 'boom.contact <contact@boom.contact>', to,
    subject: m.paidSubj,
    html: emailShell(m.paidSubj.replace('✅ ', ''), m.paidBody(p.credits)),
  });
  if (error) throw new Error(error.message);
  logger.email('sent', to, `invoice paid ${p.number}`);
}
