# Prompt 01 — Multi-Provider AI Rules Generation

**Phase:** 1 — AI Provider Breadth & Presets ([roadmap](../roadmap/02-phase-ai-providers-presets.md))

## Goal

Extend AI-rules generation beyond Cursor and Claude Code to cover the other AI coding tools ChatGPT's feature list names: GitHub Copilot, Gemini CLI, OpenAI Codex, Continue.dev, Cline, and Roo Code. Each selected technology module's existing rule content should be re-emitted in each target tool's expected file format/location, without requiring module authors to hand-write N new files per module.

## Why

`src/builders/assetBuilders.ts` currently has exactly two builders that touch AI tool config: `cursorBuilder` (order 60, emits `.cursor/rules/<id>.mdc`) and `claudeBuilder` (order 70, emits `.claude/skills/<id>/SKILL.md`, synthesizing YAML frontmatter via `skillFrontmatter()`). Confirmed via grep: there is no `.github/copilot-instructions.md` or equivalent output anywhere. This is the single biggest gap relative to ChatGPT's own framing of AI-rules generation as "probably your biggest differentiator" — the tool only serves 2 of the ~8 tools developers actually use.

## Current state

- Source content per module (already exists, don't change its shape unless necessary): `technologies/<id>/cursor-rule.mdc` (raw `.mdc` with frontmatter incl. `globs:`), `technologies/<id>/claude-skill.md` (plain content, no frontmatter — `claudeBuilder` synthesizes frontmatter from the manifest description + globs regex-extracted from the module's own `cursor-rule.mdc`).
- Builder registration: `src/builders/index.ts` — builders are independent, ordered, and each receives the same resolved build context.
- Template rendering: `src/core/template/render.ts` (`{{var}}`/`{{#if}}`/`{{#unless}}`/`{{#each}}` against `templateData(ctx)` from `src/core/pipeline/buildContext.ts`).
- Base (always-on) rules: `assets/base/` ships stack-agnostic base rules (architecture, performance, testing, typescript) alongside per-module ones.
- VFS write path: builders write into an in-memory `VirtualFs` (`src/core/vfs/`), which is later flushed to disk with fingerprint-based preservation of hand-edited files — new builders should follow this same pattern, not write to disk directly.

## Requirements

1. Research each target tool's actual expected config file format/location as of today (don't guess from memory — verify current conventions):
   - **GitHub Copilot**: `.github/copilot-instructions.md` (single file, or possibly path-scoped instructions — check current GitHub docs for the supported format).
   - **Gemini CLI**: check current config file convention (likely something under a `.gemini/` directory or similar).
   - **OpenAI Codex**: check current config file convention.
   - **Continue.dev**: `.continue/rules/` or config-based — verify current format.
   - **Cline**: `.clinerules` or similar — verify current format.
   - **Roo Code**: `.roo/rules/` or similar — verify current format.
2. Design a shared internal representation so all N provider builders can be driven from the same per-module source content (`cursor-rule.mdc`'s body minus its own frontmatter, plus the manifest description) rather than duplicating `cursorBuilder`'s or `claudeBuilder`'s logic six more times. Consider extracting a shared "rule content resolver" that all provider builders call, each doing only its own frontmatter/file-placement logic — mirrors how `claudeBuilder` already derives its output from `cursor-rule.mdc`'s globs today.
3. Add a wizard question — likely multiselect, e.g. "Which AI coding tools do you use?" — gating which provider builders actually run. Default to Cursor + Claude Code (today's implicit behavior) if not asked, to avoid breaking existing `--config` replay files that predate this question (check how other multiselect questions handle defaulting for saved configs missing the key — see `src/cli/wizard.ts` and `resolveSelection`).
4. Each new builder must respect the existing base-rules pattern (`assets/base/` emits stack-agnostic guidance regardless of module selection) — don't special-case base content differently per provider without reason.
5. `AGENTS.md` already exists as a cross-tool convention file — check whether any of the new providers actually read `AGENTS.md` natively (some tools do) before building a fully separate file for them; prefer pointing to `AGENTS.md` over duplicating content where a tool supports it.

## Acceptance criteria

- New Vitest tests (follow the pattern in `tests/generate.test.ts` and `tests/moduleContract.test.ts`) proving each new provider's output file(s) are correctly generated for a representative fixture selection.
- `tests/moduleContract.test.ts` (currently iterates every `technologies/*` directory) should still pass unmodified — new builders must not require every existing module to add new source files; missing source content for a given module should be handled gracefully (skip that module for that provider, not error).
- Manual verification: run the CLI against a test directory with several providers selected, inspect the generated file tree for each target format.
- `npx vitest run` passes in full (273+ existing tests, plus new ones).
- README's "what it generates" section and the (from prompt `00`) `ARCHITECTURE.md` builder list are updated to mention the new builders.

## Out of scope

- Stack presets (`02-stack-presets.md`) — separate prompt.
- Any new CLI commands — this is purely a builder/wizard-question extension to the existing generation flow.
- Building actual editor/IDE integrations beyond writing the config files these tools read.
