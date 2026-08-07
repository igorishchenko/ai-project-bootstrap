# Architecture

This document describes how `ai-project-bootstrap` turns a wizard answer set into
a generated project. It's written for anyone touching `src/` — contributors,
and any AI assistant working on this repo itself (see `CONTRIBUTING.md` for the
much shorter path of adding a _technology_, which touches none of this).

## The pipeline

```
Wizard → Selection → validateSelection → resolveSelection → createBuildContext → runPipeline(builders) → VirtualFs → disk flush
```

1. **Wizard** (`src/cli/wizard.ts`) asks the questions declared in
   `config/categories.json`, in `order`, skipping any question whose `showWhen`
   isn't satisfied by earlier answers. The result is a `Selection` — a plain
   object mapping category id to the chosen module id(s).
2. **`validateSelection`** (`src/core/resolve/validate.ts`) checks the raw
   selection is well-formed: every chosen id exists, required categories are
   answered, single-select categories don't have multiple answers.
3. **`resolveSelection`** (`src/core/resolve/resolveSelection.ts`) turns a valid
   selection into the actual build set: it pulls in `requires` transitively,
   rejects `conflicts`, detects cycles, and produces a deterministic order.
4. **`createBuildContext`** (`src/core/pipeline/buildContext.ts`) assembles
   everything a builder needs — the resolved modules, their loaded assets
   (`src/core/registry/moduleAssets.ts`), and `templateData(ctx)`, the object
   every template is rendered against (`{ stack, has, ... }`, so a template can
   write `{{#if has.react-native}}`).
5. **`runPipeline`** (`src/core/pipeline/runPipeline.ts`) runs every builder in
   order against that context, each writing into...
6. **`VirtualFs`** (`src/core/vfs/virtualFs.ts`) — an in-memory tree. Nothing
   touches disk until every builder has succeeded, so a failure partway
   through never leaves a half-written project on disk.
7. **Disk flush** writes the virtual tree out, consulting the fingerprint
   mechanism (below) to skip any file a human has edited since it was last
   generated.

`generate()` (`src/core/pipeline/generate.ts`) is the pure function wrapping
steps 2–6 — no filesystem access, which is what makes the 40 cases in
`tests/generate.test.ts` fast and exhaustive.

## The builder registry

`src/builders/index.ts` is the full list, each builder declaring its own
`order` (lower runs first):

| Order | Builder        | Owns                                                                                |
| ----- | -------------- | ----------------------------------------------------------------------------------- |
| 10    | `folder`       | Project folder tree from every module's `folders.json`                              |
| 20    | `package`      | Merged `package.json` (deps, scripts)                                               |
| 30    | `env`          | `.env.example`, merged and deduplicated from every module's `env.md`                |
| 40    | `docs`         | `docs/setup.md`, `deployment.md`, `testing.md`, `coding-standards.md`, `release.md` |
| 50    | `architecture` | `docs/architecture.md`                                                              |
| 60    | `cursor`       | `.cursor/rules/<id>.mdc`                                                            |
| 70    | `claude`       | `.claude/skills/<id>/SKILL.md` (frontmatter synthesized, see below)                 |
| 80    | `prompts`      | `prompts/*.md`                                                                      |
| 90    | `checklists`   | `checklists/*.md`                                                                   |
| 100   | `github`       | `.github/` CI workflow                                                              |
| 110   | `hygiene`      | eslint, prettier, husky, lint-staged, commitlint, `.editorconfig`                   |
| 115   | `templates`    | Arbitrary per-module `templates/**` content                                         |
| 120   | `readme`       | The generated project's `README.md`, `CLAUDE.md`, `AGENTS.md`                       |
| 140   | `gitkeep`      | `.gitkeep` for any folder that would otherwise be empty                             |
| 150   | `config`       | `ai-project.config.json` — the saved selection + fingerprints                       |

Adding a **builder** means editing this list. Adding a **technology** means
adding a directory under `technologies/` and touching none of it — see
`CONTRIBUTING.md`.

## The hard invariant: no technology names in `src/`

