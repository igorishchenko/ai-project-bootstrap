# Contributing

## Setup

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck and test on every PR, plus
a second job that generates a full-stack project from
`tests/fixtures/ci-full-stack.json` and runs _its_ setup, doctor, lint,
typecheck and tests — proving the generator's output actually works, not just
that the generator's own code compiles.

Before opening a PR: `pnpm test && pnpm lint && pnpm typecheck` should all
pass locally. If you touched `README.md`'s technology table by hand, run
`pnpm docs:tech-table` — `tests/techTable.test.ts` fails CI if the checked-in
table drifts from `technologies/*/manifest.json`.

## Adding a technology

**Create one folder. Change no code.**

```
technologies/<id>/
  manifest.json          required — everything else is optional
  setup.md               → a section in docs/setup.md
  ios.md  android.md     → platform subsections of that section
  architecture.md        → a section in docs/architecture.md
  cursor-rule.mdc        → .cursor/rules/<id>.mdc
  claude-skill.md        → .claude/skills/<id>/SKILL.md
  env.md                 → .env.example
  folders.json           → project folders
  package.fragment.json  → package.json
  dependencies.json      → dependencies + install commands
  prompts/*.md           → prompts/
  checklists/*.md        → checklists/
  templates/**           → mirrored into the project root
```

A missing file means the module contributes nothing to that builder. The
manifest:

```json
{
  "id": "stripe",
  "name": "Stripe",
  "category": "payments",
  "description": "Card payments and subscriptions.",
  "requires": [],
  "conflicts": [],
  "dependencies": [],
  "priority": 45
}
```

- `category` must exist in `config/categories.json` — that file declares the
  wizard's questions, and options are derived from the modules found on disk.
  A category with no installed modules is skipped rather than shown empty.
- `priority` controls display/generation order _within_ a category (lower
  first) — it's what keeps `README.md`'s technology table and the wizard's
  option order stable and intentional as the catalogue grows (see
  `scripts/generate-tech-table.mjs`).
- `requires` are hard prerequisites, pulled in transitively. `conflicts` are
  mutual exclusions. `dependencies` are soft edges that only affect ordering.

A question may instead declare fixed `choices` in `config/categories.json`,
making it a **gating question**: its answer shapes the wizard rather than
selecting a technology. Other questions opt in with `showWhen`, and a
question ruled out this way also removes any module that would have pulled
one of its modules in — a web-only project is never offered a mobile-only
test runner.

```jsonc
{ "id": "target", "label": "What are you building?", "type": "single",
  "required": true, "allowNone": false, "order": 5,
  "choices": [{ "value": "mobile", "label": "Mobile app" },
              { "value": "hybrid", "label": "Both" }] }

{ "id": "mobile", "label": "Mobile platform", …, "showWhen": { "target": ["mobile", "hybrid"] } }
```

### Conventions inside a module

- **`claude-skill.md`** is plain content — no frontmatter. The builder writes
  it to `.claude/skills/<id>/SKILL.md`, the directory shape Claude Code
  requires to discover a skill at all, and synthesises the frontmatter itself:
  `description` from the manifest, `paths` from the same `globs` the module's
  `cursor-rule.mdc` already declares. Cursor and Claude activate on the same
  files without the glob list living in two places.
- **`env.md`** documents variables in a markdown table with `Key`, `Required`,
  `Description` and `Example` columns. Prose around the table is ignored.
- **`dependencies.json` and `package.fragment.json` may be templated.** They
  are parsed after rendering, so a module can vary by what else was selected —
  `{{#if has.react-native}}` picks native test tooling, and a web framework
  namespaces its `start` script when a mobile platform already defines one.
- **`templates/`** has three reserved subtrees: `root/` (project root),
  `github/` (`.github/`) and `hygiene/` (lint, format and hook configs).
  Everything else mirrors to the project root at its own path.
- **`_name`** in a template path becomes `.name` on output — npm rewrites a
  packaged `.gitignore`, so sources store `_gitignore`.
- Every text asset is rendered with `{{var}}`, `{{#if}}`, `{{#unless}}` and
  `{{#each}}` against the full stack, so module content can adapt to what else
  was selected.

New modules are picked up by the test suite automatically —
`tests/moduleContract.test.ts` iterates the directory, so a malformed module
fails CI without anyone writing a test for it. If your module's category is
new to the "Available technologies" table, run `pnpm docs:tech-table` (or just
let `pnpm test` tell you it's out of sync) before opening a PR.

## Changing the engine (`src/`)

If you're touching `src/` rather than adding a module, read `ARCHITECTURE.md`
first — in particular the invariant that **no file under `src/` names a
specific technology**. Builders iterate the resolved modules and read
well-known filenames; they never branch on a module id. That constraint is
what keeps adding a technology a content-only change, and it's worth
preserving deliberately when you're tempted to special-case one module's
behavior in a builder.

## Commit style

Recent history follows Conventional Commits (`feat:`, `fix:`, `chore:`,
`docs:`) — see `CHANGELOG.md` for how that maps to release notes. Releases are
tagged `chore: release vX.Y.Z` commits; this package is pre-1.0 and
"Work in progress — expect breaking changes" per its npm description, so
`feat:` commits may still land breaking changes without a major bump.

## Roadmap

Larger planned work — new CLI commands, multi-provider AI rules support,
SaaS starter templates, and more — is tracked in `.planning/`, organized as a
sequence of self-contained implementation prompts. See
`.planning/README.md` for the index if you're looking for something
substantial to pick up.
