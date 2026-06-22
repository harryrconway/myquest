-- Fix: the Team Availability card on the dashboard home page subscribes
-- to postgres_changes on the `profiles` table (dashboard/js/dashboard-home-r2.js)
-- but never receives events, because `profiles` was never added to the
-- supabase_realtime publication. The subscription code is correct; this
-- is purely a one-time Supabase configuration step.
--
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor) — it is
-- not applied automatically by this codebase.

ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
