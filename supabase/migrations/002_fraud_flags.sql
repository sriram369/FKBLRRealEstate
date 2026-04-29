CREATE TABLE fraud_flags (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  flag_type   text NOT NULL CHECK (flag_type IN (
                'delayed_possession','false_amenities','area_mismatch','unregistered'
              )),
  severity    text NOT NULL CHECK (severity IN ('critical','high','medium')),
  detail      jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fraud_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON fraud_flags FOR SELECT USING (true);

CREATE INDEX fraud_flags_project ON fraud_flags (project_id);
CREATE INDEX fraud_flags_type ON fraud_flags (flag_type);
