# Phase 3 — AI-Native Differentiators

**Goal:** build the features that ChatGPT itself flagged as the strongest differentiator — not generating folders, but generating everything an AI coding agent needs to build *inside* the project after it exists. This is the highest-leverage, highest-difficulty phase.

## Features

### `ai-project-bootstrap implement <feature>` (`prompts/06-implement-command.md`)

ChatGPT's own top pick ("this is where I think your package could really stand out"): instead of only scaffolding at project-creation time, generate a detailed implementation plan, stack-tailored AI prompts, scaffolded files, and validation checklists for a *specific feature* (e.g. `implement authentication`) inside an already-generated project. This is new capability — nothing today operates on a project after initial generation except `add` (which only wires in a technology, not a feature).

### `ai-project-bootstrap review` (`prompts/07-review-command.md`)

An AI-oriented static review (architecture/performance/security/DX) run against the current project, producing prioritized suggestions rather than raw lint output. Shares scanning infrastructure with `10-project-analyzer.md` in Phase 4, but `review` targets a project this tool generated (so it can use `ai-project.config.json` to know the resolved stack) while `analyze` (Phase 4) targets an arbitrary repo.

### Architecture diagrams (`prompts/08-architecture-diagrams.md`)

`architectureBuilder` already exists and writes `docs/architecture.md`, but it doesn't emit mermaid diagrams. This extends it to generate component-architecture, sequence, and ERD diagrams from the resolved module set — a concrete, scoped enhancement to an existing builder rather than a new one.

### Implementation roadmap generator (`prompts/09-roadmap-generator.md`)

At generation time, emit a week-by-week implementation plan (e.g. "Week 1: auth, navigation, theme; Week 2: payments, push notifications, settings") derived from the resolved technology set — ChatGPT's "Generate implementation roadmap" item. This pairs naturally with `06` (the roadmap can reference `implement <feature>` for each item) but doesn't require it.

## Ordering note

`06` is the largest, riskiest prompt in this roadmap — consider it the centerpiece deliverable of the whole roadmap. Doing `07`–`09` first is reasonable if you want smaller wins before tackling it, but `06` doesn't strictly require them.

Prompts: [`../prompts/06-implement-command.md`](../prompts/06-implement-command.md), [`../prompts/07-review-command.md`](../prompts/07-review-command.md), [`../prompts/08-architecture-diagrams.md`](../prompts/08-architecture-diagrams.md), [`../prompts/09-roadmap-generator.md`](../prompts/09-roadmap-generator.md)
