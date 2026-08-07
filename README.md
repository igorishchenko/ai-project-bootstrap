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
docs/          setup, architecture, roadmap, deployment, testing, coding-standards, release
prompts/       nine reusable prompts for common tasks
checklists/    release, plus whatever the selected technologies contribute
.github/       CI workflow
.env.example   every variable from every module, documented and deduplicated
package.json   merged dependencies with version conflicts resolved
README.md  CLAUDE.md  AGENTS.md  GEMINI.md  ai-project.config.json
```

`docs/architecture.md` includes Mermaid diagrams, not just prose: a component
diagram built from the resolved stack (nodes per module, edges from `requires`
plus a default frontend → backend → database backbone), a sequence diagram
per module that has one — every auth provider ships a real sign-in flow
diagram naming that provider, not a generic placeholder — and, for a selected
database technology, a starter entity-relationship diagram. That ERD is
explicitly a starting point (nothing here scaffolds real tables), not a
reflection of your actual schema — GitHub, GitLab and most markdown viewers
render Mermaid natively.

`docs/roadmap.md` is a suggested build order for exactly the stack you
selected, grouped into weeks (capped at three items each) using
`config/categories.json`'s own category ordering — backend and auth before
payments, deployment last. A category whose selected module has a matching
`ai-project-bootstrap implement <feature>` command (authentication, payments,
push notifications) names it directly. It's explicitly a starting point to
reorder or split, not a schedule handed down from above.

Plus one rule per selected technology, and the stack-agnostic set
(architecture, performance, testing, typescript), for every AI coding tool
the wizard's first question selects — Cursor and Claude Code by default,
or whichever combination you answer with:

| Tool           | Where                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------- |
| Cursor         | `.cursor/rules/<id>.mdc`                                                                       |
| Claude Code    | `.claude/skills/<id>/SKILL.md`                                                                 |
| GitHub Copilot | `.github/copilot-instructions.md` (project-wide) + `.github/instructions/<id>.instructions.md` |
| Continue.dev   | `.continue/rules/<id>.md`                                                                      |
| Cline          | `.clinerules/<id>.md`                                                                          |
| Roo Code       | `.roo/rules/<id>.md`                                                                           |

All six render the same source content (`technologies/<id>/cursor-rule.mdc`)
into each tool's own format — a module author writes one rule, not six.
OpenAI Codex reads the generated `AGENTS.md` directly, and Gemini CLI reads
the generated `GEMINI.md`, so neither needs a per-technology directory.

## Available technologies

After asking which AI tools you use, the wizard asks what you are building —
**mobile**, **web**, or **both** — and the rest follows from that. Choosing
both asks for a mobile platform and then a web framework, and the generated
project carries the documentation, rules and scripts for each.

<!-- TECH_TABLE:START -->

| Category        | Modules                                          |
| --------------- | ------------------------------------------------ |
| Mobile          | React Native, Expo                               |
| Web             | Next.js, React (Vite)                            |
| Backend         | Supabase, Firebase, FastAPI, NestJS              |
| Auth            | Supabase Auth, Clerk, Auth0                      |
| Database        | SQLite, PostgreSQL (self-managed), Firestore     |
| Features        | Dark Theme, Onboarding Flow, Localization (i18n) |
| Payments        | RevenueCat, Stripe                               |
| Analytics       | PostHog                                          |
| Crash reporting | Sentry, Crashlytics                              |
| Notifications   | Expo Push, OneSignal                             |
| Storage         | Supabase Storage, Cloudflare R2                  |
| Email           | Resend, SendGrid                                 |
| Monitoring      | Better Stack                                     |
| CI/CD           | GitHub Actions, GitLab CI                        |
| Testing         | Jest, Detox                                      |
| Deployment      | EAS Submit, Fastlane                             |

<!-- TECH_TABLE:END -->

This table is generated from `technologies/*/manifest.json` — run
`pnpm docs:tech-table` after adding or removing a module, and
`tests/techTable.test.ts` fails CI if it ever drifts out of sync.

A category with no installed modules is skipped by the wizard, so the catalogue
can grow without any change to the questions.

## Stack presets

Answering all seventeen categories from scratch is unnecessary for the common
case. A preset pre-fills the categories it covers — the wizard still shows
what it filled and lets you back out to a fully custom run before anything is
asked, and still asks about anything the preset leaves unopinionated.

| Preset        | Fills                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------ |
| `startup-mvp` | Expo + Supabase + RevenueCat + Sentry + PostHog — a fast solo/indie mobile stack           |
| `web-saas`    | Next.js + Supabase + Stripe + Resend + Sentry + PostHog — a solo/small-team web SaaS stack |
| `enterprise`  | Next.js + NestJS + PostgreSQL + GitHub Actions — a self-managed backend for a larger team  |

```bash
npx ai-project-bootstrap --preset startup-mvp             # pick a preset, review the rest interactively
npx ai-project-bootstrap --preset startup-mvp --yes       # fully non-interactive
```

`--preset` and `--config` cannot be combined — both are ways of pre-filling
the selection, and mixing them would leave it ambiguous which one wins.
Presets live in `config/presets.json` and are validated the same way a
hand-written `--config` file is: every module id must exist, and the
resulting selection must resolve without a conflict, or the tool refuses to
start rather than shipping a broken preset.

## Usage

```bash
npx ai-project-bootstrap                          # interactive
npx ai-project-bootstrap my-app --yes             # accept defaults
npx ai-project-bootstrap --name ./apps/my-app     # create ./apps/my-app
npx ai-project-bootstrap --config ai-project.config.json --out .   # regenerate
npx ai-project-bootstrap --preset startup-mvp --yes   # generate from a preset, non-interactively
npx ai-project-bootstrap --dry-run                # show what would be written
npx ai-project-bootstrap --list-modules
```

The project name doubles as its location. Answer `my-app` and the project lands
in `./my-app`; answer `./apps/my-app` and that folder is created — parents and
all — with the project named `my-app` inside it. `--out` overrides the location
without touching the name.

| Flag              | Meaning                                                          |
| ----------------- | ---------------------------------------------------------------- |
| `-o, --out <dir>` | Target directory (default: the project slug)                     |
| `--name <name>`   | Project name or path, skipping the first question                |
| `--config <file>` | Replay a saved selection instead of asking                       |
| `--preset <id>`   | Start from a curated stack — see [Stack presets](#stack-presets) |
| `-y, --yes`       | Accept defaults for every question                               |
| `--dry-run`       | Print the file list without writing anything                     |
| `--force`         | Write into a non-empty directory                                 |
| `--skip <ids>`    | Comma-separated builder ids to skip                              |
| `--list-modules`  | List every available technology                                  |

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
be filled in when empty, or swapped out with `--replace`:

```bash
npx ai-project-bootstrap add supabase --replace
npx ai-project-bootstrap add supabase --replace --dry-run   # preview first
```

No need to name what's being replaced — with one answer per single-select
category, it's inferred from the project itself. This deletes the old
technology's own files (`.cursor/rules/<id>.mdc`, `.claude/skills/<id>/`, and
so on for every AI provider — see [What it generates](#what-it-generates))
and regenerates merged output (`package.json`, `.env.example`, ...) from
scratch, so it reflects only what's still selected. If any of the old
technology's own files were hand-edited since generation, the whole replace
is refused and nothing changes — move or remove them yourself, then run it
again. (Directories left empty by a replace aren't cleaned up automatically —
a cosmetic gap, not a correctness one.)

Multi-select categories (analytics, testing, crash-reporting) just grow —
`--replace` doesn't apply to them, and there's no `add`-side way to remove a
single item from one yet. `add --help` covers the rest.

## Upgrading a project

`add` brings in something new; `upgrade` refreshes what is already there —
bring a project's rules, prompts, docs and hygiene config up to date with
whatever version of `ai-project-bootstrap` is installed now, using the exact
same selection it was generated with:

```bash
cd my-app
npx ai-project-bootstrap upgrade
npx ai-project-bootstrap upgrade --dry-run       # preview first
npx ai-project-bootstrap upgrade --dir ../my-app # from elsewhere
```

It reports what actually changed — added, updated, and how many files were
already current — and, same as `add`, never touches a file you have
hand-edited since it was generated. Nothing is added to or removed from the
stack; that's what `add` is for. If newer AI tools are supported than this
project originally selected, `upgrade` says so without adding them itself —
edit `"aiTools"` in `ai-project.config.json` and upgrade again to include
them. `upgrade --help` covers the rest.

## Implementing a feature

Everything so far scaffolds the project or wires in a technology. `implement`
goes a step further: it writes a stack-tailored implementation plan, AI
prompts, a validation checklist and a handful of skeleton files for a
_specific feature_ — not the whole project, and not a full implementation
either. You (or your AI assistant, using the generated prompts) write the
actual logic; `implement` makes sure it's tailored to exactly the stack you
picked rather than generic advice with the provider name swapped in.

```bash
npx ai-project-bootstrap implement --list-features
npx ai-project-bootstrap implement authentication
npx ai-project-bootstrap implement authentication --dry-run   # preview first
```

It reads `ai-project.config.json` to see which technology answers the
feature's category — `authentication` reads `auth`, `payments` reads
`payments`, and so on — with no question asked. Two projects that answer
`auth` differently get genuinely different output from the same command:

```bash
$ ai-project-bootstrap implement authentication   # a project with Supabase Auth selected

Implementing Authentication (Supabase Auth) in my-app…

Feature    Authentication — Supabase Auth
Plan       implementation/authentication/plan.md
Checklist  implementation/authentication/checklist.md
Prompts    1
    implementation/authentication/prompts/implement.md
Scaffold   4
    src/features/auth/authClient.ts
    src/features/auth/screens/SignInScreen.tsx
    src/features/auth/screens/SignUpScreen.tsx
    src/hooks/auth/useAuth.ts
```

`implementation/authentication/plan.md` opens with session persistence via
`AsyncStorage` and the Row Level Security policies that actually gate access
— because this project picked Supabase Auth. Run the identical command
against a project that picked Clerk instead, and the plan opens with
`ClerkProvider` and a secure token cache, the scaffold has no `authClient.ts`
(Clerk's own hooks _are_ the client), and there's a
`useAuthedFetch.ts` hook attaching a bearer token to your backend instead.
Same command, same feature, deliberately different output.

Currently covered, each with real content for every provider this project
supports — not a generic template:

| Feature              | Reads category  | Providers                   |
| -------------------- | --------------- | --------------------------- |
| `authentication`     | `auth`          | Supabase Auth, Clerk, Auth0 |
| `payments`           | `payments`      | RevenueCat, Stripe          |
| `push-notifications` | `notifications` | Expo Push, OneSignal        |

Re-running is safe — a scaffold file you've hand-edited since it was written
is left alone, the same fingerprint-based protection `add` and `upgrade`
use, tracked per feature in `implementation/<feature>/.manifest.json`.
`implement --help` covers the rest.

## Reviewing a project

`review` runs a static, AI-oriented pass over an already-generated project and
reports findings across four categories — architecture, security,
performance, dx — instead of raw linter output:

```bash
npx ai-project-bootstrap review
npx ai-project-bootstrap review --report            # also write review-report.md
npx ai-project-bootstrap review --fail-on warning   # for CI — see exit codes below
```

```
Security
  ✖ .env exists but is not listed in .gitignore.
      .gitignore
      → Add ".env" to .gitignore immediately — real secrets are one `git add .` away from being committed.
  ! eslint-disable suppresses a check instead of fixing the cause.
      src/lib/analytics.ts:12
      → Fix the underlying issue, or leave a comment explaining why this one is a deliberate exception.

Performance
  ℹ .cursor/rules/nextjs.mdc (Next.js)
```

What it checks, honestly:

- **Architecture** — a folder a selected technology declares (`folders.json`)
  that no longer exists on disk.
- **Security** — `.env` present but not gitignored; a credential-shaped
  string literal assigned directly in `src/`, `server/`, `app/` or `api/`
  (never a value read from `process.env` or a placeholder like
  `"your-api-key"`); an `eslint-disable`, `@ts-ignore` or `@ts-nocheck`
  comment, none of which the generated `eslint` config flags on its own.
- **Performance** — pointers to the stack-specific rule file already
  generated for each selected technology (wherever it actually exists on
  disk, given the AI tools this project chose), not pass/fail findings.
  Reliably checking real performance concerns — unnecessary re-renders, N+1
  queries, bundle size — needs runtime profiling or a bundler pass, neither
  of which a static scan can do.
- **DX** — generated files that would come out differently if regenerated
  with today's templates (the same diff `upgrade --dry-run` would show).

What it does **not** do: this is pattern-based static analysis — grep-like
checks, config validation, existence checks — not a general-purpose static
analyzer, and not an LLM call (the package has no AI-provider dependency).
It will miss anything that needs actual type information, control-flow
analysis, or judgment about your specific domain. It doesn't check whether
`.env` itself is filled in — that's `npm run doctor` inside the generated
project — and it doesn't modify anything; run `upgrade` to act on a `dx`
finding.

Exit code is non-zero once any finding is at or above `--fail-on`'s severity
(`critical`, `warning` or `info`; default `critical`) — safe to wire into CI.
`review --help` covers the rest.

## Analyzing any repository

`review` needs `ai-project.config.json` to know the stack. `analyze` doesn't
— it works against **any** repository, including ones this tool never
generated, inferring the stack from `package.json` dependencies and known
config files instead:

```bash
npx ai-project-bootstrap analyze
npx ai-project-bootstrap analyze --dir ../someone-elses-repo
npx ai-project-bootstrap analyze --report   # also write analyze-report.md
```

```
Detected stack
  ◆ Next.js (Web framework) — high confidence
      package.json dependency "next"

Architecture  70/100
  ! No tests found.
      → Even a handful of tests around the riskiest logic catches regressions a README never will.
```

**Detection is a guess, and says so.** Every entry names its own evidence and
confidence: `high` means an exact `package.json` dependency match; `medium`
means only a config file's presence (e.g. `requirements.txt` says "some
Python framework," not specifically which). A package name declared by more
than one technology — `react` alone can't tell Next.js, Vite and React
Native apart — is never used as a signal at all, rather than guessed at.

**Scoring rubric** — four categories, each out of 100, fixed and additive
(or subtractive for security) rather than a black box:

| Category          | Points come from (out of 100)                                                                                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Architecture**  | A recognized source directory — `src`, `app`, `lib`, `server` or `api` (30); tests present (30); a lint config (20); `package.json` declaring both a `build` script and a `test`/`lint` script (20) |
| **Security**      | Starts at 100. `-25` per hardcoded-looking credential, `-30` for an ungitignored `.env`, `-5` per lint-suppression comment (capped at `-20` total), `-10` for no `.gitignore` at all                |
| **Performance**   | `.gitignore` excludes `node_modules` (30); a recognized bundler/build config exists (40); no committed image over 1MB (30)                                                                          |
| **Documentation** | `README.md` (40); `CONTRIBUTING.md` (20); a `LICENSE` file (15); a `docs/` directory with markdown content (15); `package.json`'s `description` filled in (10)                                      |

Security and performance checks are the same functions `review` uses — a
hardcoded secret or an ungitignored `.env` means the same thing whether or
not the repo has an `ai-project.config.json`. Architecture and documentation
scoring is JS/TS-shaped throughout (a Python or Go repo will score low on
"source directory" and "lint config" regardless of how well-organized it
actually is) — an honest limitation, not hidden.

**What it deliberately excludes**: dependency-vulnerability scanning
(`npm audit` and similar need a live registry lookup — this command stays
fully offline; run it yourself for that) and any auto-fixing — `analyze`
reports, the same boundary `review` draws. If the target has
`ai-project.config.json`, `analyze` says so and points at `review` for more
precise, stack-aware findings, but still runs its own generic pass rather
than refusing. `analyze --help` covers the rest.

## Checking your environment

`doctor` checks whether this machine can actually build what you are about
to generate — before you spend a wizard run finding out the hard way:

```bash
npx ai-project-bootstrap doctor              # Node, Git, npm, Bun — always
npx ai-project-bootstrap doctor --mobile     # + Xcode, Android SDK, Watchman, Java
npx ai-project-bootstrap doctor --backend    # + Docker
npx ai-project-bootstrap doctor --all        # everything
npx ai-project-bootstrap doctor --for startup-mvp   # exactly what that preset needs
```

Node, Git and npm are the only checks that affect the exit code — everything
else (Bun, Xcode, Android SDK, Watchman, Java, Docker) is informational, since
this machine may simply not be the one you use for that platform. With no
flags, an interactive terminal is asked which extra tooling to check; a
non-interactive one (CI, a pipe) runs the universal checks only. `doctor
--help` covers the rest.

This is separate from the `npm run doctor` a _generated_ project ships with,
which checks that project's own `.env` and setup — this one checks the
machine, before anything has been generated at all.

## Adding a technology

**Create one folder. Change no code.**

```
technologies/<id>/
  manifest.json          required — everything else is optional
  setup.md  cursor-rule.mdc  claude-skill.md  env.md  folders.json
  package.fragment.json  dependencies.json  detect.json  prompts/*.md
  checklists/*.md  templates/**   → mirrored into the project root
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
