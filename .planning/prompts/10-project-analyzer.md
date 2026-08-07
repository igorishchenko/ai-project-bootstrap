# Prompt 10 — `ai-project-bootstrap analyze`

**Phase:** 4 — Analysis & Ecosystem Breadth ([roadmap](../roadmap/05-phase-analysis-ecosystem.md))

## Goal

Add `ai-project-bootstrap analyze [--dir <path>]`, runnable against **any** existing repository — including ones this tool never generated — producing an architecture/security/documentation-coverage score with prioritized suggestions.

## Why

ChatGPT's "Project analyzer" item. This is the acquisition-funnel command: someone can run `analyze` against a repo they already have, get real value (a score + concrete suggestions) with zero commitment to adopting the tool's generation workflow, and see what adopting `ai-project-bootstrap`'s conventions would improve. It's closely related to `07-review-command.md` but strictly harder: `review` gets to assume `ai-project.config.json` exists and tells it the stack; `analyze` has none of that and must infer everything from the filesystem.

## Current state

- No prior art for "detect stack from an arbitrary repo" exists in this codebase yet — this is genuinely new capability. Reasonable signals to detect from: `package.json` dependencies (map against known technology ids in `technologies/*/manifest.json` — a repo using `@supabase/supabase-js` is very likely "using Supabase"), presence of framework-specific config files (`next.config.js`, `app.json`/`app.config.js` for Expo, etc.), folder structure conventions.
- `technologies/*/manifest.json` + `technologies/*/checklists/` are a reasonable source of "what good looks like for stack X" to check an arbitrary repo against, once the stack is inferred.
- Share scoring/finding logic with `07-review-command.md` where the two commands' concerns actually overlap (e.g. "is there a README", "are there tests") — but keep `analyze`'s stack-detection step as its own clearly separated concern, since `review` never needs it.

## Requirements

1. **Stack detection**: infer likely technologies from `package.json` dependencies, config file presence, and folder conventions. Be explicit in output about confidence — "detected: Next.js (high confidence), Supabase (high confidence), auth provider (undetermined)" rather than presenting guesses as facts.
2. **Scoring**: produce category scores (architecture, security, performance-relevant-patterns, documentation coverage) — e.g. "Architecture: 78/100" per ChatGPT's example — with a defined, documented rubric (what specifically contributes to each score) so it's not a black box. Keep the rubric honest and simple for a first version (e.g. doc coverage = presence of README/CONTRIBUTING/key docs; security = presence of `.env` in `.gitignore`, no obvious hardcoded secrets via basic pattern matching, dependency check for known-vulnerable versions if feasible without adding a heavy new dependency).
3. **Suggestions**: prioritized, concrete, each ideally pointing at what adopting this tool's conventions (docs structure, hygiene tooling, AI rules) would add — this command is explicitly also a showcase for the rest of the tool, lean into that honestly without being a pure ad.
4. Must work against a repo with **no** `ai-project.config.json` and must not assume one exists or crash if it does happen to exist (a project this tool generated should still be analyzable, just via the generic path, or optionally short-circuit to reuse `review`'s logic if `ai-project.config.json` is found — your call, document the choice).
5. Consider dependency-vulnerability scanning scope carefully — don't casually shell out to `npm audit` and treat its raw output as authoritative without understanding false-positive rates; if included, frame it as informational, not a hard score component.

## Acceptance criteria

- New tests: fixture repos (a few minimal synthetic ones, following the pattern of `tests/fixtures/`) with known characteristics (has tests / doesn't, has docs / doesn't, uses a detectable stack) produce expected scores/findings.
- Manual verification: run `analyze` against this very repo (`ai-project-bootstrap` itself) and against at least one real generated project, sanity-check output quality.
- `npx vitest run` passes in full.
- README documents `analyze`, its scoring rubric, and its detection-confidence framing.

## Out of scope

- Any network calls (e.g. live CVE database lookups) — keep this fully offline/local for a first version.
- Auto-fixing anything found — `analyze` reports only, same boundary as `review`.
