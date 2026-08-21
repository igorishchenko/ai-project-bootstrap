# Prepare a release

> Replace the bracketed parts, delete what does not apply, then send.

Prepare release **[version]** of {{projectName}}.

## Steps

1. Confirm the main branch is green — lint, typecheck, tests.
2. List every change since the last tag, grouped as features, fixes, and
   anything requiring action from users.
3. Propose the version number and justify it: does anything here break an
   existing integration or user expectation?
4. Draft the changelog, written for someone who does not work on this codebase.
5. Work through `checklists/release.md` and report anything unmet.
{{#if has.mobile}}6. [Bump the build number — stores reject duplicates]
{{/if}}

## Read first

`docs/release.md` for the process, `docs/deployment.md` for how environments
and rollback work.

## Report back

- The proposed version and why.
- The changelog draft.
- Anything on the checklist that is not satisfied.
- Anything in this release that is risky to roll back — particularly database
  migrations, which usually cannot be reverted with the code.

Do not tag or publish anything. Prepare it and stop.
