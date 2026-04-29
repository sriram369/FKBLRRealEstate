CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE projects (
  id                          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  rera_number                 text UNIQUE NOT NULL,
  project_name                text NOT NULL,
  builder_name                text NOT NULL,
  locality                    text,
  lat                         float8,
  lng                         float8,
  city                        text NOT NULL DEFAULT 'Bengaluru',
  rera_possession_date        date,
  advertised_possession_date  date,
  rera_carpet_area_sqft       float8,
  advertised_carpet_area_sqft float8,
  rera_amenities              jsonb NOT NULL DEFAULT '[]',
  advertised_amenities        jsonb NOT NULL DEFAULT '[]',
  status                      text NOT NULL DEFAULT 'registered',
  scraped_at                  timestamptz,
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON projects FOR SELECT USING (true);

CREATE INDEX projects_lat_lng ON projects (lat, lng);
CREATE INDEX projects_builder ON projects (builder_name);
CREATE INDEX projects_locality ON projects (locality);
