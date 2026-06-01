/**
 * Fleet B2B — Wallet service (sprint Monetization).
 * Wallet d'organisation + routage du débit crédit selon le scope du véhicule.
 * Coexiste avec users.credits (NON migré). Webhook Stripe NON touché.
 */
import crypto from 'crypto';
import { db } from '../db/index.js';
import { creditWallets, walletTransactions, sessions, organizationMembers } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from '../logger.js';
import { getUserOrganizationRole, type OrgRole } from './organization.service.js';
import { useCredit, getUserCredits } from './stripe.service.js';

function nanoid(len = 20): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(len);
  return Array.from(bytes).map(b => chars[b % chars.length]).join('');
}

export type BillingSource = 'personal' | 'organization';
// Rôles autorisés à consommer le wallet d'organisation (les viewers ne consomment pas).
const CONSUMING_ROLES: readonly OrgRole[] = ['owner', 'fleet_admin', 'driver'];

// ── Wallet organisation ──────────────────────────────────────
export async function getOrCreateOrganizationWallet(organizationId: string) {
  const existing = await db.query.creditWallets.findFirst({
    where: and(eq(creditWallets.ownerType, 'organization'), eq(creditWallets.organizationId, organizationId)),
  });
  if (existing) return existing;
  const id = nanoid();
  const now = new Date();
  await db.insert(creditWallets).values({
    id, ownerType: 'organization', organizationId, credits: 0, createdAt: now, updatedAt: now,
  });
  const created = await db.query.creditWallets.findFirst({ where: eq(creditWallets.id, id) });
  return created!;
}

export async function getOrganizationWalletBalance(organizationId: string): Promise<number> {
  const w = await db.query.creditWallets.findFirst({
    where: and(eq(creditWallets.ownerType, 'organization'), eq(creditWallets.organizationId, organizationId)),
  });
  return w?.credits ?? 0;
}

/** Ajoute des crédits au wallet d'org (achat/ajustement). amount > 0. */
export async function addOrganizationCredits(organizationId: string, amount: number, reason: string, actorUserId?: string) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('CONFLICT: amount must be a positive integer');
  const wallet = await getOrCreateOrganizationWallet(organizationId);
  return db.transaction(async (tx) => {
    const [row] = await tx.update(creditWallets)
      .set({ credits: sql`${creditWallets.credits} + ${amount}`, updatedAt: new Date() })
      .where(eq(creditWallets.id, wallet.id))
      .returning({ credits: creditWallets.credits });
    await tx.insert(walletTransactions).values({
      id: nanoid(), walletId: wallet.id, type: 'purchase', amount, balanceAfter: row.credits,
      reason, relatedOrganizationId: organizationId, createdByUserId: actorUserId ?? null,
    });
    logger.info('Org wallet credited', { organizationId, amount, balanceAfter: row.credits });
    return { ok: true as const, balanceAfter: row.credits };
  });
}

/** Un utilisateur peut-il consommer le wallet de cette org ? (membre actif, rôle consommateur) */
export async function canUseOrganizationWallet(userId: string, organizationId: string): Promise<boolean> {
  const role = await getUserOrganizationRole(userId, organizationId);
  return !!role && CONSUMING_ROLES.includes(role);
}

/**
 * Consomme 1 crédit du wallet d'org pour un constat. Idempotent par sessionId.
 * Jamais de solde négatif. Re-vérifie l'appartenance.
 */
export async function consumeOrganizationCredit(organizationId: string, sessionId: string, actorUserId: string):
  Promise<{ ok: boolean; reason?: 'not_member' | 'insufficient' | 'already'; balanceAfter?: number }> {
  if (!(await canUseOrganizationWallet(actorUserId, organizationId))) return { ok: false, reason: 'not_member' };
  const wallet = await getOrCreateOrganizationWallet(organizationId);
  return db.transaction(async (tx) => {
    const existing = await tx.select({ id: walletTransactions.id })
      .from(walletTransactions)
      .where(and(
        eq(walletTransactions.walletId, wallet.id),
        eq(walletTransactions.type, 'consumption'),
        eq(walletTransactions.relatedSessionId, sessionId),
      )).limit(1);
    if (existing.length) return { ok: true as const, reason: 'already' as const };

    const result = await tx.update(creditWallets)
      .set({ credits: sql`${creditWallets.credits} - 1`, updatedAt: new Date() })
      .where(and(eq(creditWallets.id, wallet.id), sql`${creditWallets.credits} > 0`))
      .returning({ credits: creditWallets.credits });
    if (!result.length) return { ok: false as const, reason: 'insufficient' as const };

    await tx.insert(walletTransactions).values({
      id: nanoid(), walletId: wallet.id, type: 'consumption', amount: -1, balanceAfter: result[0].credits,
      reason: 'constat', relatedSessionId: sessionId, relatedOrganizationId: organizationId, createdByUserId: actorUserId,
    });
    logger.info('Org wallet consumed', { organizationId, sessionId, balanceAfter: result[0].credits });
    return { ok: true as const, balanceAfter: result[0].credits };
  });
}

