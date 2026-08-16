alter table staff
  add column if not exists employment_type     text check (employment_type in ('full-time','part-time','subcontractor','casual')),
  add column if not exists abn                 text,
  add column if not exists emergency_contact   text,
  add column if not exists emergency_phone     text,
  add column if not exists police_check_expiry date,
  add column if not exists police_check_path   text,
  add column if not exists insurance_provider  text,
  add column if not exists insurance_policy_no text,
  add column if not exists insurance_expiry    date,
  add column if not exists insurance_cert_path text;

insert into storage.buckets (id, name, public)
values ('staff-documents', 'staff-documents', false)
on conflict (id) do nothing;

create policy "staff_docs_owner_select" on storage.objects
  for select using (
    bucket_id = 'staff-documents'
    and auth.jwt() ->> 'email' in ('harryrconway@icloud.com', 'hello@myquest.au')
  );

create policy "staff_docs_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'staff-documents'
    and auth.jwt() ->> 'email' in ('harryrconway@icloud.com', 'hello@myquest.au')
  );

create policy "staff_docs_owner_update" on storage.objects
  for update using (
    bucket_id = 'staff-documents'
    and auth.jwt() ->> 'email' in ('harryrconway@icloud.com', 'hello@myquest.au')
  );

create policy "staff_docs_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'staff-documents'
    and auth.jwt() ->> 'email' in ('harryrconway@icloud.com', 'hello@myquest.au')
  );
