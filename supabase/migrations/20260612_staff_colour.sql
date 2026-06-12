-- Staff colour system
-- Run this in Supabase SQL Editor

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS colour TEXT DEFAULT '';
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS assigned_staff_colour TEXT DEFAULT '';
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS assigned_staff_name TEXT DEFAULT '';
