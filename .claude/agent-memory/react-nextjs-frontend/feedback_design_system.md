---
name: Design system rules
description: Must read shared/design-system.md before writing UI; use tokens not hex
type: feedback
---

Read `/Users/paolouy/dev/sred-manager/shared/design-system.md` BEFORE writing any component styling. Use design tokens (`bg-surface`, `text-text-muted`, `border-border`, `text-accent`, etc.) exposed via Tailwind v4's `@theme inline` block in `app/src/app/globals.css`. Never inline hex values in components.

**Why:** The user is rebuilding this app to escape the retro 2008 prototype look. Hard-coded hex breaks dark mode (CSS vars flip automatically). The plan explicitly lists this as a hard rule.

**How to apply:**
- Every new color/spacing/radius decision: check the design system doc first.
- If the doc is silent on something, choose conservatively (modern, minimal) and surface the decision so it can be codified.
- Custom semantic colors available as Tailwind classes: `bg-bg`, `bg-surface`, `bg-surface-hover`, `border-border`, `border-border-strong`, `text-text`, `text-text-muted`, `text-accent`, `text-success`, `text-warning`, `text-danger` (and `bg-` variants of accent/success/warning/danger).
- Forbidden: gradients, `shadow-lg+`, `rounded-xl+`, faux-3D buttons, multiple accent colors, the old orange `#e07820`.
