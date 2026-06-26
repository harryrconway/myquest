-- Input length constraints on user-submitted text fields
-- Matches the limits enforced at the Cloudflare Function and HTML layers.

-- quote_requests: public-facing fields (submitted via quote form or accepted by manager)
ALTER TABLE quote_requests
  ADD CONSTRAINT chk_qr_full_name       CHECK (length(full_name)        <= 100),
  ADD CONSTRAINT chk_qr_phone           CHECK (length(phone)            <= 20),
  ADD CONSTRAINT chk_qr_email           CHECK (length(email)            <= 254),
  ADD CONSTRAINT chk_qr_suburb          CHECK (length(suburb)           <= 100),
  ADD CONSTRAINT chk_qr_state           CHECK (length(state)            <= 50),
  ADD CONSTRAINT chk_qr_postcode        CHECK (length(postcode)         <= 10),
  ADD CONSTRAINT chk_qr_street_address  CHECK (length(street_address)   <= 200),
  ADD CONSTRAINT chk_qr_notes           CHECK (length(notes)            <= 500),
  ADD CONSTRAINT chk_qr_internal_notes  CHECK (length(internal_notes)   <= 500),
  ADD CONSTRAINT chk_qr_frequency       CHECK (length(frequency)        <= 50),
  ADD CONSTRAINT chk_qr_condition       CHECK (length(condition)        <= 100),
  ADD CONSTRAINT chk_qr_property_type   CHECK (length(property_type)    <= 100),
  ADD CONSTRAINT chk_qr_service_type    CHECK (length(service_type)     <= 100),
  ADD CONSTRAINT chk_qr_recurrence      CHECK (length(recurrence)       <= 20),
  ADD CONSTRAINT chk_qr_status          CHECK (status IN ('unscheduled','scheduled','completed','archived'));

-- profiles: staff-submitted fields
ALTER TABLE profiles
  ADD CONSTRAINT chk_prof_name          CHECK (length(name)                     <= 100),
  ADD CONSTRAINT chk_prof_email         CHECK (length(email)                    <= 254),
  ADD CONSTRAINT chk_prof_phone         CHECK (length(phone)                    <= 20),
  ADD CONSTRAINT chk_prof_mobile        CHECK (length(mobile)                   <= 20),
  ADD CONSTRAINT chk_prof_suburb        CHECK (length(suburb)                   <= 100),
  ADD CONSTRAINT chk_prof_state         CHECK (length(state)                    <= 50),
  ADD CONSTRAINT chk_prof_postcode      CHECK (length(postcode)                 <= 10),
  ADD CONSTRAINT chk_prof_address       CHECK (length(address)                  <= 200),
  ADD CONSTRAINT chk_prof_colour        CHECK (length(colour)                   <= 20),
  ADD CONSTRAINT chk_prof_role          CHECK (role IN ('owner','manager','senior-cleaner','mid-cleaner','junior-cleaner','staff')),
  ADD CONSTRAINT chk_prof_status        CHECK (status IN ('active','invited','suspended')),
  ADD CONSTRAINT chk_prof_ec_name       CHECK (length(emergency_contact_name)   <= 100),
  ADD CONSTRAINT chk_prof_ec_number     CHECK (length(emergency_contact_number) <= 20),
  ADD CONSTRAINT chk_prof_ec_relation   CHECK (length(emergency_relation)       <= 100);

-- clients: manager-created records
ALTER TABLE clients
  ADD CONSTRAINT chk_cl_full_name       CHECK (length(full_name)       <= 100),
  ADD CONSTRAINT chk_cl_email           CHECK (length(email)           <= 254),
  ADD CONSTRAINT chk_cl_phone           CHECK (length(phone)           <= 20),
  ADD CONSTRAINT chk_cl_suburb          CHECK (length(suburb)          <= 100),
  ADD CONSTRAINT chk_cl_state           CHECK (length(state)           <= 50),
  ADD CONSTRAINT chk_cl_postcode        CHECK (length(postcode)        <= 10),
  ADD CONSTRAINT chk_cl_street_address  CHECK (length(street_address)  <= 200),
  ADD CONSTRAINT chk_cl_notes           CHECK (length(notes)           <= 500);

-- company_settings: key is an internal enum, not user-submitted, but lock it anyway
ALTER TABLE company_settings
  ADD CONSTRAINT chk_cs_key             CHECK (key IN ('rates','checklist_template','message_of_week'));
