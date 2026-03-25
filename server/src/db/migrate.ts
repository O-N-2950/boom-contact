import { logger } from '../logger.js';
import { db } from './index.js';

export async function runMigrations() {
  try {
    // ── Block 1 : core tables ─────────────────────────────────────────────
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id           VARCHAR(20) PRIMARY KEY,
        status       VARCHAR(20) NOT NULL DEFAULT 'waiting',
        created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
        expires_at   TIMESTAMP NOT NULL,
        accident     JSONB NOT NULL DEFAULT '{}',
        participant_a JSONB NOT NULL DEFAULT '{}',
        participant_b JSONB,
        pdf_url      TEXT,
        owner_email  TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_sessions_status  ON sessions(status);

      DO $$ BEGIN
        ALTER TABLE sessions ADD COLUMN IF NOT EXISTS owner_email TEXT;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;

      DO $$ BEGIN
        ALTER TABLE sessions ADD COLUMN IF NOT EXISTS participant_c JSONB;
        ALTER TABLE sessions ADD COLUMN IF NOT EXISTS participant_d JSONB;
        ALTER TABLE sessions ADD COLUMN IF NOT EXISTS participant_e JSONB;
        ALTER TABLE sessions ADD COLUMN IF NOT EXISTS vehicle_count INTEGER NOT NULL DEFAULT 2;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;

      CREATE TABLE IF NOT EXISTS users (
        id                    VARCHAR(20) PRIMARY KEY,
        email                 TEXT NOT NULL UNIQUE,
        created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
        credits               INTEGER NOT NULL DEFAULT 0,
        consent_cgu           BOOLEAN NOT NULL DEFAULT FALSE,
        consent_cgu_at        TIMESTAMP,
        consent_marketing     BOOLEAN NOT NULL DEFAULT FALSE,
        consent_marketing_at  TIMESTAMP,
        country               VARCHAR(10),
        language              VARCHAR(10),
        last_seen_at          TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

      CREATE TABLE IF NOT EXISTS payments (
        id                  VARCHAR(30) PRIMARY KEY,
        user_email          TEXT NOT NULL,
        stripe_session_id   TEXT,
        package_id          VARCHAR(20) NOT NULL,
        package_label       TEXT NOT NULL,
        credits_granted     INTEGER NOT NULL,
        amount_cents        INTEGER NOT NULL,
        currency            VARCHAR(5) NOT NULL DEFAULT 'EUR',
        status              VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
        paid_at             TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_payments_email ON payments(user_email);

      CREATE TABLE IF NOT EXISTS credit_txns (
        id          VARCHAR(20) PRIMARY KEY,
        user_email  TEXT NOT NULL,
        delta       INTEGER NOT NULL,
        reason      VARCHAR(40) NOT NULL,
        ref         TEXT,
        created_at  TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // ── Block 2 : Module Police B2B — Session 6 ──────────────────────────
    await db.execute(`
      CREATE TABLE IF NOT EXISTS police_stations (
        id          VARCHAR(20) PRIMARY KEY,
        name        TEXT NOT NULL,
        canton      VARCHAR(10),
        country     VARCHAR(5) NOT NULL DEFAULT 'CH',
        city        TEXT,
        email       TEXT,
        phone       TEXT,
        active      BOOLEAN NOT NULL DEFAULT TRUE,
        created_at  TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS police_users (
        id            VARCHAR(30) PRIMARY KEY,
        station_id    VARCHAR(20) NOT NULL REFERENCES police_stations(id),
        email         TEXT NOT NULL UNIQUE,
        first_name    TEXT NOT NULL,
        last_name     TEXT NOT NULL,
        badge_number  TEXT,
        password_hash TEXT NOT NULL,
        role          VARCHAR(20) NOT NULL DEFAULT 'agent',
        active        BOOLEAN NOT NULL DEFAULT TRUE,
        created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
        last_login_at TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_police_users_email   ON police_users(email);
      CREATE INDEX IF NOT EXISTS idx_police_users_station ON police_users(station_id);
    `);

    // ── Block 3 : Annotations police — Session 7 ─────────────────────────
    await db.execute(`
      CREATE TABLE IF NOT EXISTS police_annotations (
        id            VARCHAR(30) PRIMARY KEY,
        session_id    VARCHAR(20) NOT NULL,
        agent_id      VARCHAR(20) NOT NULL,
        station_id    VARCHAR(20) NOT NULL,
        country       VARCHAR(5)  NOT NULL DEFAULT 'CH',
        report_number TEXT,
        infractions   JSONB NOT NULL DEFAULT '[]',
        measures      JSONB NOT NULL DEFAULT '[]',
        witnesses     JSONB NOT NULL DEFAULT '[]',
        observations  TEXT,
        created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
        consulted_at  TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_police_annotations_session ON police_annotations(session_id);
      CREATE INDEX IF NOT EXISTS idx_police_annotations_agent   ON police_annotations(agent_id);
    `);

    // ── Block 4 : Auth — password + magic tokens — Session 13 ────────────
    await db.execute(`
      DO $$ BEGIN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'customer';
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;

      CREATE TABLE IF NOT EXISTS magic_tokens (
        id           VARCHAR(30) PRIMARY KEY,
        email        TEXT NOT NULL,
        token        TEXT NOT NULL UNIQUE,
        type         VARCHAR(20) NOT NULL DEFAULT 'login',
        gift_credits INTEGER,
        expires_at   TIMESTAMP NOT NULL,
        used_at      TIMESTAMP,
        created_at   TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_magic_tokens_token ON magic_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_magic_tokens_email ON magic_tokens(email);
    `);


    // ── Block 5 : Garage personnel — vehicles — Session 13 ───────────────
    await db.execute(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id             VARCHAR(20) PRIMARY KEY,
        user_id        VARCHAR(20) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        nickname       TEXT,
        plate          TEXT,
        make           TEXT,
        model          TEXT,
        color          TEXT,
        year           TEXT,
        category       TEXT,
        license_data   JSONB NOT NULL DEFAULT '{}',
        insurance_data JSONB NOT NULL DEFAULT '{}',
        created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_vehicles_user ON vehicles(user_id);
    `);

    // ── Block 6 : Admin user seed — raw SQL, no dynamic import ──────────
    // Upsert admin user — always sets role=admin + credits=999999 + password
    // Password: Cristal4you11++ → scrypt hash computed at first run
    // We use bcrypt-compatible approach: store a known sentinel, 
    // then auth.service will hash on first login if needed.
    // For now we store a pre-seeded password_hash via a known value:
    // We can't compute scrypt here easily — so we set a flag and let 
    // auth.service handle it. Instead: just ensure role/credits are correct
    // and set password_hash to NULL so the user can use magic link or 
    // we'll push the hash separately.
    await db.execute(`
      INSERT INTO users (id, email, role, credits, consent_cgu, consent_cgu_at, created_at)
      VALUES ('admin_boom_01', 'contact@boom.contact', 'admin', 999999, TRUE, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        role    = 'admin',
        credits = 999999
      WHERE users.email = 'contact@boom.contact';
    `);
    logger.info('✅ Admin user upserted (role=admin, credits=999999)');


    // ── Block 7 : Profil utilisateur étendu — Session 15 ────────────────
    await db.execute(`
      DO $$ BEGIN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS company TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `);


    // ── Block 8 : Social media posts — Session 15+ ───────────────
    await db.execute(`
      CREATE TABLE IF NOT EXISTS social_posts (
        id          SERIAL PRIMARY KEY,
        platform    VARCHAR(20) NOT NULL,
        pillar      VARCHAR(1) NOT NULL,
        text        TEXT NOT NULL,
        status      VARCHAR(20) NOT NULL DEFAULT 'pending',
        posted_at   TIMESTAMP,
        created_at  TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    logger.info('✅ DB migrations applied');
  } catch (err: any) {
    if (err?.code === '42P07') {
      console.log('✅ DB migrations applied (tables already exist)');
    } else {
      logger.error('DB migration error', { error: err?.message || String(err) });
      throw err;
    }
  }
}


