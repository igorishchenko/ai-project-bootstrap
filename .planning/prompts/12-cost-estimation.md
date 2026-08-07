# Prompt 12 — Cost Estimation

**Phase:** 4 — Analysis & Ecosystem Breadth ([roadmap](../roadmap/05-phase-analysis-ecosystem.md))

## Goal

Add optional cost metadata to the module manifest schema, and emit a monthly cost estimate summary at generation time (and/or as part of `add`) — e.g. "Supabase: $25/mo (Pro tier estimate), RevenueCat: Free, Sentry: Free, Posthog: Free, Resend: Free → Estimated total: $25/month".

## Why

ChatGPT's "Cost estimation" item, explicitly framed as useful for founders deciding on a stack. None of the 31 existing manifests carry pricing data today (confirmed — the manifest schema has no cost-related fields). This is a small, additive, low-risk feature: the schema addition doesn't invalidate any existing manifest, and the output is a straightforward sum/table.

## Current state

- Manifest schema (zod): `src/core/registry/` — locate the exact schema file, extend it with new **optional** fields so existing manifests without cost data remain valid and simply show as "cost unknown" rather than erroring.
- Module data source for all 31 modules: `technologies/*/manifest.json`.
- Output surface options: could be printed at the end of the wizard (after `✔ Done`), written to a doc (`docs/costs.md` or folded into `docs/setup.md`), or both — check what other end-of-generation summary output already exists (the CLI already prints `✔ Generating project... ✔ Installing packages... ✔ Done`-style status via `@clack/prompts`/`picocolors`) and match that pattern for the interactive summary.

## Requirements

1. Extend the manifest schema with optional pricing fields — think through the actual shape needed to be honest rather than misleading: pricing is rarely a single flat number (free tiers with usage limits, per-seat pricing, usage-based pricing that depends on the built app's traffic). A reasonable v1 shape: `{ pricing: { model: "free" | "flat" | "usage-based" | "freemium", estimateUsd?: number, notes?: string, url?: string } }` — the `notes`/`url` fields matter *more* than a possibly-wrong flat number, since pricing changes over time and this data will go stale.
2. Populate pricing data for the modules where it's genuinely known and stable enough to be useful (Supabase, Firebase, Sentry, Posthog, Resend, RevenueCat, Stripe, etc. all have public, well-known free/paid tiers) — verify current pricing for each rather than trusting memory, since pricing pages change. Leave `pricing` unset for modules where it doesn't clearly apply (e.g. `eslint`/testing tooling has no cost) rather than forcing a value.
3. Summary output should clearly flag freshness/uncertainty — e.g. "Estimated costs based on published pricing as of [date]; verify current pricing before committing" — don't present these as guaranteed figures.
4. Sum only modules with a known flat/freemium estimate into the "estimated total"; list usage-based/unknown-pricing modules separately with a note and link rather than silently omitting or wrongly including them in the sum.
5. Decide whether `doctor` (`03-cli-doctor-preflight.md`) or `analyze` (`10-project-analyzer.md`) should also surface cost data if either is built — reasonable but not required; keep this prompt's scope to producing the data and the primary summary output, note the extension point rather than building all three integrations now.

## Acceptance criteria

- Schema change doesn't break `tests/moduleContract.test.ts` or any existing manifest — all 31 modules still validate with the new optional field unset.
- New tests: cost summary correctly sums flat-priced modules, correctly separates out usage-based/unknown modules, correctly handles an all-unknown-pricing selection (no crash, clear "no cost data available" message).
- Manual verification: generate a project with a realistic paid-tool-heavy selection, confirm the cost summary is accurate against each vendor's actual current published pricing (spot-check a few).
- `npx vitest run` passes in full.
- README documents the new manifest field for module authors (extend the "Adding a technology" contract section, or point to `CONTRIBUTING.md` if prompt `00` created it) and the cost-summary output for end users.

## Out of scope

- Any live pricing-API integration — static, manually-curated, notes-and-link-backed data only, refreshed by maintainers over time (much like the rest of the module catalogue).
- Usage-based cost *prediction* (estimating what a specific app's actual traffic would cost) — out of reach without real usage data; just surface that these modules are usage-based and link to pricing pages.
