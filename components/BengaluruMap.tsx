// components/BengaluruMap.tsx
'use client'

import { useEffect, useRef } from 'react'
import type { Project } from '@/lib/types'
import { markerColor } from '@/lib/fraud'

interface Props {
  projects: Project[]
  onSelectProject: (project: Project) => void
  selectedId: string | null
}

const BENGALURU_CENTER: [number, number] = [13.0, 77.6]

export default function BengaluruMap({ projects, onSelectProject, selectedId }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<import('leaflet').Map | null>(null)
  const markersRef = useRef<import('leaflet').CircleMarker[]>([])

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return
    if (leafletMapRef.current) return

    import('leaflet').then((L) => {
      const map = L.map(mapRef.current!, {
        center: BENGALURU_CENTER,
        zoom: 11,
        minZoom: 10,
        maxBounds: [
          [12.73, 77.40],
          [13.25, 77.85],
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

  useEffect(() => {
    if (!leafletMapRef.current) return

    import('leaflet').then((L) => {
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
          color: isSelected ? '#ffffff' : color,
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
      className="w-full h-full"
      style={{ minHeight: '100vh' }}
    />
  )
}
