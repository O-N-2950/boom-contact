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
  participantC: jsonb('participant_c'),
  participantD: jsonb('participant_d'),
  participantE: jsonb('participant_e'),
  vehicleCount: integer('vehicle_count').notNull().default(2),
  pdfUrl:       text('pdf_url'),
  ownerEmail:   text('owner_email'),
});

// ── Users — comptes avec crédits ─────────────────────────────
export const users = pgTable('users', {
  id:               varchar('id', { length: 20 }).primaryKey(),
  email:            text('email').notNull().unique(),
  passwordHash:     text('password_hash'),
  role:             varchar('role', { length: 20 }).notNull().default('customer'),
  createdAt:        timestamp('created_at').notNull().defaultNow(),
  credits:          integer('credits').notNull().default(0),
  consentCGU:       boolean('consent_cgu').notNull().default(false),
  consentCGUAt:     timestamp('consent_cgu_at'),
  consentMarketing: boolean('consent_marketing').notNull().default(false),
  consentMarketingAt: timestamp('consent_marketing_at'),
  country:          varchar('country', { length: 10 }),
  language:         varchar('language', { length: 10 }),
  lastSeenAt:       timestamp('last_seen_at'),
  firstName:        text('first_name'),
  lastName:         text('last_name'),
  phone:            varchar('phone', { length: 30 }),
  company:          text('company'),
  address:          text('address'),
}, (t) => ({
  emailIdx: index('users_email_idx').on(t.email),
}));

// ── Magic tokens — login links + gift credits ─────────────────
export const magicTokens = pgTable('magic_tokens', {
  id:          varchar('id', { length: 30 }).primaryKey(),
  email:       text('email').notNull(),
  token:       text('token').notNull().unique(),
  type:        varchar('type', { length: 20 }).notNull().default('login'), // 'login' | 'gift'
  giftCredits: integer('gift_credits'),
  expiresAt:   timestamp('expires_at').notNull(),
  usedAt:      timestamp('used_at'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  tokenIdx: index('magic_tokens_token_idx').on(t.token),
  emailIdx: index('magic_tokens_email_idx').on(t.email),
}));

// ── Payments ─────────────────────────────────────────────────
export const payments = pgTable('payments', {
  id:                varchar('id', { length: 30 }).primaryKey(),
  userEmail:         text('user_email').notNull(),
  stripeSessionId:   text('stripe_session_id'),
  packageId:         varchar('package_id', { length: 20 }).notNull(),
  packageLabel:      text('package_label').notNull(),
  creditsGranted:    integer('credits_granted').notNull(),
  amountCents:       integer('amount_cents').notNull(),
  currency:          varchar('currency', { length: 5 }).notNull().default('EUR'),
  status:            varchar('status', { length: 20 }).notNull().default('pending'),
  createdAt:         timestamp('created_at').notNull().defaultNow(),
  paidAt:            timestamp('paid_at'),
}, (t) => ({
  emailIdx: index('payments_email_idx').on(t.userEmail),
}));

// ── Credit transactions ───────────────────────────────────────
export const creditTxns = pgTable('credit_txns', {
  id:          varchar('id', { length: 20 }).primaryKey(),
  userEmail:   text('user_email').notNull(),
  delta:       integer('delta').notNull(),
  reason:      varchar('reason', { length: 40 }).notNull(),
  ref:         text('ref'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
});

// ── Police stations ───────────────────────────────────────────
export const policeStations = pgTable('police_stations', {
  id:          varchar('id', { length: 20 }).primaryKey(),
  name:        text('name').notNull(),
  canton:      varchar('canton', { length: 10 }),
  country:     varchar('country', { length: 5 }).notNull().default('CH'),
  city:        text('city'),
  email:       text('email'),
  phone:       text('phone'),
  active:      boolean('active').notNull().default(true),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
});

// ── Police users ──────────────────────────────────────────────
export const policeUsers = pgTable('police_users', {
  id:          varchar('id', { length: 20 }).primaryKey(),
  stationId:   varchar('station_id', { length: 20 }).notNull().references(() => policeStations.id),
  email:       text('email').notNull().unique(),
  firstName:   text('first_name').notNull(),
  lastName:    text('last_name').notNull(),
  badgeNumber: text('badge_number'),
  passwordHash: text('password_hash').notNull(),
  role:        varchar('role', { length: 20 }).notNull().default('agent'),
  active:      boolean('active').notNull().default(true),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at'),
}, (t) => ({
  emailIdx:   index('police_users_email_idx').on(t.email),
  stationIdx: index('police_users_station_idx').on(t.stationId),
}));

// ── Police annotations — Session 7 ───────────────────────────
// Annotations de l'agent sur une session conducteur
// Séparées des données conducteurs — jamais visibles côté B2C
export const policeAnnotations = pgTable('police_annotations', {
  id:           varchar('id', { length: 30 }).primaryKey(),
  sessionId:    varchar('session_id', { length: 20 }).notNull(),   // ref session conducteur
  agentId:      varchar('agent_id', { length: 20 }).notNull(),     // ref police_users
  stationId:    varchar('station_id', { length: 20 }).notNull(),   // ref police_stations
  country:      varchar('country', { length: 5 }).notNull().default('CH'), // pour template PDF
  // Contenu du rapport
  reportNumber: text('report_number'),                              // numéro PV officiel
  infractions:  jsonb('infractions').notNull().default('[]'),      // [{code, description, party}]
  measures:     jsonb('measures').notNull().default('[]'),          // [{type, description}]
  witnesses:    jsonb('witnesses').notNull().default('[]'),         // [{name, address, phone, statement}]
  observations: text('observations'),                               // texte libre
  // Audit trail RGPD
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow(),
  // Consultation log
  consultedAt:  timestamp('consulted_at'),
}, (t) => ({
  sessionIdx: index('police_annotations_session_idx').on(t.sessionId),
  agentIdx:   index('police_annotations_agent_idx').on(t.agentId),
}));


// ── Vehicles — garage personnel ───────────────────────────────
export const vehicles = pgTable('vehicles', {
  id:           varchar('id', { length: 20 }).primaryKey(),
  userId:       varchar('user_id', { length: 20 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  nickname:     text('nickname'),                          // ex: "Ma Golf bleue"
  plate:        text('plate'),
  make:         text('make'),
  model:        text('model'),
  color:        text('color'),
  year:         text('year'),
  category:     text('category'),                          // ex: "Voiture de tourisme"
  licenseData:  jsonb('license_data').notNull().default({}),   // raw OCR permis de circuler
  insuranceData:jsonb('insurance_data').notNull().default({}), // raw OCR carte verte + mises à jour manuelles
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  userIdx: index('vehicles_user_idx').on(t.userId),
}));


// ── Social posts (générateur marketing automatique) ──────────
export const socialPosts = pgTable('social_posts', {
  id:          serial('id').primaryKey(),
  platform:    varchar('platform', { length: 20 }).notNull(), // TikTok | Instagram | Facebook | LinkedIn
  pillar:      varchar('pillar', { length: 1 }).notNull(),    // A | B | C | D
  text:        text('text').notNull(),
  hashtags:    text('hashtags').notNull(),                    // JSON array
  staging:     text('staging'),
  status:      varchar('status', { length: 20 }).notNull().default('pending'), // pending | approved | posted | archived
  postedAt:    timestamp('posted_at'),
  scheduledFor: timestamp('scheduled_for'),
  generatedBy: varchar('generated_by', { length: 20 }).default('claude'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  platformIdx: index('social_posts_platform_idx').on(t.platform),
  statusIdx:   index('social_posts_status_idx').on(t.status),
}));
