# Prompt 03 — `ai-project-bootstrap doctor` (CLI-Level Preflight Check)

**Phase:** 2 — CLI Operational Commands ([roadmap](../roadmap/03-phase-cli-operations.md))

## Goal

Add a new top-level CLI command, `ai-project-bootstrap doctor`, that checks the local development environment *before* generation — is Node/Bun installed at a compatible version, is Docker available, is Git installed, and (conditionally, based on what the user is about to select or has already selected) is Xcode/Android SDK/Watchman/Java present for mobile stacks.

## Why

A generated *project* already gets its own `scripts/doctor.mjs` (shipped from `assets/base/`, checks the environment needed to *run* that specific generated project). But there's no equivalent at the CLI-tool level — nothing checks, before or during the wizard, whether the environment can support the stack the user is about to choose. This is ChatGPT's "Environment validator" item, applied to the generation step itself rather than only to the post-generation project. It's also useful as a fast, standalone command independent of generation ("can my machine build a mobile app at all").

## Current state

- Existing generated-project doctor for reference/reuse of check logic: `assets/base/.../scripts/doctor.mjs` (read this first — don't reinvent environment-check logic that already exists, extract/share it if reasonable).
- CLI command dispatch: `src/cli/index.ts` (`main()`) currently branches on: no subcommand → wizard, `add` → `runAdd()`. A new `doctor` subcommand needs its own branch here, following the same flag-parsing pattern as `src/cli/add.ts` (small dedicated parser) rather than overloading `src/cli/flags.ts`.
- Category/module data needed for conditional checks (e.g. only check Xcode if a mobile module might be selected): `config/categories.json`, `technologies/*/manifest.json`.
- Output/reporting conventions: check `src/cli/reporter.ts` (or equivalent — the wizard already prints `✔`/`✖`-style status via `@clack/prompts` and `picocolors`) and match that visual style rather than introducing a new one.

## Requirements

1. `ai-project-bootstrap doctor` with no args: checks universal requirements (Node version against `package.json`'s `engines` if declared, Git, package manager availability) plus best-effort checks for common per-category tools (Docker for backend/database work, Xcode + Android SDK + Watchman + Java for mobile) — probably gated behind flags or an interactive follow-up ("Also check mobile tooling?") rather than always running every possible check unconditionally, since not every user needs mobile tooling.
2. `ai-project-bootstrap doctor --for <preset-or-selection>` or similar (optional stretch): scope checks to exactly what a specific stack selection needs, reusing whatever module-metadata mechanism makes sense (may require extending manifest schema with a `requiresTooling` field — if so, keep it optional/backward-compatible, existing manifests shouldn't need updates to remain valid).
3. Exit code semantics matter: `doctor` should exit non-zero if hard-required tooling (Node, Git) is missing, but a non-zero exit for soft/optional tooling (Xcode when the user hasn't indicated they want mobile) would be wrong — think through what's a hard failure vs. an informational warning.
4. Reuse check logic between the CLI-level `doctor` and the generated-project `doctor.mjs` where genuinely shared (e.g. "is Docker installed" is identical in both contexts) rather than forking two divergent implementations — but don't force an awkward shared abstraction if the two contexts' needs diverge enough that it's not worth it.

## Acceptance criteria

- New tests covering: the check functions themselves (mockable/testable independent of actually having Xcode installed — inject a command-existence check so tests don't depend on the CI machine's actual toolchain), and the CLI dispatch (unknown flags, `--help` output).
- Manual verification: run `ai-project-bootstrap doctor` on the actual dev machine, confirm accurate pass/fail per installed tool.
- `npx vitest run` passes in full.
- README documents the new `doctor` command.
- `-h`/`--help` at the top level (`src/cli/index.ts`) lists `doctor` alongside `add`.

## Out of scope

- `bootstrap analyze` (repo-content analysis, not environment checks) — that's `10-project-analyzer.md`, a different command entirely despite the similar-sounding name.
- Auto-installing missing tooling — `doctor` reports, it doesn't install (installing Xcode/Android SDK automatically is out of scope for a CLI tool and risky to attempt).
