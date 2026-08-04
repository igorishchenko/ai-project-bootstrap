# Deployment

How {{projectName}} goes from a commit to something users can reach.

## Environments

| Environment | Purpose | Data |
| --- | --- | --- |
| Local | Day-to-day development | Disposable, seeded |
| Staging | Verification before release | Production-like, never real user data |
| Production | Live users | Real. Treat every change to it as irreversible |

Each environment gets its own credentials and its own third-party project. A
staging build must never be able to write to production — the separation is the
safety mechanism, so do not share keys across environments "just for now".

## Configuration

Every environment variable is documented in `.env.example`, with per-technology
detail in [setup.md](setup.md).

- Local values live in `.env`, which is git-ignored and stays that way.
- CI and hosting values live in that platform's secret store.
- Adding a variable means updating `.env.example`, the CI secrets, and the
  hosting config — in that order, before the code that reads it ships.

## Release flow

1. Merge to the main branch once CI is green.
2. Deploy to staging automatically.
3. Verify against `checklists/` — at minimum the release checklist.
4. Promote to production deliberately, not automatically.
5. Watch error reporting and analytics for the first few minutes.

## Rolling back

Know how to roll back before you need to. Whatever the mechanism — redeploying
the previous build, reverting the commit, disabling a flag — the rollback path
should be quicker than a fix-forward, and someone other than the author should
be able to run it.

Note that database migrations usually cannot be rolled back with the code. Ship
migrations that work with both the old and the new version, and remove the old
path in a later release.

## After deploying

- Confirm the version actually running is the one you shipped.
- Check error reporting for new issues, not just for volume.
- Confirm the key user flow still works, with a real account.