// ── Billing context sur la session ───────────────────────────
/** Attache l'organisation de facturation à une session (véhicule d'org sélectionné). */
export async function setConstatBillingOrganization(userId: string, sessionId: string, organizationId: string) {
  if (!(await canUseOrganizationWallet(userId, organizationId))) throw new Error('FORBIDDEN: not allowed to bill this organization');
  await db.update(sessions).set({ billingOrganizationId: organizationId }).where(eq(sessions.id, sessionId));
  logger.info('Constat billing org attached', { sessionId, organizationId });
  return { ok: true as const };
}

/**
 * Résout la source de facturation d'un constat.
 * Règle (non bloquante) : ORGANISATION si la session pointe une org ET l'utilisateur est
 * membre consommateur actif ET le wallet d'org a un solde > 0 ; sinon PERSONNEL.
 * → tant qu'aucun achat de crédits org n'existe, on retombe proprement sur le crédit perso.
 */
export async function resolveBillingSourceForConstat(userId: string, sessionId: string):
  Promise<{ source: BillingSource; organizationId: string | null }> {
  const session = await db.query.sessions.findFirst({ where: eq(sessions.id, sessionId) });
  const orgId = (session as any)?.billingOrganizationId as string | null | undefined;
  if (!orgId) return { source: 'personal', organizationId: null };
  if (!(await canUseOrganizationWallet(userId, orgId))) return { source: 'personal', organizationId: null };
  const balance = await getOrganizationWalletBalance(orgId);
  if (balance <= 0) return { source: 'personal', organizationId: null };
  return { source: 'organization', organizationId: orgId };
}

/**
 * Consomme un crédit pour un constat en routant vers le wallet d'org ou le crédit perso.
 * Retourne la source effective. Jamais d'exception non gérée : fallback perso si l'org échoue.
 */
export async function consumeCreditForConstat(userEmail: string, userId: string, sessionId: string):
  Promise<{ ok: boolean; billingSource: BillingSource; reason?: string }> {
  const resolved = await resolveBillingSourceForConstat(userId, sessionId);
  if (resolved.source === 'organization' && resolved.organizationId) {
    const r = await consumeOrganizationCredit(resolved.organizationId, sessionId, userId);
    if (r.ok) return { ok: true, billingSource: 'organization' };
    // Course concurrente / solde tombé à 0 → fallback perso (ne jamais bloquer le PDF).
    const personal = await useCredit(userEmail, sessionId);
    return { ok: personal, billingSource: 'personal', reason: r.reason };
  }
  const personal = await useCredit(userEmail, sessionId);
  return { ok: personal, billingSource: 'personal' };
}

export { getUserCredits };

// ── Achat de crédits entreprise (appelé par le webhook Stripe) ───────────────
/** owner / fleet_admin peuvent acheter des crédits pour l'organisation. */
export async function canManageOrganizationBilling(userId: string, organizationId: string): Promise<boolean> {
  const role = await getUserOrganizationRole(userId, organizationId);
  return role === 'owner' || role === 'fleet_admin';
}

/**
 * Crédite le wallet d'org suite à un achat Stripe. IDEMPOTENT par session Stripe
 * (relatedPaymentId) → les retries de webhook ne re-créditent jamais.
 */
export async function creditOrganizationFromPurchase(
  organizationId: string, credits: number, stripeSessionId: string, actorUserId?: string | null,
): Promise<{ ok: boolean; already?: boolean; balanceAfter?: number }> {
  if (!Number.isInteger(credits) || credits <= 0) throw new Error('CONFLICT: invalid credits');
  const wallet = await getOrCreateOrganizationWallet(organizationId);
  return db.transaction(async (tx) => {
    const existing = await tx.select({ id: walletTransactions.id })
      .from(walletTransactions)
      .where(and(
        eq(walletTransactions.walletId, wallet.id),
        eq(walletTransactions.type, 'purchase'),
        eq(walletTransactions.relatedPaymentId, stripeSessionId),
      )).limit(1);
    if (existing.length) return { ok: true as const, already: true as const };

    const [row] = await tx.update(creditWallets)
      .set({ credits: sql`${creditWallets.credits} + ${credits}`, updatedAt: new Date() })
      .where(eq(creditWallets.id, wallet.id))
      .returning({ credits: creditWallets.credits });
    await tx.insert(walletTransactions).values({
      id: nanoid(), walletId: wallet.id, type: 'purchase', amount: credits, balanceAfter: row.credits,
      reason: 'org_checkout', relatedPaymentId: stripeSessionId, relatedOrganizationId: organizationId,
      createdByUserId: actorUserId ?? null,
    });
    logger.info('Org wallet credited from purchase', { organizationId, credits, balanceAfter: row.credits, stripeSessionId });
    return { ok: true as const, balanceAfter: row.credits };
  });
}
