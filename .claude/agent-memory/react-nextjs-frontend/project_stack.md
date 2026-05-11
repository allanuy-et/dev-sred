---
name: Stack snapshot
description: Tech stack and workspace layout for the sred-manager monorepo
type: project
---

Monorepo with yarn workspaces. Key facts.

**Why:** Saves the rediscovery cost on every conversation about what's installed and where things live.

**How to apply:** Use this as a starting point but verify before depending on a specific file path — the repo is still in early build phases.

- App workspace: `@sred/app` at `/Users/paolouy/dev/sred-manager/app/`
  - Next.js 16.2.6, React 19.2.4, Tailwind v4 (CSS-first config in `app/src/app/globals.css` with `@theme inline` for token → utility mapping)
  - Path alias `@/*` → `app/src/*`
  - Scripts: `yarn workspace @sred/app run typecheck` / `lint` / `dev` / `build`
  - **No UI libs installed** (no shadcn, Radix, react-hook-form, etc.). Hand-build everything.
- Shared types: `@sred/shared` at `/Users/paolouy/dev/sred-manager/shared/` — import from `@sred/shared` (re-exports user/company/project/labour/expense types)
- App router with route group `(app)` for protected pages; `/login` and `/` sit outside it
- Next.js 16 quirks to remember: `cookies()` is async, route `params` is a Promise. Always check `node_modules/next/dist/docs/` before assuming an API matches older Next.js.
