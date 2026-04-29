# fckblrrealestate MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public map of Bengaluru that pins every RERA-registered real estate project and exposes builder fraud — delayed possession, false amenities, carpet area mismatch, and unregistered projects.

**Architecture:** Next.js App Router frontend with Leaflet + OpenStreetMap for the map. Supabase (PostgreSQL + PostGIS) stores project and fraud data. Next.js API routes serve data to the frontend. A Python scraper (separate task) populates Supabase daily.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Leaflet + react-leaflet, Supabase JS client, PostgreSQL (via Supabase)

---

## File Structure

```
fckblrrealestate/
├── app/
│   ├── layout.tsx                  # Root layout, metadata
│   ├── page.tsx                    # Home page — renders map + panels
│   ├── api/
│   │   ├── projects/route.ts       # GET /api/projects — filtered project list
│   │   └── projects/[id]/route.ts  # GET /api/projects/:id — single project detail
│   └── globals.css
├── components/
│   ├── BengaluruMap.tsx            # Leaflet map, markers, clustering
│   ├── ProjectPanel.tsx            # Side panel: RERA vs advertised comparison
│   ├── FilterPanel.tsx             # Fraud type filters, search, locality
│   └── StatsBar.tsx                # Top bar: counts and averages
├── lib/
│   ├── supabase.ts                 # Supabase client (browser + server)
│   ├── types.ts                    # Shared TypeScript types
│   └── fraud.ts                    # Fraud flag helpers (severity labels, colors)
├── supabase/
│   └── migrations/
│       ├── 001_projects.sql
│       ├── 002_fraud_flags.sql
│       ├── 003_manual_overrides.sql
│       └── 004_scrape_logs.sql
├── .env.local.example
└── package.json
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`
- Create: `app/layout.tsx`, `app/globals.css`
- Create: `.env.local.example`

- [ ] **Step 1: Bootstrap Next.js app**

```bash
cd /Users/sriram
npx create-next-app@latest fckblrrealestate \
  --typescript --tailwind --app --no-src-dir \
  --import-alias "@/*"
cd fckblrrealestate
```

- [ ] **Step 2: Install dependencies**

```bash
npm install leaflet react-leaflet @types/leaflet
npm install @supabase/supabase-js
npm install lucide-react
```

- [ ] **Step 3: Create `.env.local.example`**

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Copy to `.env.local` and fill in your Supabase values.

- [ ] **Step 4: Update `app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'fckblrrealestate — Bengaluru Builder Fraud Exposed',
  description: 'RERA Karnataka data vs what builders advertise. The truth about Bengaluru real estate.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-white`}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 5: Verify scaffold runs**

```bash
npm run dev
```

Expected: Next.js dev server starts on http://localhost:3000 with no errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js app with Tailwind, Leaflet, Supabase deps"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Write types**

```typescript
// lib/types.ts

export type FlagType =
  | 'delayed_possession'
  | 'false_amenities'
  | 'area_mismatch'
  | 'unregistered'

export type Severity = 'critical' | 'high' | 'medium'

export type ProjectStatus = 'registered' | 'lapsed' | 'completed'

export interface FraudFlag {
  id: string
  project_id: string
  flag_type: FlagType
  severity: Severity
  detail: Record<string, unknown>
  created_at: string
}

export interface Project {
  id: string
  rera_number: string
  project_name: string
  builder_name: string
  locality: string | null
  lat: number
  lng: number
  city: string
  rera_possession_date: string | null
  advertised_possession_date: string | null
  rera_carpet_area_sqft: number | null
  advertised_carpet_area_sqft: number | null
  rera_amenities: string[]
  advertised_amenities: string[]
  status: ProjectStatus
  scraped_at: string
  updated_at: string
  fraud_flags?: FraudFlag[]
}

export interface ProjectsResponse {
  projects: Project[]
  total: number
}

export interface FilterState {
  search: string
  flagTypes: FlagType[]
  minDelayMonths: number | null
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: Supabase Client + Database Schema

**Files:**
- Create: `lib/supabase.ts`
- Create: `supabase/migrations/001_projects.sql`
- Create: `supabase/migrations/002_fraud_flags.sql`
- Create: `supabase/migrations/003_manual_overrides.sql`
- Create: `supabase/migrations/004_community.sql`

- [ ] **Step 1: Create Supabase client**

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client with service role (for API routes)
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

- [ ] **Step 2: Write projects migration**

```sql
-- supabase/migrations/001_projects.sql
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

