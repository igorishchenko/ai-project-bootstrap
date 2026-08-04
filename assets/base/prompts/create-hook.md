# Create a hook

> Replace the bracketed parts, delete what does not apply, then send.

Add a hook to {{projectName}}: **use[Name]**.

## What it does

[One sentence. If it needs two, it is probably two hooks.]

## Interface

```ts
const [what it returns] = use[Name]([what it takes]);
```

- **Returns**: [shape — model loading/error as a union, not as loose flags]
- **Re-runs when**: [dependencies]
- **Cleans up**: [subscriptions, timers, listeners]

## Requirements

- Data fetching goes through a service; the hook orchestrates, it does not call
  the network directly.
- Cancel or ignore in-flight work on unmount — no state updates after teardown.
- Keep the dependency array honest; do not silence the lint rule.

## Tests

Cover the initial state, the resolved state, the error path, and cleanup.

## Reference

Follow **[path to an existing hook]**, and `docs/coding-standards.md`.
