---
name: i18n architecture
description: Hand-rolled i18n — messages catalog, provider-throws-if-missing, locale split into two contexts alongside tz
type: project
---

The app uses a hand-rolled i18n system (no next-intl / i18next). Source of truth lives in three files:

- `app/src/lib/i18n/messages.ts` — pure data, one nested object per locale (`en`, `es`, `fr`, `tl`). The `en` catalog is canonical: `Messages` is derived from it but with leaves widened to `string` so other locales can supply different translations while sharing the **exact same key shape**. Missing keys fail to compile.
- `app/src/lib/i18n.ts` — pure server-safe helpers (`getMessages`, `resolveLocale`, `getIntlLocale`, `LOCALE_TO_INTL`, `interpolate`). No React imports. Safe to import anywhere.
- `app/src/lib/i18n-context.tsx` — client-only `<I18nProvider>` + `useMessages()` hook. The hook **throws** if used outside the provider (production safety, matches `useTimezone` pattern).

**Why:** Adds zero dependencies, gives full TS coverage on keys, matches the existing `TimezoneProvider` shape (same throw-if-missing semantics), and the catalog stays trivial to diff/audit.

**How to apply:**
- AppShell wires three providers: `<I18nProvider locale={user.language}>` outermost, then `<TimezoneProvider tz={user.timezone}>`, then `<LocaleProvider locale={getIntlLocale(user.language)}>` (Intl locale, distinct from message-catalog locale).
- Client components read messages via `const t = useMessages()` and format via `useFormatters()` (which reads both tz + locale contexts).
- Server components don't touch contexts: `const t = getMessages(user.language); const locale = getIntlLocale(user.language)`.
- Login page is the **special case** — it renders before auth, so it uses `useSyncExternalStore` to read `navigator.language` (hydration-safe, no setState-in-effect violation) and calls `getMessages(...)` directly without any provider.
- Add new strings by extending the `en` catalog first (TS will flag every other locale that's missing the key), then translate. Don't reach for entity-specific labels yet — current coverage is intentionally scoped to nav + auth + prefs chrome.