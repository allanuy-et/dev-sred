/**
 * Locale-resolution helpers. Pure / sync / no React or Next.js imports — safe
 * to import from Server Components, Client Components, route handlers, or
 * tests.
 *
 * Companion to `app/src/lib/format.ts`: this module decides *which* locale
 * applies; `format.ts` consumes the matching Intl locale string when shaping
 * dates and numbers.
 */

import { messages, type Locale, type Messages } from './i18n/messages'

export type { Locale, Messages }

/**
 * Map our internal locale codes to the Intl-compatible locale string used by
 * `Intl.DateTimeFormat`, `Intl.RelativeTimeFormat`, and `Number.toLocaleString`.
 *
 * - `en` → `en-CA` matches the SR&ED accounting context (ISO-like dates,
 *   Canadian numbers).
 * - `fr` → `fr-CA` for Quebec-style French (matches the same Canadian
 *   accounting context).
 * - `tl` → `en-PH`: Tagalog rarely has good Intl data, but en-PH gives
 *   sensible Philippine number/date conventions and is what most Philippine
 *   business apps fall back to.
 */
export const LOCALE_TO_INTL: Record<Locale, string> = {
  en: 'en-CA',
  es: 'es',
  fr: 'fr-CA',
  tl: 'en-PH',
}

const KNOWN_LOCALES: ReadonlySet<Locale> = new Set<Locale>([
  'en',
  'es',
  'fr',
  'tl',
])

function isLocale(value: string): value is Locale {
  return KNOWN_LOCALES.has(value as Locale)
}

/**
 * Narrow a free-form string (e.g. `user.language`, `navigator.language`) into
 * one of our supported `Locale` codes. Falls back to `'en'` for anything we
 * don't recognize.
 *
 * Also accepts BCP-47 region tags by stripping anything after the first `-`
 * (so `en-US`, `es-MX`, `fr-FR`, `fil-PH`, `tl-PH` all resolve correctly).
 */
export function resolveLocale(input: string | undefined): Locale {
  if (!input) return 'en'
  const base = input.toLowerCase().split('-')[0]
  // Filipino is the official name for Tagalog in BCP-47; map it home.
  const normalized = base === 'fil' ? 'tl' : base
  return isLocale(normalized) ? normalized : 'en'
}

/**
 * Look up a message catalog by locale string. Accepts the raw `string` shape
 * that comes off `SessionUser.language`; unknown locales fall back to `'en'`.
 */
export function getMessages(locale: string): Messages {
  return messages[resolveLocale(locale)]
}

/**
 * Resolve a free-form locale string directly to its Intl tag. Convenience for
 * server pages that already hold `user.language` and want to pass an Intl
 * locale to `formatDate(value, tz, locale)`.
 */
export function getIntlLocale(locale: string | undefined): string {
  return LOCALE_TO_INTL[resolveLocale(locale)]
}

/**
 * Lightweight `{name}`-style interpolation for message templates. Replaces
 * `{key}` tokens with values from `params`. Missing keys yield an empty
 * string (rather than leaving the literal `{key}` visible).
 */
export function interpolate(
  template: string,
  params: Record<string, string>,
): string {
  return template.replace(/{(\w+)}/g, (_, key: string) => params[key] ?? '')
}
