CREATE TABLE IF NOT EXISTS quotes (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id       uuid        REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  created_at      timestamptz DEFAULT now() NOT NULL,
  space           text,
  freq            text,
  type            text,
  hrs             numeric(5,2),
  after_hours_pct integer     DEFAULT 0,
  buffer          boolean     DEFAULT false,
  per             numeric(10,2),
  monthly         numeric(10,2),
  label           text
);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_quotes" ON quotes
  USING  (auth.email() IN ('harryrconway@icloud.com','hello@myquest.au'))
  WITH CHECK (auth.email() IN ('harryrconway@icloud.com','hello@myquest.au'));
