-- Migration: Add police_corrections table for audit trail
-- Tracks every field correction made by police on driver-submitted data
-- Stores old/new values for RGPD compliance and PDF annotation

CREATE TABLE IF NOT EXISTS police_corrections (
  id              VARCHAR(30) PRIMARY KEY,
  session_id      VARCHAR(20) NOT NULL,
  agent_id        VARCHAR(20) NOT NULL REFERENCES police_users(id),
  station_id      VARCHAR(20) NOT NULL REFERENCES police_stations(id),
  party           VARCHAR(2) NOT NULL,
  corrections     JSONB NOT NULL DEFAULT '[]'::jsonb,
  reason          TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS police_corrections_session_idx ON police_corrections(session_id);
CREATE INDEX IF NOT EXISTS police_corrections_agent_idx ON police_corrections(agent_id);
