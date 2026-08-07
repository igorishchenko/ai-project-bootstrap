# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this package is
pre-1.0 and "Work in progress — expect breaking changes" per its npm
description, so a `feat:` entry may include a breaking change without a major
version bump. Seeded from git history; going forward, add an entry here as
part of the PR that makes the change, not at release time.

## [0.5.0] — 2026-08-06

### Added

- `add <technology-id>` command to retrofit one more technology into a
  project this tool already generated, without regenerating from scratch —
  reuses fingerprint-based preservation so hand-edited files are left alone.

### Changed

- npm package description now flags the project as work in progress.

## [0.4.1] — 2026-08-06

### Fixed

- Claude Code output now emits real skills (`.claude/skills/<id>/SKILL.md`
  with synthesized frontmatter) instead of flat files Claude Code never
  discovered.

## [0.4.0] — 2026-08-05

### Added

- The project name argument now accepts a path (e.g. `./apps/my-app`),
  doubling as both the project's name and its location.

## [0.3.0] — 2026-08-05

### Added

- FastAPI and NestJS server backends.
- Stripe and the Firebase family (Firebase, Firestore).
- Auth0.

### Fixed

- Stopped documenting `npm test` in generated setup docs when no test runner
  was selected.

## [0.2.0] — 2026-08-05

### Added

- Web platforms and a hybrid mobile+web target, so a project can carry both a
  mobile app and a web app sharing one repository.

### Chore

- Added a `LICENSE` and CI for the generator's own repository.

## [0.1.1] — 2026-08-05

### Added

- The nine previously-empty wizard categories (analytics, crash reporting,
  notifications, storage, email, monitoring, CI/CD, testing, deployment).
- One-command setup (`scripts/setup.mjs`) and an environment `doctor` check
  (`scripts/doctor.mjs`) in generated projects.
- Fingerprint-based protection for hand-edited files on regeneration, and a
  "None" option offered consistently across optional categories.

### Fixed

- The wizard no longer offers options it would later reject during
  resolution.
- Dependency pins brought current; generated scripts made to actually work.
- `git init` now runs before `install` in the generated setup guide.

### Chore

- Renamed the package to `ai-project-bootstrap` and fixed the `bin` path.
- Added repository metadata for npm and GitHub.

[0.5.0]: https://github.com/igorishchenko/ai-project-bootstrap/compare/v0.4.1...v0.5.0
[0.4.1]: https://github.com/igorishchenko/ai-project-bootstrap/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/igorishchenko/ai-project-bootstrap/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/igorishchenko/ai-project-bootstrap/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/igorishchenko/ai-project-bootstrap/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/igorishchenko/ai-project-bootstrap/releases/tag/v0.1.1
