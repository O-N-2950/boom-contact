import { pgTable, text, timestamp, jsonb, varchar, integer, boolean, index, serial, uniqueIndex } from 'drizzle-orm/pg-core';
import type { AccidentData, ParticipantData } from '../../../shared/types/index.js';

// ── JSONB column types for police annotations ────────────────
export interface InfractionRecord {
  code: string;
  description: string;
  party: 'A' | 'B' | 'both';
}
export interface MeasureRecord {
  type: string;
  description: string;
  party?: 'A' | 'B' | 'both';
}
export interface WitnessRecord {
  name: string;
  address?: string;
  phone?: string;
  statement?: string;
}

// ── JSONB column types for vehicles ──────────────────────────
export interface VehicleLicenseData {
  [key: string]: string | number | boolean | null;
}
export interface VehicleInsuranceData {
  [key: string]: string | number | boolean | null;
}

// ── Sessions — constats en cours ─────────────────────────────
export const sessions = pgTable('sessions', {
  id:           varchar('id', { length: 20 }).primaryKey(),
  status:       varchar('status', { length: 20 }).notNull().default('waiting'),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  expiresAt:    timestamp('expires_at').notNull(),
  accident:     jsonb('accident').$type<Partial<AccidentData>>().notNull().default({}),
  participantA: jsonb('participant_a').$type<Partial<ParticipantData>>().notNull().default({}),
  participantB: jsonb('participant_b').$type<Partial<ParticipantData>>(),
  participantC: jsonb('participant_c').$type<Partial<ParticipantData>>(),
  participantD: jsonb('participant_d').$type<Partial<ParticipantData>>(),
  participantE: jsonb('participant_e').$type<Partial<ParticipantData>>(),
  vehicleCount: integer('vehicle_count').notNull().default(2),
  pdfUrl:       text('pdf_url'),
  ownerEmail:   text('owner_email'),
  participantBEmail: text('participant_b_email'),
  tokenA:       text('token_a'),            // participant token for party A
  tokenB:       text('token_b'),            // participant token for party B
  // Fleet billing : organisation à débiter si le constat utilise un véhicule d'org (NULL = perso)
  billingOrganizationId: varchar('billing_organization_id', { length: 20 }),
  timestampProof: jsonb('timestamp_proof').$type<{
    sha256: string;
    otsProofBase64: string;
    calendarUrl: string;
    submittedAt: string;
  }>(),
}, (t) => ({
  statusIdx:     index('sessions_status_idx').on(t.status),
  createdAtIdx:  index('sessions_created_at_idx').on(t.createdAt),
  expiresAtIdx:  index('sessions_expires_at_idx').on(t.expiresAt),
  ownerEmailIdx: index('sessions_owner_email_idx').on(t.ownerEmail),
  participantBEmailIdx: index('sessions_participant_b_email_idx').on(t.participantBEmail),
  statusCreatedIdx: index('sessions_status_created_idx').on(t.status, t.createdAt),
}));

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
  tokenVersion:     integer('token_version').notNull().default(0),
  verified:         boolean('verified').notNull().default(false),
  verificationToken: text('verification_token'),
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
  emailIdx:      index('payments_email_idx').on(t.userEmail),
  statusIdx:     index('payments_status_idx').on(t.status),
  createdAtIdx:  index('payments_created_at_idx').on(t.createdAt),
}));

// ── Credit transactions ───────────────────────────────────────
export const creditTxns = pgTable('credit_txns', {
  id:          varchar('id', { length: 20 }).primaryKey(),
  userEmail:   text('user_email').notNull(),
  delta:       integer('delta').notNull(),
  reason:      varchar('reason', { length: 40 }).notNull(),
  ref:         text('ref'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  emailIdx:      index('credit_txns_email_idx').on(t.userEmail),
  reasonIdx:     index('credit_txns_reason_idx').on(t.reason),
  createdAtIdx:  index('credit_txns_created_at_idx').on(t.createdAt),
}));

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

// ── Police interventions — Module QR complet ─────────────────
// Données terrain saisies par l'agent lors de l'intervention
export interface DriverStateRecord {
  party: 'A' | 'B';
  apparentState: 'normal' | 'shocked' | 'minor_injury' | 'serious_injury' | 'under_influence';
  alcoholTestDone: boolean;
  alcoholResult?: 'negative' | 'positive';
  alcoholRate?: string;
  drugTestDone: boolean;
  drugResult?: 'negative' | 'positive';
  testRefused: boolean;
}

export interface ConditionsRecord {
  weather: string;
  visibility: string;
  roadState: string;
  signage: string;
  signageDetails?: string;
  speedLimit?: number;
}

export interface PolicePhotoRecord {
  id: string;
  category: 'overview' | 'tracks' | 'signage' | 'other';
  base64: string;
  caption?: string;
  takenAt: string;
}

