-- FOCA Web: Initial D1 Schema
-- Run with: npx wrangler d1 execute foca-db --local --file=./migrations/0001_init.sql

CREATE TABLE IF NOT EXISTS analysis_jobs (
  id            TEXT PRIMARY KEY,
  filename      TEXT NOT NULL,
  file_type     TEXT NOT NULL,
  file_size     INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'uploaded'
                CHECK (status IN ('uploaded', 'analyzing', 'completed', 'error')),
  metadata_json TEXT,           -- JSON-serialized FileMetadata
  log_json      TEXT,           -- JSON-serialized LogEntry[]
  error_message TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON analysis_jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON analysis_jobs(created_at DESC);
