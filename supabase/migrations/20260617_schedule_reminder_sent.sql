ALTER TABLE quote_requests
  ADD COLUMN IF NOT EXISTS schedule_reminder_sent boolean DEFAULT false;

UPDATE quote_requests
  SET schedule_reminder_sent = false
  WHERE schedule_reminder_sent IS NULL;
