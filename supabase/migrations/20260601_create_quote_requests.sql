-- Bootstrap migration: creates quote_requests from scratch.
-- All subsequent ALTER TABLE ADD COLUMN IF NOT EXISTS migrations are safe no-ops after this.
-- Run this first if the table does not yet exist in your Supabase project.

CREATE TABLE IF NOT EXISTS quote_requests (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Lifecycle status (job scheduling workflow)
  status                  TEXT        NOT NULL DEFAULT 'unscheduled'
                                        CHECK (status IN ('unscheduled','scheduled','completed','archived')),

  -- Client details
  full_name               TEXT        CHECK (length(full_name)        <= 100),
  phone                   TEXT        CHECK (length(phone)            <= 20),
  email                   TEXT        CHECK (length(email)            <= 254),
  preferred_contact       TEXT,
  client_id               UUID,

  -- Property location
  street_address          TEXT        CHECK (length(street_address)   <= 200),
  suburb                  TEXT        CHECK (length(suburb)           <= 100),
  state                   TEXT        CHECK (length(state)            <= 50),
  postcode                TEXT        CHECK (length(postcode)         <= 10),
  access_instructions     TEXT,
  parking_type            TEXT,

  -- Property details
  property_type           TEXT        CHECK (length(property_type)    <= 100),
  bedrooms                INTEGER,
  bathrooms               INTEGER,
  living_areas            INTEGER,
  floor_area_sqm          NUMERIC(10,2),
  num_floors              INTEGER,
  restroom_count          INTEGER,
  staff_count             INTEGER,
  condition               TEXT        CHECK (length(condition)        <= 100),
  furnished_status        TEXT        CHECK (furnished_status IN ('furnished','partly','unfurnished')),
  pet_info                TEXT,
  property_size_tag       TEXT,

  -- Services
  service_type            TEXT        CHECK (length(service_type)     <= 100),
  services                JSONB       DEFAULT '[]'::jsonb,
  extras                  JSONB       DEFAULT '[]'::jsonb,

  -- Scheduling preferences
  frequency               TEXT        CHECK (length(frequency)        <= 50),
  recurrence              TEXT        DEFAULT 'none' CHECK (length(recurrence) <= 20),
  recurrence_parent_id    UUID,
  is_recurring            BOOLEAN     DEFAULT FALSE,
  preferred_days          JSONB       DEFAULT '[]'::jsonb,
  preferred_time          TEXT,
  flexible_schedule       BOOLEAN     DEFAULT FALSE,

  -- Quote workflow (internal)
  quote_type              TEXT        CHECK (quote_type IN ('residential','commercial')),
  client_type             TEXT,
  quote_status            TEXT        NOT NULL DEFAULT 'draft'
                                        CHECK (quote_status IN ('draft','sent','accepted','declined')),
  quoted_price            NUMERIC(10,2),
  quote_source            TEXT        DEFAULT 'phone'
                                        CHECK (quote_source IN ('phone','walk-in','website')),
  quote_sent_at           TIMESTAMPTZ,
  urgency                 TEXT        CHECK (urgency IN ('asap','this-week','next-week','specific','flexible')),
  vacate_date             DATE,
  lead_source             TEXT,
  email_log               JSONB       DEFAULT '[]'::jsonb,

  -- Staff assignment
  assigned_staff_id       UUID,
  assigned_staff_name     TEXT        DEFAULT '',
  assigned_staff_colour   TEXT        DEFAULT '',

  -- Open shift coverage
  needs_coverage          BOOLEAN     DEFAULT FALSE,
  coverage_requested_by   UUID,
  coverage_requested_at   TIMESTAMPTZ,
  coverage_claimed_by     UUID,
  coverage_claimed_at     TIMESTAMPTZ,
  coverage_alert_sent_at  TIMESTAMPTZ,

  -- Notes
  notes                   TEXT        CHECK (length(notes)            <= 500),
  internal_notes          TEXT        CHECK (length(internal_notes)   <= 500),

  -- Reminders
  schedule_reminder_sent  BOOLEAN     DEFAULT FALSE,

  -- Audit
  created_by              UUID        REFERENCES auth.users(id),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ
);
