-- Allow authenticated users to read all staff records (owner views grid, staff views own profile)
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read staff" ON staff
  FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to update their own record, matched by email
-- This lets staff upload docs and update personal details via profile.html
CREATE POLICY "Staff update own record" ON staff
  FOR UPDATE TO authenticated
  USING (email = (auth.jwt() ->> 'email'))
  WITH CHECK (email = (auth.jwt() ->> 'email'));

-- Service role has full access for owner writes via Cloudflare Functions
CREATE POLICY "Service role full access" ON staff
  FOR ALL TO service_role USING (true) WITH CHECK (true);
