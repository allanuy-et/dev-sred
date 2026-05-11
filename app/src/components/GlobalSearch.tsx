'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'

import type { SearchMatch, SearchResponse } from '@sred/shared'

import { ApiError } from '@/lib/api'
import { clientApi } from '@/lib/api.client'

const DEBOUNCE_MS = 200
const MIN_QUERY_LEN = 2

interface State {
  projects: SearchMatch[]
  employees: SearchMatch[]
  loading: boolean
  error: string | null
  /** True once we've completed a search for a query of length >= MIN. */
  hasResults: boolean
}

const EMPTY_STATE: State = {
  projects: [],
  employees: [],
  loading: false,
  error: null,
  hasResults: false,
}

function hrefFor(match: SearchMatch): string {
  return match.kind === 'project'
    ? `/projects/${match.id}`
    : `/employees/${match.id}`
}

export function GlobalSearch() {
  const router = useRouter()
  const inputId = useId()
  const listboxId = useId()

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<State>(EMPTY_STATE)
  const [activeIndex, setActiveIndex] = useState(-1)

  const containerRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  // The most recently issued query — responses for earlier queries are dropped.
  const latestQueryRef = useRef('')

  const flatMatches: SearchMatch[] = [...state.projects, ...state.employees]

  const runSearch = useCallback(async (q: string) => {
    // Cancel any in-flight request.
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller
    latestQueryRef.current = q

    try {
      const data = await clientApi<SearchResponse>(
        `/search?q=${encodeURIComponent(q)}`,
        { signal: controller.signal },
      )
      // Drop the response if the query has changed since.
      if (latestQueryRef.current !== q) return
      setState({
        projects: data.projects,
        employees: data.employees,
        loading: false,
        error: null,
        hasResults: true,
      })
      setActiveIndex(-1)
    } catch (err) {
      if (controller.signal.aborted) return
      if (latestQueryRef.current !== q) return
      const message =
        err instanceof ApiError && err.status === 401
          ? 'Your session expired. Please sign in again.'
          : 'Search failed. Try again.'
      setState({
        projects: [],
        employees: [],
        loading: false,
        error: message,
        hasResults: false,
      })
      setActiveIndex(-1)
    }
  }, [])

  // Debounce: schedule the search 200ms after the last keystroke. Setting
  // the loading state and clearing results on a short query is handled
  // synchronously in handleChange so the dropdown UI updates without an
  // intermediate render.
  useEffect(() => {
    const q = query.trim()
    if (q.length < MIN_QUERY_LEN) return
    const handle = window.setTimeout(() => {
      void runSearch(q)
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [query, runSearch])

  // Close on click-outside.
  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      window.addEventListener('mousedown', onPointerDown)
      return () => window.removeEventListener('mousedown', onPointerDown)
    }
  }, [open])

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const next = e.currentTarget.value
    setQuery(next)
    setOpen(true)
    setActiveIndex(-1)
    const trimmed = next.trim()
    if (trimmed.length < MIN_QUERY_LEN) {
      // Drop any in-flight request and clear results.
      if (abortRef.current) abortRef.current.abort()
      latestQueryRef.current = ''
      setState(EMPTY_STATE)
    } else {
      // Show the loading state immediately so the dropdown doesn't flash
      // empty during the debounce window.
      setState((prev) => ({ ...prev, loading: true, error: null }))
    }
  }

  function close() {
    setOpen(false)
    setActiveIndex(-1)
  }

  function navigateTo(match: SearchMatch) {
    if (abortRef.current) abortRef.current.abort()
    latestQueryRef.current = ''
    setQuery('')
    setState(EMPTY_STATE)
    close()
    router.push(hrefFor(match))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
      return
    }
    if (!open) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (flatMatches.length === 0) return
      setActiveIndex((i) => (i + 1) % flatMatches.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (flatMatches.length === 0) return
      setActiveIndex((i) => (i <= 0 ? flatMatches.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < flatMatches.length) {
        e.preventDefault()
        navigateTo(flatMatches[activeIndex])
      }
    }
  }

  const trimmed = query.trim()
  const showDropdown = open && trimmed.length >= MIN_QUERY_LEN
  const showNoMatches =
    showDropdown &&
    state.hasResults &&
    !state.loading &&
    !state.error &&
    flatMatches.length === 0

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={inputId} className="sr-only">
        Search projects and employees
      </label>
      <input
        id={inputId}
        type="search"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined
        }
        placeholder="Search…"
        value={query}
        onChange={handleChange}
        onFocus={() => {
          if (trimmed.length >= MIN_QUERY_LEN) setOpen(true)
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        className="w-44 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text placeholder:text-text-muted focus:border-border-strong focus:outline-2 focus:outline-offset-1 focus:outline-accent md:w-56"
      />

      {showDropdown ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute right-0 top-full z-20 mt-1 w-72 overflow-hidden rounded-md border border-border bg-surface shadow-md"
        >
          {state.loading ? (
            <p className="px-3 py-2 text-xs text-text-muted">Searching…</p>
          ) : state.error ? (
            <p className="px-3 py-2 text-xs text-danger" role="alert">
              {state.error}
            </p>
          ) : showNoMatches ? (
            <p className="px-3 py-2 text-xs text-text-muted">No matches.</p>
          ) : (
            <>
              {state.projects.length > 0 ? (
                <Section
                  title="Projects"
                  matches={state.projects}
                  startIndex={0}
                  activeIndex={activeIndex}
                  listboxId={listboxId}
                  onSelect={navigateTo}
                />
              ) : null}
              {state.employees.length > 0 ? (
                <Section
                  title="Employees"
                  matches={state.employees}
                  startIndex={state.projects.length}
                  activeIndex={activeIndex}
                  listboxId={listboxId}
                  onSelect={navigateTo}
                />
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}

function Section({
  title,
  matches,
  startIndex,
  activeIndex,
  listboxId,
  onSelect,
}: {
  title: string
  matches: SearchMatch[]
  startIndex: number
  activeIndex: number
  listboxId: string
  onSelect: (m: SearchMatch) => void
}) {
  return (
    <div className="border-b border-border last:border-b-0">
      <p className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wide text-text-muted">
        {title}
      </p>
      <ul>
        {matches.map((m, i) => {
          const absoluteIndex = startIndex + i
          const isActive = absoluteIndex === activeIndex
          return (
            <li key={`${m.kind}-${m.id}`}>
              <Link
                id={`${listboxId}-opt-${absoluteIndex}`}
                role="option"
                aria-selected={isActive}
                href={hrefFor(m)}
                onClick={(e) => {
                  e.preventDefault()
                  onSelect(m)
                }}
                className={`block px-3 py-1.5 text-sm ${
                  isActive
                    ? 'bg-surface-hover text-text'
                    : 'text-text hover:bg-surface-hover'
                }`}
              >
                <span className="block truncate">{m.label}</span>
                {m.detail ? (
                  <span className="block truncate text-xs text-text-muted">
                    {m.detail}
                  </span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
