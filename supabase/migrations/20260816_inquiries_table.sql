create table if not exists inquiries (
  id           uuid        primary key default gen_random_uuid(),
  created_at   timestamptz default now(),
  biz_name     text,
  contact_name text,
  email        text,
  mobile       text,
  suburb       text,
  space_type   text,
  sqm_range    text,
  frequency    text,
  notes        text,
  status       text        default 'new'
);

alter table inquiries enable row level security;

create policy "owner_select" on inquiries
  for select using (auth.jwt() ->> 'email' in ('harryrconway@icloud.com', 'hello@myquest.au'));

create policy "owner_update" on inquiries
  for update using (auth.jwt() ->> 'email' in ('harryrconway@icloud.com', 'hello@myquest.au'));

grant all on public.inquiries to service_role;
grant all on public.inquiries to authenticated;
