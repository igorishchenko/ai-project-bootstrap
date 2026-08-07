# Prompt 02 — Stack Presets

**Phase:** 1 — AI Provider Breadth & Presets ([roadmap](../roadmap/02-phase-ai-providers-presets.md))

## Goal

Add curated, one-click stack bundles (e.g. "Startup MVP" = Expo + NativeWind* + RevenueCat + Sentry + Posthog + Supabase, "Enterprise" = Next.js + NestJS + Postgres + GitHub Actions) selectable at the start of the wizard or via a `--preset <name>` flag, pre-filling category answers that the user can still review/override before generation.

*Note: verify whether NativeWind exists as a module under `technologies/` — if not, either scope the preset to what actually exists or treat adding NativeWind as a prerequisite content task, don't silently reference a nonexistent module id.

## Why

Every project today is built by answering all ~16 category questions from `config/categories.json` one at a time — there's no fast path for the common case, and new users unfamiliar with the 31-module catalogue have no guidance on what goes well together. ChatGPT's example frames this as "one click" — the highest-leverage version is a small, curated set of presets, not an attempt to cover every possible stack combination.

## Current state

- Wizard question schema: `config/categories.json` (order, `showWhen`, gating choices, requires/conflicts).
- Wizard implementation: `src/cli/wizard.ts` — `isCompatible()` handles requires/conflicts resolution; the first question ("What are you building?" mobile/web/hybrid) is a fixed gating question not backed by a module.
- Selection type: `Selection.choices` (a plain object of category → module id(s)), the same shape `add.ts`'s `mergeChoice` manipulates and that `ai-project.config.json` persists.
- Non-interactive path: `--config <file>` replays a saved `Selection`; `--yes` accepts defaults for every question. A preset should slot in as a *third* way to pre-fill `Selection.choices`, ideally reusing the same validation (`validateSelection`) and resolution (`resolveSelection`) pipeline so presets can't produce an invalid/conflicting selection.
- Resolution/validation: `src/core/resolve/` — cycle detection, requires/conflicts checks, already handles arbitrary selections; presets should be validated through this exact path, not bypass it.

## Requirements

1. Define `config/presets.json` (or similar): a small number (start with 2-4, not dozens) of named presets, each mapping to a partial or full `Selection.choices` object using real, currently-existing module ids only (cross-check every id against `technologies/` — a preset referencing a nonexistent module id must fail validation loudly, ideally caught by a test, not silently produce a broken project).
2. Wizard integration: an initial "Start from a preset?" step (preset name, or "Custom" to go through the full question flow as today). Choosing a preset pre-fills `Selection.choices` for every category the preset covers; the user still walks through *remaining* unanswered categories (e.g. a preset might not opinionated about the `crash-reporting` sub-choice) and can review/change any pre-filled answer before confirming — don't make presets a silent, unreviewable shortcut.
3. Non-interactive flag: `--preset <name>` combinable with `--yes` for fully non-interactive generation from a preset, and combinable with `--config` should be explicitly rejected (mutually exclusive — both are ways of pre-filling `Selection.choices`, don't define ambiguous merge semantics between them).
4. Run every preset's resulting selection through the existing `validateSelection`/`resolveSelection` pipeline — a preset that fails validation is a bug in the preset definition, not a runtime user error to silently swallow.
5. Pick 2-4 real presets to start (e.g. "Startup MVP" and "Enterprise" from ChatGPT's own examples, adjusted to modules that actually exist), not an exhaustive library — this can grow later via `11-feature-marketplace-modules.md`/`13-saas-starter-templates.md`.

## Acceptance criteria

- New tests (pattern after `tests/wizard.test.ts` and `tests/resolveSelection.test.ts`) covering: preset selection produces a valid `Selection`, preset + review-and-override works, `--preset` + `--config` together errors clearly, an intentionally-broken preset (bad module id) fails a test asserting presets are validated against the real module registry.
- Manual verification: `ai-project-bootstrap --preset startup-mvp --yes -o /tmp/preset-test` generates successfully; inspect the output matches the preset's intended stack.
- `npx vitest run` passes in full.
- README documents the new `--preset` flag and lists available presets.

## Out of scope

- Full SaaS starter templates (app archetypes with starter screens/data models) — that's `13-saas-starter-templates.md`, which builds on this.
- A preset marketplace/community-contributed presets — just the curated built-in set for now.
