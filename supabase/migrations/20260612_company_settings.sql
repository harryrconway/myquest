-- Company-wide settings (rates, checklist template, etc.)
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS company_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- All authenticated users can read settings (needed by staff to load checklist template)
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read" ON company_settings
  FOR SELECT TO authenticated USING (true);

-- Only the service role (via Cloudflare Functions) can write — no direct client writes
-- The save-settings.js function verifies owner role before calling with service key
