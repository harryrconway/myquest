alter table scopes
  add column if not exists job_id uuid references jobs(id) on delete set null;
