---
name: SR&ED Manager Phase 1 milestone
description: Phase 1 build context — parallel agents, build errors fixed, code review done, demo Wednesday 2026-05-14
type: project
---

Phase 1 completed 2026-05-11. Backend (Express) and frontend (Next.js App Router) agents spawned in parallel with a shared API contract via `@sred/shared`. Build error resolved by splitting `api.ts` → `api.ts` / `api.server.ts` / `api.client.ts` (same for `auth.ts`) to avoid pulling `next/headers` into client bundles. Code-reviewer agent found: stale non-UUID fallback ids in `selectOptions.ts` (would silently 400 every POST), and frontend re-declaring types already in `@sred/shared` with extra enum members. Golden path verified: login → labour POST → dashboard increments → logout clears cookie. Port conflicts moved to 3100/4100.

**Why:** One-day coder challenge, demo Wednesday 2026-05-14. 25% of grade is prompting craft.

**How to apply:** When curating future milestones, carry forward: the parallel-agent-as-contract-forcing-function theme, the build-error-trace-verbatim technique, and the reviewer-framed-as-demo-risk pattern — all three have been discussed and are strong demo talking points.
