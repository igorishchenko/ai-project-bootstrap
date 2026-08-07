# Prompt 09 — Implementation Roadmap Generator

**Phase:** 3 — AI-Native Differentiators ([roadmap](../roadmap/04-phase-ai-differentiators.md))

## Goal

At generation time, emit a week-by-week implementation roadmap (e.g. "Week 1: authentication, navigation, theme; Week 2: payments, push notifications, settings; ...") derived from the resolved module selection, written to something like `docs/roadmap.md`.

## Why

ChatGPT's "Generate implementation roadmap" item — after answering the wizard, a new project's owner has a pile of scaffolding but no suggested build order. This is a genuinely useful, low-risk addition: it's a new template-driven doc, not a new command, and it pairs naturally with `06-implement-command.md` (each roadmap item can reference `ai-project-bootstrap implement <feature>` where applicable) without requiring it.

## Current state

- `docsBuilder` (`src/builders/index.ts`, order in the pipeline before `architectureBuilder`) is the existing pattern for generating docs from the resolved stack — study its current output set (`setup.md`, `architecture.md` [built separately by `architectureBuilder`], `deployment.md`, `testing.md`, `coding-standards.md`, `release.md`) before adding a new doc alongside it.
- Resolved selection with category/module data: `src/core/pipeline/buildContext.ts`'s `templateData(ctx)`.
- Per-module data available for prioritization: `manifest.json` fields (category, possibly complexity/effort hints if you choose to add one — check the current manifest schema in `src/core/registry/` first).

## Requirements

1. Define a prioritization heuristic for ordering selected modules into weeks — likely category-based (auth + core navigation/theme first, since most other features depend on them; payments/notifications/analytics next; deployment-related last). This can be a simple, hardcoded category-priority ordering (`config/categories.json` already has category order metadata — check whether it's suitable for this or whether a separate roadmap-specific priority makes sense) rather than a complex planning algorithm — the value here is a *reasonable default*, not a perfectly optimized schedule.
2. Each roadmap item should name the specific selected module(s) for that slot (not just the category) and, if `06-implement-command.md` exists by the time this is built, reference the exact `ai-project-bootstrap implement <feature>` command to run for it.
3. Make week-count/pacing configurable or at least sensible-by-default (don't hardcode "always exactly 2 weeks" if 8 categories were selected — scale reasonably, e.g. cap items per week and add weeks as needed).
4. This is a *suggested* plan, not a hard schedule — the doc's framing should make clear it's a starting point the team should adjust, not prescriptive.

## Acceptance criteria

- New tests verifying: a fixture selection produces a roadmap doc listing every selected module exactly once, ordering follows the defined priority heuristic, week-count scales sensibly with selection size.
- Manual verification: generate a project with a realistic stack selection, read `docs/roadmap.md`, confirm it's sensible and actually useful (not just a mechanical dump).
- `npx vitest run` passes in full.
- README/`ARCHITECTURE.md` mention the new `docs/roadmap.md` output.

## Out of scope

- Any actual project-management integration (Linear/Jira/GitHub Projects export) — plain markdown output only.
- Dynamic re-planning based on progress — this is generated once at project-creation time (though `04-upgrade-command.md` could regenerate it as part of a general refresh, that's incidental, not a design requirement here).
