-- MyQuest CRM tables
-- Run once in Supabase SQL editor

-- ── clients ──────────────────────────────────────────────────────────────────
create table if not exists clients (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  industry     text,
  status       text not null default 'active'
               check (status in ('active','onboarding','exited')),
  contact      text,
  contact_title text,
  phone        text,
  email        text,
  site_address text,
  notes        text,
  created_at   timestamptz not null default now()
);

-- ── jobs ─────────────────────────────────────────────────────────────────────
create table if not exists jobs (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid references clients(id) on delete cascade,
  client_name    text,
  date           date not null,
  type           text not null
                 check (type in ('maintenance','deep','window','builders')),
  status         text not null default 'upcoming'
                 check (status in ('upcoming','completed')),
  site           text,
  repeat         text
                 check (repeat in ('none','weekly','fortnightly','4-weekly','monthly')),
  source_job_id  uuid references jobs(id) on delete cascade,
  from_schedule  boolean not null default false,
  created_at     timestamptz not null default now()
);

-- ── contracts ────────────────────────────────────────────────────────────────
create table if not exists contracts (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid references clients(id) on delete cascade,
  type          text
                check (type in ('12-month','6-month','ongoing','trial','ad-hoc')),
  value         integer,
  start_date    date,
  end_date      date,
  renewal_date  date,
  signed_date   date,
  notes         text,
  pdf_path      text,
  created_at    timestamptz not null default now()
);

-- ── staff ────────────────────────────────────────────────────────────────────
create table if not exists staff (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  role        text,
  phone       text,
  email       text,
  start_date  date,
  status      text not null default 'active'
              check (status in ('active','on-leave','left')),
  created_at  timestamptz not null default now()
);

-- ── scopes ───────────────────────────────────────────────────────────────────
create table if not exists scopes (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid references clients(id) on delete cascade,
  client_name  text,
  name         text,
  site         text,
  date         date,
  global_notes text,
  areas        jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now()
);

-- ── row level security ───────────────────────────────────────────────────────
alter table clients   enable row level security;
alter table jobs      enable row level security;
alter table contracts enable row level security;
alter table staff     enable row level security;
alter table scopes    enable row level security;

-- Any authenticated user can read and write all CRM data (single-tenant)
create policy "crm_all" on clients   for all to authenticated using (true) with check (true);
create policy "crm_all" on jobs      for all to authenticated using (true) with check (true);
create policy "crm_all" on contracts for all to authenticated using (true) with check (true);
create policy "crm_all" on staff     for all to authenticated using (true) with check (true);
create policy "crm_all" on scopes    for all to authenticated using (true) with check (true);

-- ── storage bucket for contract PDFs ────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('contract-pdfs', 'contract-pdfs', false)
on conflict (id) do nothing;

create policy "crm_pdfs_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'contract-pdfs')
  with check (bucket_id = 'contract-pdfs');
