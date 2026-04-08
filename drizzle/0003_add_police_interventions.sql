-- Migration: Add police_interventions table for full QR intervention flow
-- Stores infractions, driver states, conditions, witnesses, photos from police field work

CREATE TABLE IF NOT EXISTS police_interventions (
  id                      VARCHAR(30) PRIMARY KEY,
  session_id              VARCHAR(20) NOT NULL,
  police_user_id          VARCHAR(20) NOT NULL REFERENCES police_users(id),
  infractions             JSONB NOT NULL DEFAULT '[]'::jsonb,
  driver_states           JSONB NOT NULL DEFAULT '[]'::jsonb,
  conditions              JSONB,
  witnesses               JSONB NOT NULL DEFAULT '[]'::jsonb,
  observations            TEXT,
  responsibility_estimate VARCHAR(30),
  police_photos           JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS police_interventions_session_idx ON police_interventions(session_id);
CREATE INDEX IF NOT EXISTS police_interventions_user_idx ON police_interventions(police_user_id);
