# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and, from 1.0.0
onward, [Semantic Versioning](https://semver.org/) — a breaking change to
the CLI's flags, exit codes, or the generated-project contract needs a major
version bump. Seeded from git history; going forward, add an entry here as
part of the PR that makes the change, not at release time.

## [Unreleased]

Nothing yet. Entries land here in the PR that makes the change, not at
release time — see `.claude/commands/changelog-entry.md`.

## [1.5.1] — 2026-08-22

### Fixed

- **`implement authentication` produced a project that would not compile.** The
  Supabase Auth scaffold imported `src/services/supabase/client`, and its own
  plan.md said the Supabase module had already written that file. It never did —
  only the `habit-tracker` archetype ships one. So the first command a new user
  runs after generating failed `tsc --noEmit` with three errors, on code nobody
  had touched yet. The scaffold now writes the client itself, branched by
  platform: `AsyncStorage` and the URL polyfill on native, the browser client on
  web, with the per-request/server split named rather than left to be discovered.
  `tests/implementPlatform.test.ts` now resolves every relative import in every
  scaffold against what was actually written, for all six provider/platform
  combinations — the one assertion that would have caught this the day it landed.

- **`implement` wrote React Native screens into Next.js projects.** Every auth
  screen used `View`, `Text` and `TextInput` regardless of target, so a web
  project got `import { Text } from 'react-native'`; Auth0's scaffold had the
  same bug pointing the other way, rendering a `<div>` into a native app. A
  provider is a technology, not a platform — Supabase Auth and Clerk each answer
  "auth" on both — and the scaffolds had no way to tell the difference: they were
  rendered against `{ projectName, projectSlug }` and nothing else. They now
  render against the project's resolved stack through the same `templateData()`
  every builder uses, so `{{#if has.react-native}}` and `{{envPrefix}}` mean
  exactly what they mean inside `technologies/<id>/templates/`. Reusing that
  rather than assembling a smaller object is the point: a second, nearly
  identical vocabulary for feature authors is how the two drift apart again.

- **The 1.5.0 platform split missed Clerk and Auth0.** Both have no `requires`
  tying them to a platform, which is exactly what kept them out of the sweep and
  what let them through on web. `clerk` was the expensive one, because it is in
  the shipped `enterprise` preset: a Next.js + NestJS project installed
  `@clerk/clerk-expo` and `expo-secure-store`, and `docs/setup.md` told you to
  run `npx expo prebuild --clean` — directly above a sample passing
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` into a `ClerkProvider` imported from the
  Expo SDK. The env prefix had been branched in 1.5.0; the code around it had
  not. Both modules now follow the target across packages, install commands,
  setup guide, rules and skill — `@clerk/nextjs` or `@clerk/clerk-react` on web,
  `@clerk/clerk-expo` on native, and the same three ways for Auth0. A mobile
  project is unchanged apart from Auth0, which was installing the Next.js SDK.

- **A hand-written config could select a technology the wizard would never have
  offered.** `--config` with `"target": "web"` and `"payments": "revenuecat"`
  generated without complaint, dragging Expo and React Native into a Next.js
  repository through `requires`. The wizard has always refused to offer these;
  nothing refused to accept one, and `--config` is the path `add` and `upgrade`
  replay. `validateSelection` now rejects a module whose category — or the
  category of anything it transitively requires — the project's own gating
  answers rule out, naming the answer to change. The `showWhen` logic moved
  beside the validator so the wizard and the validator cannot disagree about
  what a target permits. An _unanswered_ gating question still rules nothing
  out: gating questions are exempt from the required-answer check, so a config
  predating `target` has none, and reading that silence as "web" would reject
  projects that generate correctly today.

- **`implement` overwrote code it had never written.** Its fingerprint guard
  asks whether you edited a file _it_ wrote, and on the first run it has written
  nothing — so every scaffold path counted as free, and scaffolds land in the
  project's ordinary source layout rather than a namespace of their own. Running
  `implement authentication` inside a `--archetype habit-tracker` project
  replaced the archetype's working `useAuth.ts` with one exporting a different
  shape, and the project stopped compiling against its own `App.tsx` —
  `Property 'signedIn' does not exist on type 'UseAuthResult'`. Anyone who had
  started their auth code by hand lost it the same way, silently. `implement`
  now leaves alone anything it has no record of writing, and skips the **whole**
  scaffold rather than the colliding files alone — following `add --replace`,
  because these files import each other and the half that happens not to collide
  does not compile either. The plan, checklist and prompts still land, since
  they are exactly what reconciling by hand needs, and the summary names every
  file it stepped around. Skipped files are not recorded as written, so a second
  run does not quietly finish the job.

- **`review` reported fourteen performance issues on a clean project.** The
  Performance section lists where this stack's guidance already lives, which is
  useful — but it marked each pointer with the same cyan `ℹ` the info findings
  use, so a freshly generated project showed a column of them two lines above a
  summary reading "0 critical, 0 warning, 0 info". A report that contradicts
  itself on its own screen is one people learn to skip, which costs the findings
  that are real. They render as plain bullets under an explicit "No issues
  found" now, in both the terminal output and `--report`'s markdown.

## [1.5.0] — 2026-08-21

### Added

- **A web project is now generated as a web project.** Choosing `web` and
  Next.js produced a half-mobile repository: twelve Expo packages with no React
  Native to bind them to, `docs/setup.md` telling you to run
  `npx expo install expo-auth-session`, and seven `EXPO_PUBLIC_*` variables that
  Next.js never inlines, so every one of them read `undefined` in the browser.
  Eight catalogue modules were written when the catalogue was mobile-only and
  never revisited when the web target landed. They branch now — packages,
  install commands, client construction, troubleshooting and rules — so the
  same module produces the web integration path or the Expo one, and neither
  mentions the other. Nothing about a mobile project changes. The reason this
  survived four releases is that no test had ever asserted the two targets
  produce _different_ output; `tests/platformSplit.test.ts` now asserts the
  absence of each platform's content from the other, which is the assertion
  that would have caught it on day one.

- **A module can name a client-visible variable without knowing the platform.**
  `env.md`'s Key column accepts `{{envPrefix}}`, resolved from the platform's
  own manifest — `NEXT_PUBLIC_`, `VITE_` or `EXPO_PUBLIC_`. It is a manifest
  field rather than a `{{#if has.nextjs}}` chain because a repository carrying
  both a mobile and a web app has two of them, and a chain would concatenate
  both into one nonsense name. `.env.example` carries one row per key, so the
  first declared prefix wins and generation warns about the other rather than
  shipping a variable one of the two bundles silently reads as `undefined`.

- **A generated Next.js project runs.** `app/` held nothing but a `.gitkeep` and
  there was no `next.config.ts`, so `npm run dev` failed on a freshly generated
  project before anyone had written a line. It now ships a root layout, a
  placeholder page pointing at `docs/setup.md`, and a config file. `npm run
dev`, `build`, `typecheck`, `lint`, `format:check` and `test` all pass on a
  fresh generate — verified by running them, not by generating and hoping.

- **`GEMINI.md` follows the Gemini CLI answer.** Selecting or deselecting Gemini
  CLI changed nothing whatsoever: the file shipped either way, so a project that
  asked for Claude Code only got a file for a tool it had just declined.
  `README.md`, `CLAUDE.md` and `AGENTS.md` stay unconditional — the first two
  double as the project's own documentation, the third is the tool-agnostic
  convention. This changes generated output for anyone who did not pick Gemini
  CLI; `upgrade` will not delete an existing `GEMINI.md`, since regeneration
  never deletes.

- **`check` now names the rule pack behind a changed rule.** 1.4.0 said it did,
  and it did not: `replacedModuleIds()` returned exactly the right map, was unit
  tested, and was exported publicly through `/rules` — but no command called it,
  so an organisation's pack could replace a built-in rule and nothing on screen
  ever said so. The failure that costs is quiet: an advisory about our `nextjs`
  rule does not seem to apply, the testing section is not what the docs
  describe, and the reason is a deliberate decision somebody made months ago in
  a different repository. `check` lists each pinned pack with what it replaced,
  extended and added, in both the human report and `--json`. **Never drift, and
  it cannot fail a build** — a pack doing its job is the system working. Which
  pack "won" a contested replacement is read from `replacedModuleIds()` rather
  than recomputed, so this report cannot disagree with the file on disk. `packs`
  is additive and `null` when none are pinned, so `schema` stays `1` and the
  action's moving `v1` tag is unaffected.

- **`USAGE.md`** — a task-first tour of the whole tool: what you can do, the
  command that does it, and where that part's instructions live. The README
  grew into a reference organised by feature, which answers "how does `check`
  work" well and "I have just installed this, now what" badly. Ordered by what
  someone wants to accomplish rather than by command name, since nobody arriving
  knows that "keep my AI rules from going stale" is spelled `check`.

- **`login` remembers which backend the key belongs to.** A licence key is only
  valid against the server that issued it, and the two were stored apart — so
  pointing the CLI at anything but the hosted service meant exporting
  `AI_PROJECT_BOOTSTRAP_API_URL` before every command, and forgetting it
  produced "that key was not accepted", which is indistinguishable from a typo.
  `login` now records the backend it verified against, and every later command
  finds it. Resolution order matches `resolveLicenseKey` exactly — environment,
  then stored, then the default — because a rule that overrode one and not the
  other would check a key against a server that never issued it. Only a
  non-default URL is written, so an ordinary install still ends up with a file
  containing a key and nothing else, and a value there always means somebody
  pointed this machine somewhere deliberately. `login --status` now always
  names the backend, default or not; `logout` removes it with the key.

### Fixed

- **`npm run typecheck` failed on a freshly generated web project.** The base
  `tsconfig.json` set `lib: ["ESNext"]` with no DOM, so the `dark-theme`
  provider's own `window` and `document` were three errors on a repository
  nobody had touched yet. DOM is added for a web target, `@/*` now resolves the
  way `jest.config.js` already assumed it did, and `app/` is type-checked at
  all.

- **`next build` quietly disabled `upgrade` for `tsconfig.json`.** Next appends
  its plugin and type globs to the file on first build, the generator
  fingerprints what it writes and reads any change as a hand edit — so one
  `npm run build` was enough to stop that file ever being refreshed again. It is
  the 1.3.1 `npm run format` bug in a different costume. The generated file now
  already contains everything Next would add, and `next build` leaves it byte
  for byte alone.

- **`next build` failed outright on any project with Dark Theme.** The web theme
  provider read `localStorage` during render, and a `'use client'` component
  still renders once on the server during prerendering. It reads from an effect
  now, which also removes a hydration mismatch.

- **Localization shipped an unformatted file,** so `format:check` — which the
  generated CI workflow runs — went red on the first push of every project that
  selected it. The formatting test's own fixture selected none of the feature
  modules, so it could not see any of their output; it now selects every module
  that ships a template.

- **A web project no longer carries app-store release steps.** `docs/release.md`
  and `checklists/release.md` asked for a build number "for native apps",
  `prompts/release.md` asked for one outright, the Stripe troubleshooting table
  listed App Store rejection, and the Supabase security checklist wanted redirect
  URLs "including deep links". A checklist item nobody can satisfy is one people
  learn to tick without reading, which costs the items around it too. All five
  now follow the target. A mobile project is unchanged.

- **A rejected key sent you back to the environment variable `login` exists to
  replace.** The backend answers a refused key with a hint written for any
  caller of any licensed endpoint — "Set AI_PROJECT_BOOTSTRAP_LICENSE_KEY to
  your license key" — and `login` printed it verbatim. Right for a CI job,
  absurd in front of somebody part-way through the one command whose whole
  purpose is that nobody has to put a credential in a shell profile. 1.4.0
  fixed the message you get with _no_ key and left the one you get with a
  _wrong_ key still pointing at the variable, which is the message a new
  subscriber who mistypes their key actually sees. `login` now writes its own
  guidance; the backend's hint is untouched and still correct for its other
  callers. The backend's _message_ still comes through, because it is what
  distinguishes a lapsed subscription from a typo.
- **A refused key never said which backend refused it.** A dashboard key cannot
  work against a backend on localhost, and a local development key cannot work
  against the hosted one — and until the URL is on screen both look exactly
  like a typo. `login` now names the backend it asked, in both directions.

## [1.4.0] — 2026-08-20

### Added

- **`check` reports advisories** — known vendor changes affecting the
  technologies you selected, after the drift summary, worst first. This is
  where "your rules are behind" and "here is the vendor change that is why"
  become one report. New in `--json` as `advisories` and `advisoryNote`;
  `schema` stays `1` because nothing that existed moved, and the GitHub action
  is pinned by a moving `v1` tag that a changed field would break all at once.
  `advisories` is `null` when they were skipped and `[]` when none matched —
  "we did not look" and "we looked and found none" are different answers.
- **`--no-advisories`** skips the lookup, completing the
  `check [--json --fail-on --no-advisories]` surface Appendix A specifies.
- **Your organisation's own rules now reach every project it generates.** The
  built-in rules cover 35 technologies and say nothing about how your team
  writes code — that you log with pino, that Row Level Security goes on before
  the first deploy. A rule pack carries that, and `pack add|update|list`
  installs one. A pack's rules become the same `RuleSource` the provider
  builders already consume, so they reach all seven AI tool formats with no
  per-tool work and no builder learning what a pack is.
- **A pack rule does exactly one of three things** — add, `extend` (appended
  below ours) or `override` (ours dropped, and `check` names the pack that did
  it). Exactly one, because a rule that both extended and replaced the same
  built-in would have no defined meaning. Precedence in one sentence: an org
  pack beats a built-in rule, and hand edits beat everything. Pack-derived
  files are fingerprinted like any other generated file, so a freshly
  generated packed project reports clean and `upgrade` refreshes pack files
  while leaving hand edits alone — both halves have a test, because a report
  that is always wrong is a report people learn to ignore.
- **Packs are pinned to an exact version; `@latest` is deliberately not
  offered.** Two runs of the same command must produce the same files, and a
  rule that moved underneath them would break that in the one direction nobody
  checks — the output would still look plausible. Generation, `check` and
  `upgrade` still never touch the network: only `pack add` and `pack update`
  fetch, caching to `~/.ai-project-bootstrap/packs`, outside any project. A
  pinned pack missing from the cache is a refusal, never a quiet generation
  without the standards.
- **`ai-project-bootstrap/rules`** — a second public export beside `/core`,
  carrying the pack schema, rule resolution and the six AI tool dialects.
  Built `platform: 'neutral'`, so it runs in a browser: a hosted editor
  validates a draft against the same schema `pack add` enforces, and previews
  what each tool will get, rather than shipping a second implementation that
  starts out identical and quietly stops being so. `/core` cannot do this — it
  imports `node:fs` for registry loading.

- **`login` and `logout`.** The first thing a paying customer used to meet was
  an error message teaching them about `AI_PROJECT_BOOTSTRAP_LICENSE_KEY` — a
  credential, introduced as an environment variable, with no suggestion of
  where to put it that was not a shell profile or a CI secret. `login` prompts
  for the key (or takes `--key`), checks it against the backend before storing
  anything, and writes it **owner-only, outside any project directory**: a
  credential inside a project is one `git add -A` from a public repository. It
  follows the platform — `~/Library/Application Support/` on macOS,
  `$XDG_CONFIG_HOME` on Linux, `%APPDATA%` on Windows.
- **`login --status`** says which key is in use and where it came from, and
  **never prints one in full** — the same masking the dashboard shows. `logout`
  removes the stored key, and says so when `AI_PROJECT_BOOTSTRAP_LICENSE_KEY`
  is still set in the shell, since that keeps winning and `logout` cannot unset
  it for you.

### Changed

- **Every AI tool dialect now has exactly one definition.** The four provider
  builders and the pack editor's preview render through the same
  `RULE_DIALECTS` table, and a test asserts the preview is byte-identical to
  what the builders write — a preview that drifts from the output is worse
  than no preview, because it is believed. No generated output changed.
  `gemini-cli` is deliberately absent from the table: it is a real `aiTools`
  option, but what it receives is the unconditional `GEMINI.md` the base
  module ships, and giving the editor a path to preview would describe files
  nothing writes.
- **A `critical` advisory now raises the report to `critical`, and can fail a
  build through `--fail-on`.** `critical` has been accepted-but-unreachable
  since 1.3.0, reserved for exactly this. The cost is real — somebody else
  publishing a change can turn your CI red with no commit on your side — and
  it is the right trade: an advisory is a _stronger_ signal than a stale file,
  `--fail-on` still defaults to `none` so nothing fails unless asked, and an
  advisory only raises severity if you can actually read it. Nobody's build
  fails over text the same response refuses to show them.
- **`check` still works offline, unaccounted-for and MIT.** The advisory
  lookup is the only network call the command makes, and it degrades to
  nothing on every failure — no network, a timeout, any non-200 — leaving the
  full drift report plus one line saying why advisories are missing.

- **Every command that needs a license key now looks in two places**, in this
  order: `AI_PROJECT_BOOTSTRAP_LICENSE_KEY`, then the key stored by `login`.
  The environment deliberately wins — a key exported for one run is the more
  deliberate of the two, and putting it first is what keeps existing CI working
  unchanged. Nothing that worked before this release stops working.
- The message you get with no key names a command to run rather than a variable
  to set.

## [1.3.2] — 2026-08-13

### Fixed

- **Continue.dev rules shipped a literal `{{projectName}}`.** `toRuleSource`
  lifts `name`, `description` and `globs` out of a rule's source frontmatter
  verbatim, and only the _body_ was ever rendered — so every generated project
  that selected Continue got
  `description: "Project-wide conventions for {{projectName}}"` in
  `.continue/rules/base.md` and `architecture.md`. Every part of a rule that
  can reach the output is now rendered. A new test generates with all seven AI
  tools enabled and fails on any surviving `{{…}}`; the existing one defaulted
  to Cursor and Claude Code only, which is how this went unnoticed.
- **Claude Code was missing the TypeScript rule entirely.** The base module's
  stack-agnostic topics are authored twice — once as a Cursor `.mdc`, once as a
  Claude `SKILL.md` — and `typescript` only ever had the Cursor half. Every
  other provider re-renders the Cursor copy, so the topic reached five tools
  and silently skipped the one this project tells people to use.
  `tests/moduleContract.test.ts` now fails on an unpaired topic, and
  `CONTRIBUTING.md` documents that they come in pairs.
- **`typescript` was named "Typescript"** wherever a rule name is derived from
  its filename — Continue's `name:` field. Known product casings now win over
  title-casing the slug.
- **Piping CLI output into `head` or `grep -q` crashed** with an unhandled
  `EPIPE` and a full stack trace over what is ordinary shell behaviour. A
  closed pipe now exits 0 quietly. Every other stream error still throws.

## [1.3.1] — 2026-08-13

### Fixed

- **Running the generated project's own `npm run format` silently broke
  `upgrade`.** The generator fingerprints every file it writes and treats a
  mismatch as "the user edited this, never touch it again" — and
  `prettier --write` is an edit. One `npm run format` rewrote 26
  generator-owned files (`.claude/skills/**`, `docs/**`, `CLAUDE.md`,
  `AGENTS.md`, …), after which `upgrade` stopped refreshing them and the rules
  the AI assistant reads went quietly stale. The generated `.prettierignore`
  now covers generator-owned output, and `tests/generatedFormatting.test.ts`
  fails if any of it is ever reformatted again.
- **Every new project's first CI run went red, twice over.** The generated
  workflow used `cache: npm` and `npm ci`, both of which require a lockfile a
  freshly generated project does not have yet — the job failed at
  `setup-node`, before a single script ran. Caching is now enabled only once
  `package-lock.json` exists, and the install step falls back to
  `npm install` for that first run. Separately, `format:check` failed on 27
  generated files, which the `.prettierignore` fix above resolves.

## [1.3.0] — 2026-08-12

### Added

- **`check`** — reports what has drifted, without changing anything. Compares
  a generated project against the templates the installed version would write
  today and sorts every generator-owned file into one of five buckets:
  _behind_ (untouched since generation, but our templates moved on),
  _missing_, _new_, _orphaned_ (still on disk, no longer part of the stack at
  all) and _edited_. Edited files are reported separately and **never counted
  as drift** — `upgrade` will not touch them, so treating them as a finding
  would only teach people to ignore the report. This is `upgrade --dry-run`'s
  own diff behind a read-only command with exit codes, sharing the comparison
  logic so the two cannot disagree. `ai-project.config.json` is excluded
  throughout: it records every other file's fingerprint, so it changes on any
  run that changes anything.
- **`check --json`** — a versioned, machine-readable report (`schema: 1`) for
  CI. Only JSON reaches stdout; errors go to stderr, so
  `check --json > report.json` is safe.
- **`check --fail-on <level>`** — `none` (default), `info`, `warning`,
  `critical`. It reports rather than blocking unless asked. `critical` is
  accepted and currently unreachable; it is reserved for a later feature.
  Exit `2` is distinct from `1`: "this repo has drifted" and "this repo was
  never generated by us" need different responses in CI.
- **`ci init`** — writes two GitHub Actions workflows: one comments drift on
  every pull request as a single comment that updates in place, the other
  opens a pull request when there is something to refresh. Neither blocks a
  build by default. Both are written once and are **not** generated output:
  `upgrade` never touches them, and re-running refuses to overwrite without
  `--force`, because the schedule and blocking behaviour are the user's to
  change.
- **`apb`** — a second, shorter binary running the identical CLI. A command
  worth running weekly is worth being short; `ai-project-bootstrap` stays the
  primary name.

## [1.2.0] — 2026-08-10

### Fixed

- **1.1.0 was published with no compiled code at all.** `dist` is gitignored
  and `files` lists it, but nothing built before `npm publish` — so the
  tarball carried all 413 catalogue files and none of the CLI: `bin` pointed
  at a `dist/index.js` that was absent, `npx ai-project-bootstrap` failed for
  every user, and `ai-project-bootstrap/core` could not resolve. Anyone on
  1.1.0 should upgrade. `prepublishOnly` now builds and then asserts that
  every path named by `bin`, `main` and `exports` exists, because a build can
  fail quietly enough that a green publish still ships nothing.

### Changed

- **`--idea` now calls the hosted backend by default.**
  `AI_PROJECT_BOOTSTRAP_API_URL` defaulted to `http://localhost:8787`, which
  an installed CLI has no way to reach — so `--idea` failed for everyone who
  did not happen to set the variable themselves. The default is now
  `https://api.ai-project-bootstrap.com`; point the variable at localhost to
  develop against a backend running on your own machine.

## [1.1.0] — 2026-08-08

### Added

- **`--idea <text>`** — proposes a technology stack from a free-text project
  idea, via a hosted backend rather than calling an LLM directly from the
  CLI — end users need no API key of their own. The CLI's `src/cli/idea.ts`
  is a thin HTTP client (`AI_PROJECT_BOOTSTRAP_API_URL`, defaults to
  `http://localhost:8787`) that offers the result to the wizard as a one-off
  preset — reviewed and confirmed exactly like `--preset` or `--archetype`,
  never generated unreviewed. Cannot be combined with `--config`, `--preset`
  or `--archetype`.
- **`--idea` is a paid, license-gated Pro feature** — no free tier, no
  trial, since every call spends real hosting/API budget. Requires
  `AI_PROJECT_BOOTSTRAP_LICENSE_KEY`, the key emailed after subscribing; the
  CLI fails fast client-side if it's unset, and the backend rejects an
  invalid or inactive key with `402 LICENSE_REQUIRED`.
- **`ai-project-bootstrap/core`** — a new public export (types, registry
  loading, selection validation/resolution: `loadRegistry`,
  `validateSelection`, `resolveSelection`, `GeneratorError`, and friends).
  This is the same domain logic the CLI runs on, now usable by other
  services — e.g. the Pro backend behind `--idea` depends on it rather than
  reimplementing catalog loading or selection validation.

## [1.0.0] — 2026-08-07

First stable release. Fourteen prompts from `.planning/prompts/`, reviewed
and re-tested together as one batch — including packing and installing the
actual npm tarball into a clean project, not just running from source —
rather than released individually. See each prompt file under
`.planning/prompts/` for the design reasoning behind its piece of this.

### Added

- **`--archetype <id>`** — full app starter templates: a curated stack
  selection plus real starter source (screens, hooks, a data model), not
  just dependencies. Ships one: `habit-tracker` (Expo + Supabase + Supabase
  Auth + Dark Theme) — a real Postgres schema with Row Level Security,
  email magic-link sign-in, and a working habit list with streak tracking.
  `archetypes/<id>/` follows the same "manifest + content, no code changes"
  contract as `technologies/<id>/` — see `CONTRIBUTING.md`.
- **Cost estimation** — `Manifest.pricing` (optional; `free`/`flat`/
  `freemium`/`usage-based`) on 16 technologies with genuinely known,
  vendor-verified pricing. `docs/costs.md` plus a one-line `Est. cost`
  summary at the end of every generation and `add`.
- **Three cross-cutting feature modules** (`dark-theme`, `onboarding`,
  `localization`) under a new `features` category — technologies that
  aren't a single-vendor integration and can be combined freely.
- **`analyze`** — the same kind of scored, prioritized feedback as `review`,
  but for any repository, including ones this tool never generated. Infers
  the stack from `package.json` dependencies and config-file signals, with
  confidence levels on every guess.
- **`docs/roadmap.md`** — a suggested week-by-week build order for the
  resolved stack, referencing `implement` where a feature covers it.
- **Richer `docs/architecture.md`** — the component diagram now draws
  `requires` edges and a frontend → backend → database backbone; database
  modules ship a starter ERD.
- **`review`** — a static, AI-oriented review of an already-generated
  project (architecture, security, performance, dx), distinct from a
  linter or an LLM call.
- **`implement <feature-id>`** — a stack-tailored implementation plan, AI
  prompts, a validation checklist and real scaffold files for a specific
  feature (`authentication`, `payments`, `push-notifications`), genuinely
  different per resolved provider.
- **`add <id> --replace`** — swaps a single-select category's existing
  answer instead of requiring it empty, refusing outright if any of the
  outgoing technology's files were hand-edited since generation.
- **`upgrade`** — refreshes an already-generated project's rules, prompts
  and docs against the same selection, without a full regeneration.
- **`doctor`** — checks whether the local machine can build the stack you
  have in mind (Node/Git/npm always; mobile/backend tooling on request)
  before generation, separate from the `npm run doctor` a generated
  project ships with.
- **`--preset <id>`** — curated stack bundles (`startup-mvp`, `web-saas`,
  `enterprise`) that pre-fill the wizard.
- **Six more AI coding tools** — GitHub Copilot, Gemini CLI, Continue.dev,
  Cline, Roo Code and OpenAI Codex now get generated rules alongside Cursor
  and Claude Code, from the same per-module source content.

### Fixed

- `add <id> --replace` no longer leaves an empty directory behind for the
  technology it removed (e.g. `.claude/skills/<old-id>/`).
- `@types/node` is now installed in every generated project — every
  module's own setup docs use `process.env`, but nothing ever installed
  its types, so a project with real application code (an archetype, or
  `implement` scaffold) failed `tsc --noEmit`.
- `dark-theme`'s system-theme detection now handles React Native's
  `"unspecified"` `ColorSchemeName` value instead of only `light`/`dark`.
- `checkLintSuppressions` (shared by `review` and `analyze`) no longer
  flags the literal text "eslint-disable" appearing in a string or comment
  as if it were a real suppression directive.
- The technology table in this README stopped drifting from
  `technologies/*/manifest.json` — it's generated by
  `scripts/generate-tech-table.mjs` and checked in CI.

## [0.5.0] — 2026-08-06

### Added

- `add <technology-id>` command to retrofit one more technology into a
  project this tool already generated, without regenerating from scratch —
  reuses fingerprint-based preservation so hand-edited files are left alone.

### Changed

- npm package description now flags the project as work in progress.

## [0.4.1] — 2026-08-06

### Fixed

- Claude Code output now emits real skills (`.claude/skills/<id>/SKILL.md`
  with synthesized frontmatter) instead of flat files Claude Code never
  discovered.

## [0.4.0] — 2026-08-05

### Added

- The project name argument now accepts a path (e.g. `./apps/my-app`),
  doubling as both the project's name and its location.

## [0.3.0] — 2026-08-05

### Added

- FastAPI and NestJS server backends.
- Stripe and the Firebase family (Firebase, Firestore).
- Auth0.

### Fixed

- Stopped documenting `npm test` in generated setup docs when no test runner
  was selected.

## [0.2.0] — 2026-08-05

### Added

- Web platforms and a hybrid mobile+web target, so a project can carry both a
  mobile app and a web app sharing one repository.

### Chore

- Added a `LICENSE` and CI for the generator's own repository.

## [0.1.1] — 2026-08-05

### Added

- The nine previously-empty wizard categories (analytics, crash reporting,
  notifications, storage, email, monitoring, CI/CD, testing, deployment).
- One-command setup (`scripts/setup.mjs`) and an environment `doctor` check
  (`scripts/doctor.mjs`) in generated projects.
- Fingerprint-based protection for hand-edited files on regeneration, and a
  "None" option offered consistently across optional categories.

### Fixed

- The wizard no longer offers options it would later reject during
  resolution.
- Dependency pins brought current; generated scripts made to actually work.
- `git init` now runs before `install` in the generated setup guide.

### Chore

- Renamed the package to `ai-project-bootstrap` and fixed the `bin` path.
- Added repository metadata for npm and GitHub.

[1.5.1]: https://github.com/igorishchenko/ai-project-bootstrap/compare/v1.5.0...v1.5.1
[1.5.0]: https://github.com/igorishchenko/ai-project-bootstrap/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/igorishchenko/ai-project-bootstrap/compare/v1.3.2...v1.4.0
[1.3.2]: https://github.com/igorishchenko/ai-project-bootstrap/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/igorishchenko/ai-project-bootstrap/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/igorishchenko/ai-project-bootstrap/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/igorishchenko/ai-project-bootstrap/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/igorishchenko/ai-project-bootstrap/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/igorishchenko/ai-project-bootstrap/compare/v0.5.0...v1.0.0
[0.5.0]: https://github.com/igorishchenko/ai-project-bootstrap/compare/v0.4.1...v0.5.0
[0.4.1]: https://github.com/igorishchenko/ai-project-bootstrap/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/igorishchenko/ai-project-bootstrap/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/igorishchenko/ai-project-bootstrap/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/igorishchenko/ai-project-bootstrap/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/igorishchenko/ai-project-bootstrap/releases/tag/v0.1.1
