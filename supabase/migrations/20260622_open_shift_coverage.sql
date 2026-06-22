-- "Open Shift" coverage requests: a staff member who can't make an assigned
-- job (e.g. sick) flags it; any other staff member can claim it.
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS needs_coverage          BOOLEAN DEFAULT FALSE;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS coverage_requested_by   UUID;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS coverage_requested_at   TIMESTAMPTZ;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS coverage_claimed_by     UUID;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS coverage_claimed_at     TIMESTAMPTZ;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS coverage_alert_sent_at  TIMESTAMPTZ;
