-- Fix inquiries FKs: add ON DELETE SET NULL so that deleting a job or client
-- does not block the operation. Preserves the inquiry record with job_id/client_id
-- set to NULL rather than deleting the lead history.

-- Drop and re-add job_id FK
ALTER TABLE inquiries DROP CONSTRAINT IF EXISTS inquiries_job_id_fkey;
ALTER TABLE inquiries
  ADD CONSTRAINT inquiries_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL;

-- Drop and re-add client_id FK
ALTER TABLE inquiries DROP CONSTRAINT IF EXISTS inquiries_client_id_fkey;
ALTER TABLE inquiries
  ADD CONSTRAINT inquiries_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;
