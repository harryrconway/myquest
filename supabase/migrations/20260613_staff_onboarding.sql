-- Staff onboarding profile fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mobile                          TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS residential_address             TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_name          TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_number        TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_photo_url               TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS police_check_url                TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS drivers_licence_url             TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vehicle_make                    TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vehicle_model                   TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vehicle_registration            TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS right_to_work_url              TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS availability                    JSONB;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employment_agreement_signed_at  TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_policy_signed_at        TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_policy_signed_at        TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_complete             BOOLEAN DEFAULT FALSE;

-- Storage bucket RLS for staff-documents — superseded by
-- 20260622_staff_documents_storage_policy.sql (this draft was never
-- applied, and was missing an UPDATE policy, which is why replacing
-- an existing document failed RLS). Run that migration instead.
