import { loadProjects } from '../labour/_lib/selectOptions'
import { ReportsClient } from './_components/ReportsClient'

export default async function ReportsPage() {
  // Active projects only — the report filter is for the current year/month;
  // deactivated projects don't typically appear in fresh filters.
  const projects = await loadProjects()
  return (
    <div className="space-y-6">
      <header className="no-print">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-text-muted">
          Monthly and yearly project rollups.
        </p>
      </header>

      <ReportsClient projects={projects} />
    </div>
  )
}
