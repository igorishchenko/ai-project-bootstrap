# Release

The process for shipping a version of {{projectName}}.

## Versioning

Semantic versioning: `MAJOR.MINOR.PATCH`.

- **PATCH** — bug fixes, no behaviour change for anyone using it correctly.
- **MINOR** — new functionality, existing behaviour unchanged.
- **MAJOR** — anything that breaks an existing integration or user expectation.

Commits follow [Conventional Commits](https://www.conventionalcommits.org/), so
the version bump and changelog can be derived rather than argued about.

## Preparing

1. Confirm the main branch is green.
2. Work through `checklists/release.md`.
3. Generate the changelog from the commits since the last tag.
4. Bump the version. Native apps also need their build number incremented —
   stores reject a duplicate.

## Releasing

1. Tag the release.
2. Let CI build and publish the artefact.
3. Deploy to staging and verify (see [deployment.md](deployment.md)).
4. Promote to production.
5. Watch error reporting and the key metrics for a rise, not just for alerts.

## Communicating

Say what changed in terms of what users can now do, what got fixed, and anything
that requires action from them. Keep the changelog readable by someone who does
not work on this codebase.

## When a release goes wrong

1. Roll back first. Diagnose second — a live incident is not the time to debug.
2. Confirm the rollback actually restored the previous behaviour.
3. Write down what happened while it is fresh: the trigger, the impact window,
   what would have caught it earlier.
4. Fix the gap that let it through, not just the bug.
