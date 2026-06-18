-- Recurrence columns were added directly in Supabase dashboard; this migration
-- records them for source control. IF NOT EXISTS makes it safe to run again.
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS recurrence TEXT DEFAULT 'none';
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS recurrence_parent_id UUID;
