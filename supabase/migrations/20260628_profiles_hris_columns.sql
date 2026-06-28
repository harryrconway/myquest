-- HRIS columns for staff management — individual address components, cleaning level,
-- and start_date. phone/address/suburb/state/postcode/start_date were missing from
-- earlier migrations (only residential_address as a concatenated field had been added).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone          TEXT,
  ADD COLUMN IF NOT EXISTS address        TEXT,
  ADD COLUMN IF NOT EXISTS suburb         TEXT,
  ADD COLUMN IF NOT EXISTS state          TEXT,
  ADD COLUMN IF NOT EXISTS postcode       TEXT,
  ADD COLUMN IF NOT EXISTS cleaning_level INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS start_date     DATE;
