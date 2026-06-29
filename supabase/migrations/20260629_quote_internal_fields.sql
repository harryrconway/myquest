-- Internal quote fields for the staff quoting workflow.
-- Extends quote_requests without touching existing job-lifecycle columns.

ALTER TABLE quote_requests
  ADD COLUMN IF NOT EXISTS quote_type        TEXT CHECK (quote_type IN ('residential','commercial')),
  ADD COLUMN IF NOT EXISTS client_type       TEXT,
  ADD COLUMN IF NOT EXISTS quote_status      TEXT NOT NULL DEFAULT 'draft'
                                               CHECK (quote_status IN ('draft','sent','accepted','declined')),
  ADD COLUMN IF NOT EXISTS quoted_price      NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS quote_source      TEXT DEFAULT 'phone'
                                               CHECK (quote_source IN ('phone','walk-in','website')),
  ADD COLUMN IF NOT EXISTS created_by        UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS quote_sent_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS furnished_status  TEXT CHECK (furnished_status IN ('furnished','partly','unfurnished')),
  ADD COLUMN IF NOT EXISTS parking_type      TEXT,
  ADD COLUMN IF NOT EXISTS urgency           TEXT CHECK (urgency IN ('asap','this-week','next-week','specific','flexible')),
  ADD COLUMN IF NOT EXISTS vacate_date       DATE,
  ADD COLUMN IF NOT EXISTS is_recurring      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS restroom_count    INTEGER,
  ADD COLUMN IF NOT EXISTS num_floors        INTEGER,
  ADD COLUMN IF NOT EXISTS lead_source       TEXT,
  ADD COLUMN IF NOT EXISTS pet_info          TEXT,
  ADD COLUMN IF NOT EXISTS property_size_tag TEXT,
  ADD COLUMN IF NOT EXISTS email_log         JSONB DEFAULT '[]'::jsonb;
