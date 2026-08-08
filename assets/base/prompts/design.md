# Design a screen or flow

> Replace the bracketed parts, delete what does not apply, then send.

Design **[screen, flow, or component]** for {{projectName}}, before any code
is written.

## Goal

- [The user need this solves, in one sentence]
- [What already exists and must be respected — an API shape, a navigation
  structure, a design pattern used elsewhere]

## Ask first, do not assume

Do not guess at layout, copy, states, or scope. Before proposing anything:

- List every open question, grouped by what depends on the answer.
- Wait for answers rather than filling a gap with a plausible default.

**Exception**: if you are 99.9% certain of the right call — because an
existing screen, the design system, or this brief already settles it — state
the assumption out loud, proceed, and mark it clearly in the output as an
assumption to approve, not a decision already made.

## What to produce

- [Wireframe, component breakdown, or states table — whatever fits the scope]
- Loading, empty, error, and offline states — not just the happy path.
- What reuses an existing component versus what needs a new one.

## Reference

Follow **[path to a similar screen]** for structure and conventions, and the
matching skill in `.claude/skills/` for platform-specific patterns.

## When you are done

Present the design and any stated assumptions for approval. Do not start
implementing until it is approved.
