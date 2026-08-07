# Phase 2 — CLI Operational Commands

**Goal:** give the tool a lifecycle beyond "generate once." Right now there are exactly two top-level commands (the default wizard, and `add <technology-id>`) — this phase adds the operational commands ChatGPT's list calls out (`doctor`, `upgrade`) and closes a documented gap in the existing retrofit command.

## Features

### `ai-project-bootstrap doctor` — CLI-level preflight check (`prompts/03-cli-doctor-preflight.md`)

A generated *project* already gets its own `scripts/doctor.mjs` (from `assets/base/`), but the CLI tool itself has no self-diagnostic command — there's no way to check, before generating, whether the user even has the SDKs/runtimes a given stack selection will need (Xcode/Android SDK for Expo, Docker for a Postgres-backed backend, etc). This is exactly ChatGPT's "Environment validator" item, applied one level up.

### `ai-project-bootstrap upgrade` (`prompts/04-upgrade-command.md`)

Regeneration exists (`--config` replay) but there's no dedicated command that means "bring my already-generated project's rules/prompts/docs/templates up to date with the currently installed package version, and tell me what changed." This is ChatGPT's "Upgrade command" item, built on infrastructure that already exists: `ai-project.config.json` (written by `configBuilder`) plus the fingerprint-based preservation in `src/core/vfs/preserve.ts`/`fingerprint.ts` that already protects hand-edited files during `add`.

### Replace/remove technology in `add` (`prompts/05-replace-technology.md`)

`src/cli/add.ts`'s `mergeChoice` explicitly refuses to swap an already-answered single-select category (error `CATEGORY_ALREADY_ANSWERED`) because regeneration never deletes files — swapping would orphan the old module's output. This is a known, documented limitation rather than a bug, but it's a real gap: today there's no supported way to say "I picked Firebase, I meant Supabase." This prompt designs and implements a `--replace` path with an explicit orphaned-file cleanup story.

## Ordering note

`05` depends only on existing `add` infrastructure and can be done in any order relative to `03`/`04`, but is sequenced last in this phase since it's the most invasive (touches file-deletion semantics, which the engine has deliberately avoided so far).

Prompts: [`../prompts/03-cli-doctor-preflight.md`](../prompts/03-cli-doctor-preflight.md), [`../prompts/04-upgrade-command.md`](../prompts/04-upgrade-command.md), [`../prompts/05-replace-technology.md`](../prompts/05-replace-technology.md)
