import { pgTable, text, timestamp, jsonb, varchar, integer, boolean, index } from 'drizzle-orm/pg-core';

// ── Sessions — constats en cours ─────────────────────────────
export const sessions = pgTable('sessions', {
  id:           varchar('id', { length: 20 }).primaryKey(),
  status:       varchar('status', { length: 20 }).notNull().default('waiting'),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  expiresAt:    timestamp('expires_at').notNull(),
  accident:     jsonb('accident').notNull().default({}),
  participantA: jsonb('participant_a').notNull().default({}),
  participantB: jsonb('participant_b'),
  pdfUrl:       text('pdf_url'),
  // Lien vers l'utilisateur qui a initié le constat (si compte créé)
  ownerEmail:   text('owner_email'),
});

// ── Users — comptes avec crédits ─────────────────────────────
export const users = pgTable('users', {
  id:               varchar('id', { length: 20 }).primaryKey(),
  email:            text('email').notNull().unique(),
  createdAt:        timestamp('created_at').notNull().defaultNow(),
  // Crédits disponibles
  credits:          integer('credits').notNull().default(0),
  // Consentements RGPD
  consentCGU:       boolean('consent_cgu').notNull().default(false),
  consentCGUAt:     timestamp('consent_cgu_at'),
  consentMarketing: boolean('consent_marketing').notNull().default(false),
  consentMarketingAt: timestamp('consent_marketing_at'),
  // Métadonnées
  country:          varchar('country', { length: 10 }),
  language:         varchar('language', { length: 10 }),
  lastSeenAt:       timestamp('last_seen_at'),
}, (t) => ({
  emailIdx: index('users_email_idx').on(t.email),
}));

// ── Payments — achats de packages Stripe ─────────────────────
export const payments = pgTable('payments', {
  id:                varchar('id', { length: 30 }).primaryKey(), // Stripe PI id
  userEmail:         text('user_email').notNull(),
  stripeSessionId:   text('stripe_session_id'),
  packageId:         varchar('package_id', { length: 20 }).notNull(), // 'single','pack3','pack10'
  packageLabel:      text('package_label').notNull(),           // '1 constat', '3 constats'...
  creditsGranted:    integer('credits_granted').notNull(),
  amountCents:       integer('amount_cents').notNull(),          // en centimes
  currency:          varchar('currency', { length: 5 }).notNull().default('EUR'),
  status:            varchar('status', { length: 20 }).notNull().default('pending'),
  createdAt:         timestamp('created_at').notNull().defaultNow(),
  paidAt:            timestamp('paid_at'),
}, (t) => ({
  emailIdx: index('payments_email_idx').on(t.userEmail),
}));

// ── Credit transactions — historique mouvements ──────────────
export const creditTxns = pgTable('credit_txns', {
  id:          varchar('id', { length: 20 }).primaryKey(),
  userEmail:   text('user_email').notNull(),
  delta:       integer('delta').notNull(),      // +3, -1, etc.
  reason:      varchar('reason', { length: 40 }).notNull(), // 'purchase','use','gift_sent','gift_received'
  ref:         text('ref'),                     // sessionId ou paymentId
  createdAt:   timestamp('created_at').notNull().defaultNow(),
});
