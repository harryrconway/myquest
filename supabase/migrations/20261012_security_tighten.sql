-- Security tightening — fix overly-permissive policies added in 20261011.
-- Audit findings: Critical (storage), High x2 (staff table), Medium x2 (training).

-- ─────────────────────────────────────────
-- 1. staff-documents storage bucket
--    Previous: any authenticated user could read/write any path.
--    Fix: staff can only access files under their own UUID prefix;
--         owner emails can access everything.
-- ─────────────────────────────────────────
DROP POLICY IF EXISTS "staff_docs_authenticated_all" ON storage.objects;

CREATE POLICY "staff_docs_own_files" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'staff-documents'
    AND (
      -- File path starts with the caller's own staff UUID
      (storage.foldername(name))[1] = (
        SELECT id::text FROM staff WHERE email = auth.email() LIMIT 1
      )
      -- Or caller is an owner
      OR auth.email() = ANY(ARRAY['harryrconway@icloud.com','hello@myquest.au'])
    )
  )
  WITH CHECK (
    bucket_id = 'staff-documents'
    AND (
      (storage.foldername(name))[1] = (
        SELECT id::text FROM staff WHERE email = auth.email() LIMIT 1
      )
      OR auth.email() = ANY(ARRAY['harryrconway@icloud.com','hello@myquest.au'])
    )
  );

-- ─────────────────────────────────────────
-- 2. staff table SELECT
--    Previous: any auth user could select all rows (exposed phone, email,
--              emergency_contact, police_check_path, etc. to all staff).
--    Fix: staff can only read their own row; owners read all.
-- ─────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated read staff" ON staff;

CREATE POLICY "staff_self_select" ON staff
  FOR SELECT TO authenticated
  USING (
    email = auth.email()
    OR auth.email() = ANY(ARRAY['harryrconway@icloud.com','hello@myquest.au'])
  );

-- ─────────────────────────────────────────
-- 3. staff table INSERT
--    Previous: any auth user could insert arbitrary rows.
--    Fix: staff can only insert a row where email matches their own JWT.
--         (Owners covered by crm_owner_only which is OR-combined.)
-- ─────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated insert staff" ON staff;

CREATE POLICY "staff_self_insert" ON staff
  FOR INSERT TO authenticated
  WITH CHECK (
    email = auth.email()
    OR auth.email() = ANY(ARRAY['harryrconway@icloud.com','hello@myquest.au'])
  );

-- ─────────────────────────────────────────
-- 4. training_items — split SELECT (all staff) from writes (owner only)
--    Previous: any auth user had full INSERT/UPDATE/DELETE.
-- ─────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated manage training_items" ON training_items;

CREATE POLICY "training_items_select" ON training_items
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "training_items_owner_write" ON training_items
  FOR ALL TO authenticated
  USING  (auth.email() = ANY(ARRAY['harryrconway@icloud.com','hello@myquest.au']))
  WITH CHECK (auth.email() = ANY(ARRAY['harryrconway@icloud.com','hello@myquest.au']));

-- ─────────────────────────────────────────
-- 5. training_progress — scope to own records
--    user_id references staff.id (not auth.uid), so we join via email.
--    Previous: any auth user could read/write any user's completions.
-- ─────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated manage training_progress" ON training_progress;

CREATE POLICY "training_progress_own" ON training_progress
  FOR ALL TO authenticated
  USING (
    user_id = (SELECT id FROM staff WHERE email = auth.email() LIMIT 1)
    OR auth.email() = ANY(ARRAY['harryrconway@icloud.com','hello@myquest.au'])
  )
  WITH CHECK (
    user_id = (SELECT id FROM staff WHERE email = auth.email() LIMIT 1)
    OR auth.email() = ANY(ARRAY['harryrconway@icloud.com','hello@myquest.au'])
  );
