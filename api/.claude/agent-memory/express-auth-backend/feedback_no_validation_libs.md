---
name: No validation libraries
description: All request validation must be hand-written; no Zod/Joi/express-validator/etc.
type: feedback
---

All request body and query validation in this API is hand-written using small typed predicate helpers (e.g. `isUuid`, `isIsoDate`, `isNonEmptyString`). Do not introduce Zod, Joi, express-validator, ajv, or similar.

**Why:** User has flagged dependency bloat as a recurring concern and the code-reviewer has caught it before. The codebase has zero validation deps; keep it that way.

**How to apply:** When adding any new POST/PATCH route, mirror the parser pattern from `api/src/routes/labour.ts` and `api/src/routes/employees.ts` — a `parseCreateX` function returning a `{ ok: true, value } | { ok: false, error }` discriminated union, and a per-field check loop in PATCH using a `push(sqlCol, value)` helper that appends to `sets[]` and `params[]`.
