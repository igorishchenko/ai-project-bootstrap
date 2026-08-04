# Create a screen

> Replace the bracketed parts, delete what does not apply, then send.

Add a screen to {{projectName}}: **[screen name]**.

## What it shows

- [The main content]
- [Where the data comes from]
- [What the user can do here]

## States to handle

- **Loading** — [skeleton, or existing pattern to follow]
- **Empty** — [message and the action that resolves it]
- **Error** — [what the user sees, and whether they can retry]
- **Offline** — [if it applies]

Do not ship only the happy path. The other states are most of the work.

## Navigation

- Reached from: [screen or flow]
- Parameters: [what it receives]
- Leads to: [next screens]

## Reference

Follow **[path to a similar screen]** for structure, and the matching skill in
`.claude/skills/` for platform conventions.

## When you are done

Run lint, typecheck and tests, and report the real results.
