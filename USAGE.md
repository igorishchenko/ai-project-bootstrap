# Using ai-project-bootstrap

What you can do with this tool, in the order you are likely to need it, and
where the instructions for each part live.

The whole CLI is free, works offline, and needs no account. An account adds the
hosted parts: stack proposals, advisories for your stack, and anything that
belongs to more than one person.

- [The first five minutes](#the-first-five-minutes)
- [Start a project](#start-a-project)
- [Work with your AI assistant](#work-with-your-ai-assistant)
- [Keep it current](#keep-it-current)
- [Build a specific feature](#build-a-specific-feature)
- [Assess code](#assess-code)
- [Your team's own standards](#your-teams-own-standards)
- [Your account](#your-account)
- [Where the instructions live](#where-the-instructions-live)
- [Command reference](#command-reference)
- [What each tier includes](#what-each-tier-includes)

Every command is also available as `apb`. `apb check` is the same thing, and
shorter for something worth running weekly.

## The first five minutes

The only sequence here that has to happen in order.

```bash
npx ai-project-bootstrap my-app
```

```bash
cd my-app && npm run setup
```

Then open the project in your AI editor. The rules are already there — ask
something stack-specific and the assistant answers from your project's own
conventions rather than generic advice.

Come back in a month and ask whether those rules still say what we would write
today. It is read-only and changes nothing:

```bash
npx apb check
```

## Start a project

Four ways in, depending on how much you have already decided. All of them end
at the same review step; nothing is written until you confirm.

**Answer questions.** The wizard asks only what applies — say "web only" and the
mobile questions never appear. 35 technologies across 16 categories.

```bash
apb my-app
```

**Start from a curated stack.** A preset pre-fills the wizard, which you then
review and change: `startup-mvp` (Expo + Supabase + RevenueCat), `web-saas`
(Next.js + Supabase + Stripe), `enterprise` (Next.js + NestJS + PostgreSQL).

```bash
apb my-app --preset web-saas
```

**Start from a running app.** An archetype is a stack _plus_ real starter code —
screens, hooks, a data model with row-level security. `habit-tracker` ships
today.

```bash
apb my-app --archetype habit-tracker
```

**Describe the idea.** Give it a sentence and it proposes a stack, shown for
review exactly like a preset. Three a day free, unlimited on Pro.

```bash
apb --idea "a habit tracker my running club can share"
```

**Check the machine first,** if you are not sure it can build what you have in
mind — Node, git and npm always; Xcode, Android SDK, Watchman, Java and Docker
on request.

```bash
apb doctor
```

The project name doubles as its location: `my-app` generates `./my-app`, and
`./apps/my-app` creates that folder and names the project `my-app`.

## Work with your AI assistant

This is the point of the generated project. Rules are written once per
technology and rendered into whichever tools you chose, so every assistant on
the team reads the same conventions.

Seven are supported: **Cursor**, **Claude Code**, **GitHub Copilot**, **Gemini
CLI**, **Continue.dev**, **Cline** and **Roo Code**. You pick which during the
wizard, and each gets its own dialect — Cursor gets `.cursor/rules/*.mdc`,
Claude Code gets discoverable skills under `.claude/skills/`, and so on.

`README.md`, `CLAUDE.md`, `AGENTS.md` and `GEMINI.md` are written regardless of
that choice, alongside ready-to-paste prompts in `prompts/` and pre-ship
checklists in `checklists/`.

> **Do not run the generated project's own formatter over generated files.**
> The tool fingerprints everything it writes and treats a rewrite as a hand
> edit, which silently stops `upgrade` from ever refreshing those files again.
> The generated `.prettierignore` already covers them.

## Keep it current

Rules go stale because vendors move, not because you did anything wrong. None
of these three will touch a file you have edited.

**See what has drifted.** Read-only. Sorts every generated file into behind,
missing, new, orphaned or edited — and edited files are never counted as drift,
because nothing will overwrite them.

```bash
apb check
apb check --json --fail-on warning   # for CI
```

**Read advisories for your stack** (Pro). Known vendor changes affecting the
technologies you actually picked — a breaking release, a deprecation, a moved
default — reported by `check`, worst first. `--no-advisories` skips the lookup,
which is the only network call the command makes.

**Refresh what has moved.** Re-renders rules, prompts and docs against the same
stack you already chose, and reports what it added, updated and left alone.

```bash
apb upgrade
```

**Stop having to remember.** Writes two GitHub Actions workflows: one comments
drift on every pull request as a single comment that updates in place, the
other opens a refresh PR on a schedule. Neither blocks a build unless you ask.

```bash
apb ci init
```

**Add or swap a technology,** without starting over. `--replace` swaps one out
instead, and refuses outright if any of the outgoing technology's files were
hand-edited.

```bash
apb add sentry
apb add clerk --replace
```

## Build a specific feature

Not a scaffold generator — a plan written for the exact provider you chose,
plus prompts to hand an assistant and a checklist to verify before shipping.

```bash
apb implement authentication
```

Three features ship today: `authentication`, `payments` and
`push-notifications`. Each has genuinely different content per provider —
Supabase Auth, Clerk and Auth0 get three separately written plans, not one plan
with the name swapped. If your provider is not covered it says so and names
what is, rather than producing filler.

You get `implementation/<feature>/plan.md`, a checklist, prompts, and skeleton
files with `TODO`s pointing back at the plan. The skeletons are deliberately
not working implementations.

## Assess code

Two commands, differing in one thing: whether this tool generated the
repository.

```bash
apb review    # a generated project — knows your exact stack
apb analyze   # any repository at all — infers the stack, with confidence levels
```

> Both are pattern-based, not a real analyzer and not an LLM call. They catch a
> specific list of things well and will not find a subtle logic bug. Dependency
> vulnerability scanning is deliberately absent: a trustworthy answer needs a
> live CVE lookup, which would break working offline.

## Your team's own standards

The built-in rules cover 35 technologies and say nothing about how your team
writes code — that you log with pino, that row-level security goes on before
the first deploy. A rule pack carries that into every project your organisation
generates.

```bash
apb pack add acme-standards
apb pack list
apb pack update
```

A pack rule does exactly one of three things, and the schema enforces it —
publishing a rule that sets two is refused with `set exactly one of appliesTo,
extends or replaces`:

| Field | Effect |
| --- | --- |
| `appliesTo` | A new rule, scoped to the technologies you name |
| `extends` | Appended **below** the built-in rule it names |
| `replaces` | The built-in rule is dropped and yours is written in its place |

Precedence in one sentence: an org pack beats a built-in rule, and your hand
edits beat everything.

`apb check` lists what each pinned pack did — which built-in rules it replaced,
extended and added — so nobody has to work out for themselves why a rule is not
what the docs describe. It is never counted as drift and never fails a build: a
pack doing its job is the system working.

> Packs are pinned to an exact version, and `@latest` is deliberately not
> offered — two runs of the same command must produce the same files. Only
> `pack add` and `pack update` touch the network; generating, `check` and
> `upgrade` read a local cache and never fetch.

The fleet dashboard is the other half: point the GitHub action at it with an
organisation token and every repository reports its own drift, so "which of
these needs attention" is one page rather than forty.

## Your account

Only the hosted parts need one. Copy your key from the dashboard's **License
key** screen, then:

```bash
apb login            # checked before it is stored
apb login --status   # which key, and which backend — never prints it in full
apb logout
```

The key is written outside any project directory: a credential inside a
repository is one `git add -A` from being public.

In CI, set `AI_PROJECT_BOOTSTRAP_LICENSE_KEY` as a secret instead. It always
wins over the stored key, so the two never fight.

Running your own backend? `login` records the one it verified against, so
later commands need nothing set:

```bash
AI_PROJECT_BOOTSTRAP_API_URL=http://localhost:8787 apb login --key <key>
```

## Where the instructions live

Four places, each answering a different kind of question. Reach for them in
this order.

**1. Every command explains itself.** The fastest answer, and the only one
guaranteed to match the version you actually have installed.

```bash
apb --help
apb check --help
```

**2. Your project documents itself,** for the stack you chose rather than
generically. Inside every generated project:

| File | What it answers |
| --- | --- |
| `docs/setup.md` | Getting running, per technology |
| `docs/architecture.md` | Diagrams from your real selection |
| `docs/roadmap.md` | A suggested build order |
| `docs/costs.md` | What this stack will cost |
| `docs/deployment.md` | Shipping it |
| `docs/testing.md` | How this stack is tested |
| `docs/coding-standards.md` | Conventions the AI rules enforce |
| `docs/release.md` | Cutting a release |
| `prompts/`, `checklists/` | Ready to paste, and to verify before shipping |

**3. The dashboard.** **Start** is the setup path end to end, and ticks off what
it can actually verify. Also your key, billing, usage, saved stacks, chat and —
on Team — the rule pack editor and the fleet view.

**4. The website.** For browsing before you install: the full technology
catalogue, every rule readable in full without an account, the command
reference and the docs.

> **Not sure a command is safe to try?** `check`, `review`, `analyze` and
> `doctor` never write anything at all, and any generating command accepts
> `--dry-run` to print what it would write without touching disk.

## Command reference

| Command | What it does | Writes? |
| --- | --- | --- |
| `apb [dir]` | Run the wizard and generate a project | Yes |
| `apb add <id>` | Retrofit one more technology; `--replace` swaps one out | Yes |
| `apb check` | Report drift and advisories; `--json`, `--fail-on` | No |
| `apb upgrade` | Refresh rules, prompts and docs against the same stack | Yes |
| `apb ci init` | Write the drift-report and refresh-PR workflows | Yes |
| `apb implement <id>` | Plan, prompts, checklist and skeletons for one feature | Yes |
| `apb pack add\|update\|list` | Your organisation's own rule pack | Yes |
| `apb review` | Static review of a generated project | No |
| `apb analyze` | The same, for any repository at all | No |
| `apb doctor` | Whether this machine can build your stack | No |
| `apb login` / `logout` | Store or remove your key; `--status` to check | Config only |

Useful flags on generation: `--preset`, `--archetype`, `--idea`, `--config` to
replay a saved selection, `--dry-run`, `--yes`, `--force` to write into a
non-empty directory, and `--list-modules`.

## What each tier includes

| | Free | Pro | Team |
| --- | --- | --- | --- |
| The wizard and every local command | Included | Included | Included |
| Drift check — `apb check` | Included | Included | Included |
| CI workflows — `apb ci init` | Included | Included | Included |
| The public rule corpus | Included | Included | Included |
| `--idea` proposals | 3 a day | Unlimited | Unlimited |
| Chat, on the site and over MCP | 3 a day, site only | 200 a day | 200 a day per seat |
| Advisories for your stack | — | Included | Included |
| CI drift gate | — | Included | Included |
| Weekly refresh PRs | — | Included | Included |
| Org rule packs | — | — | Included |
| Fleet dashboard | — | — | Included |
| Roles and invites | — | — | Included |
| Seats | 1 | 1 | 3 minimum |
