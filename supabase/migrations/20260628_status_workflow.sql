-- Migrate old status values to new workflow statuses
UPDATE profiles SET status = 'onboarding' WHERE status = 'invited';
UPDATE profiles SET status = 'exited'     WHERE status = 'suspended';

-- Track when invite email was sent
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;
