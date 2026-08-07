# Prompt 00 — Fix Stale Tech Table & Add Meta Docs

**Phase:** 0 — Repo Hygiene ([roadmap](../roadmap/01-phase-hygiene.md))

## Goal

Fix `README.md`'s stale "Available technologies" table and add three missing meta docs for the tool's own repo: `CONTRIBUTING.md`, `ARCHITECTURE.md`, `CHANGELOG.md`. These are docs *about the tool*, distinct from the `docs/*.md` templates the tool generates *for consumer projects* (`assets/base/templates/docs/`).

## Why

`README.md`'s technology table (lines ~36-52) is missing at least FastAPI, NestJS, Firebase, Firestore, Auth0, Crashlytics, and Detox — all real modules that exist under `technologies/`. It will keep drifting every time a module is added or removed unless it's generated rather than hand-maintained. Separately, there is no `CONTRIBUTING.md`, `ARCHITECTURE.md`, or `CHANGELOG.md` anywhere in the repo (confirmed: none exist), so the only record of what changed between releases is `git log`'s `chore: release vX.Y.Z` commits, and the only record of the architecture (builder pipeline, VFS, the "no technology names in `src/`" invariant) is scattered code comments.

## Current state

- Module catalogue: one directory per module under `technologies/`, each with a `manifest.json` (id, name, category, description, etc. — schema lives under `src/core/registry/`).
- Category mapping: `config/categories.json` (16 categories, e.g. `mobile`, `backend`, `auth`, `payments`).
- The stale table lives in `README.md` at the repo root.
- Builder pipeline (order matters): `src/builders/index.ts` — `folderBuilder → packageBuilder → envBuilder → docsBuilder → architectureBuilder → cursorBuilder → claudeBuilder → promptBuilder → checklistBuilder → githubBuilder → hygieneBuilder → templateBuilder → readmeBuilder → configBuilder → gitkeepBuilder`.
- Fingerprint-based preservation: `src/core/vfs/preserve.ts`, `fingerprint.ts`.
- Release history pattern: `git log --grep "chore: release"` gives every past version bump, useful as raw material for a first `CHANGELOG.md` entry set.

## Requirements

1. **Fix the table**: regenerate it accurately from the current `technologies/*/manifest.json` + `config/categories.json` contents (by hand is fine for this one-time fix, but note requirement 2).
2. **Prevent re-drift**: add a small script (e.g. `scripts/generate-tech-table.mjs` or similar, run via `npm run docs:tech-table` or as part of an existing script) that regenerates the table from the manifests, and either (a) wire it into CI to fail if the checked-in table is out of date, or (b) wire it into the existing release process. Pick whichever is less invasive given the existing `.github/workflows/ci.yml`.
3. **`CONTRIBUTING.md`**: how to add a new technology module (this content already exists in `README.md`'s "Adding a technology" section — extract/expand it), how to run tests (`npx vitest run`), the module-authoring file contract (`manifest.json`, optional `setup.md`/`ios.md`/`android.md`/`architecture.md`/`cursor-rule.mdc`/`claude-skill.md`/`env.md`/`folders.json`/`package.fragment.json`/`dependencies.json`/`prompts/`/`checklists/`/`templates/**`), and the hard invariant that `src/` must never name a specific technology (stated in `src/core/types.ts`).
4. **`ARCHITECTURE.md`**: describe the pipeline (`Wizard → Selection → validateSelection → resolveSelection → createBuildContext → runPipeline(builders) → VirtualFs → disk flush`), the builder list and what each does, the fingerprint-preservation mechanism, and the template engine's syntax (`{{var}}`, `{{#if}}`, `{{#unless}}`, `{{#each}}`).
5. **`CHANGELOG.md`**: seed it from git history (`chore: release vX.Y.Z` commits and their associated PRs), following [Keep a Changelog](https://keepachangelog.com/) format going forward.
6. Update `README.md` to link to the new `CONTRIBUTING.md`/`ARCHITECTURE.md`/`CHANGELOG.md` where appropriate, and trim any content now duplicated in `ARCHITECTURE.md`/`CONTRIBUTING.md` if it makes the README clearer (don't delete unique content, just avoid triplication).

## Acceptance criteria

- The technology table in `README.md` lists every directory under `technologies/` with correct category/name, verified by a script or manual cross-check (`ls technologies/` vs. the table).
- Whatever regeneration mechanism you add has a test or CI check proving it stays in sync (a Vitest test that reads `technologies/` and asserts the README table contains every id is sufficient — don't over-engineer this into a full docs-generation system).
- `npx vitest run` still passes (273+ tests).
- `CONTRIBUTING.md`, `ARCHITECTURE.md`, `CHANGELOG.md` exist at the repo root and are cross-linked from `README.md`.

## Out of scope

- Auto-generating any of the *other* generated-project docs (`docs/architecture.md` templates etc.) — this prompt is about the tool's own repo docs only.
- Any CI changes beyond what's needed to keep the tech table in sync (no new release automation).
