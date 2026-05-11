# Design System

Source of truth for visual conventions. The `react-nextjs-frontend` agent reads this **before generating any UI**. The `design-system` agent owns extending it.

**Target aesthetic:** modern SaaS dashboard. Reference points: Linear, Vercel Dashboard, Notion, Stripe Dashboard. 16px body, ~1360px content width, pure-white surfaces, subtle borders, generous padding, one accent.

---

## Color tokens

Defined in `app/src/app/globals.css`. Used via Tailwind utilities: `bg-surface`, `text-muted`, `border-border`, `text-accent`, etc.

| Token              | Hex       | Use                                                  |
|--------------------|-----------|------------------------------------------------------|
| `--bg`             | `#ffffff` | Page background (pure white)                         |
| `--surface`        | `#ffffff` | Cards, panels, table rows, table headers, asides     |
| `--surface-hover`  | `#f4f4f5` | Row hover, ghost button hover (zinc-100)             |
| `--border`         | `#e4e4e7` | Card borders, table dividers, input borders          |
| `--border-strong`  | `#d4d4d8` | Focused / active borders                             |
| `--text`           | `#27272a` | Primary text (zinc-800 — softer than near-black)     |
| `--text-muted`     | `#71717a` | Labels, helper text, table column headers            |
| `--text-subtle`    | `#a1a1aa` | Faint helpers, separators, placeholder echoes        |
| `--accent`         | `#4f46e5` | Primary button, active nav, links                    |
| `--accent-hover`   | `#4338ca` | Primary button hover                                 |
| `--accent-soft`    | `#eef2ff` | Active nav background, info badge bg                 |
| `--success`        | `#16a34a` | Active badges, success alerts                        |
| `--warning`        | `#ca8a04` | Concept / pending badges                             |
| `--danger`         | `#dc2626` | Destructive buttons, error alerts                    |

**No muted surface token.** Every panel is pure white. Differentiation comes from borders + `shadow-sm`. Linear, Vercel, and Stripe dashboards all do this.

---

## Typography

- **Font:** Geist Sans (loaded in `app/src/app/layout.tsx` as `--font-geist-sans`). Geist Mono via `--font-geist-mono` for IDs/code only.
- **Body baseline:** **16px root** (set on `html, body` in `globals.css`), `leading-6`, `font-normal`, color `--text`. Use Tailwind `text-base` for body content; `text-sm` (14px) only for dense data (tables, badges).
- **Scale (use these utilities):**
  - Page title: `text-4xl font-semibold tracking-tight` (36px)
  - Section header: `text-2xl font-semibold tracking-tight` (24px)
  - Card title (default): `text-xl font-semibold tracking-tight` (20px)
  - Card title (compact): `text-lg font-semibold` (18px)
  - Body / form labels: `text-base font-normal` (16px); emphasis `font-medium`
  - Table cells: `text-sm` (14px)
  - Table column header: `text-xs font-medium uppercase tracking-wider text-muted`
  - Helpers / hints: `text-xs text-muted` (12px)
  - Stat number (dashboard primary): `text-5xl font-semibold tabular-nums tracking-tight`
  - Stat number (card stat): `text-3xl font-semibold tabular-nums`

---

## Spacing — generous, modern SaaS scale

- **Page padding:** `px-8 py-12` (mobile `px-6 py-10`); on `lg:` go `lg:px-16 lg:py-16`
- **Page container:** `mx-auto w-full max-w-[1360px]`
- **Section gap (between top-level page blocks):** `space-y-12`
- **Card padding (default):** `p-10`
- **Card padding (compact, aside cards, dense tables):** `p-8`
- **Card title → body gap:** `mb-8` (default), `mb-6` (compact)
- **Form field gap:** `space-y-6`; between form sections `space-y-10`
- **Inline gap:** `gap-2` (icon + text), `gap-3` (button rows), `gap-4` (toolbar groups)
- **Detail layout column gap:** `gap-10`
- **Inside-card vertical rhythm:** `space-y-8`

---

## Radius

- Inputs, buttons: `rounded-md` (6px)
- Cards, panels: `rounded-lg` (8px)
- Badges, pills, avatars: `rounded-full`

No `rounded-xl`+.

---

## Shadow

- Cards: `shadow-sm`
- Elevated (dropdown, modal): `shadow-md`
- Never `shadow-lg+`.

---

## Components

### App shell / Layout
- App container: `mx-auto w-full max-w-[1360px] px-8 py-12 lg:px-16 lg:py-16`
- Top nav: full-width sticky `border-b border-border bg-surface`, height `h-16`, inner `mx-auto max-w-[1360px] px-8 lg:px-16`

### Card
```tsx
<section className="rounded-lg border border-border bg-surface shadow-sm p-10">
  <header className="flex items-center justify-between mb-8">
    <h2 className="text-xl font-semibold tracking-tight">Title</h2>
    <div className="flex gap-2">{/* actions */}</div>
  </header>
  {/* body */}
</section>
```
Compact variant (`<Card compact>`): swap `p-10` → `p-8`, `mb-8` → `mb-6`, title `text-lg font-semibold`.

