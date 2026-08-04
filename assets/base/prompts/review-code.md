# Review code

> Replace the bracketed parts, delete what does not apply, then send.

Review **[the diff / branch / file]** in {{projectName}}.

## Look for, in this order

1. **Correctness** — does it do what it claims, including at the boundaries?
   Off-by-one, null handling, race conditions, unhandled rejections.
2. **Security** — unvalidated input, secrets in code or logs, missing
   authorisation, data exposed to the wrong user.
3. **Error handling** — swallowed errors, generic messages, failures that leave
   state half-updated.
4. **Architecture** — layering respected, SDK access wrapped, no cycles.
   See `docs/architecture.md`.
5. **Tests** — do they cover the behaviour that changed, and would they fail if
   the change were reverted?
6. **Standards** — `docs/coding-standards.md`.

## How to report it

For each finding: the file and line, what is wrong, and a concrete failing
scenario — inputs and the resulting wrong behaviour. Something that cannot be
made to fail is a preference, so label it as one.

Rank by severity. Do not pad the list; if there is nothing serious, say so.

## Out of scope

Do not rewrite it. Point at the problem and suggest the fix.
