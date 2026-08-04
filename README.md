# create-ai-project

Bootstrap the **development environment for AI-assisted development** — not
application code.

Answer a short wizard, and the generator writes the documentation, Cursor rules,
Claude skills, prompts, checklists, folder structure, environment template and
package manifest that let an AI assistant open the repository and start
implementing features correctly.

```bash
npx create-ai-project
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

| Category | Modules |
| --- | --- |
| Platform | React Native, Expo |
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
npx create-ai-project                          # interactive
npx create-ai-project my-app --yes             # accept defaults
npx create-ai-project --config ai-project.config.json --out .   # regenerate
npx create-ai-project --dry-run                # show what would be written
npx create-ai-project --list-modules
```

| Flag | Meaning |
| --- | --- |
| `-o, --out <dir>` | Target directory (default: the project slug) |
| `--name <name>` | Project name, skipping the first question |
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
  claude-skill.md        → .claude/skills/<id>.md
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

`requires` are hard prerequisites, pulled in transitively. `conflicts` are
mutual exclusions. `dependencies` are soft edges that only affect ordering.

### Conventions inside a module

- **`env.md`** documents variables in a markdown table with `Key`, `Required`,
  `Description` and `Example` columns. Prose around the table is ignored.
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
