-- Security hardening — two fixes:
--
-- 1. Enable RLS on profiles and block all direct client writes.
--    SELECT remains open to authenticated users (required by auth.js store and
--    Team Availability widget). INSERT/UPDATE/DELETE have no policy, so only the
--    service role (Cloudflare Functions) can write — clients cannot self-promote,
--    change status, or modify any profile field directly.
--
-- 2. Restrict storage SELECT so staff can only read their own profile photo.
--    Compliance documents (police_check, drivers_licence, right_to_work,
--    employment_agreement) are owner/manager-read only.

-- ── profiles ────────────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Idempotent: drop before recreating
DROP POLICY IF EXISTS "profiles_select_authenticated" ON profiles;

CREATE POLICY "profiles_select_authenticated" ON profiles
  FOR SELECT TO authenticated USING (true);

-- No INSERT / UPDATE / DELETE policies → service role only for all writes.


-- ── storage: staff-documents ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "staff documents select" ON storage.objects;

CREATE POLICY "staff documents select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'staff-documents' AND (
      -- Owner / manager can read any file
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role IN ('owner', 'manager')
      )
      OR
      -- Staff can only read their own profile photo, not compliance documents
      (
        (storage.foldername(name))[1] = auth.uid()::text
        AND name LIKE '%/profile-photo%'
      )
    )
  );
