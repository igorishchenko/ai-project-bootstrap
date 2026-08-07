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
| 60    | `cursor`       | `.cursor/rules/<id>.mdc`, plus the base module's extra stack-agnostic rules         |
| 62    | `copilot`      | `.github/copilot-instructions.md` + `.github/instructions/<id>.instructions.md`     |
| 64    | `continue`     | `.continue/rules/<id>.md`                                                           |
| 66    | `cline`        | `.clinerules/<id>.md`                                                               |
| 68    | `roo`          | `.roo/rules/<id>.md`                                                                |
| 70    | `claude`       | `.claude/skills/<id>/SKILL.md` (frontmatter synthesized, see below)                 |
| 80    | `prompts`      | `prompts/*.md`                                                                      |
| 90    | `checklists`   | `checklists/*.md`                                                                   |
| 100   | `github`       | `.github/` CI workflow                                                              |
| 110   | `hygiene`      | eslint, prettier, husky, lint-staged, commitlint, `.editorconfig`                   |
| 115   | `templates`    | Arbitrary per-module `templates/**` content                                         |
| 120   | `readme`       | The generated project's `README.md`, `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`          |
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

## Multi-provider AI rules

`cursor` and `claude` predate the rest and stay independent, but `copilot`,
`continue`, `cline` and `roo` (`src/builders/aiProviderBuilders.ts`) are all
driven by the same source: `collectRuleSources()`
(`src/builders/ruleSources.ts`) reads every module's `cursorRule` field, plus
the base module's four extra stack-agnostic rules — which ship as
pre-rendered `.mdc`/`SKILL.md` files under `assets/base/templates/_cursor/rules/`
and `_claude/skills/` rather than through the single-file `cursorRule` field,
since one module can only hold one rule — and returns a tool-agnostic
`RuleSource[]`. Each provider builder turns that into its own file
path and frontmatter dialect; none of them require a module author to write
more than the one `cursor-rule.mdc` every module already has.

Which tools actually get output is controlled by the `aiTools` wizard
question (`config/categories.json`, a gating question like `target` — its
answer never reaches the module resolver, but it does reach
`BuildContext.selection`, which is where `enabledAiTools()` reads it from). A
config saved before this question existed has no `aiTools` key at all, which
is treated as "cursor + claude" — today's pre-existing behavior — not as
"nothing selected"; an explicit empty selection is honored and produces no
provider-specific rule files. `README.md`, `CLAUDE.md`, `AGENTS.md` and
`GEMINI.md` stay unconditional regardless of `aiTools`, the same as they were
before this question existed — they're general project documentation, not
per-technology rule output.

## Non-destructive regeneration: fingerprints and preservation

`src/core/vfs/fingerprint.ts` records a short content hash for every generated
file at generation time, stored in `ai-project.config.json` alongside the
generator's own version (`generatorVersion`, threaded through `BuildContext`
from `generate()`'s `rootDir/package.json` — see `configBuilder.ts`). On any
later regeneration (`--config` replay, `add`, or `upgrade`),
`src/core/vfs/preserve.ts` compares each candidate file's current on-disk
content against its recorded fingerprint:

- **Unchanged since generation** → safe to overwrite with the new output.
- **Changed** (a human edited it) → left alone. Regeneration only ever adds or
  preserves; it never silently overwrites hand-written work.

This is the mechanism that makes `add <technology-id>` (`src/cli/add.ts`) and
`upgrade` (`src/cli/upgrade.ts`) safe to run against a project someone has
already been working in. `VirtualFs.flush()` additionally classifies every
non-preserved file as `added`, `updated` or `unchanged` by comparing the
freshly rendered content against whatever is currently on disk (not the
fingerprint — a separate comparison) — `upgrade` is what surfaces that
breakdown, but the data is computed for every flush, dry-run included.

