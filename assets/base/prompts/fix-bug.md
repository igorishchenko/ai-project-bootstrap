# Fix a bug

> Replace the bracketed parts, delete what does not apply, then send.

## The bug

- **What happens**: [observed behaviour]
- **What should happen**: [expected behaviour]
- **Steps to reproduce**: [1, 2, 3]
- **Where**: [screen, endpoint, or file if known]
- **Since**: [when it started, or which change you suspect]

## Evidence

```
[error message, stack trace, or log output]
```

## How to work this

1. **Reproduce it first.** Do not start fixing until you can trigger it.
2. **Find the cause**, not the symptom. Tell me what the actual cause is before
   you change anything — if the fix does not explain the evidence above, it is
   the wrong fix.
3. **Write a failing test** that captures the bug.
4. **Fix it**, and confirm that test now passes.
5. **Check for siblings.** The same mistake is often repeated elsewhere.

## Constraints

- Smallest change that fixes the cause. Do not refactor around it.
- Do not silence the error — no empty catch, no disabled rule.
- If the real fix is large or risky, say so and describe the options rather
  than quietly applying a workaround.
