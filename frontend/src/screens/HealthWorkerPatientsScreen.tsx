import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page, ScreenHeader } from '@/components/caregiver/Page'
import { Button } from '@/components/ui/Button'
import { getFacilityName, getResidents, priorityRoster, statusFor } from '@/data/facility'
import type { ResidentStatus } from '@/data/facility'
import { AddPatientModal, FilterPill, MagnifierIcon, ResidentCard } from '@/screens/HealthWorkerScreen'

type Filter = 'all' | ResidentStatus

/** The facility roster, plain — just the people. Home keeps the check-in dashboard. */
export function HealthWorkerPatientsScreen() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [refresh, setRefresh] = useState(0)

  const roster = useMemo(() => getResidents(), [refresh])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return priorityRoster(roster).filter(
      (r) =>
        (filter === 'all' || statusFor(r) === filter) &&
        (!q || `${r.name} ${r.ward} ${r.room}`.toLowerCase().includes(q)),
    )
  }, [filter, query, roster])

  const resetFilters = () => {
    setFilter('all')
    setQuery('')
  }

  return (
    <Page>
      <ScreenHeader
        title="Patients"
        subtitle={
          roster.length === 0
            ? 'No patients yet — add the first one to get started.'
            : `${roster.length} ${roster.length === 1 ? 'patient' : 'patients'} at ${getFacilityName() || 'the facility'}…`
        }
        backTo="/healthworker"
        action={
          <Button variant="primary" icon="plus" onClick={() => setAddOpen(true)}>
            Add patient
          </Button>
        }
      />

      <div className="space-y-4">
        {/* Search + status filters */}
        <div className="space-y-2.5">
          <label className="relative block">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint">
              <MagnifierIcon />
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search patient…"
              className="input pl-11"
              aria-label="Search patients"
            />
          </label>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
            <FilterPill active={filter === 'all'} onClick={() => setFilter('all')}>
              All
            </FilterPill>
            <FilterPill active={filter === 'red'} onClick={() => setFilter('red')}>
              Needs Attention
            </FilterPill>
            <FilterPill active={filter === 'amber'} onClick={() => setFilter('amber')}>
              Review Suggested
            </FilterPill>
            <FilterPill active={filter === 'green'} onClick={() => setFilter('green')}>
              Stable
            </FilterPill>
          </div>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-faint">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" /> Needs attention</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-clay-500" aria-hidden="true" /> Review suggested</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sage-500" aria-hidden="true" /> Stable</span>
          </p>
        </div>

        {/* Roster — only the people */}
        {filtered.length === 0 ? (
          <div className="card card-pad text-center text-sm text-ink-soft">
            No patients match this filter.
            {(filter !== 'all' || query.trim()) && (
              <button
                type="button"
                onClick={resetFilters}
                className="ml-2 font-semibold text-[#0B6B5F] underline underline-offset-2 hover:text-[#0A5B51]"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3 pb-2">
            {filtered.map((resident) => (
              <ResidentCard key={resident.id} resident={resident} onClick={() => navigate(`/healthworker/${resident.id}`)} />
            ))}
          </div>
        )}
      </div>

      <AddPatientModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={(resident) => {
          setAddOpen(false)
          setRefresh((v) => v + 1)
          navigate(`/healthworker/${resident.id}`)
        }}
      />
    </Page>
  )
}