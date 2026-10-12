-- Grant service_role SELECT on jobs so server-side API functions can query it.
-- service_role bypasses RLS but still needs table-level PostgreSQL grants.
-- staff table already works (send-invite.js patches it), jobs was never granted.
GRANT SELECT ON public.jobs TO service_role;
