# Coding standards

The rules below apply to every file in {{projectName}}. Technology-specific
conventions live in `.cursor/rules/` and `.claude/skills/`.

## Naming

- Say what a thing is, not what type it is: `subscription`, not `subData`.
- Booleans read as assertions: `isActive`, `hasAccess`, `shouldRetry`.
- Functions start with a verb: `loadProfile`, `formatPrice`, `retryPayment`.
- Files match their primary export. One meaningful export per file.
- Abbreviate only where the abbreviation is more common than the word (`id`,
  `url`, `api`).

## Types

- No `any`. If a type is genuinely unknown, use `unknown` and narrow it.
- Model states as unions rather than optional-flag soup:
  `{ status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; error: Error }`
  beats `{ loading?: boolean; data?: T; error?: Error }`, because the impossible
  combinations stop being representable.
- Types belong next to what they describe, not in a project-wide `types.ts` bin.
- Validate anything crossing a boundary — network responses, storage, env vars.
  A type assertion on unvalidated input is a lie the compiler believes.

## Functions

- One job each. If you need "and" to describe it, it is two functions.
- Return early. Deep nesting is usually a missing guard clause.
- Keep side effects at the edges; keep the middle pure and testable.
- Default to fewer than five parameters — beyond that, pass an object.

## Errors

- Never swallow an error. Handle it, or let it propagate.
- Add context when rethrowing: what was being attempted, with which input.
- Users see what they can act on; the details go to the error reporter.
- `try/catch` around the specific failing call, not around an entire function.

## Structure

- Group by feature, not by file type. Everything a feature needs lives together.
- Shared code moves into a shared location on the third use, not the first —
  premature abstraction is harder to undo than duplication.
- Dependencies point inward: UI depends on services, services never depend on UI.
- No circular imports. If two modules need each other, a third one is hiding.

## Comments

- Explain *why*, never *what*. The code already says what.
- A comment that restates the line below it is noise; delete it.
- Document the non-obvious: workarounds, ordering constraints, business rules.
- Mark deliberate compromises with `TODO:` and enough context to act on later.

## Formatting

Formatting is not a matter of taste here — Prettier owns it, ESLint owns
correctness, and both run on commit. Do not hand-format, and do not disable a
rule to get past an error; fix the cause or raise the rule for discussion.
