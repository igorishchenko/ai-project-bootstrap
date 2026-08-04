# Release checklist

Work through this before every release of {{projectName}}.

## Code

- [ ] Main branch is green: lint, typecheck, tests.
- [ ] No `TODO` or `FIXME` blocking anything in this release.
- [ ] No debug logging, commented-out code, or temporary flags left behind.
- [ ] Dependencies audited for known vulnerabilities.

## Configuration

- [ ] Every new environment variable is in `.env.example`, with a description.
- [ ] Staging and production both have the new variables set.
- [ ] No secret, key or token committed to the repository.
- [ ] Production credentials differ from staging credentials.

## Verification

- [ ] The main user flow works end to end against staging, with a real account.
- [ ] The states that are easy to forget — empty, error, offline — still work.
- [ ] Verified on the oldest platform version this project supports.

## Data

- [ ] Migrations run cleanly on a copy of production data.
- [ ] Migrations are compatible with the currently deployed version, so a
      rollback does not corrupt anything.
- [ ] A restorable backup exists from before the release.

## Observability

- [ ] Error reporting receives events from the release build.
- [ ] Analytics events for anything new in this release fire correctly.
- [ ] Someone is watching after deploy, and knows how to roll back.

## Release

- [ ] Version bumped; build number incremented for native apps.
- [ ] Changelog written for users, not for the team.
- [ ] Tagged, with the artefact built by CI rather than a local machine.

## After

- [ ] The version running in production is the version you shipped.
- [ ] Error rate and key metrics checked, not just alerts.
- [ ] Anything that went wrong is written down while it is fresh.
