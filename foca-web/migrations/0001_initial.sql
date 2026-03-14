-- =============================================================================
-- FOCA Web - D1 Schema
-- =============================================================================

-- Analysis jobs table: one row per uploaded file
CREATE TABLE IF NOT EXISTS analyses (
  id          TEXT PRIMARY KEY,            -- UUID v4
  filename    TEXT NOT NULL,
  filetype    TEXT NOT NULL,               -- mime type
  filesize    INTEGER NOT NULL,            -- bytes
  status      TEXT NOT NULL DEFAULT 'uploaded',  -- uploaded | analyzing | completed | error
  metadata    TEXT,                         -- JSON string of extracted metadata
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Processing log entries
CREATE TABLE IF NOT EXISTS processing_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  message     TEXT NOT NULL,
  level       TEXT NOT NULL DEFAULT 'info',  -- info | warn | error
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for fast history lookups
CREATE INDEX IF NOT EXISTS idx_analyses_created ON analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_analysis ON processing_logs(analysis_id, created_at);
