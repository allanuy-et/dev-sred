'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'

export interface SearchBarProps {
  /** Current `?q=` value from the URL — used as the initial input value on SSR. */
  initialValue: string
  /** Visible placeholder. */
  placeholder?: string
  /** Search-param key. Defaults to `q`. */
  paramName?: string
  /** Debounce in ms before pushing the URL update. Defaults to 250. */
  debounceMs?: number
  /** Optional label for assistive tech. */
  ariaLabel?: string
}

/**
 * URL-driven search input. Types push a debounced `router.replace` so the
 * server page re-fetches the filtered list. Falls back to the empty string —
 * which removes the param entirely — to keep URLs clean.
 *
 * Strictly client-side: the server page reads the new `q` from its
 * `searchParams` and re-renders.
 */
export function SearchBar({
  initialValue,
  placeholder = 'Search…',
  paramName = 'q',
  debounceMs = 250,
  ariaLabel,
}: SearchBarProps) {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()
  const [value, setValue] = useState(initialValue)
  const [pending, startTransition] = useTransition()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep input in sync if the URL changes from elsewhere (back button, etc.).
  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  function push(next: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    const trimmed = next.trim()
    if (trimmed === '') params.delete(paramName)
    else params.set(paramName, trimmed)
    const qs = params.toString()
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    })
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.currentTarget.value
    setValue(next)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => push(next), debounceMs)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    // Enter → push immediately without waiting for the debounce.
    e.preventDefault()
    if (timer.current) clearTimeout(timer.current)
    push(value)
  }

  return (
    <form onSubmit={handleSubmit} role="search" className="w-full">
      <label className="relative block">
        <span className="sr-only">{ariaLabel ?? placeholder}</span>
        <span
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle"
        >
          ⌕
        </span>
        <input
          type="search"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          aria-label={ariaLabel ?? placeholder}
          className="w-full rounded-md border border-border bg-surface pl-9 pr-9 py-2 text-sm placeholder:text-text-subtle focus:border-border-strong focus:outline-2 focus:outline-offset-1 focus:outline-accent"
        />
        {value !== '' ? (
          <button
            type="button"
            onClick={() => {
              setValue('')
              if (timer.current) clearTimeout(timer.current)
              push('')
            }}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-text-subtle hover:text-text"
          >
            ×
          </button>
        ) : null}
        {pending ? (
          <span
            aria-hidden
            className="absolute right-9 top-1/2 -translate-y-1/2 text-[11px] text-text-subtle"
          >
            …
          </span>
        ) : null}
      </label>
    </form>
  )
}
