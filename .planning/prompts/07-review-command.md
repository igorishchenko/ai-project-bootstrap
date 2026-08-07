# Prompt 07 — `ai-project-bootstrap review`

**Phase:** 3 — AI-Native Differentiators ([roadmap](../roadmap/04-phase-ai-differentiators.md))

## Goal

Add `ai-project-bootstrap review [--dir <path>]`, run inside a project this tool generated: produce a static, AI-oriented review (architecture, performance, security, DX) with prioritized, actionable suggestions — not raw linter output.

## Why

ChatGPT's "AI code reviewer" item (`bootstrap review`). Nothing today inspects a generated project's actual code after generation — every existing command is about *generating* or *retrofitting* structure, not evaluating what a human (or their AI assistant) subsequently built inside it.

## Current state

- `ai-project.config.json` gives `review` the resolved stack up front (unlike `10-project-analyzer.md`, which must work without this) — use it to tailor checks to what's actually installed (e.g. only run Supabase-specific checks if Supabase was selected).
- Existing hygiene tooling already installed into generated projects: eslint config, prettier, husky/lint-staged (`src/builders/hygieneBuilder`) — `review` should complement, not duplicate, what running `eslint`/`tsc` already surfaces. Consider whether `review` should shell out to these existing tools and *synthesize* their output into prioritized findings, rather than reimplementing static analysis from scratch.
- Checklists per technology (`technologies/*/checklists/`) — these already encode "things to verify for X integration" and are a natural source of review criteria to check programmatically where feasible (e.g. "is `STRIPE_WEBHOOK_SECRET` set" is checkable; "is your Stripe webhook idempotent" is not, without deeper analysis — separate the two kinds of checks explicitly).
- Module manifests (`src/core/registry/`) as the source of truth for what's selected, to scope which per-technology checks apply.

## Requirements

1. Define review categories explicitly: architecture (e.g. deviations from the feature-based structure the module templates set up), performance (stack-specific known pitfalls per selected technology), security (secrets in code, missing env var validation, known-risky config defaults), DX (missing docs, stale generated files vs. current templates — can share detection logic with `04-upgrade-command.md`'s staleness check).
2. Output format: a report (console + optionally a written `review-report.md`) with findings grouped by category and severity, each with a concrete file:line reference and suggested fix — mirror the file-path-citation style this whole roadmap uses, don't produce vague generic advice.
3. Decide the analysis depth honestly: this is static, template/pattern-based analysis (grep-like checks tied to the resolved stack, config validation, checking for the existence of things the module manifests say should exist), not a general-purpose static analyzer or an LLM call (no AI-provider dependency exists in this package — see the note in `06-implement-command.md`'s Out of Scope). Scope the checks to what's honestly achievable without one.
4. Exit code: consider whether `review` should be usable in CI (non-zero exit on findings above some severity threshold, configurable) — useful but don't over-build a full policy-configuration system for a first version.

## Acceptance criteria

- New tests covering: review against a project with intentionally-introduced issues (e.g. missing required env var, stale generated file) correctly flags them; review against a clean freshly-generated project reports no false positives.
- Manual verification: run against an actual generated + hand-modified project, sanity-check the findings are accurate and useful, not noisy.
- `npx vitest run` passes in full.
- README documents `review`, including what categories of issues it can and cannot catch (be honest about the static-analysis boundary).

## Out of scope

- `bootstrap analyze` for arbitrary (non-generated) repos — `10-project-analyzer.md`, a related but distinct command that can't assume `ai-project.config.json` exists.
- Auto-fixing findings — `review` reports, it doesn't modify code (that's what the AI prompts from `06-implement-command.md` and the existing prompts library are for, run by the user's own AI assistant).
