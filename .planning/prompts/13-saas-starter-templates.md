# Prompt 13 — SaaS Starter Templates

**Phase:** 4 — Analysis & Ecosystem Breadth ([roadmap](../roadmap/05-phase-analysis-ecosystem.md))

## Goal

Add full app-archetype starter templates (e.g. AI Chat, CRM, Habit Tracker, Booking) selectable as a step beyond stack presets — bundling a preset stack selection, relevant feature modules, and archetype-specific starter screens/data-model scaffolding into one cohesive starting point.

## Why

ChatGPT's "SaaS templates" item, explicitly the most ambitious/content-heavy item on the list. It's sequenced last in this roadmap because it's most naturally built as a layer *on top of* infrastructure the earlier prompts create: `02-stack-presets.md` (bundle a sensible default stack) and `11-feature-marketplace-modules.md` (bundle relevant cross-cutting features, e.g. a Booking app archetype probably wants notifications + a calendar-ish data model). Attempting this before those exist means either duplicating their mechanisms or building throwaway scaffolding.

## Current state

- Presets: `config/presets.json` (from `02-stack-presets.md`) — an archetype's stack layer can literally *be* a preset, reused rather than re-invented.
- Feature modules: `technologies/<feature-id>/` (from `11-feature-marketplace-modules.md`) — an archetype references a set of these the same way it references stack modules.
- What archetypes need *beyond* presets + features: actual starter data models, starter screens, and starter API routes specific to the app type (e.g. "Habit Tracker" needs a `habits` table/model and a check-in screen, not just "Supabase + Expo" generically) — this is new content with no existing analog in the module system, since today's modules are stack/feature building blocks, not app-specific.
- Template engine + folder scaffolding pattern: same `{{var}}`/`{{#if}}`/`{{#each}}` engine (`src/core/template/render.ts`) and `folders.json`/`templates/**` conventions used throughout `technologies/*` — archetype content should follow the exact same authoring conventions so it's not a parallel, divergent system.

## Requirements

1. Design the archetype as a *composition* mechanism, not a new content-authoring primitive: an archetype = a preset (or preset-like partial selection) + a set of feature/technology modules + a new, archetype-specific "starter content" bundle (data model, screens, seed data) that layers on top after the normal builder pipeline runs — or as an actual new category/pseudo-module in the existing pipeline if that's a cleaner fit; make this call after re-reading how `resolveSelection`/`runPipeline` currently compose things, don't assume either approach without checking.
2. Pick **one archetype fully built end-to-end first** (recommend Habit Tracker or AI Chat — both are narrow enough to scaffold meaningfully without an enormous data model) before attempting a second, to validate the composition mechanism actually works cleanly rather than discovering problems after building four archetypes.
3. Archetype-specific starter content should be genuinely useful (a real, if simple, data model + 2-3 real starter screens wired to it) — not just "a folder named `habits/` with empty files." This is meant to demonstrate the tool's value at its most compelling; low-effort scaffolding undermines that.
4. Consider licensing/scope carefully: these are the most "product," least "infrastructure" pieces of content in the whole tool — if the maintainer intends any of this to eventually be a paid/Pro tier (per the separate, out-of-scope monetization conversation), avoid architecting it in a way that makes a future free/paid split painful (e.g. don't hard-wire archetype content into core builders — keep it as swappable, addable content, the same way everything else in `technologies/` already is).

## Acceptance criteria

- New tests covering: the one fully-built archetype generates successfully end-to-end (preset + features + starter content all present and internally consistent), `moduleContract.test.ts`-equivalent validation if the archetype introduces its own content-contract shape.
- Manual verification: generate a project from the archetype, actually run it (`npm install && npm run dev` or equivalent) and confirm the starter screens/data model work, not just that files exist.
- `npx vitest run` passes in full.
- README gets a new "Starter templates" section documenting the archetype, how to select it, and what it scaffolds.

## Out of scope

- Building all of ChatGPT's named archetypes (AI Chat, Notes, Habit Tracker, Expense Tracker, Calorie Tracker, CRM, Booking, Marketplace, Inventory, Fitness, Restaurant, Finance) — ship one well, establish the mechanism, leave the rest as a clear, documented pattern for future additions rather than a rushed batch.
- Any monetization/licensing gating logic — explicitly out of scope for this whole roadmap; keep the *architecture* future-compatible with a possible split (per requirement 4) without building any gating now.
