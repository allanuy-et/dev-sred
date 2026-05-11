'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

import { EmployeeAvatar } from '@/components/EmployeeAvatar'
import type { EmployeeOption } from '@/app/(app)/labour/_lib/selectOptions'

export interface EmployeePickerProps {
  label: ReactNode
  /** Selected employee id, or empty string when nothing is selected. */
  value: string
  onChange: (id: string) => void
  options: EmployeeOption[]
  /** Helper text shown below the control when there's no error. */
  helper?: ReactNode
  /** Error text — replaces helper and applies the error styling. */
  error?: ReactNode
  /** Visually hide the label (still announced to assistive tech). */
  hideLabel?: boolean
  /** Required marker on the form. The constraint itself lives on the parent form. */
  required?: boolean
  /** Placeholder shown when no option is selected. */
  placeholder?: string
  /**
   * When provided, the dropdown shows a "clear selection" row at the top
   * with this label (e.g. "Unassigned"). Clicking it fires `onChange('')`.
   */
  clearLabel?: string
  /**
   * Lock the picker to the current selection — renders as a non-interactive
   * pill showing the chosen employee. Used when the backend forbids the
   * caller from changing this field (e.g. standard users logging labour for
   * someone else).
   */
  locked?: boolean
  className?: string
}

/**
 * Rich employee picker — a button-backed dropdown that renders each
 * employee as an avatar + name (primary) + email (secondary). Drop-in
 * replacement for a `<SelectField>` whenever the option set is an employee
 * list. Search bar appears once the option count crosses 6.
 */
export function EmployeePicker({
  label,
  value,
  onChange,
  options,
  helper,
  error,
  hideLabel,
  required,
  placeholder = 'Select an employee…',
  clearLabel,
  locked,
  className,
}: EmployeePickerProps) {
  const id = useId()
  const listboxId = `${id}-listbox`
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.id === value)
  const showSearch = options.length > 6

  // Close on outside click + ESC. Keep the listener active only while open
  // so we don't waste cycles in the common closed state.
  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Reset query and focus the search box when the panel opens.
  useEffect(() => {
    if (open) {
      setQuery('')
      if (showSearch) {
        requestAnimationFrame(() => searchRef.current?.focus())
      }
    }
  }, [open, showSearch])

  const filtered = query.trim()
    ? options.filter((o) => {
        const q = query.trim().toLowerCase()
        return (
          o.firstName.toLowerCase().includes(q) ||
          o.lastName.toLowerCase().includes(q) ||
          o.email.toLowerCase().includes(q)
        )
      })
    : options

  if (locked) {
    return (
      <div className={`flex flex-col gap-1 ${className ?? ''}`}>
        <label
          htmlFor={id}
          className={`text-xs font-medium text-text-muted ${hideLabel ? 'sr-only' : ''}`}
        >
          {label}
          {required ? (
            <span aria-hidden className="ml-0.5 text-danger">*</span>
          ) : null}
        </label>
        <div
          id={id}
          className="flex w-full items-center gap-2 rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-text"
          aria-readonly
        >
          {selected ? (
            <>
              <EmployeeAvatar employee={selected} size="sm" />
              <span className="min-w-0 truncate">
                {selected.firstName} {selected.lastName}
              </span>
            </>
          ) : (
            <span className="text-text-subtle">{placeholder}</span>
          )}
        </div>
        {helper ? (
          <p className="text-xs text-text-muted">{helper}</p>
        ) : null}
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-1 ${className ?? ''}`}>
      <label
        htmlFor={id}
        className={`text-xs font-medium text-text-muted ${hideLabel ? 'sr-only' : ''}`}
      >
        {label}
        {required ? <span aria-hidden className="ml-0.5 text-danger">*</span> : null}
      </label>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          id={id}
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-invalid={error ? true : undefined}
          className={`flex w-full items-center justify-between gap-3 rounded-md border bg-surface px-3 py-2 text-left text-sm text-text focus:outline-2 focus:outline-offset-1 focus:outline-accent disabled:opacity-50 ${
            error
              ? 'border-danger focus:border-danger'
              : 'border-border focus:border-border-strong'
          }`}
        >
          <span className="flex min-w-0 items-center gap-2">
            {selected ? (
              <>
                <EmployeeAvatar employee={selected} size="sm" />
                <span className="min-w-0 truncate">
                  {selected.firstName} {selected.lastName}
                </span>
              </>
            ) : (
              <span className="text-text-subtle">
                {clearLabel ?? placeholder}
              </span>
            )}
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-text-muted"
            aria-hidden
          >
            <path d="M6 8l4 4 4-4" />
          </svg>
        </button>

        {open ? (
          <div
            className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-border bg-surface shadow-lg"
            role="presentation"
          >
            {showSearch ? (
              <div className="border-b border-border p-2">
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.currentTarget.value)}
                  placeholder="Search employees…"
                  aria-label="Search employees"
                  className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm focus:outline-2 focus:outline-offset-1 focus:outline-accent"
                />
              </div>
            ) : null}
            <ul
              id={listboxId}
              role="listbox"
              aria-label="Employees"
              className="max-h-72 overflow-y-auto py-1"
            >
              {clearLabel ? (
                <li
                  role="option"
                  aria-selected={value === ''}
                  className={`cursor-pointer border-b border-border ${
                    value === '' ? 'bg-surface-hover' : 'hover:bg-surface-hover'
                  }`}
                  onClick={() => {
                    onChange('')
                    setOpen(false)
                  }}
                >
                  <div className="px-3 py-2 text-sm text-text-muted italic">
                    {clearLabel}
                  </div>
                </li>
              ) : null}
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-sm text-text-subtle">
                  No employees match.
                </li>
              ) : (
                filtered.map((emp) => {
                  const isSelected = emp.id === value
                  return (
                    <li
                      key={emp.id}
                      role="option"
                      aria-selected={isSelected}
                      className={`cursor-pointer ${
                        isSelected ? 'bg-surface-hover' : 'hover:bg-surface-hover'
                      }`}
                      onClick={() => {
                        onChange(emp.id)
                        setOpen(false)
                      }}
                    >
                      <div className="flex items-center gap-3 px-3 py-2">
                        <EmployeeAvatar employee={emp} size="md" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-text">
                            {emp.firstName} {emp.lastName}
                          </div>
                          <div className="truncate text-xs text-text-muted">
                            {emp.email}
                          </div>
                        </div>
                        {isSelected ? (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 20 20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="shrink-0 text-accent"
                            aria-hidden
                          >
                            <path d="M4 10l4 4 8-8" />
                          </svg>
                        ) : null}
                      </div>
                    </li>
                  )
                })
              )}
            </ul>
          </div>
        ) : null}
      </div>
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : helper ? (
        <p className="text-xs text-text-muted">{helper}</p>
      ) : null}
    </div>
  )
}
