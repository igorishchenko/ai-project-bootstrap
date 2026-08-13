# ai-project-bootstrap — the CLI

Public, MIT, published to npm as `ai-project-bootstrap`. The directory on disk
is `ai-project-generator`; the package, the repo and the tags all say
`ai-project-bootstrap`. Three sibling repos consume what this one publishes —
see **Downstream** below.

The long-form context lives in files. Read them when the work touches them
rather than restating them here:

- @ARCHITECTURE.md — the registry, the builders, the virtual filesystem
- @CONTRIBUTING.md — adding a technology, feature or archetype; module contracts

## The invariant

**No file under `src/` names a specific technology.** Builders iterate the
resolved modules and read well-known filenames; they never branch on a module
id. If a change looks like it needs `if (id === 'stripe')`, the answer is a new
well-known file in the module, not a special case in the builder. That
constraint is the whole reason adding a technology is a content-only change.

## Before opening a PR

```bash
pnpm lint && pnpm typecheck && pnpm test
```

`pnpm test` asserts against a virtual filesystem, so it cannot see a generated
project that fails to install. When a change can reach generated output —
`technologies/`, `assets/`, `features/`, `archetypes/`, dependencies, scripts,
any builder — generate a real project and run its own checks too. `/verify`
does both halves. Every bug class this repo has shipped twice was invisible to
`pnpm test` alone.

## Branches, commits, changelog

- Branch off `main`: `feat/…`, `fix/…`, `chore/…`, `docs/…`. One change per PR.
- Conventional Commits. The subject says what changed for someone using the
  CLI, not which file moved.
- Every PR that changes behaviour adds its own entry under `## [Unreleased]`
  in @CHANGELOG.md — **at PR time, not at release time**. `/changelog-entry`
  writes one in the house style.
- **A feature PR never touches `version` in package.json.** Version bumps
  belong to a release commit and nowhere else.

## Releases

Features merge to `main`. A release is a short-lived `release/X.Y.Z` branch cut
from `main` carrying exactly one `chore: release vX.Y.Z` commit (CHANGELOG plus
the version bump), merged back, then tagged on `main` once CI is green. Pushing
the tag runs `.github/workflows/release.yml`, which publishes to npm and cuts
the GitHub Release from the changelog section. Full procedure: `/release`.

From 1.0.0 this package is real semver. A breaking change to the CLI's flags,
its exit codes, or the generated-project contract is a **major** — not a
`feat:`, however small the diff.

## Downstream — the tag is not the end of a release

Publishing changes three other repos, and none of them find out on their own:

- **`ai-project-bootstrap-site`** builds `data/catalogue.json` from the
  installed tarball and reads its advertised version from the same install.
  Until its `ai-project-bootstrap` devDependency is bumped, the site describes
  the previous release. That lag is deliberate — the site documents what is
  published, not what is on `main` here — but it still has to be closed.
- **`ai-project-bootstrap-cloud`** imports `/core` from the published package.
  It also carries a `file:../ai-project-generator` link during local
  development; a deploy with that link in `package.json` cannot build.
- **`ai-project-bootstrap-action`** wraps `check`. A release that changes
  `check`'s JSON, its exit codes or its `--fail-on` behaviour needs the action
  re-tested and its moving `v1` tag repointed.

Say which of these a release affects in the release PR, so the follow-up is
not left to memory.

## Don't

- Don't hand-edit the technology table in README.md — run `pnpm docs:tech-table`.
- Don't run a generated project's own `npm run format` over generator-owned
  files. The generator fingerprints what it writes and treats a rewrite as a
  hand edit, which silently stops `upgrade` from ever refreshing those files.
- Don't add a secret, an API key, or a paid-service call to this package. It is
  public, MIT and must work offline; anything hosted belongs in
  `ai-project-bootstrap-cloud`.
- Don't add a dependency without a reason worth stating in the PR. This ships
  as a CLI people run with `npx`.