Every builder iterates the resolved modules and reads well-known filenames
(`manifest.json`, `setup.md`, `cursor-rule.mdc`, ...) from whichever modules
were selected. None of them branch on a module id ("if id === 'stripe'").
That's what lets the catalogue grow to hundreds of technologies without the
engine changing — a new module is pure content, reviewable without reading
TypeScript.

The one deliberate exception to "no technology-specific logic" is
`claudeBuilder` (`src/builders/assetBuilders.ts`, order 70): it doesn't
special-case any _module_, but it does synthesize Claude Code's required skill
frontmatter (`name`, `description`, `paths`) from each module's manifest and
its own `cursor-rule.mdc` glob line, so Cursor and Claude activate on the same
files without a module author maintaining the glob list twice.

## Non-destructive regeneration: fingerprints and preservation

`src/core/vfs/fingerprint.ts` records a short content hash for every generated
file at generation time, stored in `ai-project.config.json`. On any later
regeneration (`--config` replay, `add`, or a future `upgrade` — see
`.planning/prompts/04-upgrade-command.md`), `src/core/vfs/preserve.ts` compares
each candidate file's current on-disk content against its recorded fingerprint:

- **Unchanged since generation** → safe to overwrite with the new output.
- **Changed** (a human edited it) → left alone. Regeneration only ever adds or
  preserves; it never silently overwrites hand-written work, and today it
  never deletes files either (see `.planning/prompts/05-replace-technology.md`
  for the one place that constraint currently blocks a feature).

This is the mechanism that makes `add <technology-id>` (`src/cli/add.ts`) safe
to run against a project someone has already been working in.

## Selection resolution: `requires`, `conflicts`, `dependencies`

`src/core/resolve/` — `requires` are hard prerequisites, pulled in
transitively (selecting a module that requires another silently adds the
other). `conflicts` are mutual exclusions, rejected at validation time.
`dependencies` are soft ordering edges only — they don't change what's
selected, just the order modules are processed in, so one module's output can
assume another's already ran.

## Merging

`src/core/merge/` handles every place two or more modules contribute to the
_same_ output file rather than owning separate files:

- `mergeJson.ts` — generic deep-merge for structured fragments
- `mergeDeps.ts` — `package.json` dependencies, resolving semver conflicts
  between two modules that both depend on (different versions of) the same
  package
- `mergeEnv.ts` — `.env.example`, deduplicating variables multiple modules
  declare
- `mergeFolders.ts` — the project folder tree from every module's
  `folders.json`

## The template engine

`src/core/template/render.ts` implements `{{var}}`, `{{#if}}`, `{{#unless}}`
and `{{#each}}` against `templateData(ctx)`. It's deliberately small — no
partials, no helpers, no third-party template library — because every module
author's content is plain markdown/JSON/config with a handful of conditionals,
not application logic. `dependencies.json` and `package.fragment.json` are
rendered _before_ being parsed as JSON, which is how a module varies its own
dependencies by what else was selected (`{{#if has.react-native}}` picks
native test tooling).

## CLI surface

`src/cli/index.ts` is the entrypoint (`main()`). Today it dispatches two
commands: no subcommand runs the wizard (or replays `--config`), and `add`
(`src/cli/add.ts`) retrofits one more technology into an already-generated
project by loading `ai-project.config.json`, mutating the saved `Selection`,
and re-running the same `generate()` → flush path with `force: true`. See
`.planning/roadmap/` for the commands planned on top of this (`doctor`,
`upgrade`, `implement`, `review`, `analyze`).

## Testing

Vitest (`vitest.config.ts`), `tests/*.test.ts`. Two tests worth knowing about
before writing more:

- **`tests/moduleContract.test.ts`** iterates every directory under
  `technologies/` and validates the file contract automatically — a malformed
  new module fails CI without anyone writing a test for it.
- **`tests/generate.test.ts`** exercises the full pipeline end-to-end against
  fixture selections in `tests/fixtures/`, entirely in-memory (`generate()` is
  pure), which is what keeps 40+ end-to-end cases fast.

Generation itself is deterministic — no timestamps, no absolute paths, stable
ordering — so the same selection always produces byte-identical output; that
property is what several of the above tests rely on.
