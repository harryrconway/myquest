-- Allow authenticated users full access to staff table.
-- The owner inserts/updates via the CRM; staff update their own record.
-- All reads are allowed (needed for owner grid + staff profile lookup).
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read staff" ON staff
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated insert staff" ON staff
  FOR INSERT TO authenticated WITH CHECK (true);

-- Staff can update their own record (personal details + doc paths), matched by email
CREATE POLICY "Staff update own record" ON staff
  FOR UPDATE TO authenticated
  USING (email = (auth.jwt() ->> 'email'))
  WITH CHECK (email = (auth.jwt() ->> 'email'));

-- Service role has full access for Cloudflare Function writes
CREATE POLICY "Service role full access" ON staff
  FOR ALL TO service_role USING (true) WITH CHECK (true);
