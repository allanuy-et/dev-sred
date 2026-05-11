# Design System

Source of truth for visual conventions. The `react-nextjs-frontend` agent reads this **before generating any UI**. Whenever a new visual decision arises, the `design-system` agent extends this doc.

**Target aesthetic:** modern SaaS dashboard (Linear / Vercel). Clean typography, generous whitespace, subtle borders + shadows, one accent color. **Not** the retro 2008 prototype.

---

## Color tokens (light mode)

Defined as CSS variables in `app/src/app/globals.css`. Used via Tailwind utilities like `bg-surface`, `text-muted`, `border-border`, `text-accent`.

| Token             | Hex       | Use                                                  |
|-------------------|-----------|------------------------------------------------------|
| `--bg`            | `#fafaf9` | Page background                                      |
| `--surface`       | `#ffffff` | Cards, panels, table rows                            |
| `--surface-hover` | `#f5f5f4` | Hovered table row, secondary button hover            |
| `--border`        | `#e7e5e4` | Card borders, table dividers, input borders          |
| `--border-strong` | `#d6d3d1` | Active inputs, focused borders                       |
| `--text`          | `#1c1917` | Primary text                                         |
| `--text-muted`    | `#78716c` | Labels, helper text, table headers                   |
| `--accent`        | `#4f46e5` | Primary button, active nav, links                    |
| `--accent-hover`  | `#4338ca` | Primary button hover                                 |
| `--success`       | `#16a34a` | Active badges, success alerts                        |
| `--warning`       | `#ca8a04` | Concept / pending badges                             |
| `--danger`        | `#dc2626` | Destructive buttons, error alerts                    |

**Dark mode** mirrors via `prefers-color-scheme: dark`: bg `#0c0a09`, surface `#1c1917`, border `#292524`, text `#f5f5f4`, muted `#a8a29e`, accent `#818cf8`.

---

## Typography

- **Font:** Geist Sans (already imported in `app/src/app/layout.tsx` as `--font-geist-sans`). Mono is Geist Mono via `--font-geist-mono` (use for code/IDs only).
- **Body default:** `text-sm` (14px), `leading-6`, `font-normal`, color `--text`.
- **Headings:** `font-semibold`, color `--text`. Scale:
  - Page title: `text-2xl` (24px)
  - Section header: `text-lg` (18px)
  - Card title: `text-base` (16px) `font-medium`
  - Table column header: `text-xs uppercase tracking-wide font-medium text-muted`
- **Labels/helpers:** `text-xs` (12px), color `--text-muted`.
- **Numbers in stat widgets:** `text-3xl font-semibold tabular-nums`.

---

## Spacing

Use Tailwind's default `0.25rem` step. Patterns:

- **Page padding:** `px-6 py-8` (or `px-8 py-10` on lg+)
- **Card padding:** `p-6`
- **Compact card padding:** `p-4`
- **Section gap:** `space-y-6`
- **Form field gap:** `space-y-4`
- **Inline gap:** `gap-2` (icon + text), `gap-4` (button rows)

---

## Radius

- Inputs, buttons: `rounded-md` (6px)
- Cards, panels: `rounded-lg` (8px)
- Badges, pills: `rounded-full`
- Avatars: `rounded-full`

**No `rounded-xl`+.** Keeps it modern, not playful.

---

## Shadow

- Cards: `shadow-sm` (subtle elevation)
- Elevated (dropdowns, modals): `shadow-md`
- **Never `shadow-lg`+.** Heavy shadows feel dated.

---

## Components

### Layout
- App container: `mx-auto max-w-[1120px] w-full`
- Top nav: full-width sticky header, `border-b border-border bg-surface`, height `h-14`
- Page header: `flex items-center justify-between mb-6`

### Card
```tsx
<div className="rounded-lg border border-border bg-surface shadow-sm p-6">
  {/* optional title row */}
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-base font-medium">Title</h2>
    <div className="flex gap-2">{/* actions */}</div>
  </div>
  {/* body */}
</div>
```

### Button

- **Primary:** `inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50`
- **Secondary:** `inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50`
- **Destructive:** same shape, `bg-danger text-white hover:bg-red-700`
- **Sizes:** default `py-1.5 px-3 text-sm`; sm: `py-1 px-2 text-xs`

### Input / Select / Textarea

```tsx
<input className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm placeholder:text-muted focus:border-border-strong focus:outline-2 focus:outline-offset-1 focus:outline-accent" />
```

Error state: replace border with `border-danger`. Helper text below: `text-xs text-muted`. Error text: `text-xs text-danger`.

### Table

```tsx
<table className="w-full text-sm">
  <thead>
    <tr className="border-b border-border">
      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted">Column</th>
    </tr>
  </thead>
  <tbody className="divide-y divide-border">
    <tr className="hover:bg-surface-hover">
      <td className="px-4 py-3">Cell</td>
    </tr>
  </tbody>
</table>
```

No alternating row colors. No gradients. No vertical column borders.

### Nav (top bar)

Active link: `border-b-2 border-accent text-text font-medium`. Inactive: `text-muted hover:text-text`.

### Badge

- Base: `inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium`
- Active: `bg-green-50 text-success border border-green-200`
- Concept/pending: `bg-amber-50 text-warning border border-amber-200`
- Neutral: `bg-stone-100 text-text-muted border border-border`

### Empty state

Centered, in a card: `text-sm text-muted py-12 text-center`.

---

## Don'ts

- ❌ Gradient panel headers (`linear-gradient(...)` on title bars)
- ❌ Light-blue table headers — that's the retro prototype
- ❌ Orange `#e07820` accents — that's the retro prototype
- ❌ `shadow-lg`, `shadow-xl`, `shadow-2xl` — too heavy
- ❌ `rounded-xl` or larger — too playful
- ❌ Multiple accent colors — pick one (`--accent`)
- ❌ Hard-coded hex values in components — always use a token or Tailwind class
- ❌ Faux-3D buttons (heavy shadow + gradient)
- ❌ Dense 12–13px everything — let things breathe

---

## When extending this doc

If you (the `design-system` agent) hit a styling decision not covered here, append a new section. Keep the doc under ~150 lines — if it grows past that, consolidate.