### Button
- **Primary:** `inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50`
- **Secondary:** `inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50`
- **Ghost:** as secondary but no border, no bg: `text-text hover:bg-surface-hover`
- **Destructive:** primary shape with `bg-danger hover:bg-red-700`
- **Sizes:** default `px-4 py-2.5 text-sm`; sm `px-2.5 py-1.5 text-xs`

### Input / Select / Textarea
```tsx
<input className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm placeholder:text-subtle focus:border-border-strong focus:outline-2 focus:outline-offset-1 focus:outline-accent" />
```
Error: `border-danger`. Helper text below: `text-xs text-muted`. Error text: `text-xs text-danger`.

### Table — rows are clickable (list views)
For any list view that links to a detail page, **the entire row navigates**, not just one cell. Convention (option b — accessible, valid HTML):
```tsx
<tr
  onClick={() => router.push(href)}
  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(href); } }}
  tabIndex={0}
  role="link"
  aria-label={accessibleLabel}
  className="cursor-pointer hover:bg-surface-hover focus:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
>
  <td className="px-4 py-4">
    {/* For SSR + crawlers: keep a real <Link> in the first cell, visually plain */}
    <Link href={href} className="font-medium text-text hover:underline">{primary}</Link>
  </td>
  {/* other cells */}
</tr>
```
Secondary actions inside a row (delete buttons, kebab menus): wrap their handler with `e.stopPropagation()` so clicks don't fight the row navigation.

Table shell:
```tsx
<table className="w-full text-sm">
  <thead>
    <tr className="border-b border-border">
      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">Column</th>
    </tr>
  </thead>
  <tbody className="divide-y divide-border">{/* rows */}</tbody>
</table>
```
Header has no background fill — pure white. Visual differentiation comes from the uppercase tracking, the muted color, and the bottom border. No alternating row colors. No vertical column borders.

### Nav (top bar)
- Active link: `bg-accent-soft text-accent font-medium rounded-md px-3 py-1.5`
- Inactive: `text-muted hover:text-text px-3 py-1.5 rounded-md hover:bg-surface-hover`

### Badge
- Base: `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium`
- Active / success: `bg-green-50 text-success border border-green-200`
- Concept / pending: `bg-amber-50 text-warning border border-amber-200`
- Info: `bg-accent-soft text-accent border border-indigo-200`
- Neutral: `bg-surface text-muted border border-border`

### Empty state
Centered, inside the card: `text-sm text-muted py-16 text-center`.

---

## Layout primitives

### `DetailLayout` — two-column "detail with related content"

Used on any detail page that has primary info **and** related/recent records (Employee view → recent labour & recent expenses; Project view → narrative + recent activity).

**Per explicit user direction:** related/aside is on the **LEFT**, primary detail on the **RIGHT**. The visual weight of the larger right column reads as "primary" once the user's eye lands.

**File:** `app/src/components/DetailLayout.tsx`

**API:**
```tsx
<DetailLayout aside={<><RecentLabourCard /><RecentExpensesCard /></>}>
  <EmployeeDetailCard />
</DetailLayout>
```

**Markup spec:**
```tsx
<div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-10">
  <aside className="space-y-8 order-2 lg:order-1">{aside}</aside>
  <div className="space-y-8 order-1 lg:order-2">{children}</div>
</div>
```
- `lg:` breakpoint is the split point. Below `lg`, main stacks **above** aside (`order-1` for main, `order-2` for aside).
- Sidebar fixed at `320px`. Main flexes.
- Sidebar cards use the **compact** Card variant (`p-8`, smaller title). Same pure-white surface as the main card — no muted fill.
- For project detail, the narrative-generation panel belongs in the aside, not inline.

### `PageHeader`
```tsx
<header className="mb-12 flex items-end justify-between gap-4">
  <div>
    <h1 className="text-4xl font-semibold tracking-tight">Title</h1>
    <p className="mt-2 text-base text-muted">Optional subtitle</p>
  </div>
  <div className="flex gap-2">{/* primary actions */}</div>
</header>
```

---

## Don'ts

- Muted / tinted "surface" fills (`#f8fafc`, `#fafafa`, `#f9f9f9`) on cards or table headers — every panel is pure white
- Gradient panel headers, faux-3D buttons, light-blue table headers
- `shadow-lg+`, `rounded-xl+`
- Multiple accent colors
- Hard-coded hex in component code — always a token
- Body text smaller than 16px outside dense data tables (which use `text-sm`)
- Page/card padding below `p-8` outside the compact variant
- Making only the "view" cell of a list row clickable — the whole row navigates

---

## When extending this doc

Append focused sections. Keep total under ~200 lines — the frontend agent reads it before every task; long = ignored.
