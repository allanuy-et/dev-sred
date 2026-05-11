---
name: No validation library — hand-write field validators
description: Don't add zod/joi/express-validator; hand-write per-field checks inline in route modules
type: feedback
---

For request validation in this project, do not pull in a validation library. Hand-write the type/range checks per field, inline in the route module.

**Why:** Explicit instruction from the user during the Phase 1 backend build: "Don't use a validation library — hand-write the checks for these 5-6 fields. (No deps bloat.)" Routes touch a small, stable set of fields, so the overhead of a schema lib isn't worth the dependency or learning curve for this codebase.

**How to apply:** When adding a new write route, write small `is*` predicates (e.g., `isUuid`, `isIsoDate`, enum-set checks) and a `parseX` function that returns `{ ok: true, value } | { ok: false, error }`. Reject with 400 + `{ error: '...' }`. If the team later wants to standardize on zod, that's a deliberate refactor — not something to slip in mid-task.