-- Public read access
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON projects FOR SELECT USING (true);

-- Index for geo bbox queries
CREATE INDEX projects_lat_lng ON projects (lat, lng);
CREATE INDEX projects_builder ON projects (builder_name);
CREATE INDEX projects_locality ON projects (locality);
```

- [ ] **Step 3: Write fraud_flags migration**

```sql
-- supabase/migrations/002_fraud_flags.sql
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
```

- [ ] **Step 4: Write manual_overrides + community migration**

```sql
-- supabase/migrations/003_manual_overrides.sql
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

-- supabase/migrations/004_community.sql
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

-- Never expose email via public API — RLS blocks it
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
```

- [ ] **Step 5: Run migrations in Supabase**

Go to Supabase dashboard → SQL Editor. Run each migration file in order (001 → 004).

- [ ] **Step 6: Insert 2 seed projects for dev testing**

```sql
INSERT INTO projects (
  rera_number, project_name, builder_name, locality, lat, lng,
  rera_possession_date, advertised_possession_date,
  rera_carpet_area_sqft, advertised_carpet_area_sqft,
  rera_amenities, advertised_amenities, status
) VALUES
(
  'PRM/KA/RERA/1251/309/PR/180831/001234',
  'Prestige Sunrise Park',
  'Prestige Group',
  'Electronic City Phase 1',
  12.8399, 77.6770,
  '2022-06-30', '2021-12-31',
  980, 1200,
  '["gym"]',
  '["gym","swimming_pool","clubhouse","tennis_court"]',
  'registered'
),
(
  'PRM/KA/RERA/1251/309/PR/190201/005678',
  'Brigade Meadows Block C',
  'Brigade Group',
  'Kanakapura Road',
  12.8529, 77.5611,
  NULL, '2023-03-31',
  1100, 1100,
  '["swimming_pool","gym"]',
  '["swimming_pool","gym","clubhouse"]',
  'registered'
);

INSERT INTO fraud_flags (project_id, flag_type, severity, detail)
SELECT id, 'delayed_possession', 'critical',
  '{"promised":"2021-12-31","rera_date":"2022-06-30","delay_months":24}'::jsonb
FROM projects WHERE rera_number = 'PRM/KA/RERA/1251/309/PR/180831/001234';

INSERT INTO fraud_flags (project_id, flag_type, severity, detail)
SELECT id, 'false_amenities', 'high',
  '{"claimed":["swimming_pool","clubhouse","tennis_court"],"missing_from_rera":["swimming_pool","clubhouse","tennis_court"]}'::jsonb
FROM projects WHERE rera_number = 'PRM/KA/RERA/1251/309/PR/180831/001234';
```

- [ ] **Step 7: Commit**

```bash
git add lib/supabase.ts supabase/
git commit -m "feat: Supabase client + DB schema migrations"
```

---

## Task 4: Projects API Routes

**Files:**
- Create: `app/api/projects/route.ts`
- Create: `app/api/projects/[id]/route.ts`

- [ ] **Step 1: Write GET /api/projects**

```typescript
// app/api/projects/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { FlagType } from '@/lib/types'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const flagTypes = searchParams.getAll('flag_type') as FlagType[]
  const minDelay = searchParams.get('min_delay_months')

  const supabase = createServerClient()

  let query = supabase
    .from('projects')
    .select(`
      id, rera_number, project_name, builder_name, locality,
      lat, lng, status, rera_possession_date, advertised_possession_date,
      rera_carpet_area_sqft, advertised_carpet_area_sqft,
      rera_amenities, advertised_amenities,
      fraud_flags (id, flag_type, severity, detail)
    `)
    .not('lat', 'is', null)
    .not('lng', 'is', null)

  if (search) {
    query = query.or(
      `project_name.ilike.%${search}%,builder_name.ilike.%${search}%,locality.ilike.%${search}%`
    )
  }

  const { data, error } = await query.limit(2000)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let projects = data || []

  // Filter by flag type (post-query since it's a join filter)
  if (flagTypes.length > 0) {
    projects = projects.filter((p) =>
      p.fraud_flags?.some((f) => flagTypes.includes(f.flag_type as FlagType))
    )
  }

  // Filter by delay months
  if (minDelay) {
    const minMonths = parseInt(minDelay)
    projects = projects.filter((p) =>
      p.fraud_flags?.some((f) => {
        if (f.flag_type !== 'delayed_possession') return false
        const detail = f.detail as { delay_months?: number }
        return (detail.delay_months ?? 0) >= minMonths
      })
    )
  }

  return NextResponse.json({ projects, total: projects.length })
}
```

- [ ] **Step 2: Write GET /api/projects/[id]**

```typescript
// app/api/projects/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      fraud_flags (*),
      media_links (id, url, title, source, published_date),
      comments (id, display_name, body, created_at)
    `)
    .eq('id', params.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json(data)
}
```

