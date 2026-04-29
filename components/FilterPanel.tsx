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
                className="w-4 h-4 rounded border-2 flex items-center justify-center transition-colors"
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
