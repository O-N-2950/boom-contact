#!/usr/bin/env node
/**
 * stripe-b2b-e2e-checklist.mjs — Vérification E2E LECTURE SEULE d'un achat de crédits entreprise.
 *
 * Usage : node scripts/stripe-b2b-e2e-checklist.mjs <organizationId> [stripeSessionId] [expectedCredits]
 *
 * - Aucun secret en dur (DATABASE_URL depuis l'env). SELECT uniquement (ne modifie jamais la base).
 * - Sortie PASS/FAIL claire. Exit code 0 si tout PASS, 1 sinon.
 */
import process from 'node:process';

const [orgId, sessionId, expectedCreditsRaw] = process.argv.slice(2);
if (!orgId) { console.error('Usage: node scripts/stripe-b2b-e2e-checklist.mjs <organizationId> [stripeSessionId] [expectedCredits]'); process.exit(1); }
const expectedCredits = expectedCreditsRaw ? parseInt(expectedCreditsRaw, 10) : null;
const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL manquant.'); process.exit(1); }

let postgres;
try { postgres = (await import('postgres')).default; }
catch { console.error('Module "postgres" introuvable (lancer depuis la racine du repo).'); process.exit(1); }

const sql = postgres(url, { max: 1, idle_timeout: 5, ssl: url.includes('localhost') ? false : 'require' });
let allPass = true;
const line = (ok, label, detail = '') => { if (!ok) allPass = false; console.log(`  ${ok ? '✅' : '❌'} ${label}${detail ? ' — ' + detail : ''}`); };

try {
  console.log(`\n=== Checklist E2E B2B — org ${orgId}${sessionId ? ' · session ' + sessionId : ''} ===`);

  const wallet = (await sql`SELECT id, credits FROM credit_wallets
    WHERE owner_type='organization' AND organization_id=${orgId}`)[0];
  line(!!wallet, 'Wallet organisation existe', wallet ? `solde=${wallet.credits}` : 'introuvable');

  if (wallet) {
    // Idempotence globale : aucun related_payment_id purchase dupliqué
    const dup = await sql`SELECT related_payment_id, COUNT(*)::int c FROM wallet_transactions
      WHERE wallet_id=${wallet.id} AND type='purchase' AND related_payment_id IS NOT NULL
      GROUP BY related_payment_id HAVING COUNT(*)>1`;
    line(dup.length === 0, 'Idempotence (aucun related_payment_id dupliqué)',
      dup.length ? 'DOUBLE: ' + dup.map(r => r.related_payment_id).join(',') : 'OK');

    if (sessionId) {
      const txns = await sql`SELECT amount, balance_after, type FROM wallet_transactions
        WHERE wallet_id=${wallet.id} AND related_payment_id=${sessionId} AND type='purchase'`;
      line(txns.length === 1, 'Transaction purchase unique pour la session', `${txns.length} trouvée(s)`);
      if (txns.length === 1 && expectedCredits != null) {
        line(txns[0].amount === expectedCredits, 'Montant crédité = attendu', `${txns[0].amount} vs ${expectedCredits}`);
      }
      const pay = (await sql`SELECT status FROM payments WHERE stripe_session_id=${sessionId}`)[0];
      line(pay?.status === 'paid', 'Payment marqué paid', pay ? pay.status : 'introuvable');
    }
  }

  const pays = await sql`SELECT stripe_session_id, status, credits_granted FROM payments
    WHERE package_label LIKE '%entreprise%' ORDER BY created_at DESC LIMIT 5`;
  console.log(`\n  Derniers paiements entreprise (${pays.length}):`);
  for (const p of pays) console.log(`    ${p.stripe_session_id}  ${p.status}  +${p.credits_granted}`);

  console.log(`\n  ${allPass ? '✅ TOUS LES CONTRÔLES PASSENT' : '❌ AU MOINS UN CONTRÔLE ÉCHOUE'}\n`);
} finally { await sql.end({ timeout: 5 }); }
process.exit(allPass ? 0 : 1);