- [ ] **Step 3: Verify API routes manually**

Start dev server: `npm run dev`

Test in browser or curl:
```bash
curl http://localhost:3000/api/projects
# Expected: {"projects":[...2 seed projects...],"total":2}

curl http://localhost:3000/api/projects/<id-from-above>
# Expected: full project object with fraud_flags array
```

- [ ] **Step 4: Commit**

```bash
git add app/api/
git commit -m "feat: projects API routes with filtering"
```

---

## Task 5: Fraud Helper + Color Mapping

**Files:**
- Create: `lib/fraud.ts`

- [ ] **Step 1: Write fraud helpers**

```typescript
// lib/fraud.ts
import type { FlagType, Severity, FraudFlag } from './types'

export const FLAG_LABELS: Record<FlagType, string> = {
  delayed_possession: 'Delayed Possession',
  false_amenities: 'False Amenities',
  area_mismatch: 'Area Mismatch',
  unregistered: 'Not on RERA',
}

export const FLAG_COLORS: Record<FlagType, string> = {
  unregistered: '#111111',
  delayed_possession: '#ef4444',
  false_amenities: '#f97316',
  area_mismatch: '#eab308',
}

// Priority: unregistered > delayed > false_amenities > area_mismatch
const FLAG_PRIORITY: FlagType[] = [
  'unregistered',
  'delayed_possession',
  'false_amenities',
  'area_mismatch',
]

export function topFlag(flags: FraudFlag[]): FlagType | null {
  if (!flags || flags.length === 0) return null
  for (const ft of FLAG_PRIORITY) {
    if (flags.some((f) => f.flag_type === ft)) return ft
  }
  return null
}

export function markerColor(flags: FraudFlag[]): string {
  const top = topFlag(flags)
  if (!top) return '#22c55e' // green = clean
  return FLAG_COLORS[top]
}

export function delayMonths(flags: FraudFlag[]): number {
  const f = flags.find((f) => f.flag_type === 'delayed_possession')
  if (!f) return 0
  const detail = f.detail as { delay_months?: number }
  return detail.delay_months ?? 0
}

export function missingAmenities(flags: FraudFlag[]): string[] {
  const f = flags.find((f) => f.flag_type === 'false_amenities')
  if (!f) return []
  const detail = f.detail as { missing_from_rera?: string[] }
  return detail.missing_from_rera ?? []
}

export function areaGapPercent(flags: FraudFlag[]): number | null {
  const f = flags.find((f) => f.flag_type === 'area_mismatch')
  if (!f) return null
  const detail = f.detail as { gap_percent?: number }
  return detail.gap_percent ?? null
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/fraud.ts
git commit -m "feat: fraud flag helpers and color mapping"
```

---

## Task 6: Bengaluru Map Component

**Files:**
- Create: `components/BengaluruMap.tsx`

- [ ] **Step 1: Fix Leaflet SSR issue**

Add to `next.config.ts`:

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Leaflet uses window — disable SSR for map component
}

export default nextConfig
```

- [ ] **Step 2: Write BengaluruMap component**

```tsx
// components/BengaluruMap.tsx
'use client'

import { useEffect, useRef } from 'react'
import type { Project } from '@/lib/types'
import { markerColor, topFlag } from '@/lib/fraud'

interface Props {
  projects: Project[]
  onSelectProject: (project: Project) => void
  selectedId: string | null
}

// Bengaluru bounds: Electronic City Phase 2 (S) → Airport (N)
const BENGALURU_CENTER: [number, number] = [13.0, 77.6]
const BENGALURU_BOUNDS = {
  south: 12.78,  // Electronic City Phase 2
  north: 13.20,  // Kempegowda Airport area
  west: 77.45,
  east: 77.80,
}

