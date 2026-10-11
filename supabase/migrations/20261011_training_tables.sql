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

-- RLS: owners can manage all training_items; everyone authenticated can read published ones
ALTER TABLE training_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read published training" ON training_items
  FOR SELECT TO authenticated
  USING (published = true);

CREATE POLICY "Service role manages training" ON training_items
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- RLS: staff can insert/read their own progress; owner can read all via service role
ALTER TABLE training_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage own progress" ON training_progress
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
