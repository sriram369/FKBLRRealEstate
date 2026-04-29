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