export const policeInterventions = pgTable('police_interventions', {
  id:                   varchar('id', { length: 30 }).primaryKey(),
  sessionId:            varchar('session_id', { length: 20 }).notNull(),
  policeUserId:         varchar('police_user_id', { length: 20 }).notNull().references(() => policeUsers.id),
  infractions:          jsonb('infractions').$type<InfractionRecord[]>().notNull().default([]),
  driverStates:         jsonb('driver_states').$type<DriverStateRecord[]>().notNull().default([]),
  conditions:           jsonb('conditions').$type<ConditionsRecord>(),
  witnesses:            jsonb('witnesses').$type<WitnessRecord[]>().notNull().default([]),
  observations:         text('observations'),
  responsibilityEstimate: varchar('responsibility_estimate', { length: 30 }),
  policePhotos:         jsonb('police_photos').$type<PolicePhotoRecord[]>().notNull().default([]),
  createdAt:            timestamp('created_at').notNull().defaultNow(),
  updatedAt:            timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  sessionIdx: index('police_interventions_session_idx').on(t.sessionId),
  userIdx:    index('police_interventions_user_idx').on(t.policeUserId),
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
  infractions:  jsonb('infractions').$type<InfractionRecord[]>().notNull().default([]),
  measures:     jsonb('measures').$type<MeasureRecord[]>().notNull().default([]),
  witnesses:    jsonb('witnesses').$type<WitnessRecord[]>().notNull().default([]),
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


// ── Police corrections — audit trail for driver data modifications ──
// When police corrects driver-submitted data, every change is tracked here
export interface PoliceFieldCorrection {
  fieldPath: string;         // e.g. "driver.lastName", "vehicle.plate"
  oldValue: string | null;
  newValue: string | null;
  party: 'A' | 'B';
}

export const policeCorrections = pgTable('police_corrections', {
  id:            varchar('id', { length: 30 }).primaryKey(),
  sessionId:     varchar('session_id', { length: 20 }).notNull(),
  agentId:       varchar('agent_id', { length: 20 }).notNull().references(() => policeUsers.id),
  stationId:     varchar('station_id', { length: 20 }).notNull().references(() => policeStations.id),
  party:         varchar('party', { length: 2 }).notNull(),              // 'A' or 'B'
  corrections:   jsonb('corrections').$type<PoliceFieldCorrection[]>().notNull().default([]),
  reason:        text('reason'),                                          // optional justification
  createdAt:     timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  sessionIdx: index('police_corrections_session_idx').on(t.sessionId),
  agentIdx:   index('police_corrections_agent_idx').on(t.agentId),
}));

// ── Vehicles — garage personnel ───────────────────────────────
export const vehicles = pgTable('vehicles', {
  id:           varchar('id', { length: 20 }).primaryKey(),
  userId:       varchar('user_id', { length: 20 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  // Fleet B2B : NULL = véhicule personnel (comportement historique) ; non-NULL = véhicule d'organisation.
  // userId reste notNull = créateur du véhicule (owner/admin de la flotte) — aucune régression perso.
  organizationId: varchar('organization_id', { length: 20 }).references(() => organizations.id, { onDelete: 'set null' }),
  nickname:     text('nickname'),                          // ex: "Ma Golf bleue"
  plate:        text('plate'),
  make:         text('make'),
  model:        text('model'),
  color:        text('color'),
  year:         text('year'),
  category:     text('category'),                          // ex: "Voiture de tourisme"
  licenseData:  jsonb('license_data').$type<VehicleLicenseData>().notNull().default({}),
  insuranceData:jsonb('insurance_data').$type<VehicleInsuranceData>().notNull().default({}),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  userIdx: index('vehicles_user_idx').on(t.userId),
  orgIdx:  index('vehicles_org_idx').on(t.organizationId),
}));


// ── Audit log — security/compliance events ───────────────────
export const auditLog = pgTable('audit_log', {
  id:          serial('id').primaryKey(),
  event:       varchar('event', { length: 100 }).notNull(),
  userId:      varchar('user_id', { length: 20 }),
  sessionId:   varchar('session_id', { length: 20 }),
  ip:          varchar('ip', { length: 45 }),
  detail:      jsonb('detail').$type<Record<string, unknown>>().default({}),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  eventIdx:     index('audit_log_event_idx').on(t.event),
  createdAtIdx: index('audit_log_created_at_idx').on(t.createdAt),
  userIdIdx:    index('audit_log_user_id_idx').on(t.userId),
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


// ── Fleet B2B — Organizations (sprint Fleet Foundation, additif) ──────────────
// Aucune modification des tables users / vehicles / payments / creditTxns.
// Le garage personnel et le flow constat ne dépendent pas de ces tables.
export const organizations = pgTable('organizations', {
  id:               varchar('id', { length: 20 }).primaryKey(),
  name:             text('name').notNull(),
  slug:             varchar('slug', { length: 60 }),
  plan:             varchar('plan', { length: 20 }).notNull().default('free'),
  country:          varchar('country', { length: 10 }),
  createdByUserId:  varchar('created_by_user_id', { length: 20 }).notNull().references(() => users.id),
  createdAt:        timestamp('created_at').notNull().defaultNow(),
  updatedAt:        timestamp('updated_at').notNull().defaultNow(),
  deletedAt:        timestamp('deleted_at'),
}, (t) => ({
  createdByIdx: index('organizations_created_by_idx').on(t.createdByUserId),
}));

// org member roles: 'owner' | 'fleet_admin' | 'driver' | 'broker_viewer' | 'insurer_viewer'
// status: 'active' | 'suspended' | 'removed'
export const organizationMembers = pgTable('organization_members', {
  id:               varchar('id', { length: 20 }).primaryKey(),
  organizationId:   varchar('organization_id', { length: 20 }).notNull()
                      .references(() => organizations.id, { onDelete: 'cascade' }),
  userId:           varchar('user_id', { length: 20 })
                      .references(() => users.id, { onDelete: 'cascade' }),
  invitedEmail:     text('invited_email'),
  role:             varchar('role', { length: 20 }).notNull().default('driver'),
  status:           varchar('status', { length: 20 }).notNull().default('active'),
  joinedAt:         timestamp('joined_at'),
  createdAt:        timestamp('created_at').notNull().defaultNow(),
  updatedAt:        timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  orgIdx:  index('org_members_org_idx').on(t.organizationId),
  userIdx: index('org_members_user_idx').on(t.userId),
  uniq:    uniqueIndex('org_members_org_user_uniq').on(t.organizationId, t.userId),
}));


// ── Fleet B2B — Monetization : wallets + transactions (additif) ──────────────
// owner_type = 'user' | 'organization'. Coexiste avec users.credits (non migré).
export const creditWallets = pgTable('credit_wallets', {
  id:             varchar('id', { length: 20 }).primaryKey(),
  ownerType:      varchar('owner_type', { length: 20 }).notNull(),
  userId:         varchar('user_id', { length: 20 }).references(() => users.id, { onDelete: 'cascade' }),
  organizationId: varchar('organization_id', { length: 20 }).references(() => organizations.id, { onDelete: 'cascade' }),
  credits:        integer('credits').notNull().default(0),
  createdAt:      timestamp('created_at').notNull().defaultNow(),
  updatedAt:      timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  userIdx: index('credit_wallets_user_idx').on(t.userId),
  orgIdx:  index('credit_wallets_org_idx').on(t.organizationId),
  orgUniq: uniqueIndex('credit_wallets_org_uniq').on(t.organizationId),
}));

// type = 'purchase' | 'consumption' | 'adjustment' | 'refund'
export const walletTransactions = pgTable('wallet_transactions', {
  id:                   varchar('id', { length: 20 }).primaryKey(),
  walletId:             varchar('wallet_id', { length: 20 }).notNull().references(() => creditWallets.id, { onDelete: 'cascade' }),
  type:                 varchar('type', { length: 20 }).notNull(),
  amount:               integer('amount').notNull(),
  balanceAfter:         integer('balance_after').notNull(),
  reason:               varchar('reason', { length: 60 }),
  relatedSessionId:     varchar('related_session_id', { length: 20 }),
  relatedPaymentId:     varchar('related_payment_id', { length: 30 }),
  relatedOrganizationId:varchar('related_organization_id', { length: 20 }),
  createdByUserId:      varchar('created_by_user_id', { length: 20 }),
  createdAt:            timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  walletIdx:  index('wallet_txns_wallet_idx').on(t.walletId),
  sessionIdx: index('wallet_txns_session_idx').on(t.relatedSessionId),
}));

// ── Fleet B2B — Onboarding : invitations membres (additif) ───────────────────
// status = 'pending' | 'accepted' | 'revoked' | 'expired'. token brut JAMAIS stocké (tokenHash).
export const organizationInvites = pgTable('organization_invites', {
  id:                varchar('id', { length: 20 }).primaryKey(),
  organizationId:    varchar('organization_id', { length: 20 }).notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  email:             text('email').notNull(),
  role:              varchar('role', { length: 20 }).notNull().default('driver'),
  tokenHash:         varchar('token_hash', { length: 64 }).notNull(),
  status:            varchar('status', { length: 20 }).notNull().default('pending'),
  invitedByUserId:   varchar('invited_by_user_id', { length: 20 }),
  acceptedByUserId:  varchar('accepted_by_user_id', { length: 20 }),
  expiresAt:         timestamp('expires_at').notNull(),
  acceptedAt:        timestamp('accepted_at'),
  createdAt:         timestamp('created_at').notNull().defaultNow(),
  updatedAt:         timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  orgIdx:   index('org_invites_org_idx').on(t.organizationId),
  emailIdx: index('org_invites_email_idx').on(t.email),
  tokenIdx: index('org_invites_token_idx').on(t.tokenHash),
}));
