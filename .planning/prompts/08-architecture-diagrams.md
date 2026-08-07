# Prompt 08 — Architecture Diagrams (Mermaid)

**Phase:** 3 — AI-Native Differentiators ([roadmap](../roadmap/04-phase-ai-differentiators.md))

## Goal

Extend the existing `architectureBuilder` to emit mermaid diagrams — component/architecture overview, at least one sequence diagram (e.g. auth flow, if auth is selected), and an ERD (if a database/backend with a schema concept is selected) — into `docs/architecture.md`.

## Why

`architectureBuilder` (part of the 14 builders in `src/builders/index.ts`, feeding `docs/architecture.md` per module contributions in `technologies/<id>/architecture.md`) already exists and already assembles per-module architecture prose — but it doesn't generate diagrams. ChatGPT's list calls this out as a "huge time saver" specifically because founders/developers rarely draw these themselves even though they're valuable. GitHub, GitLab, and most markdown viewers render mermaid natively, so this is low-friction to ship.

## Current state

- `src/builders/architectureBuilder` (locate exact file — likely `src/builders/docBuilders.ts` or similar, alongside `docsBuilder`) — read its current implementation before extending it; understand exactly how it aggregates per-module `architecture.md` content today.
- Per-module architecture content: `technologies/<id>/architecture.md` (optional file in the module contract, per `README.md`'s "Adding a technology" section).
- Template engine: `src/core/template/render.ts` — diagrams will need to be generated from the resolved stack data structure (`templateData(ctx)`, `src/core/pipeline/buildContext.ts`), likely via a dedicated diagram-generation function rather than the `{{#each}}` templating alone (mermaid syntax requires structural generation, e.g. building node/edge lists from the resolved category → module map).
- Resolved stack shape: whatever `Selection`/`resolveSelection` produces (`src/core/resolve/`) — categories and their chosen modules, plus `requires`/`conflicts` relationships already computed, which double as a reasonable source for a component diagram's edges (e.g. "auth requires backend" becomes an arrow).

## Requirements

1. **Component/architecture diagram**: generate a mermaid graph (`graph TD` or similar) from the resolved selection — nodes per selected module/category, edges from known `requires` relationships (already computed by the resolution engine) plus sensible default edges for common patterns (frontend → backend → database) where not already captured by `requires`.
2. **Sequence diagram**: at minimum, an auth flow sequence diagram when an auth category module is selected (client → auth provider → backend → database, tailored to the actual selected auth provider). Design this as extensible — a per-module-contributed sequence diagram fragment (new optional file in the module contract, e.g. `technologies/<id>/sequence.mmd` or embedded in `architecture.md`) is more scalable than hardcoding "if auth then draw this specific diagram" in `src/`, and respects the existing "no technology names in `src/`" invariant.
3. **ERD**: when a database-category module is selected, emit a basic entity-relationship diagram. This one is harder to do generically (the actual schema is app-specific, not knowable at generation time) — likely scope this to a *starter* ERD showing whatever entities the module's own starter templates create (e.g. if a module scaffolds a `users` table), rather than attempting to infer a real app's schema. Be explicit in the output that this is a starting point, not a reflection of the eventual real schema.
4. Keep the "no technology names in `src/`" invariant intact — any technology-specific diagram content (like the auth sequence) should live in `technologies/<id>/`, not be special-cased in builder code.
5. Verify current mermaid syntax/best practices for the diagram types you generate (syntax has evolved across mermaid versions) rather than relying on possibly-stale memory of the syntax.

## Acceptance criteria

- New tests verifying: generated mermaid blocks are syntactically well-formed (at minimum, balanced brackets/valid block structure — a real mermaid parser dependency is probably overkill, but check for obviously malformed output), diagrams correctly reflect a given fixture selection (e.g. a fixture with Supabase Auth produces a sequence diagram naming Supabase, not a generic placeholder).
- Manual verification: generate a project, open `docs/architecture.md` in a mermaid-rendering viewer (GitHub preview, VS Code mermaid extension, or the mermaid live editor), confirm diagrams render without syntax errors and look sensible.
- `npx vitest run` passes in full.
- README/`ARCHITECTURE.md` (from prompt `00`) mention the new diagram output and the new optional module-contract file(s) if you add any.

## Out of scope

- Diagrams reflecting the actual evolved codebase after a human has built on top of the generated skeleton (that would require real static analysis of arbitrary code — closer to `10-project-analyzer.md`'s territory, and even there it's a stretch). This prompt is scoped to diagrams derivable from the *resolved module selection* at generation time.
- A full interactive diagram-editing UI — static markdown/mermaid output only.
