# Phase 0 — Repo Hygiene

**Goal:** clear out documentation debt before building new features on top, so contributors (human or AI) start from an accurate picture of the codebase.

## Features

### Fix the stale technology table + add missing meta docs (`prompts/00-fix-tech-table-and-meta-docs.md`)

`README.md`'s "Available technologies" table is out of sync with `technologies/` — it's missing FastAPI, NestJS, Firebase, Firestore, Auth0, Crashlytics, and Detox, all of which are real, shipped modules. Left alone, this table will keep drifting every time a module is added. The repo also has no `CONTRIBUTING.md`, `ARCHITECTURE.md`, or `CHANGELOG.md` — there's real architectural content worth writing down (the builder pipeline, the "no technology names in `src/`" invariant, the fingerprint-preservation mechanism) that currently only exists in code comments and this planning folder's own audit.

This is intentionally the first prompt: it's low-risk, fast, and every other phase benefits from `ARCHITECTURE.md` existing as a place to point new AI-rules builders, new commands, etc.

Prompt: [`../prompts/00-fix-tech-table-and-meta-docs.md`](../prompts/00-fix-tech-table-and-meta-docs.md)
