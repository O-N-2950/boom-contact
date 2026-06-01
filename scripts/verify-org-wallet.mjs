#!/usr/bin/env node
/**
 * verify-org-wallet.mjs — Inspection LECTURE SEULE du wallet d'une organisation.
 *
 * Usage :   node scripts/verify-org-wallet.mjs <organizationId>
 *
 * - Aucun secret en dur : lit DATABASE_URL depuis l'environnement.
 * - Lecture seule (SELECT uniquement) : ne modifie jamais la base.
 * - Utilise postgres.js (dépendance du projet). À exécuter manuellement
 *   (Railway shell ou local avec DATABASE_URL exporté). NE PAS appeler en prod auto.
 */
import process from 'node:process';

const orgId = process.argv[2];
if (!orgId) { console.error('Usage: node scripts/verify-org-wallet.mjs <organizationId>'); process.exit(1); }
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL manquant dans l'environnement."); process.exit(1); }

let postgres;
try { postgres = (await import('postgres')).default; }
catch { console.error('Module "postgres" introuvable (lancer depuis la racine du repo).'); process.exit(1); }

const sql = postgres(url, { max: 1, idle_timeout: 5, ssl: url.includes('localhost') ? false : 'require' });
try {
  const wallet = await sql`SELECT id, credits, updated_at FROM credit_wallets
    WHERE owner_type = 'organization' AND organization_id = ${orgId}`;
  if (!wallet.length) {
    console.log(`Aucun wallet pour l'organisation ${orgId} (sera créé au premier crédit).`);
  } else {
    const w = wallet[0];
    console.log(`\n=== Wallet org ${orgId} ===`);
    console.log(`  id=${w.id}  solde=${w.credits} crédits  maj=${w.updated_at?.toISOString?.() || w.updated_at}`);

    const txns = await sql`SELECT type, amount, balance_after, reason, related_session_id, related_payment_id, created_at
      FROM wallet_transactions WHERE wallet_id = ${w.id} ORDER BY created_at DESC LIMIT 20`;
    console.log(`\n  --- ${txns.length} dernières transactions ---`);
    for (const t of txns) {
      console.log(`  ${t.created_at?.toISOString?.() || t.created_at}  ${String(t.type).padEnd(11)} ${String(t.amount).padStart(4)}  solde->${t.balance_after}  ${t.reason || ''}  pay=${t.related_payment_id || '-'}`);
    }

    const dup = await sql`SELECT related_payment_id, COUNT(*)::int c FROM wallet_transactions
      WHERE wallet_id = ${w.id} AND type = 'purchase' AND related_payment_id IS NOT NULL
      GROUP BY related_payment_id HAVING COUNT(*) > 1`;
    if (dup.length) console.log(`\n  ⚠️ DOUBLE CRÉDIT : ${dup.map(r => r.related_payment_id).join(', ')}`);
    else console.log(`\n  ✅ Idempotence OK : aucun related_payment_id dupliqué (purchase).`);
  }

  const pays = await sql`SELECT stripe_session_id, status, credits_granted, amount_cents, currency, paid_at
    FROM payments WHERE package_label LIKE '%entreprise%' ORDER BY created_at DESC LIMIT 10`;
  console.log(`\n  --- ${pays.length} derniers paiements entreprise ---`);
  for (const p of pays) console.log(`  ${p.stripe_session_id}  ${p.status}  +${p.credits_granted}  ${p.amount_cents/100} ${p.currency}  ${p.paid_at ? 'payé' : 'pending'}`);
  console.log('');
} finally { await sql.end({ timeout: 5 }); }