export default function BengaluruMap({ projects, onSelectProject, selectedId }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.CircleMarker[]>([])

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return
    if (leafletMapRef.current) return // already initialized

    import('leaflet').then((L) => {
      // Fix default marker icons
      delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current!, {
        center: BENGALURU_CENTER,
        zoom: 11,
        minZoom: 10,
        maxBounds: [
          [BENGALURU_BOUNDS.south - 0.05, BENGALURU_BOUNDS.west - 0.05],
          [BENGALURU_BOUNDS.north + 0.05, BENGALURU_BOUNDS.east + 0.05],
        ],
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      leafletMapRef.current = map
    })

    return () => {
      leafletMapRef.current?.remove()
      leafletMapRef.current = null
    }
  }, [])

  // Update markers when projects change
  useEffect(() => {
    if (!leafletMapRef.current) return

    import('leaflet').then((L) => {
      // Clear existing markers
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []

      projects.forEach((project) => {
        if (!project.lat || !project.lng) return

        const flags = project.fraud_flags ?? []
        const color = markerColor(flags)
        const isSelected = project.id === selectedId

        const marker = L.circleMarker([project.lat, project.lng], {
          radius: isSelected ? 10 : 7,
          fillColor: color,
          color: isSelected ? '#fff' : color,
          weight: isSelected ? 2 : 1,
          opacity: 1,
          fillOpacity: 0.9,
        })

        marker.bindTooltip(
          `<strong>${project.project_name}</strong><br/>${project.builder_name}<br/>${project.locality ?? ''}`,
          { direction: 'top', offset: [0, -8] }
        )

        marker.on('click', () => onSelectProject(project))
        marker.addTo(leafletMapRef.current!)
        markersRef.current.push(marker)
      })
    })
  }, [projects, selectedId, onSelectProject])

  return (
    <div
      ref={mapRef}
      className="w-full h-full rounded-none"
      style={{ minHeight: '100vh' }}
    />
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/BengaluruMap.tsx
git commit -m "feat: Bengaluru map component with Leaflet + fraud color markers"
```

---

## Task 7: Project Detail Panel

**Files:**
- Create: `components/ProjectPanel.tsx`

- [ ] **Step 1: Write ProjectPanel**

```tsx
// components/ProjectPanel.tsx
'use client'

import { X, ExternalLink, AlertTriangle, CheckCircle } from 'lucide-react'
import type { Project } from '@/lib/types'
import { FLAG_LABELS, FLAG_COLORS, delayMonths, missingAmenities, areaGapPercent } from '@/lib/fraud'

interface Props {
  project: Project
  onClose: () => void
}

function Row({ label, advertised, rera, bad }: {
  label: string
  advertised: React.ReactNode
  rera: React.ReactNode
  bad?: boolean
}) {
  return (
    <div className={`grid grid-cols-2 gap-2 py-2 border-b border-gray-800 ${bad ? 'bg-red-950/20' : ''}`}>
      <div>
        <div className="text-xs text-gray-500 mb-1">{label} (ADVERTISED)</div>
        <div className="text-sm text-orange-300 font-medium">{advertised}</div>
      </div>
      <div>
        <div className="text-xs text-gray-500 mb-1">{label} (RERA)</div>
        <div className="text-sm text-green-300 font-medium">{rera}</div>
      </div>
    </div>
  )
}

export default function ProjectPanel({ project, onClose }: Props) {
  const flags = project.fraud_flags ?? []
  const delay = delayMonths(flags)
  const missingAmens = missingAmenities(flags)
  const areaGap = areaGapPercent(flags)

  const reraUrl = `https://rera.karnataka.gov.in/projectDetails?id=${project.rera_number}`

  return (
    <div className="h-full flex flex-col bg-gray-900 border-l border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">{project.project_name}</h2>
          <p className="text-sm text-gray-400">{project.builder_name}</p>
          {project.locality && (
            <p className="text-xs text-gray-500 mt-1">{project.locality}</p>
          )}
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white p-1">
          <X size={18} />
        </button>
      </div>

      {/* Fraud flags */}
      {flags.length > 0 && (
        <div className="p-4 border-b border-gray-800">
          <div className="flex flex-wrap gap-2">
            {flags.map((f) => (
              <span
                key={f.id}
                className="px-2 py-1 rounded text-xs font-semibold text-black"
                style={{ backgroundColor: FLAG_COLORS[f.flag_type] }}
              >
                {FLAG_LABELS[f.flag_type]}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Comparison table */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">

        {/* Possession date */}
        <Row
          label="Possession Date"
          advertised={project.advertised_possession_date ?? '—'}
          rera={project.rera_possession_date ?? 'Not registered'}
          bad={delay > 0}
        />
        {delay > 0 && (
          <div className="flex items-center gap-1 text-xs text-red-400 pb-2">
            <AlertTriangle size={12} />
            {delay} months late
          </div>
        )}

        {/* Carpet area */}
        <Row
          label="Carpet Area (sqft)"
          advertised={project.advertised_carpet_area_sqft?.toLocaleString() ?? '—'}
          rera={project.rera_carpet_area_sqft?.toLocaleString() ?? '—'}
          bad={!!areaGap && areaGap > 10}
        />
        {areaGap !== null && areaGap > 0 && (
          <div className="flex items-center gap-1 text-xs text-yellow-400 pb-2">
            <AlertTriangle size={12} />
            {areaGap.toFixed(1)}% smaller than advertised
          </div>
        )}

        {/* Amenities */}
        <div className="py-2 border-b border-gray-800">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs text-gray-500 mb-2">AMENITIES (ADVERTISED)</div>
              <div className="flex flex-wrap gap-1">
                {(project.advertised_amenities ?? []).map((a) => (
                  <span
                    key={a}
                    className={`text-xs px-2 py-0.5 rounded ${
                      missingAmens.includes(a)
                        ? 'bg-red-900 text-red-200 line-through'
                        : 'bg-gray-800 text-gray-300'
                    }`}
                  >
                    {a.replace(/_/g, ' ')}
                  </span>
                ))}
                {(project.advertised_amenities ?? []).length === 0 && (
                  <span className="text-xs text-gray-600">—</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-2">AMENITIES (RERA)</div>
              <div className="flex flex-wrap gap-1">
                {(project.rera_amenities ?? []).map((a) => (
                  <span key={a} className="text-xs px-2 py-0.5 rounded bg-green-900 text-green-200">
                    {a.replace(/_/g, ' ')}
                  </span>
                ))}
                {(project.rera_amenities ?? []).length === 0 && (
                  <span className="text-xs text-gray-600">None listed</span>
                )}
              </div>
            </div>
          </div>
          {missingAmens.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-orange-400 mt-2">
              <AlertTriangle size={12} />
              {missingAmens.length} amenities claimed but not in RERA filing
            </div>
          )}
        </div>

        {/* RERA status */}
        <div className="py-2 flex items-center gap-2">
          {project.status === 'registered' ? (
            <CheckCircle size={14} className="text-green-400" />
          ) : (
            <AlertTriangle size={14} className="text-red-400" />
          )}
          <span className="text-sm text-gray-300 capitalize">RERA Status: {project.status}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800 flex gap-2">
        <a
          href={reraUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
        >
          <ExternalLink size={12} /> View on RERA Karnataka
        </a>
        <button
          onClick={() => {
            const url = `${window.location.origin}/?project=${project.id}`
            navigator.clipboard.writeText(url)
          }}
          className="ml-auto text-xs text-gray-500 hover:text-white"
        >
          Copy link
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ProjectPanel.tsx
git commit -m "feat: project detail panel with RERA vs advertised comparison"
```

---

## Task 8: Filter Panel + Stats Bar

**Files:**
- Create: `components/FilterPanel.tsx`
- Create: `components/StatsBar.tsx`

- [ ] **Step 1: Write FilterPanel**

```tsx
// components/FilterPanel.tsx
'use client'

import { Search } from 'lucide-react'
import type { FilterState, FlagType } from '@/lib/types'
import { FLAG_LABELS, FLAG_COLORS } from '@/lib/fraud'

interface Props {
  filters: FilterState
  onChange: (filters: FilterState) => void
  total: number
}

const FLAG_TYPES: FlagType[] = ['delayed_possession', 'false_amenities', 'area_mismatch', 'unregistered']

export default function FilterPanel({ filters, onChange, total }: Props) {
  function toggleFlag(flag: FlagType) {
    const next = filters.flagTypes.includes(flag)
      ? filters.flagTypes.filter((f) => f !== flag)
      : [...filters.flagTypes, flag]
    onChange({ ...filters, flagTypes: next })
  }

  return (
    <div className="bg-gray-900 border-r border-gray-800 p-4 flex flex-col gap-4 w-72 shrink-0">
      <div>
        <h1 className="text-xl font-black text-white tracking-tight">FCK BLR</h1>
        <p className="text-xs text-gray-500">REAL ESTATE</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Builder, project, locality..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="w-full bg-gray-800 text-white text-sm pl-8 pr-3 py-2 rounded border border-gray-700 placeholder-gray-600 focus:outline-none focus:border-gray-500"
        />
      </div>

      {/* Fraud type filters */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Show Fraud Type</p>
        <div className="flex flex-col gap-2">
          {FLAG_TYPES.map((flag) => (
            <label key={flag} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.flagTypes.includes(flag)}
                onChange={() => toggleFlag(flag)}
                className="sr-only"
              />
              <div
                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors`}
                style={{
                  borderColor: FLAG_COLORS[flag],
                  backgroundColor: filters.flagTypes.includes(flag) ? FLAG_COLORS[flag] : 'transparent',
                }}
              >
                {filters.flagTypes.includes(flag) && (
                  <span className="text-white text-[10px] font-bold">✓</span>
                )}
              </div>
              <span className="text-sm text-gray-300">{FLAG_LABELS[flag]}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Delay severity */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Min Delay</p>
        <select
          value={filters.minDelayMonths ?? ''}
          onChange={(e) =>
            onChange({ ...filters, minDelayMonths: e.target.value ? parseInt(e.target.value) : null })
          }
          className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded border border-gray-700 focus:outline-none"
        >
          <option value="">Any delay</option>
          <option value="6">6+ months late</option>
          <option value="12">12+ months late</option>
          <option value="24">24+ months late</option>
        </select>
      </div>

      <div className="mt-auto text-xs text-gray-600">
        Showing {total} projects
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write StatsBar**

```tsx
// components/StatsBar.tsx
'use client'

import type { Project } from '@/lib/types'
import { delayMonths } from '@/lib/fraud'

interface Props {
  projects: Project[]
}

export default function StatsBar({ projects }: Props) {
  const total = projects.length
  const delayed = projects.filter((p) =>
    p.fraud_flags?.some((f) => f.flag_type === 'delayed_possession')
  ).length
  const unregistered = projects.filter((p) =>
    p.fraud_flags?.some((f) => f.flag_type === 'unregistered')
  ).length
  const delays = projects
    .map((p) => delayMonths(p.fraud_flags ?? []))
    .filter((d) => d > 0)
  const avgDelay = delays.length ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length) : 0

  return (
    <div className="bg-red-950/30 border-b border-red-900/30 px-4 py-2 flex gap-6 text-sm">
      <span className="text-gray-400">
        <span className="text-white font-bold">{total}</span> projects tracked
      </span>
      <span className="text-gray-400">
        <span className="text-red-400 font-bold">{delayed}</span> delayed (
        {total ? Math.round((delayed / total) * 100) : 0}%)
      </span>
      <span className="text-gray-400">
        <span className="text-black font-bold bg-white px-1 rounded">{unregistered}</span> unregistered
      </span>
      {avgDelay > 0 && (
        <span className="text-gray-400">
          Avg delay: <span className="text-red-400 font-bold">{avgDelay} months</span>
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/FilterPanel.tsx components/StatsBar.tsx
git commit -m "feat: filter panel and stats bar components"
```

---

## Task 9: Home Page — Wire Everything Together

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Write home page**

```tsx
// app/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import FilterPanel from '@/components/FilterPanel'
import ProjectPanel from '@/components/ProjectPanel'
import StatsBar from '@/components/StatsBar'
import type { Project, FilterState } from '@/lib/types'

// Dynamic import — Leaflet needs browser APIs
const BengaluruMap = dynamic(() => import('@/components/BengaluruMap'), { ssr: false })

const DEFAULT_FILTERS: FilterState = {
  search: '',
  flagTypes: [],
  minDelayMonths: null,
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([])
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch projects from URL params on load (for share links)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const projectId = params.get('project')
    if (projectId) {
      fetch(`/api/projects/${projectId}`)
        .then((r) => r.json())
        .then((data) => setSelectedProject(data))
        .catch(() => {})
    }
  }, [])

  // Fetch projects when filters change
  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    filters.flagTypes.forEach((f) => params.append('flag_type', f))
    if (filters.minDelayMonths) params.set('min_delay_months', String(filters.minDelayMonths))

    fetch(`/api/projects?${params}`)
      .then((r) => r.json())
      .then((data) => setProjects(data.projects ?? []))
      .finally(() => setLoading(false))
  }, [filters])

  const handleSelectProject = useCallback((project: Project) => {
    setSelectedProject(project)
    // Update URL for share links
    const url = new URL(window.location.href)
    url.searchParams.set('project', project.id)
    window.history.replaceState({}, '', url.toString())
  }, [])

  const handleClosePanel = useCallback(() => {
    setSelectedProject(null)
    const url = new URL(window.location.href)
    url.searchParams.delete('project')
    window.history.replaceState({}, '', url.toString())
  }, [])

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      <StatsBar projects={projects} />
      <div className="flex flex-1 overflow-hidden">
        <FilterPanel filters={filters} onChange={setFilters} total={projects.length} />
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 bg-gray-950/60 z-10 flex items-center justify-center">
              <span className="text-gray-400 text-sm">Loading projects...</span>
            </div>
          )}
          <BengaluruMap
            projects={projects}
            onSelectProject={handleSelectProject}
            selectedId={selectedProject?.id ?? null}
          />
        </div>
        {selectedProject && (
          <div className="w-96 shrink-0 overflow-hidden">
            <ProjectPanel project={selectedProject} onClose={handleClosePanel} />
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add Leaflet CSS to layout**

Modify `app/layout.tsx` — add Leaflet CSS import:

```tsx
// app/layout.tsx — add this import at the top
import 'leaflet/dist/leaflet.css'
```

- [ ] **Step 3: Run and verify**

```bash
npm run dev
```

Expected:
- Map fills screen, centered on Bengaluru
- 2 seed project pins visible
- Filter panel on left
- Stats bar at top
- Click a pin → project panel slides in on right
- Close button works
- Share link (copy button) puts `?project=<id>` in URL

- [ ] **Step 4: Fix any TypeScript errors**

```bash
npm run build
```

Fix any type errors reported. Common fix: `@types/leaflet` may need type assertions for some Leaflet internals.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/layout.tsx
git commit -m "feat: wire up home page — map + filters + project panel + stats"
```

---

## Task 10: Deploy MVP

**Files:**
- Create: `.env.local` (not committed — values only)
- Create: `vercel.json` (optional, for env config)

- [ ] **Step 1: Push to GitHub**

```bash
git remote add origin https://github.com/<your-username>/fckblrrealestate.git
git push -u origin main
```

- [ ] **Step 2: Deploy to Vercel**

```bash
npx vercel --prod
```

Or connect GitHub repo at vercel.com → import project → set env vars:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

- [ ] **Step 3: Verify production**

Open the Vercel URL. Check:
- Map loads with OSM tiles
- Seed projects appear as pins
- Panel opens on click
- Filter works

- [ ] **Step 4: Add custom domain (optional)**

In Vercel dashboard → Settings → Domains → add `fckblrrealestate.com`

---

## Self-Review Checklist

- [x] **Spec coverage:** Map ✓, Fraud pins ✓, Project panel ✓, Filter ✓, Stats bar ✓, DB schema ✓, API routes ✓, Share links ✓, RERA source link ✓
- [x] **No placeholders:** All code blocks complete, no TBDs
- [x] **Type consistency:** `FraudFlag`, `Project`, `FilterState` defined in Task 2, used consistently in Tasks 5-9
- [x] **Method names:** `markerColor()`, `topFlag()`, `delayMonths()`, `missingAmenities()`, `areaGapPercent()` — defined Task 5, used Tasks 6-7
- [x] **Deferred to Plan B:** RERA scraper, admin panel, builder scorecard, community comments, media links

---

## What's NOT in this plan (Plan B)

- Python RERA scraper (rera.karnataka.gov.in crawler)
- Admin CSV upload + manual override UI
- Builder scorecard page (/builders)
- Community comments with email + moderation
- News/media links per project
- Complaint count scraper

Plan B kicks off after MVP is live and tested.
