-- Add staff assignment columns to jobs table
alter table jobs
  add column if not exists assigned_staff_id uuid references staff(id) on delete set null,
  add column if not exists assigned_staff_name text;
