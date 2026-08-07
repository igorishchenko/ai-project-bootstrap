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
| 55    | `roadmap`      | `docs/roadmap.md`                                                                   |
| 56    | `costs`        | `docs/costs.md`                                                                     |
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

## Architecture diagrams

`architectureBuilder` (`src/builders/architectureBuilder.ts`) emits three
kinds of Mermaid diagram into `docs/architecture.md`, all derived from the
resolved module selection rather than hand-drawn — no new module-contract
file was needed for any of them:

- **Component diagram** (`stackDiagram`) — a `flowchart TD` built from
  `ctx.categories` and the resolved modules: `app → category layer → module`
  for the tree, plus two kinds of edges beyond it. `requiresEdges` draws a
  dashed edge for every `manifest.requires` pair the resolver already
  computed (e.g. `supabase-auth -.->|requires| supabase`) — no guessing,
  just naming a dependency that already exists. `backboneEdges` draws a
  generic frontend → backend → database default (`web`/`mobile` →
  `backend` → `database`, connecting whichever of those three category ids
  are actually present) — these are the only technology-shaped ids this
  function is allowed to know about, since they're category ids from
  `config/categories.json`, not technology ids, and referencing them doesn't
  break the no-technology-names invariant below.
- **Sequence diagrams** — no new mechanism at all: any module's
  `technologies/<id>/architecture.md` can embed a ` ```mermaid ` block
  directly, and `architectureBuilder` already renders that content verbatim
  into the doc's "Flows" section. Every auth provider (`supabase-auth`,
  `clerk`, `auth0`) does exactly this for its own sign-in flow, so two
  projects with a different auth answer get a genuinely different diagram,
  not a placeholder with the name swapped in.
- **Starter ERD** — same mechanism again: `postgresql`, `sqlite` and
  `firestore` each embed an `erDiagram` block in their own
  `architecture.md`, under a "Starter data model" heading that says plainly
  this is a starting point to replace, not a reflection of the eventual real
  schema (there is no schema to infer at generation time — these modules
  scaffold no tables).

Because the sequence and ERD content lives entirely in each module's own
`architecture.md`, `stackDiagram`'s helpers (`backboneEdges`, `requiresEdges`)
are the only part of this that lives in `src/` — and they only ever look at
category ids and the already-resolved `requires` graph, never a technology id.

## Roadmap generation

`roadmapBuilder` (`src/builders/roadmapBuilder.ts`) emits `docs/roadmap.md` —
a suggested build order, grouped into weeks capped at three items each. The
ordering heuristic is deliberately the cheapest thing that could work:
`config/categories.json`'s own `order` field already encodes a reasonable
dependency-aware sequence (backend and auth before payments, deployment
last), so this reuses it instead of inventing a second priority system.
`isGatingQuestion` (see `src/core/types.ts`) excludes `aiTools`/`target`
automatically; a small `PLATFORM_CATEGORIES` set excludes `mobile`/`web`
explicitly, since picking a framework isn't a week of work the way wiring up
auth is — the project already has a working skeleton for it on day one.

Naming the exact `ai-project-bootstrap implement <feature>` command for a
roadmap item (when one exists) needed a lightweight read of `features/`
manifests from inside a builder — something no builder previously needed,
since `implement` (see "Implementing a feature" below) loads `features/`
directly and outside the `generate()` pipeline entirely. Two changes made
that possible: `BuildContext` gained a `rootDir` field (`generate()` already
receives it; threading it through `createBuildContext` was the only
plumbing needed), and `loadFeatures.ts` gained `loadFeatureIndex(rootDir)` —
manifests only, none of the plan/checklist/prompt content or full-registry
provider validation `loadFeatures()` does, since a feature's `providers`
legitimately names technology ids this particular project never selected.
Cheap enough to call on every generation, unlike the full loader.

## Cost estimation

`Manifest.pricing` (`src/core/types.ts`, validated by `manifestSchema.ts`)
is an optional, manually-curated field — `{ model, estimateUsd?, notes?,
url? }`, `model` one of `free`/`flat`/`freemium`/`usage-based`. No live
pricing API, no network call at generation time: this is exactly as fresh
as the last time a maintainer checked a vendor's pricing page, the same
"maintainers keep the catalogue honest over time" trust model as every
other piece of module content. See `CONTRIBUTING.md` for the full field
contract module authors follow.

`summarizeCosts()` (`src/core/pricing.ts`) is the one function that reads
this data — a pure `LoadedModule[] → CostSummary` reducer with no CLI or
builder knowledge, so both consumers below share the exact same bucketing
logic instead of two implementations quietly drifting apart:

- **`costsBuilder`** (`src/builders/costsBuilder.ts`) writes the full
  breakdown to `docs/costs.md` at generation time.
- **`Reporter.summary()`** (`src/cli/reporter.ts`) prints the one-line
  `Est. cost` summary at the end of `main()` and `runAdd()` — both already
  had a `GenerateResult` in hand, so `generate()` computes `costSummary`
  once (via the same `summarizeCosts()`) and both call sites pass it
  straight through, rather than each recomputing it from `ctx.modules`.

Four buckets, never blended into one number: `estimated` (flat/freemium
with a real `estimateUsd` — the only ones summed into `totalUsd`),
`free`, `usageBased` (a real cost, no honest flat number), and `unknown`
(no `pricing` field at all — the common case, and never treated as $0).

**Extension point, not built here**: `doctor` and `analyze` could each
surface cost data too (`doctor --for <preset>` naming a preset's rough
monthly cost before generation; `analyze` estimating cost for a detected
stack) — both would call the same `summarizeCosts()`, `doctor` on a
preset's modules, `analyze` on `detectStack()`'s results, mapped back to
`LoadedModule`s via the registry. Neither integration exists yet; this is
deliberately scoped to producing the data and the primary summary output.

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

`src/cli/index.ts` is the entrypoint (`main()`). Today it dispatches seven
commands: no subcommand runs the wizard (or replays
`--config`/`--preset`/`--archetype` — see "Starter templates" below for the
last one);
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
users. `analyze` (`src/cli/analyze.ts` + `src/cli/analyzeChecks.ts`) is
`review`'s strictly-harder sibling — see "Analyzing an arbitrary repository"
below.

## Analyzing an arbitrary repository

`review` gets to assume `ai-project.config.json` exists and names the exact
stack. `analyze` has neither: it runs against any repository — including
ones this tool never generated — and has to infer everything from the
filesystem instead.

**Stack detection** (`detectStack` in `analyzeChecks.ts`) has two signals,
each carrying its own confidence so a guess is never shown as a fact.
`high` confidence comes from a `package.json` dependency matching a name in
a module's own `dependencies.json` — read from the already-parsed
`LoadedModule.dependencies`, or regex-extracted from the raw
`dependenciesRaw` text for the one module (`jest`) whose `dependencies.json`
is templated; the `"name": "..."` fields themselves are never inside a
`{{#if}}` block, so the regex needs no awareness of the templating syntax at
all. A package name more than one module declares (`react`, shared by
`nextjs`, `react-native` and the Vite `react` module) is excluded from
matching entirely — `ambiguousPackageNames()` computes this once from the
whole registry, since presence alone can't tell those modules apart.
`medium` confidence comes from a module's optional `detect.json` — new in
this prompt, `{ "configFiles": [...] }`, for the handful of modules with no
npm package of their own (`fastapi`, `github-actions`, `gitlab-ci`,
`eas-submit`) — read directly from `module.root` at analysis time rather
than threaded through `LoadedModule` the way `folders`/`env` are, since
`analyze` is its only consumer.

**Scoring** (`scoreArchitecture`, `scoreSecurity`, `scorePerformance`,
`scoreDocumentation`) is four independent, fixed rubrics — see the README's
"Analyzing any repository" section for the exact point values, kept in sync
by hand since there's no single source both the docs and the code could
read from without adding indirection for four short functions. Security and
performance reuse `review`'s own `checkHardcodedSecrets`, `checkEnvGitignored`
and `checkLintSuppressions` directly (the shared `Finding`/`FindingCategory`
types in `reviewChecks.ts` gained a `documentation` category so `analyze`'s
own findings fit the same shape) — a hardcoded secret means the same thing
whether or not `ai-project.config.json` exists. Architecture and
documentation have no `review` equivalent (there's no folder-declaring
`Selection` to check against, and a generated project always has docs), so
those two are `analyze`-only.

Dependency-vulnerability scanning is deliberately not implemented: a
trustworthy result needs a live CVE lookup, which conflicts with staying
fully offline, and `npm audit`'s own false-positive rate makes it unsuitable
to fold into a score silently. If the target has an `ai-project.config.json`,
`analyze` prints a one-line pointer at `review` for more precise findings
but still completes its own generic pass — deliberately not a hard
short-circuit, so `analyze` remains usable even against this tool's own
output.

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

## Starter templates: `archetypes/`

An archetype composes three things that already exist rather than
introducing a fourth content-authoring shape: a preset-shaped `choices`
selection (reusing `validateSelection`/`resolveSelection` — the exact
pipeline `loadPresets.ts` validates a preset's `choices` through), the
normal `generate()` builder pipeline (completely unmodified — an archetype
never touches `Selection`, `BuildContext`, or the builder registry), and a
second, `implement`-shaped scaffold-writing pass layered on top of the
_same_ `VirtualFs` `generate()` already produced (`applyArchetype()`,
`src/cli/archetype.ts`) — not a fresh one, since there's no fingerprinting
concern here: an archetype only ever runs once, at first generation,
never against an already-generated project the way `implement` does.

```
archetypes/<id>/
  manifest.json           { id, name, description, choices }
  package.fragment.json   optional, merged into package.json via mergeJson
  scaffold/**              optional, mirrored into the project root
```

`loadArchetype()` (`src/core/registry/loadArchetypes.ts`) is deliberately
not part of `Registry`/`loadRegistry()` — like `loadFeatures()`, nothing
should pay for reading `scaffold/**` content except `--archetype` itself.
`src/cli/index.ts` synthesizes a one-off `Preset` object from the
archetype's manifest (`{id, name, description, choices}` — identical shape
by design) and passes it to `runWizard()` the same way `--preset` does, so
prefilling/reviewing an archetype's answers needed zero changes to
`wizard.ts` — the wizard has no idea "archetype" exists as a concept, only
"a preset was chosen." The one thing genuinely new: `VirtualFs.mergeJson()`
doesn't check ownership the way `write()` does (re-tagging instead of
throwing `PATH_COLLISION`), which is what lets a `package.fragment.json`
merge safely into a `package.json` the `package` builder already wrote,
without a special case.

Building the first archetype (`habit-tracker`) surfaced two real,
previously-undiscovered gaps in the base template shared by every generated
project — `@types/node` was never installed anywhere despite every
module's own docs telling users to read `process.env`, and `dark-theme`
didn't handle react-native's `"unspecified"` `ColorSchemeName` value —
neither caught by the test suite because nothing had ever generated,
`npm install`ed and typechecked a project with real application code in it
before. Both are fixed at the source (`assets/base/dependencies.json` +
`assets/base/templates/tsconfig.json`'s now-conditional `"types"` array;
`technologies/dark-theme/templates/src/theme/ThemeProvider.tsx`), not
special-cased in the archetype — see `CONTRIBUTING.md`'s "Adding an
archetype" section for why "actually run it" is now a stated part of that
checklist, not just this one's.

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
