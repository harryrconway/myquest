-- Add human-readable job reference number to jobs table
alter table jobs add column if not exists job_number integer;

-- Sequence for new jobs
create sequence if not exists jobs_job_number_seq;

-- Backfill existing jobs ordered by date ascending
update jobs j
set job_number = sub.rn
from (
  select id, row_number() over (order by date asc nulls last) as rn
  from jobs
) sub
where j.id = sub.id;

-- Advance the sequence past the highest existing value
select setval('jobs_job_number_seq', (select coalesce(max(job_number), 0) from jobs));

-- Auto-assign number on every new insert
alter table jobs alter column job_number set default nextval('jobs_job_number_seq');
