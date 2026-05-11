---
name: SR&ED Manager one-day build
description: Context and constraints for the one-day SR&ED Manager rebuild challenge
type: project
---

Phase 1 backend (auth, labour CRUD, dashboard) completed 2026-05-11. The full build is a one-day coder challenge with demo on 2026-05-13. The plan lives at `/Users/paolouy/.claude/plans/encapsulated-noodling-sparkle.md`.

**Why:** Grading weights this project heavily on (a) how much works end-to-end, (b) code quality, and (c) prompting craft. The plan trades off "perfect" for "demo-ready by Wednesday."

**How to apply:** Favor working golden-path code over abstraction. Don't add dependencies unless absolutely required. The frontend lives in `/app` and is owned by a different agent — don't touch it. The Next.js rewrite strips `/api` so Express routes mount at `/auth`, `/labour`, `/dashboard` (not `/api/auth` etc.). Cookie is httpOnly, name = `sred_session`, JWT payload = `{ userId, email, accessLevel }`. DB columns are snake_case; shared types are camelCase — always map at the boundary.
