## What this does

<!-- One paragraph, in the language a user would use. What can they do now that they could not? -->

## Why

<!-- The problem this solves. Link the task, question or decision it came from. -->

## How it was checked

<!-- What you ran, and what you looked at by hand. -->

- [ ] the repo's gate is green (`npm run verify`, or lint + type-check)
- [ ] `node scripts/verify-repo-standards.mjs` is clean
- [ ] `CHANGELOG.md` has an entry under `[Unreleased]`, or this change is invisible to users
- [ ] no version bump — only a `chore: release vX.Y.Z` commit bumps (R4)
- [ ] new configuration is in `.env.example`, by name
