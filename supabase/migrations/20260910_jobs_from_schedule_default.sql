-- Backfill nulls and set column default so new rows never land as null
UPDATE jobs SET from_schedule = false WHERE from_schedule IS NULL;
ALTER TABLE jobs ALTER COLUMN from_schedule SET DEFAULT false;
