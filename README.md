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

<!-- TECH_TABLE:START -->

| Category        | Modules                                      |
| --------------- | -------------------------------------------- |
| Mobile          | React Native, Expo                           |
| Web             | Next.js, React (Vite)                        |
| Backend         | Supabase, Firebase, FastAPI, NestJS          |
| Auth            | Supabase Auth, Clerk, Auth0                  |
| Database        | SQLite, PostgreSQL (self-managed), Firestore |
| Payments        | RevenueCat, Stripe                           |
| Analytics       | PostHog                                      |
| Crash reporting | Sentry, Crashlytics                          |
| Notifications   | Expo Push, OneSignal                         |
| Storage         | Supabase Storage, Cloudflare R2              |
| Email           | Resend, SendGrid                             |
| Monitoring      | Better Stack                                 |
| CI/CD           | GitHub Actions, GitLab CI                    |
| Testing         | Jest, Detox                                  |
| Deployment      | EAS Submit, Fastlane                         |

<!-- TECH_TABLE:END -->

This table is generated from `technologies/*/manifest.json` — run
`pnpm docs:tech-table` after adding or removing a module, and
`tests/techTable.test.ts` fails CI if it ever drifts out of sync.

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

| Flag              | Meaning                                           |
| ----------------- | ------------------------------------------------- |
| `-o, --out <dir>` | Target directory (default: the project slug)      |
| `--name <name>`   | Project name or path, skipping the first question |
| `--config <file>` | Replay a saved selection instead of asking        |
| `-y, --yes`       | Accept defaults for every question                |
| `--dry-run`       | Print the file list without writing anything      |
| `--force`         | Write into a non-empty directory                  |
| `--skip <ids>`    | Comma-separated builder ids to skip               |
| `--list-modules`  | List every available technology                   |

## Growing a project after the fact

Nobody picks their whole stack on day one. `add` puts one more technology into
a project this tool already generated, without starting over:

```bash
cd my-app
npx ai-project-bootstrap add stripe
npx ai-project-bootstrap add stripe --dry-run     # preview first
npx ai-project-bootstrap add stripe --dir ../my-app   # from elsewhere
```

It loads the project's `ai-project.config.json`, adds the technology to the
saved selection, and regenerates — the same fingerprint-based preservation as
a normal `--config` regeneration, so anything you have hand-edited since it
was generated is left alone.

A category that only allows one choice (payments, database, backend, ...) can
be filled in when empty, but not swapped once answered: replacing an
already-selected technology would leave its old files behind, since
regeneration only ever adds or preserves — it never deletes. Multi-select
categories (analytics, testing, crash-reporting) just grow. `add --help`
covers the rest.

## Adding a technology

**Create one folder. Change no code.**

```
technologies/<id>/
  manifest.json          required — everything else is optional
  setup.md  cursor-rule.mdc  claude-skill.md  env.md  folders.json
  package.fragment.json  dependencies.json  prompts/*.md  checklists/*.md
  templates/**           → mirrored into the project root
```

A missing file means the module contributes nothing to that builder, and new
modules are picked up by the test suite automatically —
`tests/moduleContract.test.ts` iterates the directory, so a malformed module
fails CI without anyone writing a test for it. Full file contract, templating
conventions and the gating-question mechanism: **[CONTRIBUTING.md](CONTRIBUTING.md)**.

## Architecture

```
Wizard → Selection → Validation → Resolution → Builders → Virtual FS → Disk
```

**No file under `src/` names a technology** — builders iterate the resolved
modules and read well-known filenames, never branching on a module id. That
constraint is what lets the catalogue grow to hundreds of technologies without
the engine changing. Full pipeline, builder registry and the fingerprint-based
preservation mechanism: **[ARCHITECTURE.md](ARCHITECTURE.md)**.

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
Contribution workflow: **[CONTRIBUTING.md](CONTRIBUTING.md)**. Release
history: **[CHANGELOG.md](CHANGELOG.md)**. Planned features and how to pick
one up: **[.planning/](.planning/README.md)**.
