# Design System

Source of truth for visual conventions. The `react-nextjs-frontend` agent reads this **before generating any UI**. The `design-system` agent owns extending it.

**Target aesthetic:** modern SaaS dashboard (Linear / Vercel). Light, airy, generous whitespace, subtle borders, one accent. **Not** the retro 2008 prototype.

---

## Color tokens

Defined in `app/src/app/globals.css`. Used via Tailwind utilities: `bg-surface`, `bg-surface-muted`, `text-muted`, `border-border`, `text-accent`, etc.

| Token              | Hex       | Use                                                  |
|--------------------|-----------|------------------------------------------------------|
| `--bg`             | `#ffffff` | Page background (pure white — clean, not dusty)      |
| `--surface`        | `#ffffff` | Cards, panels, table rows                            |
| `--surface-muted`  | `#f8fafc` | Sidebar cards, table headers, subtle bg blocks       |
| `--surface-hover`  | `#fafafa` | Hovered row / ghost button                           |
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

**Palette shift note:** moved from warm `stone` to cool `zinc`, lightened text + bg. The page reads as airier and less heavy.

---

## Typography

- **Font:** Geist Sans (loaded in `app/src/app/layout.tsx` as `--font-geist-sans`). Geist Mono via `--font-geist-mono` for IDs/code only. Geist IS modern — earlier "needs a modern font" complaint was the size/weight scale being too dense.
- **Body baseline:** **15px** (set on `html, body` in `globals.css`), `leading-6`, `font-normal`, color `--text`. Use Tailwind `text-base` for body content; `text-sm` only for dense data (tables, badges).
- **Scale (use these utilities):**
  - Page title: `text-3xl font-semibold tracking-tight` (30px)
  - Section header: `text-xl font-semibold tracking-tight` (20px)
  - Card title: `text-lg font-semibold` (18px)
  - Body / form labels: `text-base` (15px via root) `font-normal`; bold labels `font-medium`
  - Table cells: `text-sm` (14px)
  - Table column header: `text-xs uppercase tracking-wider font-medium text-muted`
  - Helpers / hints: `text-xs text-muted` (12px)
  - Stat number (dashboard primary): `text-4xl font-semibold tabular-nums tracking-tight`
  - Stat number (card stat): `text-3xl font-semibold tabular-nums`

---

## Spacing — generous, not cramped

- **Page padding:** `px-8 py-10` (mobile `px-6 py-8`); on `lg:` go `lg:px-12 lg:py-12`
- **Page container:** `mx-auto w-full max-w-[1200px]`
- **Section gap (between cards on a page):** `space-y-8`
- **Card padding (default):** `p-8`
- **Card padding (compact, sidebar cards, dense tables):** `p-6`
- **Card title → body gap:** `mb-6`
- **Form field gap:** `space-y-4`; between form sections `space-y-8`
- **Inline gap:** `gap-2` (icon + text), `gap-3` (button rows), `gap-4` (toolbar groups)
- **Detail layout column gap:** `gap-8`

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
- App container: `mx-auto w-full max-w-[1200px] px-8 py-10 lg:px-12 lg:py-12`
- Top nav: full-width sticky `border-b border-border bg-surface`, height `h-14`, inner `mx-auto max-w-[1200px] px-8 lg:px-12`

### Card
```tsx
<section className="rounded-lg border border-border bg-surface shadow-sm p-8">
  <header className="flex items-center justify-between mb-6">
    <h2 className="text-lg font-semibold">Title</h2>
    <div className="flex gap-2">{/* actions */}</div>
  </header>
  {/* body */}
</section>
```
Compact variant (`<Card compact>`): swap `p-8` → `p-6`, `mb-6` → `mb-4`, title `text-base font-semibold`.

### Button
- **Primary:** `inline-flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50`
- **Secondary:** `inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3.5 py-2 text-sm font-medium text-text hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50`
- **Ghost:** as secondary but no border, no bg: `text-text hover:bg-surface-hover`
- **Destructive:** primary shape with `bg-danger hover:bg-red-700`
- **Sizes:** default `px-3.5 py-2 text-sm`; sm `px-2.5 py-1.5 text-xs`

### Input / Select / Textarea
```tsx
<input className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-subtle focus:border-border-strong focus:outline-2 focus:outline-offset-1 focus:outline-accent" />
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
  <td className="px-4 py-3">
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
  <thead className="bg-surface-muted">
    <tr className="border-b border-border">
      <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted">Column</th>
    </tr>
  </thead>
  <tbody className="divide-y divide-border">{/* rows */}</tbody>
</table>
```
No alternating row colors. No vertical column borders. No gradient headers.

### Nav (top bar)
- Active link: `bg-accent-soft text-accent font-medium rounded-md px-3 py-1.5`
- Inactive: `text-muted hover:text-text px-3 py-1.5 rounded-md hover:bg-surface-hover`

### Badge
- Base: `inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium`
- Active / success: `bg-green-50 text-success border border-green-200`
- Concept / pending: `bg-amber-50 text-warning border border-amber-200`
- Info: `bg-accent-soft text-accent border border-indigo-200`
- Neutral: `bg-surface-muted text-muted border border-border`

### Empty state
Centered, inside the card: `text-sm text-muted py-12 text-center`.

---

## Layout primitives

### `DetailLayout` — two-column "detail with related content"

Used on any detail page that has primary info **and** related/recent records (Employee view → recent labour & recent expenses; Project view → narrative + recent activity).

**Per explicit user direction:** related/aside is on the **LEFT**, primary detail on the **RIGHT**. (Unusual — Western reading order puts primary on the left — but this is what the user envisioned, so we honor it. The visual weight of the larger right column still reads as "primary" once the user's eye lands.)

**File:** `app/src/components/DetailLayout.tsx`

**API:**
```tsx
<DetailLayout aside={<><RecentLabourCard /><RecentExpensesCard /></>}>
  <EmployeeDetailCard />
</DetailLayout>
```

**Markup spec:**
```tsx
<div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-8">
  <aside className="space-y-6 order-2 lg:order-1">{aside}</aside>
  <div className="space-y-6 order-1 lg:order-2">{children}</div>
</div>
```
- `lg:` breakpoint is the split point. Below `lg`, main stacks **above** aside (`order-1` for main, `order-2` for aside).
- Sidebar fixed at `280px`. Main flexes.
- Sidebar cards use the **compact** Card variant (`p-6`, smaller title).
- For project detail, the narrative-generation panel belongs in the aside, not inline.

### `PageHeader`
```tsx
<header className="mb-8 flex items-end justify-between gap-4">
  <div>
    <h1 className="text-3xl font-semibold tracking-tight">Title</h1>
    <p className="mt-1 text-sm text-muted">Optional subtitle</p>
  </div>
  <div className="flex gap-2">{/* primary actions */}</div>
</header>
```

---

## Don'ts

- Gradient panel headers
- Light-blue table headers, orange `#e07820` accents (retro prototype cues)
- `shadow-lg+`, `rounded-xl+`
- Multiple accent colors
- Hard-coded hex in component code — always a token
- Body text smaller than 15px outside dense data tables
- Page/card padding below `p-6` outside the compact variant
- Making only the "view" cell of a list row clickable — the whole row navigates

---

## When extending this doc

Append focused sections. Keep total under ~200 lines — the frontend agent reads it before every task; long = ignored.
