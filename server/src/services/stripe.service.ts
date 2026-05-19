import { logger } from '../logger.js';
import Stripe from 'stripe';
import { db, schema } from '../db/index.js';
import { eq, gt, and, sql } from 'drizzle-orm';
import { makeId } from '../constants.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

const BASE_URL = process.env.CLIENT_URL
  || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null)
  || 'https://boom-contact-production.up.railway.app';

// ── Devises supportées ───────────────────────────────────────
export const SUPPORTED_CURRENCIES = ['CHF','EUR','GBP','AUD','USD','CAD','SGD','JPY'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

// Mapping pays ISO → devise
export const COUNTRY_TO_CURRENCY: Record<string, SupportedCurrency> = {
  CH: 'CHF', LI: 'CHF',
  DE: 'EUR', FR: 'EUR', BE: 'EUR', LU: 'EUR', IT: 'EUR', ES: 'EUR',
  AT: 'EUR', NL: 'EUR', PT: 'EUR', FI: 'EUR', IE: 'EUR', GR: 'EUR',
  GB: 'GBP',
  AU: 'AUD', NZ: 'AUD',
  US: 'USD', MX: 'USD',
  CA: 'CAD',
  SG: 'SGD', MY: 'SGD',
  JP: 'JPY',
};

// ── Grille tarifaire internationale ──────────────────────────
// Arrondie aux psychologiques par devise
export const PACKAGES = {
  single: {
    id: 'single',
    label: '1 constat',
    credits: 1,
    description: '1 constat numérique certifié boom.contact',
    popular: false,
    savings: null,
    prices: {
      CHF: 490,  EUR: 490,  GBP: 390,
      AUD: 790,  USD: 490,  CAD: 690,
      SGD: 690,  JPY: 750, // JPY = zero-decimal currency, amount in yen directly
    },
  },
  pack3: {
    id: 'pack3',
    label: '3 constats',
    credits: 3,
    description: '3 constats — idéal famille · économie 12%',
    popular: true,
    savings: '12%',
    prices: {
      CHF: 1290, EUR: 1290, GBP:  990,
      AUD: 1990, USD: 1290, CAD: 1790,
      SGD: 1790, JPY: 1900,
    },
  },
  pack10: {
    id: 'pack10',
    label: '10 constats',
    credits: 10,
    description: '10 constats — flottes et entreprises · économie 29%',
    popular: false,
    savings: '29%',
    prices: {
      CHF: 3490, EUR: 3490, GBP: 2790,
      AUD: 5490, USD: 3490, CAD: 4790,
      SGD: 4790, JPY: 5200,
    },
  },
} as const;

export type PackageId = keyof typeof PACKAGES;

// Prix en centimes pour une devise
export function getPrice(packageId: PackageId, currency: SupportedCurrency): number {
  return (PACKAGES[packageId].prices as Record<string, number>)[currency] ?? PACKAGES[packageId].prices.EUR;
}

// Formatage lisible ex: "CHF 4.90" ou "¥750"
export function formatPrice(amountCents: number, currency: SupportedCurrency): string {
  if (currency === 'JPY') return `¥${amountCents}`;
  const amount = (amountCents / 100).toFixed(2);
  const symbols: Record<string, string> = { CHF:'CHF ', EUR:'€', GBP:'£', AUD:'A$', USD:'$', CAD:'C$', SGD:'S$' };
  return `${symbols[currency] || ''}${amount}`;
}

// ── Upsert user ───────────────────────────────────────────────
async function upsertUser(email: string, country?: string, language?: string) {
  const existing = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (existing.length > 0) {
    await db.update(schema.users).set({ lastSeenAt: new Date() }).where(eq(schema.users.email, email));
    return existing[0];
  }
  const id = makeId();
  const [user] = await db.insert(schema.users).values({
    id, email, credits: 0,
    country: country || null,
    language: language || null,
    lastSeenAt: new Date(),
  }).returning();
  return user;
}

// ── Create Stripe Checkout Session ───────────────────────────
export async function createCheckoutSession(
  packageId: PackageId,
  userEmail: string,
  currency: SupportedCurrency = 'EUR',
  locale: string = 'fr',
  constatSessionId?: string, // pour retour direct au constat après paiement
) {
  const pkg = PACKAGES[packageId];
  if (!pkg) throw new Error(`Package inconnu: ${packageId}`);

  const priceAmount = getPrice(packageId, currency);
  const currencyLower = currency.toLowerCase();

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: userEmail,
    locale: ((locale as string) || 'fr') as any,
    // ── Facture PDF automatique envoyée par Stripe ──────────
    invoice_creation: { enabled: true },
    // ── TVA automatique — activée si STRIPE_TAX_ENABLED=true (configurer dans Stripe Tax dashboard) ──
    ...(process.env.STRIPE_TAX_ENABLED === 'true' ? { automatic_tax: { enabled: true } } : {}),
    line_items: [{
      price_data: {
        currency: currencyLower,
        product_data: {
          name: `boom.contact — ${pkg.label}`,
          description: pkg.description,
          images: [],
          metadata: {
            packageId,
            credits: String(pkg.credits),
            application: 'boom.contact',
          },
        },
        unit_amount: priceAmount,
      },
      quantity: 1,
    }],
    metadata: {
      packageId,
      userEmail,
      credits: String(pkg.credits),
      application: 'boom.contact',
      environment: process.env.NODE_ENV || 'production',
      ...(constatSessionId ? { constatSessionId } : {}),
    },
    success_url: constatSessionId
      ? `${BASE_URL}?payment=success&session_id={CHECKOUT_SESSION_ID}&constat=${constatSessionId}`
      : `${BASE_URL}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: constatSessionId
      ? `${BASE_URL}?session=${constatSessionId}&payment=cancelled`
      : `${BASE_URL}?payment=cancelled`,
  });

  // Enregistrer le paiement en pending
  const payId = makeId(20);
  await db.insert(schema.payments).values({
    id: payId,
    userEmail,
    stripeSessionId: session.id,
    packageId,
    packageLabel: pkg.label,
    creditsGranted: pkg.credits,
    amountCents: priceAmount,
    currency,
    status: 'pending',
  });

  await upsertUser(userEmail);

  logger.payment('checkout-created', userEmail, packageId, priceAmount);
  return { url: session.url!, sessionId: session.id };
}

// ── Webhook: confirmer paiement et créditer ───────────────────
export async function handleStripeWebhook(payload: Buffer, signature: string) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET manquant');

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    throw new Error(`Webhook signature invalide: ${err}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { packageId, userEmail, credits } = session.metadata || {};

    if (!userEmail || !credits) {
      console.error('Webhook: metadata manquantes', session.metadata);
      return;
    }

    const creditsInt = parseInt(credits, 10);

    // Analytics — paiement_effectué (server-side, authoritative)
    try {
      const { trackPaiementEffectue } = await import('../analytics.js');
      await trackPaiementEffectue({
        email: userEmail,
        packageId: packageId || 'unknown',
        amount: (session.amount_total || 0) / 100,
        currency: (session.currency || 'eur').toUpperCase(),
        stripeSessionId: session.id,
      });
    } catch (e) { logger.warn('Analytics tracking failed', { error: String(e) }); }

    // Idempotency check — skip if already processed
    const [existingPayment] = await db.select()
      .from(schema.payments)
      .where(eq(schema.payments.stripeSessionId, session.id))
      .limit(1);
    if (existingPayment?.status === 'paid') {
      logger.info('Webhook already processed, skipping', { stripeSessionId: session.id });
      return;
    }

    // Atomic transaction: update payment status + credit user together
    await db.transaction(async (tx) => {
      // Marquer paiement comme complété
      await tx.update(schema.payments)
        .set({ status: 'paid', paidAt: new Date() })
        .where(eq(schema.payments.stripeSessionId, session.id));

      // Créditer l'utilisateur
      const [user] = await tx.select().from(schema.users).where(eq(schema.users.email, userEmail)).limit(1);
      if (user) {
        await tx.update(schema.users)
          .set({ credits: user.credits + creditsInt })
          .where(eq(schema.users.email, userEmail));
      } else {
        // Create user inside transaction
        const id = makeId();
        await tx.insert(schema.users).values({ id, email: userEmail, credits: creditsInt });
      }

      // Enregistrer la transaction
      await tx.insert(schema.creditTxns).values({
        id: makeId(),
        userEmail,
        delta: creditsInt,
        reason: 'purchase',
        ref: session.id,
      });
    });

    logger.payment('credits-granted', userEmail, packageId, creditsInt);

    // One-shot : si constatSessionId dans metadata → consommer immédiatement 1 crédit
    const constatSessionId = session.metadata?.constatSessionId;
    if (constatSessionId && creditsInt >= 1) {
      await useCredit(userEmail, constatSessionId);
      logger.payment('credit-auto-used', userEmail, 'single', 1);

      // Auto-generate PDF and email with retry logic (handles race: payment before signature)
      setImmediate(async () => {
        const MAX_RETRIES = 3;
        const DELAYS = [0, 30_000, 60_000, 120_000]; // 0s, 30s, 60s, 120s

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          if (attempt > 0) {
            await new Promise(r => setTimeout(r, DELAYS[attempt] || 120_000));
          }
          try {
            const { getSession, savePdfUrl, updateParticipant } = await import('./session.service.js');
            const { generateConstatPDF } = await import('./pdf.service.js');
            const { sendPDFToDriver } = await import('./email.service.js');

            // A3 — envoi avec suivi de livraison par destinataire (capture
            // aussi ok:false). Ne lève jamais. Zéro migration (JSONB participant).
            const deliverAndRecord = async (
              role: 'A' | 'B' | 'C' | 'D' | 'E',
              params: Parameters<typeof sendPDFToDriver>[0],
            ): Promise<void> => {
              try {
                const r = await sendPDFToDriver(params);
                if (r?.ok) {
                  await updateParticipant(constatSessionId, role, {
                    pdfDeliveredAt: new Date().toISOString(),
                    pdfDeliveryMessageId: r.messageId,
                    pdfDeliveryError: undefined,
                  } as any).catch(() => {});
                  logger.info(`[DELIVERY] Webhook PDF livré ${role}`, { sessionId: constatSessionId });
                } else {
                  await updateParticipant(constatSessionId, role, { pdfDeliveryError: r?.error || 'unknown' } as any).catch(() => {});
                  logger.error(`[DELIVERY] Webhook échec PDF ${role} — resend requis`, { sessionId: constatSessionId, role, error: r?.error });
                }
              } catch (e) {
                await updateParticipant(constatSessionId, role, { pdfDeliveryError: String(e) } as any).catch(() => {});
                logger.error(`[DELIVERY] Webhook échec PDF ${role} — resend requis`, { sessionId: constatSessionId, role, error: String(e) });
              }
            };

            const fullSession = await getSession(constatSessionId);
            if (!fullSession) {
              logger.warn('Webhook auto-PDF: session not found', { sessionId: constatSessionId, attempt });
              return; // no point retrying if session doesn't exist
            }

            // A3 — Dedup PRÉCIS par destinataire (cf. sign handler) :
            // skip total seulement si tous les destinataires sont livrés.
            const _allDelivered = (['A','B','C','D','E'] as const).every((rr) => {
              const pp = (fullSession as any)[`participant${rr}`];
              if (!pp?.driver?.email) return true;
              return !!pp.pdfDeliveredAt;
            });
            if (fullSession.pdfUrl && _allDelivered) {
              logger.info('Webhook auto-PDF: tous les destinataires déjà livrés, skip', { sessionId: constatSessionId });
              return;
            }

            // Only auto-send if session is completed or A has signed
            const aHasSigned = !!fullSession.participantA?.signature;
            if (fullSession.status !== 'completed' && !aHasSigned) {
              if (attempt < MAX_RETRIES) {
                logger.info('Webhook auto-PDF: session not completed yet, will retry', { sessionId: constatSessionId, status: fullSession.status, attempt });
                continue; // retry after delay — signature may arrive later
              }
              logger.info('Webhook auto-PDF: session not completed after all retries, giving up', { sessionId: constatSessionId, status: fullSession.status });
              return;
            }

            // Mark PDF as sent BEFORE sending to prevent duplicates
            const marker = `pdf-sent-${Date.now()}`;
            await savePdfUrl(constatSessionId, marker);

            const pdfBytesA = await generateConstatPDF(fullSession, 'A');
            const pdfB64A = Buffer.from(pdfBytesA).toString('base64');
            const nameA = [fullSession.participantA?.driver?.firstName, fullSession.participantA?.driver?.lastName].filter(Boolean).join(' ') || 'Conducteur';

            // Blockchain timestamp (non-blocking — never prevents PDF delivery)
            try {
              const { timestampPDF } = await import('./timestamp.service.js');
              const { schema: dbSchema } = await import('../db/index.js');
              const { eq: eqOp } = await import('drizzle-orm');
              const proof = await timestampPDF(Buffer.from(pdfBytesA));
              if (proof.sha256) {
                await db.update(dbSchema.sessions)
                  .set({ timestampProof: proof as any })
                  .where(eqOp(dbSchema.sessions.id, constatSessionId));
                logger.info('[OTS] Timestamp proof stored (webhook)', { sessionId: constatSessionId, sha256: proof.sha256.slice(0, 16) + '...' });
              }
            } catch (tsErr) {
              logger.warn('[OTS] Timestamping failed in webhook (non-blocking)', { sessionId: constatSessionId, error: String(tsErr) });
            }

            if (!(fullSession.participantA as any)?.pdfDeliveredAt) {
              await deliverAndRecord('A', {
                driverEmail: userEmail,
                driverName: nameA,
                role: 'A',
                sessionId: constatSessionId,
                pdfBase64: pdfB64A,
                insurerName: fullSession.participantA?.insurance?.company,
                language: fullSession.participantA?.language || 'fr',
              });
            }

            // Also send to conductor B if email available
            const B = fullSession.participantB;
            const emailB = B?.driver?.email;
            if (emailB) {
              const NON_SIGNING = ['pedestrian','bicycle','escooter','cargo_bike','moped'];
              const bIsPedestrian = NON_SIGNING.includes(B?.vehicle?.vehicleType as string) || (B as any)?.isPedestrian;

              if (!bIsPedestrian) {
                if (!(B as any)?.pdfDeliveredAt) {
                  const pdfBytesB = await generateConstatPDF(fullSession, 'B');
                  const pdfB64B = Buffer.from(pdfBytesB).toString('base64');
                  const nameB = [B?.driver?.firstName, B?.driver?.lastName].filter(Boolean).join(' ') || 'Conducteur B';
                  await deliverAndRecord('B', {
                    driverEmail: emailB,
                    driverName: nameB,
                    role: 'B',
                    sessionId: constatSessionId,
                    pdfBase64: pdfB64B,
                    insurerName: B?.insurance?.company,
                    language: B?.language || 'fr',
                  });
                }
              } else {
                const nameB = [B?.driver?.firstName, B?.driver?.lastName].filter(Boolean).join(' ') || 'Piéton';
                await sendPDFToDriver({
                  driverEmail: emailB,
                  driverName: nameB,
                  role: 'A',
                  sessionId: constatSessionId,
                  pdfBase64: pdfB64A,
                  language: B?.language || 'fr',
                });
                logger.info('Webhook auto-PDF sent to pedestrian B', { sessionId: constatSessionId });
              }
            }

            // Voie B — Envoi aux participants additionnels C/D/E (si email)
            for (const role of ['C', 'D', 'E'] as const) {
              const p = (fullSession as any)[`participant${role}`];
              const emailP = p?.driver?.email;
              if (!emailP || p?.pdfDeliveredAt) continue;
              const NON_SIGNING = ['pedestrian','bicycle','escooter','cargo_bike','moped'];
              const pIsPedestrian = NON_SIGNING.includes(p?.vehicle?.vehicleType as string) || (p as any)?.isPedestrian;
              const pdfBytesP = await generateConstatPDF(fullSession, role);
              const pdfB64P = Buffer.from(pdfBytesP).toString('base64');
              const nameP = [p?.driver?.firstName, p?.driver?.lastName].filter(Boolean).join(' ') || `Participant ${role}`;
              await deliverAndRecord(role, {
                driverEmail: emailP,
                driverName: nameP,
                role,
                sessionId: constatSessionId,
                pdfBase64: pdfB64P,
                insurerName: pIsPedestrian ? undefined : p?.insurance?.company,
                language: p?.language || 'fr',
              });
            }

            return; // success — exit retry loop
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            if (attempt < MAX_RETRIES) {
              logger.warn(`Webhook auto-PDF attempt ${attempt + 1} failed, retrying...`, {
                sessionId: constatSessionId,
                error: errorMsg,
              });
            } else {
              logger.error('Webhook auto-PDF failed after all retries — user can still download manually', {
                sessionId: constatSessionId,
                error: errorMsg,
              });
            }
          }
        }
      });
    }
  }
}

