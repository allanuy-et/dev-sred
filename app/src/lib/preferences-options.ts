/**
 * Frontend-local copies of `SUPPORTED_TIMEZONES` / `SUPPORTED_LANGUAGES`.
 *
 * Why this exists: Next.js 16 + Turbopack does not reliably resolve **runtime**
 * exports from a workspace package that ships raw `.ts` via its `main` (type
 * imports from `@sred/shared` work because TS erases them at compile time, but
 * runtime constants like these arrays cannot be loaded into client bundles).
 * `transpilePackages: ['@sred/shared']` was set in `next.config.ts` but does
 * not resolve this specific case.
 *
 * The backend imports `SUPPORTED_TIMEZONES` / `SUPPORTED_LANGUAGES` from
 * `@sred/shared` directly (server-side, works fine), and is the canonical
 * validator. This frontend copy must stay in sync with
 * `shared/src/types/preferences.ts` — if you add a timezone, add it in both.
 */

export const SUPPORTED_TIMEZONES: ReadonlyArray<{
  value: string
  label: string
}> = [
  { value: 'America/Toronto', label: 'Eastern (Toronto)' },
  { value: 'America/Halifax', label: 'Atlantic (Halifax)' },
  { value: 'America/Winnipeg', label: 'Central (Winnipeg)' },
  { value: 'America/Edmonton', label: 'Mountain (Edmonton)' },
  { value: 'America/Vancouver', label: 'Pacific (Vancouver)' },
  { value: 'America/St_Johns', label: 'Newfoundland (St. John’s)' },
  { value: 'America/New_York', label: 'US Eastern (New York)' },
  { value: 'America/Chicago', label: 'US Central (Chicago)' },
  { value: 'America/Denver', label: 'US Mountain (Denver)' },
  { value: 'America/Los_Angeles', label: 'US Pacific (Los Angeles)' },
  { value: 'UTC', label: 'UTC' },
]

export const SUPPORTED_LANGUAGES: ReadonlyArray<{
  value: string
  label: string
}> = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'tl', label: 'Tagalog' },
]
