alter table inquiries add column if not exists source text;
alter table inquiries add column if not exists client_id uuid references clients(id);
alter table inquiries add column if not exists job_id uuid references jobs(id);
alter table inquiries add column if not exists converted_at timestamptz;
alter table inquiries add column if not exists lost_reason text;