// ── Utiliser un crédit pour un constat ────────────────────────
export async function useCredit(userEmail: string, sessionId: string): Promise<boolean> {
  // Idempotent par session : si un crédit a déjà été consommé pour ce
  // sessionId, on NE re-débite PAS (on renvoie true → le PDF peut être
  // (re)généré sans nouveau débit). Corrige le double-débit (audit B3) :
  // revisite d'un constat (QR 7j / lien email / historique) → re-download.
  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: schema.creditTxns.id })
      .from(schema.creditTxns)
      .where(and(
        eq(schema.creditTxns.userEmail, userEmail),
        eq(schema.creditTxns.reason, 'use'),
        eq(schema.creditTxns.ref, sessionId),
      ))
      .limit(1);

    if (existing.length) return true; // déjà consommé pour ce constat → pas de re-débit

    // Décrément atomique : SELECT+UPDATE en une requête (anti-race)
    const result = await tx.update(schema.users)
      .set({ credits: sql`${schema.users.credits} - 1` })
      .where(and(eq(schema.users.email, userEmail), gt(schema.users.credits, 0)))
      .returning({ credits: schema.users.credits });

    if (!result.length) return false;

    await tx.insert(schema.creditTxns).values({
      id: makeId(),
      userEmail,
      delta: -1,
      reason: 'use',
      ref: sessionId,
    });

    return true;
  });
}

// ── Récupérer solde utilisateur ───────────────────────────────
export async function getUserCredits(email: string): Promise<number> {
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  return user?.credits ?? 0;
}

// ── Sauvegarder consentements RGPD ───────────────────────────
export async function saveConsent(
  email: string,
  consentCGU: boolean,
  consentMarketing: boolean,
  country?: string,
  language?: string,
) {
  await upsertUser(email, country, language);
  await db.update(schema.users).set({
    consentCGU,
    consentCGUAt: consentCGU ? new Date() : null,
    consentMarketing,
    consentMarketingAt: consentMarketing ? new Date() : null,
    country: country || null,
    language: language || null,
  }).where(eq(schema.users.email, email));
}


