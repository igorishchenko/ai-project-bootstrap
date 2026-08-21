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

**New here?** [USAGE.md](USAGE.md) is the task-first tour — what you can do,
which command does it, and where each part's instructions live. This README is
the reference underneath it.

## What it generates

```
docs/          setup, architecture, roadmap, costs, deployment, testing, coding-standards, release
prompts/       ten reusable prompts for common tasks
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

`docs/costs.md`, and a one-line `Est. cost` summary at the end of the run,
estimate the monthly cost of the paid services you selected — see
"Estimating monthly cost" below.

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

`--preset`, `--archetype`, `--idea` and `--config` cannot be combined — all
four are ways of pre-filling the selection, and mixing them would leave it
ambiguous which one wins. Presets live in `config/presets.json` and are validated the
same way a hand-written `--config` file is: every module id must exist, and
the resulting selection must resolve without a conflict, or the tool refuses
to start rather than shipping a broken preset.

## Starter templates

A preset picks a stack. An **archetype** picks a stack _and_ scaffolds a
real, running starting point on top of it — actual screens wired to an
actual data model, not just dependencies:

```bash
npx ai-project-bootstrap --archetype habit-tracker             # pick it, review the rest interactively
npx ai-project-bootstrap --archetype habit-tracker --yes       # fully non-interactive
```

| Archetype       | Stack                                        | Scaffolds                                                                                                                                     |
| --------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `habit-tracker` | Expo + Supabase + Supabase Auth + Dark Theme | `habits`/`habit_checkins` tables with Row Level Security, email magic-link sign-in, a habit list + add-habit screen with real streak tracking |

`--archetype` pre-fills the wizard exactly the way `--preset` does — same
review-before-generating flow, same "still asks about anything left
unopinionated" behavior (payments, analytics, notifications and the rest
are yours to add with `add <technology-id>` afterward, kept out of the
default to keep the starter's first-run surface small). What's different is
what happens after: a second pass writes the archetype's own
`scaffold/**` — real `.ts`/`.tsx` source and a Supabase migration file, not
just docs — into the same project, rendered through the identical
`{{var}}` templating every `technologies/*` module already uses.

Generate one, then read `docs/starter-template.md` in the result — it
documents exactly what got scaffolded, what's deliberately not wired in (no
router — this generator never scaffolds one, for any project — see
`docs/architecture.md`), and how to apply the migration before running it.

Only one archetype ships today, deliberately — see `CONTRIBUTING.md` for
the full contract if you want to add another. An archetype is
`archetypes/<id>/manifest.json` (a `choices` selection, shaped exactly like
a `config/presets.json` entry) plus `archetypes/<id>/scaffold/**`, the same
way a technology is a `manifest.json` plus `templates/**` — adding one
touches no code in `src/`.

## Describe your idea (Pro)

Don't know which technologies you want yet? Describe the project instead:

```bash
npx ai-project-bootstrap login   # once, per machine
npx ai-project-bootstrap --idea "a habit tracker for runners, web app, cheap to run"
```

This sends your idea to a hosted backend, which builds the full installed
technology catalog, asks an LLM for a proposed stack, and returns it — the
same kind of one-off pre-fill `--preset` and `--archetype` are, so it goes
through the identical review: a short "why this stack" note, then the usual
preset-style confirm-or-back-out-to-custom prompt before anything is
written. Nothing is generated from an unreviewed AI guess.

**`--idea` is a Pro feature** — every call spends real hosting/API budget,
so unlike the rest of this tool it isn't free and has no trial. It requires
an active subscription and the key emailed to you right after checkout (also
on your dashboard). Without one, the CLI fails immediately with a clear
message rather than making a request that would just be rejected.
`--idea` calls `https://api.ai-project-bootstrap.com` by default — set
`AI_PROJECT_BOOTSTRAP_API_URL` to point elsewhere, such as a backend running
on your own machine.

### Signing in

```bash
npx ai-project-bootstrap login            # prompts, then stores the key
npx ai-project-bootstrap login --key ...  # non-interactive (lands in shell history)
npx ai-project-bootstrap login --status   # which key is in use, masked
npx ai-project-bootstrap logout           # remove it
```

`login` checks the key against the backend before storing it, so a typo fails
there rather than at first use, and it writes the key **owner-only, outside
any project directory** — a credential inside a project is one `git add -A`
away from a public repository. Where it lands follows the platform: `~/Library/
Application Support/ai-project-bootstrap/` on macOS, `$XDG_CONFIG_HOME` (or
`~/.config`) on Linux, `%APPDATA%` on Windows. `login --status` prints the
exact path.

Every command that needs a key looks in two places, **in this order**:

1. **`AI_PROJECT_BOOTSTRAP_LICENSE_KEY`** — so existing CI keeps working
   exactly as it did, and a key set for one run beats whatever is stored.
2. **The key stored by `login`.**

Neither `login --status` nor any error message ever prints a key in full.
Cannot be combined with `--config`, `--preset` or `--archetype` — all four
pre-fill the selection, pick one — and combining it with `--yes` skips the
review step, so it isn't recommended.

The backend itself isn't part of this repo — it's a separate service that
depends on this package's `ai-project-bootstrap/core` export (the same
catalog-loading and selection-validation logic the CLI runs on) to build its
proposals, so a proposal is validated the same way regardless of which side
of the network call it happens on.

## Usage

```bash
npx ai-project-bootstrap                          # interactive
npx ai-project-bootstrap my-app --yes             # accept defaults
npx ai-project-bootstrap --name ./apps/my-app     # create ./apps/my-app
npx ai-project-bootstrap --config ai-project.config.json --out .   # regenerate
npx ai-project-bootstrap --preset startup-mvp --yes   # generate from a preset, non-interactively
npx ai-project-bootstrap --dry-run                # show what would be written
npx ai-project-bootstrap --list-modules
npx ai-project-bootstrap login                    # store a Pro license key (see above)
npx ai-project-bootstrap logout                   # remove it
```

The package installs a second, shorter binary: **`apb`** runs the identical
CLI, so `apb check` and `ai-project-bootstrap check` are the same command.
The long name stays primary — it is the package's identity — but a command
worth running weekly is worth being short.

The project name doubles as its location. Answer `my-app` and the project lands
in `./my-app`; answer `./apps/my-app` and that folder is created — parents and
all — with the project named `my-app` inside it. `--out` overrides the location
without touching the name.

| Flag               | Meaning                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| `-o, --out <dir>`  | Target directory (default: the project slug)                                                    |
| `--name <name>`    | Project name or path, skipping the first question                                               |
| `--config <file>`  | Replay a saved selection instead of asking                                                      |
| `--preset <id>`    | Start from a curated stack — see [Stack presets](#stack-presets)                                |
| `--archetype <id>` | Start from a full app starter — see [Starter templates](#starter-templates)                     |
| `--idea <text>`    | Propose a stack from a free-text idea (Pro) — see [Describe your idea](#describe-your-idea-pro) |
| `-y, --yes`        | Accept defaults for every question                                                              |
| `--dry-run`        | Print the file list without writing anything                                                    |
| `--force`          | Write into a non-empty directory                                                                |
| `--skip <ids>`     | Comma-separated builder ids to skip                                                             |
| `--list-modules`   | List every available technology                                                                 |

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

## Checking for drift

Rules go stale. A `.cursor/rules/nextjs.mdc` written against one release of a
framework will keep confidently telling an AI assistant the old defaults long
after they changed, and nothing in the repo complains.

`check` answers whether what this repo tells an assistant is still what the
generator would write today — read-only, offline, and safe to run anywhere:

```bash
cd my-app
npx ai-project-bootstrap check
npx ai-project-bootstrap check --dir ../my-app   # from elsewhere
apb check                                        # the short alias
```

```
Project    my-app  ·  v1.0.0 → v1.2.0

Behind  1  · untouched since generation, safe to refresh
    .cursor/rules/nextjs.mdc

Missing 1  · generated once, no longer on disk
    .claude/skills/sentry/SKILL.md

ℹ 1 file you edited — upgrade will not touch it:
    .cursor/rules/stripe.mdc

2 files would change. npx ai-project-bootstrap upgrade
```

Every generated file lands in exactly one bucket:

| Bucket       | Meaning                                                                |
| ------------ | ---------------------------------------------------------------------- |
| **Behind**   | Untouched since generation, but the templates have moved on            |
| **Missing**  | Generated once, no longer on disk                                      |
| **New**      | This version writes it; the version that generated the project did not |
| **Orphaned** | Still on disk, but no longer part of this stack at all                 |
| **Edited**   | You changed it — reported separately, and **never counted as drift**   |

That last row is the point. A file you have edited is the fingerprint
preservation working exactly as designed, and `upgrade` will not touch it —
so counting it as drift would train you to ignore the report.

**Orphaned** is the opposite of missing, and the one bucket `upgrade` does not
resolve: a rule file left behind by a technology the project no longer uses is
still there, still being read, still describing a stack that no longer exists.
`check` reports those separately and points at `add <id> --replace` or a
plain delete, rather than suggesting an `upgrade` that would leave them
exactly where they are.

`ai-project.config.json` is excluded throughout: it records every other file's
fingerprint, so it changes on any run that changes anything, and reporting it
would add a second, meaningless finding to every real one.

This is `upgrade --dry-run`'s own diff, reframed as a report with exit codes —
the two share the comparison logic, so they cannot disagree about what has
drifted.

### In CI

```bash
npx ai-project-bootstrap check --json                  # machine-readable
npx ai-project-bootstrap check --fail-on warning       # exit 1 on drift
```

| Exit | Meaning                                               |
| ---- | ----------------------------------------------------- |
| `0`  | Nothing at or above `--fail-on`                       |
| `1`  | Something at or above `--fail-on`                     |
| `2`  | Not a generated project (no `ai-project.config.json`) |

**`--fail-on` defaults to `none`** — by default `check` reports and never
fails a build. Levels are `none`, `info` (a newer version, new files, newly
supported AI tools), `warning` (rules behind the templates) and `critical`,
which a `critical` **advisory** now reaches — see below.

### Advisories

`check` also asks whether any known vendor change affects the technologies
you selected: a breaking release, a deprecation, a default that moved. This is
the only network call the command makes.

**A `critical` advisory raises the report to `critical`, and can therefore fail
a build through `--fail-on`.** That is a deliberate choice with a real cost —
somebody else publishing a change can turn your CI red without a commit on your
side — and it is the right one, for three reasons. An advisory is a _stronger_
signal than a stale file, not a weaker one: a rule being out of date is our
problem, a vendor breaking something is yours. `--fail-on` defaults to `none`,
so nothing turns red unless you asked for it. And an advisory only ever raises
severity if you can actually read it — an unentitled report is never failed over
text it will not show you.

**It always degrades to nothing.** `--no-advisories` skips the call; so does
having no network, a slow service, or any non-200. In every one of those cases
you still get the full drift report plus one line saying why advisories are
missing. `check` stays offline-capable, MIT and account-free: advisories add a
sentence when the service is reachable, never a reason for the report not to
arrive.

Without a subscription you are told how many advisories match your stack and how
severe they are, but not what they say. That is the whole difference; the count
is never hidden and never reported as zero when it is not.

Exit `2` is deliberately distinct from `1`: "this repo has drifted" and "this
repo was never generated by us" call for different responses, and a CI job
needs to tell them apart. `--json` writes only JSON to stdout — errors go to
stderr — so `check --json > report.json` is safe. The payload carries a
`schema` field and is versioned from the start. `check --help` covers the rest.

## Checking automatically

`check` answers the question when you remember to ask it. `ci init` makes it
answer itself:

```bash
cd my-app
npx ai-project-bootstrap ci init
npx ai-project-bootstrap ci init --dry-run      # preview first
npx ai-project-bootstrap ci init --no-refresh   # just the check, no refresh PRs
```

It writes two GitHub Actions workflows:

| File                                     | What it does                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------- |
| `.github/workflows/ai-rules.yml`         | Reports drift on every pull request, as one comment that updates in place       |
| `.github/workflows/ai-rules-refresh.yml` | Opens a pull request when there is something to refresh — Dependabot, for rules |

Neither blocks a build by default: the check runs with `fail-on: none`, so it
reports and gets out of the way. Move it to `warning` once the project is
current and you want it to stay that way.

**These two files are yours.** They are written once, deliberately, and are not
part of the generated output — `upgrade` never touches them, and re-running
`ci init` refuses to overwrite them without `--force`. Change the schedule, the
branch filters or whether it blocks, and nothing will argue.

The check workflow uses
[`ai-project-bootstrap-action`](https://github.com/igorishchenko/ai-project-bootstrap-action),
which wraps `check --json`. The refresh workflow uses only `gh` and this CLI —
no third-party actions in either. Nothing is sent anywhere: both run entirely
on the runner against files already in the checkout.

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

## Your organisation's own rules (Team)

The built-in rules cover 35 technologies. They do not cover how _your_ team
writes code — that you log with `pino`, that Row Level Security goes on before
the first deploy, that the bare Expo workflow is not an option here. A **rule
pack** carries those into every project your organisation generates, rendered
into all seven AI tool formats alongside the built-in rules.

```bash
cd my-app
npx ai-project-bootstrap pack add acme-standards   # fetch, cache, pin
npx ai-project-bootstrap upgrade                   # write the rules in
npx ai-project-bootstrap pack list                 # what is pinned, what is cached
npx ai-project-bootstrap pack update               # move the pin deliberately
```

**Precedence, in one sentence: an org pack beats a built-in rule, and your own
hand edits beat everything.**

A pack is one JSON document with three things a rule can do:

|              | Written as             | What happens                                                                                            |
| ------------ | ---------------------- | ------------------------------------------------------------------------------------------------------- |
| **Add**      | `"appliesTo": ["*"]`   | A new rule, in every project — or scope it to module ids and it appears only where those were selected. |
| **Extend**   | `"extends": "nextjs"`  | Appended below our section. Ours stays.                                                                 |
| **Override** | `"replaces": "nextjs"` | Ours is dropped entirely, and `check` says which pack did it.                                           |

```json
{
  "id": "acme-standards",
  "name": "Acme engineering standards",
  "version": "2.1.0",
  "rules": [
    {
      "id": "logging",
      "name": "Logging",
      "appliesTo": ["*"],
      "content": "# Logging\n\nUse `pino`…"
    },
    {
      "id": "nextjs",
      "name": "Next.js at Acme",
      "extends": "nextjs",
      "content": "## Acme additions\n…"
    }
  ],
  "docs": [{ "path": "docs/acme-review.md", "content": "…" }],
  "checklists": [{ "path": "checklists/acme-launch.md", "content": "…" }]
}
```

**A pack is pinned to an exact version, and `@latest` is deliberately not
offered.** Two runs of the same command against the same commit produce the
same files — a rule that changed underneath them would break that quietly, in
the direction nobody checks, because the output would still look plausible.
`pack update` moves the pin on purpose.

**Generation stays offline.** `pack add` and `pack update` are the only
commands that touch the network; they cache to
`~/.ai-project-bootstrap/packs/`, and generation, `check` and `upgrade` read
that cache and nothing else. A pinned pack that is not cached is a clear
refusal rather than a silent generation without your standards — which would
also make every rule file report as drifted, since the fingerprints were
recorded with the pack's content in them.

Fetching a pack needs a licence key and an organisation that publishes one.

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

## Estimating monthly cost

Every generation prints one line — `Est. cost $134/mo (Supabase, OneSignal, ...) — 3 usage-based services not counted` — and writes the full breakdown to `docs/costs.md`:

```
## Estimated monthly total: $134/mo

- **Supabase** — $25/mo (paid tier) — [pricing](https://supabase.com/pricing)
  Free tier: 50,000 MAU, 500MB database, 5GB egress, projects pause after a
  week idle. Pro ($25/mo) removes pausing and adds daily backups.

## Usage-based (not included in the total above)

- **Stripe** — [pricing](https://stripe.com/pricing)
  No monthly fee. Standard US card processing is 2.9% + 30¢ per transaction.
```

The estimate is **only ever a starting point, never a guaranteed figure** —
every module's pricing data was checked by hand against that vendor's own
pricing page on a specific date (recorded in its `notes`), and pricing pages
change. Four buckets, each rendered separately rather than blended into one
misleading number:

- **Estimated total** — only technologies with a known flat or freemium
  starting price (`pricing.model: "flat" | "freemium"` and a real
  `estimateUsd`) are summed. A service declared `flat`/`freemium` but
  missing a number is treated as unknown, never silently counted as $0.
- **Usage-based** — bills on your app's own traffic, storage or transaction
  volume (Stripe's per-transaction fee, RevenueCat's revenue share). There
  is no honest single number for these, so they're listed with a link
  instead of forced into the total.
- **Free** — a real, billable-capable service that happens to cost nothing
  at typical usage (e.g. Expo Push) — shown for completeness, not omitted.
- **No cost data available** — the module simply has no `pricing` field.
  Most modules land here on purpose: a testing library or a UI feature has
  no vendor to price, so `pricing` stays unset rather than forced to a
  meaningless value.

Adding pricing data to a module you maintain is documented in
**[CONTRIBUTING.md](CONTRIBUTING.md)**.

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
