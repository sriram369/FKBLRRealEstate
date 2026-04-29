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

      {/* Comparison */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
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
      <div className="p-4 border-t border-gray-800 flex gap-2 items-center">
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
