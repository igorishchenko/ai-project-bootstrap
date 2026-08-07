# Prompt 11 — Feature-Marketplace-Style Modules

**Phase:** 4 — Analysis & Ecosystem Breadth ([roadmap](../roadmap/05-phase-analysis-ecosystem.md))

## Goal

Add a batch of new, cross-cutting "feature" modules — push notifications (beyond the existing vendor-specific `expo-notifications`/`onesignal`), deep linking, onboarding flows, localization/i18n, dark theme, offline mode/sync — following the existing module contract, addable via `add` just like any technology today.

## Why

Every one of the 31 existing `technologies/*` modules is a single-vendor integration (Stripe, Supabase, Sentry, etc.). ChatGPT's list separately names cross-cutting *capabilities* that aren't tied to one vendor — "feature marketplace" (`bootstrap add <feature>`: Push Notifications, Deep Linking, Onboarding, Localization, Dark Theme, Offline Mode). Some of these are vendor-specific enough to fit today's model already (`expo-notifications`, `onesignal` exist); others (dark theme, onboarding, localization, deep linking, offline sync) are genuinely cross-cutting and don't fit neatly into today's 16 fixed categories in `config/categories.json`.

## Current state

- Module contract (per `README.md`'s "Adding a technology" section, confirmed by `tests/moduleContract.test.ts` which validates every directory under `technologies/`): `manifest.json` (required) + optional `setup.md`/`ios.md`/`android.md`/`architecture.md`/`cursor-rule.mdc`/`claude-skill.md`/`env.md`/`folders.json`/`package.fragment.json`/`dependencies.json`/`prompts/`/`checklists/`/`templates/**`.
- Category schema: `config/categories.json` — 16 categories today (mobile, web, backend, auth, database, payments, analytics, crash-reporting, notifications, storage, email, monitoring, ci-cd, testing, deployment). None of these fit "dark theme" or "onboarding" naturally.
- `add` command semantics differ by category type (`src/cli/add.ts`'s `mergeChoice`): multi-select categories grow, single-select categories can only fill when empty (see `05-replace-technology.md` for the single-select-swap gap). New feature categories should default to multi-select where it makes sense (a project can have dark theme AND localization AND offline mode simultaneously) — check this against `mergeChoice`'s existing logic rather than assuming.
- `showWhen`/`requires`/`conflicts` gating (`src/core/resolve/`) — some of these features are meaningfully stack-dependent (offline sync implementation differs completely between a Supabase-backed and Firebase-backed project) — design each new module's `requires`/`showWhen` carefully rather than presenting options that don't actually apply to the resolved stack.

## Requirements

1. Decide category structure: likely a new `feature` category (or a few: `feature-notifications-ux`, `feature-navigation`, etc. — probably overkill; a single new `features` multi-select category is more in keeping with the existing 16-category granularity) added to `config/categories.json`.
2. For each of the 5-6 named features, decide whether it needs stack-specific variants (e.g. "offline mode" needs genuinely different implementation guidance for Supabase vs. Firebase vs. a custom backend) — if so, either multiple module ids (`offline-mode-supabase`, `offline-mode-firebase`) or a single module with `{{#if}}`-templated content branching on the resolved backend (check `src/core/template/render.ts`'s conditional support — likely the cleaner approach given the existing `{{#if has.X}}` pattern already used elsewhere).
3. Author real content for each — not stub manifests. Each needs at minimum: `manifest.json`, `setup.md`, a `cursor-rule.mdc`/`claude-skill.md` pair (now also feeding the multi-provider builders from `01-multi-provider-ai-rules.md` if that's landed), and `templates/` for any starter code (e.g. dark theme needs an actual theme-context/hook scaffold, not just docs).
4. Verify each new module passes `tests/moduleContract.test.ts` automatically (it iterates every `technologies/*` directory) — this is your main correctness signal for contract compliance, no new test-writing needed for basic shape validation.
5. Start with 2-3 features fully fleshed out rather than 6 shallow ones — quality over coverage, matching this whole roadmap's bias toward "real, tailored content" over generic templates (see `06-implement-command.md`'s framing of the same tradeoff).

## Acceptance criteria

- `npx vitest run` passes in full, including `moduleContract.test.ts` picking up and validating every new module directory automatically.
- New `tests/generate.test.ts`-style fixture(s) exercising at least one new feature module end-to-end.
- Manual verification: `ai-project-bootstrap add dark-theme` (or equivalent id) against a real generated project produces working, sensible scaffolding.
- README's technology/feature table (from prompt `00`'s regeneration mechanism, if built) picks up the new modules automatically; if `00` wasn't done first, update the table by hand and note the gap.

## Out of scope

- Full SaaS starter templates — `13-saas-starter-templates.md` builds *on top of* this prompt's output, don't pre-build that layer here.
- Every possible cross-cutting feature ChatGPT could imagine — ship a curated, well-built few (per requirement 5) rather than a sprawling shallow catalogue.
