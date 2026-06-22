-- Fix: "new row violates row-level security policy" when replacing an
-- existing staff document. The original policies drafted in
-- 20260613_staff_onboarding.sql were never applied (left commented out)
-- and only covered INSERT — there was no UPDATE policy at all, so the
-- client-side upsert() call fails the moment a file already exists at
-- that path (first upload works, replacing it doesn't).
--
-- This also extends the policy so managers/owners can upload/view
-- documents on behalf of other staff (matching the Settings page,
-- where a manager/owner can select any team member's Documents
-- section), not just their own folder.
--
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor) — it is
-- not applied automatically by this codebase.

DROP POLICY IF EXISTS "staff upload own docs" ON storage.objects;
DROP POLICY IF EXISTS "staff read own docs" ON storage.objects;

CREATE POLICY "staff documents insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'staff-documents' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
    )
  );

CREATE POLICY "staff documents select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'staff-documents' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
    )
  );

CREATE POLICY "staff documents update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'staff-documents' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
    )
  )
  WITH CHECK (
    bucket_id = 'staff-documents' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
    )
  );
