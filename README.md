# ai-project-bootstrap

Bootstrap the **development environment for AI-assisted development** — not
application code.

Answer a short wizard, and the generator writes the documentation, Cursor rules,
Claude skills, prompts, checklists, folder structure, environment template and
package manifest that let an AI assistant open the repository and start
implementing features correctly.

```bash
npx ai-project-bootstrap
```

## What it generates

```
docs/          setup, architecture, deployment, testing, coding-standards, release
.cursor/rules/ one rule per selected technology, plus the stack-agnostic set
.claude/skills/ one skill per selected technology, plus architecture/testing/performance
prompts/       nine reusable prompts for common tasks
checklists/    release, plus whatever the selected technologies contribute
.github/       CI workflow
.env.example   every variable from every module, documented and deduplicated
package.json   merged dependencies with version conflicts resolved
README.md  CLAUDE.md  AGENTS.md  ai-project.config.json
```

## Available technologies

The first question asks what you are building — **mobile**, **web**, or **both**
— and the rest of the wizard follows from it. Choosing both asks for a mobile
platform and then a web framework, and the generated project carries the
documentation, rules and scripts for each.

| Category | Modules |
| --- | --- |
| Mobile | React Native, Expo |
| Web | Next.js, React (Vite) |
| Backend | Supabase |
| Auth | Supabase Auth, Clerk |
| Database | SQLite, PostgreSQL |
| Payments | RevenueCat |
| Analytics | PostHog |
| Crash reporting | Sentry |
| Notifications | Expo Push, OneSignal |
| Storage | Supabase Storage, Cloudflare R2 |
| Email | Resend, SendGrid |
| Monitoring | Better Stack |
| CI/CD | GitHub Actions, GitLab CI |
| Testing | Jest, Detox |
| Deployment | EAS Submit, Fastlane |

A category with no installed modules is skipped by the wizard, so the catalogue
can grow without any change to the questions.

## Usage

```bash
npx ai-project-bootstrap                          # interactive
npx ai-project-bootstrap my-app --yes             # accept defaults
npx ai-project-bootstrap --name ./apps/my-app     # create ./apps/my-app
npx ai-project-bootstrap --config ai-project.config.json --out .   # regenerate
npx ai-project-bootstrap --dry-run                # show what would be written
npx ai-project-bootstrap --list-modules
```

The project name doubles as its location. Answer `my-app` and the project lands
in `./my-app`; answer `./apps/my-app` and that folder is created — parents and
all — with the project named `my-app` inside it. `--out` overrides the location
without touching the name.

| Flag | Meaning |
| --- | --- |
| `-o, --out <dir>` | Target directory (default: the project slug) |
| `--name <name>` | Project name or path, skipping the first question |
| `--config <file>` | Replay a saved selection instead of asking |
| `-y, --yes` | Accept defaults for every question |
| `--dry-run` | Print the file list without writing anything |
| `--force` | Write into a non-empty directory |
| `--skip <ids>` | Comma-separated builder ids to skip |
| `--list-modules` | List every available technology |

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

`category` must exist in `config/categories.json` — that file declares the
wizard's questions, and options are derived from the modules found on disk. A
category with no installed modules is skipped rather than shown empty.

A question may instead declare fixed `choices`, making it a **gating question**:
its answer shapes the wizard rather than selecting a technology. Other questions
opt in with `showWhen`, and a question ruled out this way also removes any module
that would have pulled one of its modules in — a web-only project is never
offered a mobile-only test runner.

```jsonc
{ "id": "target", "label": "What are you building?", "type": "single",
  "required": true, "allowNone": false, "order": 5,
  "choices": [{ "value": "mobile", "label": "Mobile app" },
              { "value": "hybrid", "label": "Both" }] }

{ "id": "mobile", "label": "Mobile platform", …, "showWhen": { "target": ["mobile", "hybrid"] } }
```

`requires` are hard prerequisites, pulled in transitively. `conflicts` are
mutual exclusions. `dependencies` are soft edges that only affect ordering.

### Conventions inside a module

- **`claude-skill.md`** is plain content — no frontmatter. The builder writes
  it to `.claude/skills/<id>/SKILL.md`, the directory shape Claude Code
  requires to discover a skill at all, and synthesises the frontmatter itself:
  `description` from the manifest, `paths` from the same `globs` the module's
  `cursor-rule.mdc` already declares. Cursor and Claude activate on the same
  files without the glob list living in two places.
- **`env.md`** documents variables in a markdown table with `Key`, `Required`,
  `Description` and `Example` columns. Prose around the table is ignored.
- **`dependencies.json` and `package.fragment.json` may be templated.** They are
  parsed after rendering, so a module can vary by what else was selected —
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

New modules are picked up by the test suite automatically — `tests/moduleContract.test.ts`
iterates the directory, so a malformed module fails CI without anyone writing a
test for it.

## Architecture

```
Wizard → Selection → Validation → Resolution → Builders → Virtual FS → Disk
```

- `src/core/registry/` — discovers modules and parses the file contract
- `src/core/resolve/` — validation, `requires` closure, conflicts, cycle
  detection, deterministic ordering
- `src/core/vfs/` — an in-memory tree; nothing touches disk until every builder
  has succeeded, so a failure leaves no half-written project
- `src/core/merge/` — package.json, dependencies (semver conflicts), env, folders
- `src/builders/` — fourteen independent builders, each owning one output area

**No file under `src/` names a technology.** Builders iterate the resolved
modules and read well-known filenames; they never branch on a module id. That
constraint is what lets the catalogue grow to hundreds of technologies without
the engine changing.

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

Generation is deterministic — no timestamps, no absolute paths, stable
ordering — so the same selection always produces byte-identical output.
