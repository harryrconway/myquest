create policy "owner_delete" on inquiries
  for delete using (auth.jwt() ->> 'email' in ('harryrconway@icloud.com', 'hello@myquest.au'));
