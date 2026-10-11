-- Training modules (owner creates, staff reads when published)
CREATE TABLE IF NOT EXISTS training_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  body          text NOT NULL DEFAULT '',
  category      text NOT NULL DEFAULT 'General',
  published     boolean NOT NULL DEFAULT false,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Staff completion records
CREATE TABLE IF NOT EXISTS training_progress (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,  -- references staff.id
  item_id    uuid NOT NULL REFERENCES training_items(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_id)
);

-- RLS: all authenticated users can read/write training data.
-- The published flag is enforced in JS: staff only see published modules,
-- owner sees all. Training content is non-sensitive (cleaning procedures).
ALTER TABLE training_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated manage training_items" ON training_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE training_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated manage training_progress" ON training_progress
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
