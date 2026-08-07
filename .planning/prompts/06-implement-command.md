# Prompt 06 — `ai-project-bootstrap implement <feature>`

**Phase:** 3 — AI-Native Differentiators ([roadmap](../roadmap/04-phase-ai-differentiators.md))

## Goal

Add `ai-project-bootstrap implement <feature>`, run inside an already-generated project: it produces a detailed implementation plan, stack-tailored AI prompts, scaffolded files (skeleton, not full implementation), and a validation checklist for a *specific feature* (e.g. `implement authentication`, `implement push-notifications`). This is explicitly ChatGPT's own top-rated idea in the source conversation ("this is where I think your package could really stand out").

## Why

Every existing command operates at the *project* level (generate a whole project) or *technology* level (`add` wires in one vendor integration). Nothing today helps with the next step — actually building a specific feature inside the project, tailored to exactly which stack was chosen. This is new capability, not an extension of an existing builder, and is the single highest-leverage prompt in this whole roadmap.

## Current state — what to reuse, not reinvent

- `ai-project.config.json` (written by `configBuilder`) already records the resolved `Selection.choices` for a generated project — `implement` should read this to know the stack (which backend, which auth provider, which UI framework) without re-asking.
- The prompts library pattern: `assets/base/` ships 9 reusable prompts (`create-api`, `create-feature`, `create-hook`, `create-screen`, `fix-bug`, `performance`, `release`, `review-code`, `write-tests`), and technology modules can contribute their own via `technologies/<id>/prompts/`. `implement`'s prompt-generation should follow the same authoring conventions (so its output looks native, not bolted-on) and likely draws on these existing prompt templates as building blocks rather than writing prose generation from scratch.
- Checklists: `technologies/{stripe,expo,supabase,revenuecat,eas-submit}/checklists/` already exist as a pattern for "validation checklist for a specific integration" — `implement`'s checklist output should follow this same format.
- Template engine: `src/core/template/render.ts` for any templated output (`{{var}}`, `{{#if}}`, `{{#each}}` against the resolved stack).
- Registry/module data: `src/core/registry/` for looking up what's actually installed (module manifests, not just category names) to tailor generated prompts precisely (e.g. "you're using Supabase Auth + Expo Router" rather than generic "add authentication").

## Requirements — design questions to resolve before implementing

1. **What is `<feature>`?** Decide whether this is a fixed enum of known features (auth, payments, push-notifications, onboarding, offline-mode, ...) with dedicated content per feature, or an open string that generates a generic plan template filled in with the resolved stack. Given the "AI implementation mode" framing, a fixed, curated set of well-supported features (start small — 3-5) with genuinely good, stack-aware output will land better than a shallow generic template that pretends to handle anything.
2. **Output structure** (per ChatGPT's description — plan, prompts, scaffold, checklist): design a concrete on-disk shape, e.g. `implementation/<feature>/{plan.md, prompts/*.md, checklist.md}` plus a handful of scaffolded skeleton files (empty/near-empty files in the conventional location for that stack — e.g. `src/features/auth/{screens,hooks,services,types}/` if the project uses feature-based architecture, or wherever the resolved stack's convention is).
3. **Stack-awareness is the whole point**: the same `implement authentication` call must produce meaningfully different output depending on whether Supabase Auth, Clerk, or Auth0 was selected — verify each supported feature × supported-provider-for-that-feature combination produces distinct, correct content, not a generic template with the provider name substituted in.
4. **Idempotency/re-running**: what happens if `implement authentication` is run twice? Should probably not blindly overwrite scaffolded files a human has since edited — reuse the fingerprint-preservation approach from `src/core/vfs/` rather than inventing new file-safety logic.
5. Content-authoring scale: decide where per-feature, per-stack-combination content lives — likely a new `features/<feature-id>/` top-level directory (parallel to `technologies/`) with its own manifest-like contract, since this is genuinely new content, not something that fits inside a single technology module (a feature like "authentication" spans multiple possible providers).

## Acceptance criteria

- New tests: at minimum, one full feature × one stack combination tested end-to-end (plan/prompts/checklist/scaffold all generated correctly), plus a test that re-running is safe/idempotent w.r.t. hand-edited scaffold files.
- Manual verification: generate a project with a specific stack, run `implement <feature>`, actually read the generated plan/prompts and confirm they're specific and correct for that stack (not generic filler) — this is a judgment call, spend real time on output quality here since it's the flagship feature.
- `npx vitest run` passes in full.
- README gets a dedicated section for `implement`, with a full worked example.

## Out of scope

- Actually calling an LLM API to generate content dynamically at runtime — this tool has no AI-provider dependency today (`@clack/prompts`, `picocolors`, `semver`, `zod` only); `implement` should produce well-authored *static* templates tailored via the existing `{{var}}`/`{{#if}}` template engine against the resolved stack, the same way every other builder works, not a live LLM call. If live generation is genuinely wanted later, that's a bigger, separate architectural decision outside this roadmap's scope.
- Full production-ready implementation code — `implement` scaffolds and plans; a human (or their AI assistant, using the generated prompts) writes the actual logic.
