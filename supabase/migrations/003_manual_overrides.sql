CREATE TABLE manual_overrides (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  field_name      text NOT NULL,
  original_value  jsonb,
  override_value  jsonb,
  reason          text,
  overridden_by   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE scrape_logs (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  scraper_name     text NOT NULL,
  status           text NOT NULL,
  projects_found   int DEFAULT 0,
  projects_updated int DEFAULT 0,
  errors           jsonb DEFAULT '[]',
  ran_at           timestamptz NOT NULL DEFAULT now()
);
