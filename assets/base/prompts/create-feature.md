# Create a feature

> Replace the bracketed parts, delete what does not apply, then send.

Add a feature to {{projectName}}: **[what the user should be able to do]**.

## Context

- Read `docs/architecture.md` for the layering, and the skill in
  `.claude/skills/` for each technology this touches.
- Follow an existing feature folder as the structural reference: **[path]**.

## Requirements

- [Behaviour, as something a user can observe]
- [Edge case that must be handled]
- [What should happen when it fails]

## Constraints

- I/O goes behind a service; components do not call SDKs directly.
- New environment variables must be added to `.env.example` in this change.
- Include the tests described in `docs/testing.md`.

## Before you start

Tell me the files you plan to create or change, and anything in the request that
is ambiguous. Then implement it.

## When you are done

Run lint, typecheck and tests, and report the actual results.
