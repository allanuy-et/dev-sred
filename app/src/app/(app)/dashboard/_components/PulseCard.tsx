'use client'

import { useState } from 'react'

import type { EmployeePulseRow, ProjectPulseRow } from '@sred/shared'

import { Card } from '@/components/Card'

import { EmployeePulseList } from './EmployeePulseList'
import { ProjectPulseList } from './ProjectPulseList'

type Dimension = 'projects' | 'employees'

export interface PulseCardProps {
  byProject: ProjectPulseRow[]
  byEmployee: EmployeePulseRow[]
  totalHours: number
  locale: string
}

/**
 * "Top this week" card with a segmented toggle that switches between the
 * project and employee breakdowns. Owns the local UI state so the rest of
 * the dashboard stays a server component.
 */
export function PulseCard({
  byProject,
  byEmployee,
  totalHours,
  locale,
}: PulseCardProps) {
  const [dimension, setDimension] = useState<Dimension>('projects')

  return (
    <Card
      title={dimension === 'projects' ? 'Top projects this week' : 'Top employees this week'}
      actions={
        <SegmentedToggle dimension={dimension} onChange={setDimension} />
      }
    >
      {dimension === 'projects' ? (
        <ProjectPulseList
          rows={byProject}
          totalHours={totalHours}
          locale={locale}
        />
      ) : (
        <EmployeePulseList
          rows={byEmployee}
          totalHours={totalHours}
          locale={locale}
        />
      )}
    </Card>
  )
}

function SegmentedToggle({
  dimension,
  onChange,
}: {
  dimension: Dimension
  onChange: (next: Dimension) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Group by"
      className="inline-flex items-center rounded-md border border-border bg-surface p-0.5 text-xs"
    >
      <Segment
        active={dimension === 'projects'}
        onClick={() => onChange('projects')}
        label="Projects"
      />
      <Segment
        active={dimension === 'employees'}
        onClick={() => onChange('employees')}
        label="Employees"
      />
    </div>
  )
}

function Segment({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-[5px] px-2.5 py-1 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
        active
          ? 'bg-accent text-white'
          : 'text-text-muted hover:text-text'
      }`}
    >
      {label}
    </button>
  )
}
