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

  if (flagTypes.length > 0) {
    projects = projects.filter((p) =>
      p.fraud_flags?.some((f) => flagTypes.includes(f.flag_type as FlagType))
    )
  }

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
