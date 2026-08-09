-- Tighten CRM RLS: replace open "using (true)" policies with email-gated ones.
-- Only the two allowlisted emails can read or write any CRM data at the DB level,
-- closing the gap where a valid Supabase JWT from any source bypassed the client-side check.

do $$
declare t text;
begin
  foreach t in array array['clients','jobs','contracts','staff','scopes'] loop
    execute format('drop policy if exists "crm_all" on %I', t);
    execute format($p$
      create policy "crm_owner_only" on %I
      for all to authenticated
      using  (auth.email() = any(array['harryrconway@icloud.com','hello@myquest.au']))
      with check (auth.email() = any(array['harryrconway@icloud.com','hello@myquest.au']))
    $p$, t);
  end loop;
end $$;

-- Storage bucket policy
drop policy if exists "crm_pdfs_all" on storage.objects;
create policy "crm_pdfs_owner_only" on storage.objects
  for all to authenticated
  using  (bucket_id = 'contract-pdfs'
          and auth.email() = any(array['harryrconway@icloud.com','hello@myquest.au']))
  with check (bucket_id = 'contract-pdfs'
              and auth.email() = any(array['harryrconway@icloud.com','hello@myquest.au']));
