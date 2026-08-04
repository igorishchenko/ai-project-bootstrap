# Investigate performance

> Replace the bracketed parts, delete what does not apply, then send.

**[What feels slow]** in {{projectName}}.

## Symptom

- **Where**: [screen, endpoint, or operation]
- **How slow**: [measured time, or "N seconds before anything appears"]
- **When**: [always / with large data / on first load / on older devices]
- **Data size**: [rows, items, payload size]

## Method

1. **Measure before changing anything.** Show me the numbers and where the time
   actually goes.
2. **Name the cause** — extra renders, N+1 requests, unbounded list, oversized
   assets, blocking startup work.
3. **Fix the largest cost first.**
4. **Measure again** and report before/after. If it did not move, revert it.

See `.claude/skills/performance.md` for this project's conventions.

## Constraints

- No speculative micro-optimisation. Evidence first.
- Do not trade correctness for speed. Caching without an invalidation rule is
  not a performance fix, it is a future bug.
- Say if the real fix is architectural rather than local.
