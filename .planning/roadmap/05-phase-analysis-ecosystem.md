# Phase 4 — Analysis & Ecosystem Breadth

**Goal:** round out the roadmap with repo-analysis tooling and catalogue/content expansion — valuable on their own, but most valuable once the AI-native commands from Phase 3 exist to act on their findings.

## Features

### `ai-project-bootstrap analyze` (`prompts/10-project-analyzer.md`)

Run against an *arbitrary existing repository* (not one this tool generated — no `ai-project.config.json` to lean on) and produce an architecture/security/documentation-coverage score with prioritized suggestions. This is ChatGPT's "Project analyzer" item and the natural companion to `07-review-command.md` — the two should share scanning infrastructure, but `analyze` has to work without any prior knowledge of the project's stack, which `review` gets for free.

### Feature-marketplace-style modules (`prompts/11-feature-marketplace-modules.md`)

Every one of the 31 existing `technologies/*` modules is a single-vendor integration (Stripe, Supabase, Sentry, ...). ChatGPT's list separately calls out cross-cutting *features* that aren't tied to one vendor: push notifications, deep linking, onboarding flows, localization, dark theme, offline mode. These fit the existing module contract (manifest + templates, addable via `add`) but need new content, and potentially a new `feature` category in `config/categories.json` alongside the existing `mobile`/`web`/`backend`/etc. categories.

### Cost estimation (`prompts/12-cost-estimation.md`)

None of the 31 manifests carry pricing data today. Add optional cost metadata to the manifest schema (`src/core/registry/`) and emit a monthly cost summary at generation time (ChatGPT's example: Supabase $25 + RevenueCat free + Sentry free + Posthog free + Resend free = $25/month estimated). Purely additive to the schema — no existing manifest needs to change to remain valid.

### SaaS starter templates (`prompts/13-saas-starter-templates.md`)

Full app archetypes (AI Chat, CRM, Habit Tracker, Booking, etc.) as a layer on top of stack selection — effectively "preset + feature modules + starter screens/data-model" bundled together. This is sequenced last because it's most naturally built once `02-stack-presets.md` (Phase 1) and `11-feature-marketplace-modules.md` (this phase) already exist to build on.

Prompts: [`../prompts/10-project-analyzer.md`](../prompts/10-project-analyzer.md), [`../prompts/11-feature-marketplace-modules.md`](../prompts/11-feature-marketplace-modules.md), [`../prompts/12-cost-estimation.md`](../prompts/12-cost-estimation.md), [`../prompts/13-saas-starter-templates.md`](../prompts/13-saas-starter-templates.md)
