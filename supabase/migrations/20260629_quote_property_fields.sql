-- Property detail columns required by the internal quoting workflow.
-- These were missing from 20260629_quote_internal_fields.sql.

ALTER TABLE quote_requests
  ADD COLUMN IF NOT EXISTS access_instructions TEXT,
  ADD COLUMN IF NOT EXISTS bedrooms            INTEGER,
  ADD COLUMN IF NOT EXISTS bathrooms           INTEGER,
  ADD COLUMN IF NOT EXISTS living_areas        INTEGER,
  ADD COLUMN IF NOT EXISTS floor_area_sqm      NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS extras              JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS preferred_days      JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS preferred_time      TEXT,
  ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ;
