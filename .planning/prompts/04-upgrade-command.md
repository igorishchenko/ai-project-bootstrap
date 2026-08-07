# Prompt 04 — `ai-project-bootstrap upgrade`

**Phase:** 2 — CLI Operational Commands ([roadmap](../roadmap/03-phase-cli-operations.md))

## Goal

Add `ai-project-bootstrap upgrade [--dir <path>] [--dry-run]`: bring an already-generated project's rules/prompts/docs/templates/hygiene config up to date with whatever version of `ai-project-bootstrap` is currently installed, without re-running the full wizard and without needing `--force` semantics.

## Why

Regeneration exists today (replay `ai-project.config.json` via `--config`), and `add` retrofits *new* technologies into a project — but there's no command that means "the package has been updated since I generated this project (new base rules, new prompt templates, fixed builder bugs, new provider support from `01-multi-provider-ai-rules.md`) — bring my project's generated files up to date, using the *same* module selection I already made." This is ChatGPT's "Upgrade command" item.

## Current state

- Saved selection: `ai-project.config.json` (written by `configBuilder`, one of the 14 builders in `src/builders/index.ts`) — this is exactly the input `upgrade` needs, and it's the same input `--config` replay already consumes.
- Fingerprint-based preservation: `src/core/vfs/preserve.ts` + `fingerprint.ts` — a file a human has hand-edited since generation is detected and skipped on regeneration. This is the mechanism that makes `upgrade` safe to run against a real, lived-in project; study it closely before designing `upgrade`'s diffing/reporting behavior.
- The `add` command (`src/cli/add.ts` + `runAdd()` in `src/cli/index.ts`) is the closest existing precedent: it loads `ai-project.config.json`, mutates `Selection.choices`, and re-runs the exact same `generate()` → `vfs.flush()` path with `force: true`. `upgrade` should follow the same overall shape but *without* mutating `Selection.choices` — it's a "regenerate with today's templates against yesterday's selection" operation, not a selection-changing one.
- Package version: `upgrade` should probably record/compare the package version that last generated the project (may need to add a `generatorVersion` field to `ai-project.config.json` if one doesn't exist — check `configBuilder`'s output shape first) so it can report "upgrading from vX to vY" and potentially skip entirely if already current.

## Requirements

1. `ai-project-bootstrap upgrade [--dir <path>]`: load `ai-project.config.json` from the target dir, re-run generation against the *current* installed package version's templates/builders using the *existing* selection, respecting fingerprint-based preservation exactly as `add` does today.
2. Report what changed: a summary of files added/updated/skipped-due-to-hand-edit (leverage existing VFS/preservation reporting if `add`/regeneration already produces this; if not, add it — and consider back-porting the reporting to `add` too for consistency, but only if low-risk).
3. `--dry-run`: show what *would* change without writing (mirrors the existing `--dry-run` flag semantics in both the default command and `add`).
4. If `ai-project.config.json` doesn't have a recorded generator version (pre-this-feature projects), handle gracefully — proceed with upgrade rather than erroring, and start recording the version going forward.
5. Consider (don't necessarily build yet, but design so it's not precluded) whether `upgrade` should also pick up newly-available provider builders from `01-multi-provider-ai-rules.md` for providers the user didn't originally select — likely not automatically (respect the original selection), but flag their availability in the summary output ("3 new AI providers are now supported — run with `--add-providers` to include them" or similar, if that's a clean fit; don't over-build this if it complicates scope).

## Acceptance criteria

- New tests (pattern after `tests/add.test.ts`, which already covers hand-edit survival, refusal cases, dry-run no-op) covering: upgrade preserves hand-edited files, upgrade updates stale generated files, upgrade on an up-to-date project reports "nothing to do", dry-run makes no filesystem changes.
- Manual verification: generate a project, hand-edit a generated file, bump/simulate a template change, run `upgrade`, confirm the hand-edit survived and the template change applied elsewhere.
- `npx vitest run` passes in full.
- README documents the new `upgrade` command including its relationship to `add` (retrofit new tech) vs. `upgrade` (refresh existing selection's output).

## Out of scope

- Changing the user's module selection (that's what `add` and `05-replace-technology.md` are for) — `upgrade` only refreshes output for the *existing* selection.
- Auto-upgrading dependency versions in the generated project's `package.json` beyond what the module templates already specify — this is about generator *output* freshness, not a general `npm-check-updates`-style dependency bumper.
