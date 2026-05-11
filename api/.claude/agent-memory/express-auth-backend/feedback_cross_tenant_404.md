---
name: Cross-tenant access returns 404
description: When a caller asks for a row owned by another company, return 404 (not 403) to avoid leaking existence
type: feedback
---

For any GET/PATCH/POST `:id` endpoint, company-scoping is enforced server-side. Cross-tenant access (caller's company_id does not match row's company_id) must return `404 { error: 'Not found' }`, not 403.

**Why:** 403 leaks the fact that the row exists in another tenant. 404 is indistinguishable from "this id has never existed." Explicit hard-rule from the user.

**How to apply:** Implement scoping by joining `users me ON me.id = $callerId` and adding `WHERE row.company_id = me.company_id` to both SELECT and UPDATE. When UPDATE affects 0 rows, return 404. Never branch on whether the row exists-elsewhere vs not-at-all.
