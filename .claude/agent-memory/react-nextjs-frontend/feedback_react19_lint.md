---
name: React 19 set-state-in-effect lint
description: Project's ESLint blocks setState() inside useEffect bodies; do state transitions in event handlers or async callbacks instead
type: feedback
---

ESLint rule `react-hooks/set-state-in-effect` is enabled (React 19) and **fails the build**, not just warns. Calling `setState(...)` synchronously in the body of a `useEffect` is rejected.

**Why:** Cascading renders hurt performance, and React 19 treats effects as a sync primitive for external systems, not for derived state. The user runs `yarn workspace @sred/app run lint` as a gate.

**How to apply:**
- Derive values during render (memo, computed) instead of mirroring into state via an effect.
- For event-driven state transitions (debounced search inputs, list resets), do the state change in the event handler synchronously, not in an effect that watches the trigger.
- Inside async callbacks awaited by an effect, `setState` is fine — the rule only flags synchronous setState in the effect's top-level body.
- If you genuinely need to reset state when a prop/derived value changes, prefer `useMemo` + a key, or put the reset in the handler that caused the change.
