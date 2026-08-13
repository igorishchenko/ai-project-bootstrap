---
description: Cut, tag and publish a release of the CLI
argument-hint: "[patch|minor|major|X.Y.Z]"
---

Release `ai-project-bootstrap`. Requested: $ARGUMENTS

If that is empty, read `## [Unreleased]` in CHANGELOG.md and decide the bump
yourself — then **say which you picked and why before touching anything**. From
1.0.0 this is real semver: a breaking change to the CLI's flags, its exit codes,
or the generated-project contract is a major, no matter how small the diff.

Stop and ask rather than guessing if the Unreleased section is empty, if it
describes something you cannot find in the log, or if the bump is ambiguous.

## 1. Preflight

```bash
git switch main && git pull
git status --short          # must be clean
gh run list --branch main --limit 1   # latest CI on main must be green
```

Confirm the version you are about to publish is not already on npm
(`npm view ai-project-bootstrap versions --json`), and run `/verify` if main
has moved since the last full run.

## 2. Cut the release branch

```bash
git switch -c release/X.Y.Z
```

Short-lived, cut from `main`, one commit. It is not an integration branch —
features never merge into it.

## 3. The one commit

Two files, nothing else:

- **CHANGELOG.md** — rename `## [Unreleased]` to `## [X.Y.Z] — YYYY-MM-DD`
  (em dash, today's date), and leave a fresh empty `## [Unreleased]` above it.
- **package.json** — `version` to `X.Y.Z`.

```bash
git commit -m "chore: release vX.Y.Z"
```

The commit body is release notes for a person, not a file list: what someone on
the previous version gets, and — if they are left in a bad state by the bug
being fixed — what repairs it. Match the voice of the previous release commits
(`git log --grep='chore: release'`).

## 4. Merge it

```bash
git push -u origin release/X.Y.Z
gh pr create --fill
```

Wait for CI. Merge. Never tag the release branch — the tag belongs on `main`.

## 5. Tag

```bash
git switch main && git pull
gh run list --branch main --limit 1   # green, on the merge commit
git tag vX.Y.Z && git push origin vX.Y.Z
```

The tag triggers `.github/workflows/release.yml`, which re-runs the checks,
refuses to publish if the tag disagrees with `package.json`, publishes to npm
with provenance, and cuts the GitHub Release from the changelog section. Watch
it: `gh run watch`.

If that workflow is not yet wired up (no `NPM_TOKEN` secret), publish by hand —
`npm publish --access public`, whose `prepublishOnly` runs `pnpm build && pnpm
check:publishable` — then `gh release create vX.Y.Z --notes-file` with the
changelog section. Say which path you took.

## 6. Verify what shipped

```bash
npm view ai-project-bootstrap version
cd /tmp && npx -y ai-project-bootstrap@X.Y.Z --version
```

A published tarball that is missing `config/`, `technologies/`, `archetypes/`
or `features/` installs fine and fails at runtime — `check:publishable` exists
for exactly that, so read its output rather than assuming.

## 7. Downstream — the release is not done at the tag

Report which of these this release touches, and offer to do them:

- **site** — bump the `ai-project-bootstrap` devDependency, so the catalogue
  and the advertised version stop describing the previous release.
- **cloud** — bump the dependency if it uses anything new from `/core`, and
  confirm `package.json` has no `file:../ai-project-generator` link.
- **action** — if `check`'s JSON, exit codes or `--fail-on` behaviour changed,
  re-test it and repoint the moving `v1` tag.

Finish with a two-line summary: the version, and what is still outstanding.
