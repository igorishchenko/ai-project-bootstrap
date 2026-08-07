# Prompt 05 — Replace/Remove a Single-Select Technology

**Phase:** 2 — CLI Operational Commands ([roadmap](../roadmap/03-phase-cli-operations.md))

## Goal

Extend `ai-project-bootstrap add` to support swapping an already-answered single-select category (e.g. "I picked Firebase for backend, I meant Supabase") via an explicit flag, including cleaning up the previous module's orphaned output files.

## Why

`src/cli/add.ts`'s `mergeChoice` currently refuses this case outright with `CATEGORY_ALREADY_ANSWERED`: multi-select categories (analytics, testing, crash-reporting) can grow via `add`, but single-select categories (payments, database, backend, auth, etc.) can only be filled when empty. This is a *documented* limitation, not a bug — the reason is that regeneration is deliberately non-destructive (nothing deletes files today), so blindly swapping the selection would leave the old module's generated files behind as orphans. It's a real, named gap in ChatGPT's feature list ("feature marketplace" implies add/remove symmetry) and worth closing deliberately rather than leaving as a permanent constraint.

## Current state

- `src/cli/add.ts`: `mergeChoice()` implements the current refusal logic; flag parsing here is small and dedicated (separate from `src/cli/flags.ts`).
- `runAdd()` in `src/cli/index.ts` (lines ~83-168): loads `ai-project.config.json`, calls `mergeChoice`, re-runs `generate()` → `vfs.flush()` with `force: true`.
- Non-destructive regeneration guarantee: `src/core/vfs/preserve.ts`/`fingerprint.ts` — this is exactly what makes "delete the old module's files" risky to build carelessly: if a human hand-edited one of the old module's generated files, deleting it on `--replace` would destroy real work with no warning today handled for hand-edited *preserved* files, only for hand-edited files being *overwritten*.
- `tests/add.test.ts` (13 tests) — the existing test suite to extend, not replace.
- Module output surface per technology: folders (`folders.json`), package deps (`package.fragment.json`/`dependencies.json`), env vars (`env.md`), docs/checklists/prompts contributed by the module — a full "remove module X" needs to reason about all of these categories of output, not just one.

## Requirements

1. `ai-project-bootstrap add <new-technology-id> --replace <old-technology-id>` (or `ai-project-bootstrap add <new-technology-id> --replace` if the old id can be inferred from the category, since single-select means at most one existing answer per category — pick whichever is less error-prone and document the choice).
2. Before touching anything, detect which files were generated *specifically* by the old module (not shared/merged output like `package.json` or `.env.example`, which need surgical un-merging rather than deletion) vs. files it contributed to via merge (deps, env vars, folder entries).
3. For files exclusively owned by the old module (e.g. `technologies/firebase/architecture.md` → wherever that rendered to, `.cursor/rules/firebase.mdc`, `.claude/skills/firebase/`): check fingerprint state first. If untouched since generation, safe to delete. If hand-edited, **do not silently delete** — warn clearly and require an explicit `--force-delete-edited` or similar, or just refuse and tell the user to remove it manually (the safer default, given this whole engine's design philosophy is "never destroy unreviewed human work").
4. For merged output (package.json deps, `.env.example` vars, `folders.json` entries): un-merge cleanly — remove only what the old module contributed and nothing the new module or other still-selected modules also need (watch for shared deps between old and new module that shouldn't be removed).
5. Update `ai-project.config.json`'s `Selection.choices` to reflect the new answer only after file cleanup succeeds (don't leave the config and the filesystem out of sync if cleanup partially fails — consider what "partial failure" recovery looks like, even if it's just "report clearly and leave old state intact, don't half-apply").
6. `--dry-run` must show exactly what would be deleted/modified/added, mirroring the existing `--dry-run` semantics elsewhere in the CLI.

## Acceptance criteria

- New tests extending `tests/add.test.ts`: successful replace with no hand-edits, replace refused/warned when old module's files were hand-edited, merged-output (deps/env) correctly un-merged without touching other modules' contributions, dry-run makes no changes, config file only updated on full success.
- Manual verification: generate a project with Firebase, hand-edit nothing, `add supabase --replace firebase`, confirm Firebase's exclusive files are gone and Supabase's are present, `.env.example`/`package.json` reflect only Supabase's contributions.
- Manual verification of the safety path: repeat with a hand-edited Firebase file present, confirm it's *not* silently deleted.
- `npx vitest run` passes in full.
- README's "Adding a technology" / `add` command section documents `--replace`.

## Out of scope

- Removing a technology without replacing it with anything (`remove <technology-id>` with no replacement) — could be a natural follow-up but isn't in ChatGPT's list or this roadmap; don't build it speculatively here unless it falls out of the design for free.
- Multi-select category removal (removing one of several selected analytics tools, say) — this prompt is scoped to the single-select swap case that's explicitly broken today.
