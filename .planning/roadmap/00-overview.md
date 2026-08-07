# Roadmap Overview

## Origin

This roadmap comes from a conversation the maintainer had with ChatGPT about `ai-project-bootstrap` (npm package, this repo). ChatGPT was asked "what features would be handy here?" and produced a 20-item feature list, followed by a separate discussion of monetization strategy. This roadmap covers the feature list only; monetization is out of scope for this planning folder.

## Current state (audit as of v0.5.0, commit `c52d6de`)

`ai-project-bootstrap` already implements a meaningful subset of that list:

| Already built | Where |
|---|---|
| Interactive wizard (multi-question, gated by project type) | `src/cli/wizard.ts`, `config/categories.json` |
| AI rules generation — Cursor + Claude Code only | `src/builders/assetBuilders.ts` (`cursorBuilder`, `claudeBuilder`) |
| Reusable AI prompts library (9 base prompts + module-contributed) | `assets/base/`, `technologies/*/prompts/` |
| Documentation generation (setup/architecture/deployment/testing/coding-standards/release) | `src/builders/docsBuilder` |
| Best-practices enforcement (eslint/prettier/husky/lint-staged/commitlint) | `src/builders/hygieneBuilder`, `assets/base/` |
| "Add a technology" retrofit command with non-destructive regeneration | `src/cli/add.ts`, `src/core/vfs/preserve.ts`/`fingerprint.ts` |
| Environment validator — but only *inside* generated projects, not at the CLI level | `assets/base/.../scripts/doctor.mjs` |
| Auto-install integrations (deps, env vars, folders) per technology | `technologies/*/manifest.json`, `package.fragment.json`, `dependencies.json`, `env.md`, `folders.json` |

That's roughly items 1, 2, 4, 7, 15, and part of 8/9/12 (upgrade-like behavior exists via re-running the wizard with `--config`, but there's no dedicated `upgrade` command) from ChatGPT's list, already done well — this is not a from-scratch effort.

## What's genuinely missing

Everything else maps to a real, verifiable gap in the code:

- **Provider breadth**: only Cursor + Claude Code get generated rules. No GitHub Copilot, Gemini CLI, OpenAI Codex, Continue.dev, Cline, or Roo Code output (confirmed via grep — no `.github/copilot-instructions.md` or equivalents anywhere in `src/` or `assets/`).
- **Stack presets**: no `config/presets.json` or `--preset` flag; every project is built question-by-question.
- **CLI-level operational commands**: only two top-level commands exist today (default wizard, `add`). No `doctor`, `upgrade`, `analyze`, `review`, or `implement`.
- **Architecture diagrams**: `architectureBuilder` exists but doesn't emit mermaid diagrams (sequence/ERD/component).
- **Implementation roadmap output**: nothing generates a week-by-week plan for a new project.
- **Cost estimation**: no cost metadata anywhere in the manifest schema.
- **Feature-marketplace-style modules**: `technologies/` only has single-integration modules (Stripe, Supabase, etc.), not cross-cutting features like push notifications, deep linking, onboarding, localization, dark theme, offline mode.
- **SaaS starter templates**: no app-archetype layer (AI Chat, CRM, Habit Tracker, etc.) on top of stack selection.
- **Replace/remove technology**: `add`'s `mergeChoice` explicitly refuses to swap an already-answered single-select category (`CATEGORY_ALREADY_ANSWERED`) — documented limitation, not a bug, but a real gap.
- **Repo hygiene**: no `CONTRIBUTING.md`/`ARCHITECTURE.md`/`CHANGELOG.md` for the tool itself, and `README.md`'s technology table is stale (missing FastAPI, NestJS, Firebase, Firestore, Auth0, Crashlytics, Detox).

## Phases

| # | Phase | Prompts | Why this order |
|---|---|---|---|
| 0 | Repo hygiene | `00` | Cheap, low-risk, clears clutter before bigger work |
| 1 | AI provider breadth & presets | `01`–`02` | Extends the tool's actual core differentiator (AI rules generation) before building new commands on top of it |
| 2 | CLI operational commands | `03`–`05` | Turns the tool from "one-shot generator" into something with a lifecycle (check env → generate → retrofit → upgrade) |
| 3 | AI-native differentiators | `06`–`09` | The highest-leverage, hardest features — ChatGPT's own top pick (`implement`) lives here, now built on top of Phase 1's provider breadth |
| 4 | Analysis & ecosystem breadth | `10`–`13` | Content/catalogue expansion and repo-analysis features that are most valuable once the above exists |

See the per-phase docs (`01-phase-hygiene.md` through `05-phase-analysis-ecosystem.md`) for feature-by-feature rationale, and `../prompts/` for the executable briefs.
