# Performance

How to make {{projectName}} faster without making it worse.

## Method

1. **Measure first.** A profile, a trace, a timing. "This looks slow" is a
   hypothesis, not a finding.
2. **Fix the largest cost**, not the most interesting one.
3. **Measure again.** If the number did not move, revert the change — you have
   added complexity for nothing.

Report the before and after numbers when you optimise something. A performance
change without evidence is indistinguishable from a style change.

## Rendering

- Keep state close to where it is used; a change high in the tree re-renders
  everything below it.
- Memoise expensive derived values. Do not memoise everything — the bookkeeping
  costs more than the work for cheap values, and it makes the code harder to
  follow.
- Lists: stable keys, and virtualise anything long.
- Avoid creating new objects and functions in render when they feed a memoised
  child; that silently defeats the memo.

## Data

- Independent requests run in parallel.
- Cache with an explicit invalidation rule. A cache nobody can invalidate is a
  bug waiting to be filed.
- Paginate anything unbounded.
- Push filtering and aggregation to the server for large datasets.

## Startup

The first screen should not wait for anything it does not display. Initialise
SDKs lazily where possible, and never block first paint on analytics or a
remote config fetch — those can arrive late without the user noticing.

## Perceived performance

Frequently the fix is not doing less work but revealing progress sooner: render
the shell immediately, prefer skeletons to spinners, and apply optimistic
updates where the action nearly always succeeds. A 300ms operation that shows
its result instantly feels faster than a 150ms one behind a spinner.

## Watch for

- A dependency added without checking its bundle cost.
- Work in a loop that could be done once outside it.
- Repeated identical requests on mount.
- Images shipped much larger than they are displayed.
