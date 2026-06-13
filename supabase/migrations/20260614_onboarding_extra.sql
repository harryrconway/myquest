-- Additional onboarding fields missing from 20260613
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth      TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_relation  TEXT;