Regeneration deleting a file is otherwise deliberately impossible — the one
exception is `add <id> --replace`, which needs to remove whatever the
technology it's swapping out exclusively owned. Rather than trying to track
"which builder wrote which file for which module" (impossible for merged
output like `package.json`, which every module's deps flow through),
`removablePaths` (`preserve.ts`, alongside `preservedPaths`) diffs the file
set recorded at the _previous_ generation against what the _new_ selection
actually produces: anything that vanishes is a candidate for deletion, split
by the same fingerprint check `preservedPaths` uses — untouched since
generation is safe to delete, hand-edited blocks the entire replace (nothing
is deleted or written) rather than silently keeping or losing it. Merged
output never "vanishes" this way — it persists with different (correctly
recomputed) content — so it needs no special-casing at all, just the normal
flush. Deletion runs _before_ the flush that writes the new
`ai-project.config.json`, so a failure partway through leaves the old config
— and so the old selection — as the source of truth for a retry. Cleaning up
directories left empty by a deletion is out of scope; a stale empty directory
is a cosmetic issue, not a correctness one.

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

`src/cli/index.ts` is the entrypoint (`main()`). Today it dispatches six
commands: no subcommand runs the wizard (or replays `--config`/`--preset`);
`add` (`src/cli/add.ts`) retrofits one more technology into an
already-generated project by loading `ai-project.config.json`, mutating the
saved `Selection`, and re-running the same `generate()` → flush path with
`force: true` — or, with `--replace`, swaps out a single-select category's
existing answer instead of requiring it empty, deleting the old technology's
own files first (see "Non-destructive regeneration" above for exactly how);
`upgrade` (`src/cli/upgrade.ts`) is the same
`generate()` → flush path again, but _without_ mutating the selection — it
refreshes a project's output against whatever templates/builders are
installed now, reporting added/updated/unchanged file counts (see
"Non-destructive regeneration" above for where that classification comes
from) and which newly-supported AI providers the project never opted into;
`implement` (`src/cli/implement.ts`) is a different shape entirely — it
doesn't touch `Selection` or run `generate()` at all, see "Implementing a
feature" below; `doctor` (`src/cli/doctor.ts` + `src/cli/doctorChecks.ts`)
checks the local machine's tooling — Node/Git/npm always, plus mobile
(Xcode/Android SDK/Watchman/Java) and backend (Docker) tooling on request —
before generation, independent of it. Its check functions take an injected
`DoctorEnv` (command runner, platform, env vars, Node version) rather than
reading `process` directly, so they're testable without a real toolchain; and
`review` (`src/cli/review.ts` + `src/cli/reviewChecks.ts`) runs a dry-run
`generate()` (for the same added/updated classification `upgrade` reports,
here read as "drifted from today's templates" rather than acted on) plus a
handful of filesystem checks — missing declared folders, an unprotected
`.env`, hardcoded-looking secrets, suppressed lint rules — against an
already-generated project, and prints the result grouped by category
(architecture, security, performance, dx) instead of writing anything. Its
checks are pattern-based, not a real analyzer or an LLM call; see
`reviewChecks.ts` for exactly what each one does and does not catch, and the
README's "Reviewing a project" section for the same boundary stated for
users. See `.planning/roadmap/` for the commands planned on top of this
(`analyze`).

## Implementing a feature: `features/`

`implement` (`src/cli/implement.ts`) is the one command that isn't a
variation on `generate()` → flush. It doesn't touch `Selection` and it never
asks a question — it reads a project's already-saved
`ai-project.config.json` to see which technology answers a feature's
category, and writes stack-tailored content for exactly that combination.

Content lives under `features/<feature-id>/`, loaded by
`src/core/registry/loadFeatures.ts` (called directly by `implement` — unlike
modules and presets, features are never wizard-facing, so nothing else pays
for loading them):

```
features/<feature-id>/
  manifest.json                     { id, name, description, category, providers: [...] }
  providers/<technology-id>/
    plan.md                         the step-by-step implementation plan
    checklist.md                    what to verify before shipping
    prompts/*.md                    ready to hand to an AI assistant
    scaffold/**                     mirrored into the project's normal source layout
```

`manifest.json`'s `category` is which wizard category's answer selects the
provider (`authentication` reads `"auth"`); `providers` lists which
technology ids this feature has _real, distinct_ content for — validated
against the actual module registry at load time, the same way a technology's
own `requires`/`conflicts` are. There is deliberately no generic
"else" content for an unsupported provider: `implement` refuses with a clear
error naming what _is_ supported rather than emitting generic filler with the
provider's name substituted in. Content is written per-provider precisely so
two projects with different answers for the same category get genuinely
different output — see `features/authentication/providers/{supabase-auth,clerk,auth0}/`
for what that looks like in practice; each is written independently, not
templated from a shared skeleton.

`implement` builds its own `VirtualFs` (not `generate()`'s builder pipeline —
there's no per-module content to merge, just one feature's content rendered
against `{ projectName, projectSlug }`) and reuses the exact same
fingerprint-preservation mechanism described above, but scoped to the
feature: fingerprints for what it wrote live in
`implementation/<feature-id>/.manifest.json`, a small sibling of
`ai-project.config.json`'s own `generated` map, read and written with the
same `Fingerprints` type and `preservedPaths()` function — nothing new
invented for file safety. Scaffold files are skeletons with `TODO` comments
pointing back to the plan, not working implementations; that boundary is
deliberate, not a shortcut — see the prompt this feature shipped from
(`.planning/prompts/06-implement-command.md`) for why.

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
