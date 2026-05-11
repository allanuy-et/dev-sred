---
name: Date/number formatting contract
description: All Intl/toLocale formatting goes through app/src/lib/format.ts; tz is required, never silently defaulted
type: feedback
---

`app/src/lib/format.ts` is the **single** place that calls `Intl.DateTimeFormat`, `Intl.RelativeTimeFormat`, or `.toLocaleString` / `.toLocaleDateString`. No page or component may call those APIs directly.

Date-rendering functions (`formatDate`, `formatDateTime`, `formatLongDate`, `formatRelativeTime`) all **require** a `tz: string` argument. There is no fallback to the browser's local zone.

**Why:** The user is explicitly rejecting the browser-tz silent fallback — users pick their tz in Preferences and every date must respect that choice, including SSR-rendered tables. Hard-coded `Intl` calls outside `format.ts` would bypass the contract and the lint can't catch them.

**How to apply:**
- Client Components: `const { formatDate, formatDateTime, formatRelativeTime, formatHours, formatCurrency } = useFormatters()` from `@/lib/timezone-context`. The hook throws if used outside `<TimezoneProvider>` (already wired in `AppShell`).
- Server Components: `const user = await getCurrentUser()`; then `formatDate(value, user.timezone)` etc. directly. Server components do **not** consume the context.
- Non-date number helpers (`formatHours`, `formatCurrency`, `formatInteger`, `formatRate`) take no tz — they're pure number formatters but still live in `format.ts` for the same single-source-of-truth reason.
- When adding a new date format need, extend `format.ts` rather than reaching for `Intl` in a component.
