// app/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import FilterPanel from '@/components/FilterPanel'
import ProjectPanel from '@/components/ProjectPanel'
import StatsBar from '@/components/StatsBar'
import type { Project, FilterState } from '@/lib/types'

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
