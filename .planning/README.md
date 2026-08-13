# `.planning/` — Implementation Roadmap

> **Status, 13 Aug 2026: complete.** Twelve of the fourteen prompts shipped.
> `11` (feature modules) and `13` (SaaS templates) are partially built and
> deliberately frozen — see §5 of the site repo's `STRATEGY_V2.md`. Product-wide
> planning has moved to that repo's `.planning/`; this folder is kept as the
> record of how the CLI got here.

This folder is a working roadmap for evolving `ai-project-bootstrap` from a project generator into what the source discussion (a ChatGPT conversation about this package, summarized in [`roadmap/00-overview.md`](roadmap/00-overview.md)) called an "AI development operating system" — a tool that doesn't just scaffold folders but ships everything an AI coding agent needs to build a project consistently: rules, prompts, docs, checklists, and now-missing capabilities like multi-provider AI support, stack presets, and AI-native commands (`implement`, `review`, `analyze`, `upgrade`).

It is **technical/implementation scope only**. Monetization and business-model questions from the source conversation are deliberately excluded here.

## Structure

- **`roadmap/`** — six markdown docs: an overview (vision, current-state audit, phase table) plus one doc per phase, each explaining the "why" behind its features.
- **`prompts/`** — fourteen numbered, self-contained prompt files (`00` through `13`), one per feature. Each can be handed to a coding agent on its own and includes enough context (goal, current relevant code, requirements, acceptance criteria) to be executed without re-reading this whole folder.

## How to use this

1. Read [`roadmap/00-overview.md`](roadmap/00-overview.md) once, for the full picture.
2. Work through `prompts/00-*.md` → `prompts/13-*.md` **in order**. The numbering is also the dependency order — later prompts assume earlier ones' output exists (e.g. `06-implement-command.md` assumes `01-multi-provider-ai-rules.md` has already landed), though each prompt restates enough context to stand alone if you jump around.
3. Treat each prompt as its own unit of work: one prompt → one implementation pass → one commit/PR → tests passing (`npx vitest run`) before moving to the next.
4. Phases are a grouping convenience, not a hard gate — you can pause between any two prompts.

## Phase index

| Phase | Doc | Prompts | Theme |
|---|---|---|---|
| 0 | [01-phase-hygiene.md](roadmap/01-phase-hygiene.md) | `00` | Repo hygiene (fix stale docs, add missing meta docs) |
| 1 | [02-phase-ai-providers-presets.md](roadmap/02-phase-ai-providers-presets.md) | `01`–`02` | AI provider breadth & stack presets |
| 2 | [03-phase-cli-operations.md](roadmap/03-phase-cli-operations.md) | `03`–`05` | CLI operational commands (`doctor`, `upgrade`, replace-technology) |
| 3 | [04-phase-ai-differentiators.md](roadmap/04-phase-ai-differentiators.md) | `06`–`09` | AI-native differentiators (`implement`, `review`, diagrams, roadmap gen) |
| 4 | [05-phase-analysis-ecosystem.md](roadmap/05-phase-analysis-ecosystem.md) | `10`–`13` | Analysis & ecosystem breadth (`analyze`, feature modules, cost estimation, SaaS templates) |

This audit reflects the repo as of `ai-project-bootstrap` v0.5.0 (commit `c52d6de`). If significant work has landed since, re-verify the "Current state" sections of later prompts before executing them — they cite specific files and may have shifted.
