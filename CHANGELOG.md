# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and, from 1.0.0
onward, [Semantic Versioning](https://semver.org/) — a breaking change to
the CLI's flags, exit codes, or the generated-project contract needs a major
version bump. Seeded from git history; going forward, add an entry here as
part of the PR that makes the change, not at release time.

## [Unreleased]

### Added

- **`check` reports advisories** — known vendor changes affecting the
  technologies you selected, after the drift summary, worst first. This is
  where "your rules are behind" and "here is the vendor change that is why"
  become one report. New in `--json` as `advisories` and `advisoryNote`;
  `schema` stays `1` because nothing that existed moved, and the GitHub action
  is pinned by a moving `v1` tag that a changed field would break all at once.
  `advisories` is `null` when they were skipped and `[]` when none matched —
  "we did not look" and "we looked and found none" are different answers.
- **`--no-advisories`** skips the lookup, completing the
  `check [--json --fail-on --no-advisories]` surface Appendix A specifies.

### Changed

- **A `critical` advisory now raises the report to `critical`, and can fail a
  build through `--fail-on`.** `critical` has been accepted-but-unreachable
  since 1.3.0, reserved for exactly this. The cost is real — somebody else
  publishing a change can turn your CI red with no commit on your side — and
  it is the right trade: an advisory is a *stronger* signal than a stale file,
  `--fail-on` still defaults to `none` so nothing fails unless asked, and an
  advisory only raises severity if you can actually read it. Nobody's build
  fails over text the same response refuses to show them.
- **`check` still works offline, unaccounted-for and MIT.** The advisory
  lookup is the only network call the command makes, and it degrades to
  nothing on every failure — no network, a timeout, any non-200 — leaving the
  full drift report plus one line saying why advisories are missing.

### Added

- **`login` and `logout`.** The first thing a paying customer used to meet was
  an error message teaching them about `AI_PROJECT_BOOTSTRAP_LICENSE_KEY` — a
  credential, introduced as an environment variable, with no suggestion of
  where to put it that was not a shell profile or a CI secret. `login` prompts
  for the key (or takes `--key`), checks it against the backend before storing
  anything, and writes it **owner-only, outside any project directory**: a
  credential inside a project is one `git add -A` from a public repository. It
  follows the platform — `~/Library/Application Support/` on macOS,
  `$XDG_CONFIG_HOME` on Linux, `%APPDATA%` on Windows.
- **`login --status`** says which key is in use and where it came from, and
  **never prints one in full** — the same masking the dashboard shows. `logout`
  removes the stored key, and says so when `AI_PROJECT_BOOTSTRAP_LICENSE_KEY`
  is still set in the shell, since that keeps winning and `logout` cannot unset
  it for you.

### Changed

- **Every command that needs a license key now looks in two places**, in this
  order: `AI_PROJECT_BOOTSTRAP_LICENSE_KEY`, then the key stored by `login`.
  The environment deliberately wins — a key exported for one run is the more
  deliberate of the two, and putting it first is what keeps existing CI working
  unchanged. Nothing that worked before this release stops working.
- The message you get with no key names a command to run rather than a variable
  to set.

## [1.3.2] — 2026-08-13

### Fixed

- **Continue.dev rules shipped a literal `{{projectName}}`.** `toRuleSource`
  lifts `name`, `description` and `globs` out of a rule's source frontmatter
  verbatim, and only the _body_ was ever rendered — so every generated project
  that selected Continue got
  `description: "Project-wide conventions for {{projectName}}"` in
  `.continue/rules/base.md` and `architecture.md`. Every part of a rule that
  can reach the output is now rendered. A new test generates with all seven AI
  tools enabled and fails on any surviving `{{…}}`; the existing one defaulted
  to Cursor and Claude Code only, which is how this went unnoticed.
- **Claude Code was missing the TypeScript rule entirely.** The base module's
  stack-agnostic topics are authored twice — once as a Cursor `.mdc`, once as a
  Claude `SKILL.md` — and `typescript` only ever had the Cursor half. Every
  other provider re-renders the Cursor copy, so the topic reached five tools
  and silently skipped the one this project tells people to use.
  `tests/moduleContract.test.ts` now fails on an unpaired topic, and
  `CONTRIBUTING.md` documents that they come in pairs.
- **`typescript` was named "Typescript"** wherever a rule name is derived from
  its filename — Continue's `name:` field. Known product casings now win over
  title-casing the slug.
- **Piping CLI output into `head` or `grep -q` crashed** with an unhandled
  `EPIPE` and a full stack trace over what is ordinary shell behaviour. A
  closed pipe now exits 0 quietly. Every other stream error still throws.

## [1.3.1] — 2026-08-13

### Fixed

- **Running the generated project's own `npm run format` silently broke
  `upgrade`.** The generator fingerprints every file it writes and treats a
  mismatch as "the user edited this, never touch it again" — and
  `prettier --write` is an edit. One `npm run format` rewrote 26
  generator-owned files (`.claude/skills/**`, `docs/**`, `CLAUDE.md`,
  `AGENTS.md`, …), after which `upgrade` stopped refreshing them and the rules
  the AI assistant reads went quietly stale. The generated `.prettierignore`
  now covers generator-owned output, and `tests/generatedFormatting.test.ts`
  fails if any of it is ever reformatted again.
- **Every new project's first CI run went red, twice over.** The generated
  workflow used `cache: npm` and `npm ci`, both of which require a lockfile a
  freshly generated project does not have yet — the job failed at
  `setup-node`, before a single script ran. Caching is now enabled only once
  `package-lock.json` exists, and the install step falls back to
  `npm install` for that first run. Separately, `format:check` failed on 27
  generated files, which the `.prettierignore` fix above resolves.

## [1.3.0] — 2026-08-12

### Added

- **`check`** — reports what has drifted, without changing anything. Compares
  a generated project against the templates the installed version would write
  today and sorts every generator-owned file into one of five buckets:
  _behind_ (untouched since generation, but our templates moved on),
  _missing_, _new_, _orphaned_ (still on disk, no longer part of the stack at
  all) and _edited_. Edited files are reported separately and **never counted
  as drift** — `upgrade` will not touch them, so treating them as a finding
  would only teach people to ignore the report. This is `upgrade --dry-run`'s
  own diff behind a read-only command with exit codes, sharing the comparison
  logic so the two cannot disagree. `ai-project.config.json` is excluded
  throughout: it records every other file's fingerprint, so it changes on any
  run that changes anything.
- **`check --json`** — a versioned, machine-readable report (`schema: 1`) for
  CI. Only JSON reaches stdout; errors go to stderr, so
  `check --json > report.json` is safe.
- **`check --fail-on <level>`** — `none` (default), `info`, `warning`,
  `critical`. It reports rather than blocking unless asked. `critical` is
  accepted and currently unreachable; it is reserved for a later feature.
  Exit `2` is distinct from `1`: "this repo has drifted" and "this repo was
  never generated by us" need different responses in CI.
- **`ci init`** — writes two GitHub Actions workflows: one comments drift on
  every pull request as a single comment that updates in place, the other
  opens a pull request when there is something to refresh. Neither blocks a
  build by default. Both are written once and are **not** generated output:
  `upgrade` never touches them, and re-running refuses to overwrite without
  `--force`, because the schedule and blocking behaviour are the user's to
  change.
- **`apb`** — a second, shorter binary running the identical CLI. A command
  worth running weekly is worth being short; `ai-project-bootstrap` stays the
  primary name.

## [1.2.0] — 2026-08-10

### Fixed

- **1.1.0 was published with no compiled code at all.** `dist` is gitignored
  and `files` lists it, but nothing built before `npm publish` — so the
  tarball carried all 413 catalogue files and none of the CLI: `bin` pointed
  at a `dist/index.js` that was absent, `npx ai-project-bootstrap` failed for
  every user, and `ai-project-bootstrap/core` could not resolve. Anyone on
  1.1.0 should upgrade. `prepublishOnly` now builds and then asserts that
  every path named by `bin`, `main` and `exports` exists, because a build can
  fail quietly enough that a green publish still ships nothing.

### Changed

- **`--idea` now calls the hosted backend by default.**
  `AI_PROJECT_BOOTSTRAP_API_URL` defaulted to `http://localhost:8787`, which
  an installed CLI has no way to reach — so `--idea` failed for everyone who
  did not happen to set the variable themselves. The default is now
  `https://api.ai-project-bootstrap.com`; point the variable at localhost to
  develop against a backend running on your own machine.

## [1.1.0] — 2026-08-08

### Added

- **`--idea <text>`** — proposes a technology stack from a free-text project
  idea, via a hosted backend rather than calling an LLM directly from the
  CLI — end users need no API key of their own. The CLI's `src/cli/idea.ts`
  is a thin HTTP client (`AI_PROJECT_BOOTSTRAP_API_URL`, defaults to
  `http://localhost:8787`) that offers the result to the wizard as a one-off
  preset — reviewed and confirmed exactly like `--preset` or `--archetype`,
  never generated unreviewed. Cannot be combined with `--config`, `--preset`
  or `--archetype`.
- **`--idea` is a paid, license-gated Pro feature** — no free tier, no
  trial, since every call spends real hosting/API budget. Requires
  `AI_PROJECT_BOOTSTRAP_LICENSE_KEY`, the key emailed after subscribing; the
  CLI fails fast client-side if it's unset, and the backend rejects an
  invalid or inactive key with `402 LICENSE_REQUIRED`.
- **`ai-project-bootstrap/core`** — a new public export (types, registry
  loading, selection validation/resolution: `loadRegistry`,
  `validateSelection`, `resolveSelection`, `GeneratorError`, and friends).
  This is the same domain logic the CLI runs on, now usable by other
  services — e.g. the Pro backend behind `--idea` depends on it rather than
  reimplementing catalog loading or selection validation.

## [1.0.0] — 2026-08-07

First stable release. Fourteen prompts from `.planning/prompts/`, reviewed
and re-tested together as one batch — including packing and installing the
actual npm tarball into a clean project, not just running from source —
rather than released individually. See each prompt file under
`.planning/prompts/` for the design reasoning behind its piece of this.

### Added

- **`--archetype <id>`** — full app starter templates: a curated stack
  selection plus real starter source (screens, hooks, a data model), not
  just dependencies. Ships one: `habit-tracker` (Expo + Supabase + Supabase
  Auth + Dark Theme) — a real Postgres schema with Row Level Security,
  email magic-link sign-in, and a working habit list with streak tracking.
  `archetypes/<id>/` follows the same "manifest + content, no code changes"
  contract as `technologies/<id>/` — see `CONTRIBUTING.md`.
- **Cost estimation** — `Manifest.pricing` (optional; `free`/`flat`/
  `freemium`/`usage-based`) on 16 technologies with genuinely known,
  vendor-verified pricing. `docs/costs.md` plus a one-line `Est. cost`
  summary at the end of every generation and `add`.
- **Three cross-cutting feature modules** (`dark-theme`, `onboarding`,
  `localization`) under a new `features` category — technologies that
  aren't a single-vendor integration and can be combined freely.
- **`analyze`** — the same kind of scored, prioritized feedback as `review`,
  but for any repository, including ones this tool never generated. Infers
  the stack from `package.json` dependencies and config-file signals, with
  confidence levels on every guess.
- **`docs/roadmap.md`** — a suggested week-by-week build order for the
  resolved stack, referencing `implement` where a feature covers it.
- **Richer `docs/architecture.md`** — the component diagram now draws
  `requires` edges and a frontend → backend → database backbone; database
  modules ship a starter ERD.
- **`review`** — a static, AI-oriented review of an already-generated
  project (architecture, security, performance, dx), distinct from a
  linter or an LLM call.
- **`implement <feature-id>`** — a stack-tailored implementation plan, AI
  prompts, a validation checklist and real scaffold files for a specific
  feature (`authentication`, `payments`, `push-notifications`), genuinely
  different per resolved provider.
- **`add <id> --replace`** — swaps a single-select category's existing
  answer instead of requiring it empty, refusing outright if any of the
  outgoing technology's files were hand-edited since generation.
- **`upgrade`** — refreshes an already-generated project's rules, prompts
  and docs against the same selection, without a full regeneration.
- **`doctor`** — checks whether the local machine can build the stack you
  have in mind (Node/Git/npm always; mobile/backend tooling on request)
  before generation, separate from the `npm run doctor` a generated
  project ships with.
- **`--preset <id>`** — curated stack bundles (`startup-mvp`, `web-saas`,
  `enterprise`) that pre-fill the wizard.
- **Six more AI coding tools** — GitHub Copilot, Gemini CLI, Continue.dev,
  Cline, Roo Code and OpenAI Codex now get generated rules alongside Cursor
  and Claude Code, from the same per-module source content.

### Fixed

- `add <id> --replace` no longer leaves an empty directory behind for the
  technology it removed (e.g. `.claude/skills/<old-id>/`).
- `@types/node` is now installed in every generated project — every
  module's own setup docs use `process.env`, but nothing ever installed
  its types, so a project with real application code (an archetype, or
  `implement` scaffold) failed `tsc --noEmit`.
- `dark-theme`'s system-theme detection now handles React Native's
  `"unspecified"` `ColorSchemeName` value instead of only `light`/`dark`.
- `checkLintSuppressions` (shared by `review` and `analyze`) no longer
  flags the literal text "eslint-disable" appearing in a string or comment
  as if it were a real suppression directive.
- The technology table in this README stopped drifting from
  `technologies/*/manifest.json` — it's generated by
  `scripts/generate-tech-table.mjs` and checked in CI.

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

[1.3.2]: https://github.com/igorishchenko/ai-project-bootstrap/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/igorishchenko/ai-project-bootstrap/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/igorishchenko/ai-project-bootstrap/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/igorishchenko/ai-project-bootstrap/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/igorishchenko/ai-project-bootstrap/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/igorishchenko/ai-project-bootstrap/compare/v0.5.0...v1.0.0
[0.5.0]: https://github.com/igorishchenko/ai-project-bootstrap/compare/v0.4.1...v0.5.0
[0.4.1]: https://github.com/igorishchenko/ai-project-bootstrap/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/igorishchenko/ai-project-bootstrap/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/igorishchenko/ai-project-bootstrap/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/igorishchenko/ai-project-bootstrap/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/igorishchenko/ai-project-bootstrap/releases/tag/v0.1.1
