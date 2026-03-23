import { logger } from '../logger.js';
import Stripe from 'stripe';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';

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
      SGD: 690,  JPY: 75000, // centimes sauf JPY en yen (pas de décimales)
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
      SGD: 1790, JPY: 190000,
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
      SGD: 4790, JPY: 520000,
    },
  },
} as const;

export type PackageId = keyof typeof PACKAGES;

// Prix en centimes pour une devise
export function getPrice(packageId: PackageId, currency: SupportedCurrency): number {
  return (PACKAGES[packageId].prices as any)[currency] ?? PACKAGES[packageId].prices.EUR;
}

// Formatage lisible ex: "CHF 4.90" ou "¥750"
export function formatPrice(amountCents: number, currency: SupportedCurrency): string {
  if (currency === 'JPY') return `¥${amountCents}`;
  const amount = (amountCents / 100).toFixed(2);
  const symbols: Record<string, string> = { CHF:'CHF ', EUR:'€', GBP:'£', AUD:'A$', USD:'$', CAD:'C$', SGD:'S$' };
  return `${symbols[currency] || ''}${amount}`;
}

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
  currency: SupportedCurrency = 'EUR',
  locale: string = 'fr',
) {
  const pkg = PACKAGES[packageId];
  if (!pkg) throw new Error(`Package inconnu: ${packageId}`);

  const priceAmount = getPrice(packageId, currency);
  const currencyLower = currency.toLowerCase();

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: userEmail,
    locale: (locale as any) || 'fr',
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
    },
    success_url: `${BASE_URL}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${BASE_URL}?payment=cancelled`,
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

    logger.payment('credits-granted', userEmail, packageId, creditsInt);
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


