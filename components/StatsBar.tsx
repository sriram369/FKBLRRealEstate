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
  const avgDelay = delays.length
    ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length)
    : 0

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
