import Stripe from 'stripe';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-18.acacia',
});

const BASE_URL = process.env.CLIENT_URL
  || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null)
  || 'https://boom-contact-production.up.railway.app';

// ── Packages disponibles ─────────────────────────────────────
export const PACKAGES = {
  single: {
    id: 'single',
    label: '1 constat',
    credits: 1,
    priceEUR: 490,   // centimes
    priceCHF: 490,
    description: '1 constat amiable numérique CEA',
    popular: false,
  },
  pack3: {
    id: 'pack3',
    label: '3 constats',
    credits: 3,
    priceEUR: 1290,
    priceCHF: 1290,
    description: '3 constats — idéal pour la famille',
    popular: true,
    savings: '12%',
  },
  pack10: {
    id: 'pack10',
    label: '10 constats',
    credits: 10,
    priceEUR: 3490,
    priceCHF: 3490,
    description: '10 constats — pour professionnels et flottes',
    popular: false,
    savings: '29%',
  },
} as const;

export type PackageId = keyof typeof PACKAGES;

function makeId(size = 12) {
  return randomBytes(size).toString('base64url').slice(0, size);
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
  currency: 'EUR' | 'CHF' = 'EUR',
  locale: string = 'fr',
) {
  const pkg = PACKAGES[packageId];
  if (!pkg) throw new Error(`Package inconnu: ${packageId}`);

  const priceAmount = currency === 'CHF' ? pkg.priceCHF : pkg.priceEUR;
  const currencyLower = currency.toLowerCase();

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: userEmail,
    locale: (locale as any) || 'fr',
    line_items: [{
      price_data: {
        currency: currencyLower,
        product_data: {
          name: `boom.contact — ${pkg.label}`,
          description: pkg.description,
          images: [],
          metadata: { packageId, credits: String(pkg.credits) },
        },
        unit_amount: priceAmount,
      },
      quantity: 1,
    }],
    metadata: {
      packageId,
      userEmail,
      credits: String(pkg.credits),
    },
    success_url: `${BASE_URL}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${BASE_URL}?payment=cancelled`,
    // Stripe Tax (optionnel — activer si domaine vérifié)
    // automatic_tax: { enabled: true },
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

    // Marquer paiement comme complété
    await db.update(schema.payments)
      .set({ status: 'paid', paidAt: new Date() })
      .where(eq(schema.payments.stripeSessionId, session.id));

    // Créditer l'utilisateur
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, userEmail)).limit(1);
    if (user) {
      await db.update(schema.users)
        .set({ credits: user.credits + creditsInt })
        .where(eq(schema.users.email, userEmail));
    } else {
      await upsertUser(userEmail);
      await db.update(schema.users)
        .set({ credits: creditsInt })
        .where(eq(schema.users.email, userEmail));
    }

    // Enregistrer la transaction
    await db.insert(schema.creditTxns).values({
      id: makeId(),
      userEmail,
      delta: creditsInt,
      reason: 'purchase',
      ref: session.id,
    });

    console.log(`✅ Crédits accordés: ${creditsInt} à ${userEmail}`);
  }
}

// ── Utiliser un crédit pour un constat ────────────────────────
export async function useCredit(userEmail: string, sessionId: string): Promise<boolean> {
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, userEmail)).limit(1);
  if (!user || user.credits < 1) return false;

  await db.update(schema.users)
    .set({ credits: user.credits - 1 })
    .where(eq(schema.users.email, userEmail));

  await db.insert(schema.creditTxns).values({
    id: makeId(),
    userEmail,
    delta: -1,
    reason: 'use',
    ref: sessionId,
  });

  return true;
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
