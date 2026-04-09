/**
 * resend-pdf.ts — Script one-shot pour re-générer et renvoyer un PDF constat
 *
 * Usage (sur Railway ou en local avec DATABASE_URL + RESEND_API_KEY):
 *
 *   npx tsx server/src/scripts/resend-pdf.ts --email info@winwin.swiss
 *   npx tsx server/src/scripts/resend-pdf.ts --session <SESSION_ID> --to info@winwin.swiss
 *
 * Options:
 *   --email <email>     Cherche les sessions liées à cet email et les affiche
 *   --session <id>      ID de la session à renvoyer
 *   --to <email>        Email de destination (défaut: email du conducteur A)
 *   --role A|B          Rôle pour le PDF (défaut: A)
 *   --send              Envoyer effectivement l'email (sans ce flag: dry-run, affiche les infos)
 */

import { db, schema } from '../db/index.js';
import { sessions } from '../db/schema.js';
import { eq, desc, or, sql, ilike } from 'drizzle-orm';
import { getSession } from '../services/session.service.js';
import { generateConstatPDF } from '../services/pdf.service.js';
import { sendPDFToDriver } from '../services/email.service.js';

// ── Parse CLI args ──────────────────────────────────────────────
function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= process.argv.length) return undefined;
  return process.argv[idx + 1];
}
const hasFlag = (name: string) => process.argv.includes(`--${name}`);

async function main() {
  const email = getArg('email');
  const sessionId = getArg('session');
  const toEmail = getArg('to');
  const role = (getArg('role') || 'A') as 'A' | 'B';
  const doSend = hasFlag('send');

  console.log('=== boom.contact — Resend PDF Script ===\n');

  // ── Mode 1: Search by email ───────────────────────────────────
  if (email && !sessionId) {
    const emailLower = email.toLowerCase();
    console.log(`Recherche des sessions pour: ${emailLower}\n`);

    const results = await db.select({
      id: sessions.id,
      status: sessions.status,
      createdAt: sessions.createdAt,
      ownerEmail: sessions.ownerEmail,
      vehicleCount: sessions.vehicleCount,
      participantA: sessions.participantA,
      participantB: sessions.participantB,
    })
    .from(sessions)
    .where(
      or(
        ilike(sessions.ownerEmail, emailLower),
        sql`lower(${sessions.participantA}->'driver'->>'email') = ${emailLower}`,
        sql`lower(${sessions.participantB}->'driver'->>'email') = ${emailLower}`,
      )
    )
    .orderBy(desc(sessions.createdAt))
    .limit(20);

    if (results.length === 0) {
      console.log('Aucune session trouvée pour cet email.');
      process.exit(0);
    }

    console.log(`${results.length} session(s) trouvée(s):\n`);
    for (const r of results) {
      const dA = (r.participantA as any)?.driver;
      const dB = (r.participantB as any)?.driver;
      const sigA = !!(r.participantA as any)?.signature;
      console.log(`  ID: ${r.id}`);
      console.log(`    Status: ${r.status} | Véhicules: ${r.vehicleCount ?? 2} | Créé: ${r.createdAt.toISOString()}`);
      console.log(`    Conducteur A: ${dA?.firstName ?? '?'} ${dA?.lastName ?? '?'} <${dA?.email ?? 'N/A'}> | Signé: ${sigA ? 'OUI' : 'NON'}`);
      if (dB) {
        console.log(`    Conducteur B: ${dB?.firstName ?? '?'} ${dB?.lastName ?? '?'} <${dB?.email ?? 'N/A'}>`);
      } else {
        console.log(`    Conducteur B: (aucun — constat solo)`);
      }
      console.log('');
    }

    console.log('Pour renvoyer un PDF, relancez avec:');
    console.log(`  npx tsx server/src/scripts/resend-pdf.ts --session <ID> --to ${email} --send`);
    process.exit(0);
  }

  // ── Mode 2: Resend PDF for a specific session ─────────────────
  if (!sessionId) {
    console.error('Erreur: --email ou --session requis.');
    console.error('Usage:');
    console.error('  npx tsx server/src/scripts/resend-pdf.ts --email info@winwin.swiss');
    console.error('  npx tsx server/src/scripts/resend-pdf.ts --session <ID> --to info@winwin.swiss --send');
    process.exit(1);
  }

  console.log(`Session: ${sessionId} | Rôle: ${role} | Envoi: ${doSend ? 'OUI' : 'DRY-RUN'}\n`);

  const session = await getSession(sessionId);
  if (!session) {
    console.error(`Session ${sessionId} introuvable.`);
    process.exit(1);
  }

  console.log(`Status: ${session.status}`);
  const participant = role === 'A' ? session.participantA : session.participantB;
  const driverEmail = participant?.driver?.email;
  const driverName = [participant?.driver?.firstName, participant?.driver?.lastName].filter(Boolean).join(' ') || 'Conducteur';
  console.log(`Conducteur ${role}: ${driverName} <${driverEmail ?? 'N/A'}>`);

  const aHasSigned = !!session.participantA?.signature;
  const canGenerate = session.status === 'completed'
    || (session.status === 'signing' && aHasSigned)
    || (session.status === 'active' && aHasSigned);

  if (!canGenerate) {
    console.error(`\nImpossible de générer le PDF: status=${session.status}, signé A=${aHasSigned}`);
    process.exit(1);
  }

  // Generate PDF
  console.log('\nGénération du PDF...');
  const pdfBytes = await generateConstatPDF(session, role);
  const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
  console.log(`PDF généré: ${(pdfBytes.length / 1024).toFixed(1)} KB`);

  const destination = toEmail || driverEmail;
  if (!destination) {
    console.error('Aucun email de destination. Utilisez --to <email>');
    process.exit(1);
  }

  if (!doSend) {
    console.log(`\n[DRY-RUN] Le PDF serait envoyé à: ${destination}`);
    console.log('Ajoutez --send pour envoyer réellement.');
    process.exit(0);
  }

  // Send email
  console.log(`\nEnvoi à ${destination}...`);
  const result = await sendPDFToDriver({
    driverEmail: destination,
    driverName,
    role,
    sessionId,
    pdfBase64,
    insurerName: participant?.insurance?.company,
    language: participant?.language || 'fr',
  });

  if (result.ok) {
    console.log(`Email envoyé avec succès! messageId: ${result.messageId}`);
  } else {
    console.error(`Échec de l'envoi: ${result.error}`);
    process.exit(1);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
