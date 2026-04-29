CREATE TABLE comments (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id   uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email        text NOT NULL,
  display_name text,
  body         text NOT NULL,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  approved_at  timestamptz
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read approved no email" ON comments
  FOR SELECT USING (status = 'approved');

CREATE TABLE media_links (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id     uuid REFERENCES projects(id) ON DELETE CASCADE,
  builder_name   text,
  url            text NOT NULL,
  title          text NOT NULL,
  source         text,
  published_date date,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE media_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON media_links FOR SELECT USING (true);
