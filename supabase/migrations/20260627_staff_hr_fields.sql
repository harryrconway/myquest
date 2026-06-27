-- Add HR-specific columns to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS hr_notes TEXT,
  ADD COLUMN IF NOT EXISTS employment_agreement_url TEXT,
  ADD COLUMN IF NOT EXISTS employment_agreement_received_at TIMESTAMPTZ;
