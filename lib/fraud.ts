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
  if (!top) return '#22c55e'
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
