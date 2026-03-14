-- =============================================================================
-- Add AI summary column to analyses table
-- Stores the AI-generated security summary so it persists across views.
-- =============================================================================

ALTER TABLE analyses ADD COLUMN ai_summary TEXT;
