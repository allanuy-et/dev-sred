---
name: SR&ED Manager Phases 1–3 milestone
description: Build context through Phase 3 — parallel agents, cross-phase security catch, demo Wednesday 2026-05-14
type: project
---

Phase 1 completed 2026-05-11. Backend (Express) and frontend (Next.js App Router) agents spawned in parallel with a shared API contract via `@sred/shared`. Build error resolved by splitting `api.ts` → `api.ts` / `api.server.ts` / `api.client.ts` (same for `auth.ts`) to avoid pulling `next/headers` into client bundles. Code-reviewer found: stale non-UUID fallback ids (silently 400 every POST), type re-declarations diverging from `@sred/shared`. Phase 1 review: 4 must-fix items.

Phase 2 completed same day. Employees + Projects CRUD. Tighter spawn brief (explicit scoping invariants, 404-not-403, 409 on email collision) → Phase 2 reviewer returned zero must-fix items. Reviewer caught inactive-manager silent data-loss bug (dropdown omits deactivated managers, form sends `projectManagerId: null` on save).

Phase 3 completed same day. Expenses + Search + Reports. Phase 3 backend agent discovered pre-existing labour cross-tenant leak by contrast with the correctly-scoped new expenses code — flagged it and explicitly refused to touch Phase 1/2 routes (self-restraint preserved Phase 1/2 stability). Labour backfill is a follow-up PR. `parseStatusFilter` server/client split: pure module in `status-filter.ts` so Server Components can import without client runtime. GlobalSearch implemented with `AbortController` + debounce + keyboard nav without adding `cmdk`/`downshift`.

**Why:** One-day coder challenge, demo Wednesday 2026-05-14. 25% of grade is prompting craft.

**How to apply:** When curating future milestones, carry forward: parallel-agent-as-contract-forcing-function, build-error-trace-verbatim, reviewer-framed-as-demo-risk, cross-phase contrast as security-review mechanism. The Phase 3 cross-tenant catch is the strongest new talking point for Wednesday.
