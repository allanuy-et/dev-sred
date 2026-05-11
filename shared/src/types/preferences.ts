import type { Company } from './company.js'

// User-editable preferences. The current user is identified by the session
// cookie — there is no userId in the body.
export interface UserPreferencesInput {
  role?: string | null
  timezone?: string
  language?: string
}

// Company-editable preferences. Restricted to admins on the backend.
export interface CompanyPreferencesInput {
  name?: string
  businessNumber?: string | null
  address1?: string | null
  address2?: string | null
  city?: string | null
  province?: string | null
  postalCode?: string | null
  phone1?: string | null
  phone2?: string | null
  fax?: string | null
  email?: string | null
  website?: string | null
  fiscalYearEnd?: string | null
  financialContact?: string | null
  technicalContact?: string | null
  timezone?: string
}

export interface CompanyPreferencesResponse {
  company: Company
}

/**
 * The well-known list of supported timezones. Kept short and pragmatic for
 * the demo — covers the Canadian + major US zones the prototype's company
 * fixtures imply. Extend at will.
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
  { value: 'fr', label: 'Français' },
]
