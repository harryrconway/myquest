-- Drop all existing staff-documents storage policies (owner-only ones from 20260816
-- and any pre-existing ones that prevented 20261011 from running correctly).
DROP POLICY IF EXISTS "staff_docs_owner_select" ON storage.objects;
DROP POLICY IF EXISTS "staff_docs_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "staff_docs_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "staff_docs_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload staff-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read staff-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update staff-documents" ON storage.objects;

-- Single policy: all authenticated users can manage files in staff-documents.
CREATE POLICY "staff_docs_authenticated_all" ON storage.objects
  FOR ALL TO authenticated
  USING  (bucket_id = 'staff-documents')
  WITH CHECK (bucket_id = 'staff-documents');

-- Allow staff to update their own row in the staff table (e.g. to save doc paths).
-- crm_owner_only covers owners; this adds staff self-update.
CREATE POLICY "staff_self_update" ON staff
  FOR UPDATE TO authenticated
  USING  (
    email = auth.email()
    OR auth.email() = ANY(ARRAY['harryrconway@icloud.com','hello@myquest.au'])
  )
  WITH CHECK (
    email = auth.email()
    OR auth.email() = ANY(ARRAY['harryrconway@icloud.com','hello@myquest.au'])
  );
