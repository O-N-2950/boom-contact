#!/usr/bin/env node
/**
 * verify-org-wallet.mjs — Inspection LECTURE SEULE du wallet d'une organisation.
 *
 * Usage :   node scripts/verify-org-wallet.mjs <organizationId>
 *
 * - Aucun secret en dur : lit DATABASE_URL depuis l'environnement.
 * - Lecture seule (SELECT uniquement) : ne modifie jamais la base.
 * - À exécuter manuellement (Railway shell ou local avec DATABASE_URL test exporté).
 *   NE PAS appeler automatiquement en prod.
 *
 * Sortie : solde du wallet org + dernières wallet_transactions + payments liés.
 */
import process from 'node:process';

const orgId = process.argv[2];
if (!orgId) {
  console.error('Usage: node scripts/verify-org-wallet.mjs <organizationId>');
  process.exit(1);
}
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL manquant dans l\'environnement.');
  process.exit(1);
}

let pg;
try { pg = await import('pg'); }
catch { console.error('Module "pg" requis (npm i pg).'); process.exit(1); }

const client = new pg.default.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  const wallet = await client.query(
    `SELECT id, owner_type, organization_id, credits, created_at, updated_at
       FROM credit_wallets
      WHERE owner_type = 'organization' AND organization_id = $1`, [orgId]);
  if (!wallet.rows.length) {
    console.log(`Aucun wallet pour l'organisation ${orgId} (sera créé au premier crédit).`);
  } else {
    const w = wallet.rows[0];
    console.log(`\n=== Wallet org ${orgId} ===`);
    console.log(`  id=${w.id}  solde=${w.credits} crédits  maj=${w.updated_at?.toISOString?.() || w.updated_at}`);

    const txns = await client.query(
      `SELECT type, amount, balance_after, reason, related_session_id, related_payment_id, created_at
         FROM wallet_transactions WHERE wallet_id = $1
        ORDER BY created_at DESC LIMIT 20`, [w.id]);
    console.log(`\n  --- ${txns.rows.length} dernières transactions ---`);
    for (const t of txns.rows) {
      console.log(`  ${t.created_at?.toISOString?.() || t.created_at}  ${t.type.padEnd(11)} ${String(t.amount).padStart(4)}  solde→${t.balance_after}  ${t.reason || ''}  pay=${t.related_payment_id || '-'}  sess=${t.related_session_id || '-'}`);
    }

    // Idempotence : compter les transactions purchase par related_payment_id
    const dup = await client.query(
      `SELECT related_payment_id, COUNT(*) c FROM wallet_transactions
        WHERE wallet_id = $1 AND type = 'purchase' AND related_payment_id IS NOT NULL
        GROUP BY related_payment_id HAVING COUNT(*) > 1`, [w.id]);
    if (dup.rows.length) {
      console.log(`\n  ⚠️ DOUBLE CRÉDIT détecté pour : ${dup.rows.map(r => r.related_payment_id).join(', ')}`);
    } else {
      console.log(`\n  ✅ Idempotence OK : aucun related_payment_id dupliqué (type purchase).`);
    }
  }

  const pays = await client.query(
    `SELECT stripe_session_id, status, credits_granted, amount_cents, currency, paid_at
       FROM payments WHERE package_label LIKE '%entreprise%'
      ORDER BY created_at DESC LIMIT 10`);
  console.log(`\n  --- ${pays.rows.length} derniers paiements entreprise ---`);
  for (const p of pays.rows) {
    console.log(`  ${p.stripe_session_id}  ${p.status}  +${p.credits_granted}  ${p.amount_cents/100} ${p.currency}  ${p.paid_at ? 'payé' : 'pending'}`);
  }
  console.log('');
} finally {
  await client.end();
}
