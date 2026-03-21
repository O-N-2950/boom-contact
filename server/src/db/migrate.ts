import { db } from './index.js';

export async function runMigrations() {
  try {
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
    console.log('✅ DB migrations applied');
  } catch (err: any) {
    if (err?.code === '42P07') {
      console.log('✅ DB migrations applied (tables already exist)');
    } else {
      console.error('DB migration error:', err);
      throw err;
    }
  }
}
