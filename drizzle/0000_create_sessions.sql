CREATE TABLE IF NOT EXISTS sessions (
  id           VARCHAR(20) PRIMARY KEY,
  status       VARCHAR(20) NOT NULL DEFAULT 'waiting',
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMP NOT NULL,
  accident     JSONB NOT NULL DEFAULT '{}',
  participant_a JSONB NOT NULL DEFAULT '{}',
  participant_b JSONB,
  pdf_url      TEXT
);

-- Auto-delete expired sessions after 30 days
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_status  ON sessions(status);
