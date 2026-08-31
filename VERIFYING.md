# Verifying

Every check that proves this CLI and the three repositories built on it still
work, and the result each one produces when nothing is broken.

The numbers below were observed against 1.5.1 by running them, not estimated.
Treat a mismatch as a finding: either something changed that should not have, or
this document is stale and needs updating in the same PR as the change.

`/verify` runs the two halves of section 1 and 2 for you. This document is the
longer form — what to run when a change reaches further than `src/`, and what
each command is supposed to say.

## How to read this

Each check pairs a command with what it produces on a healthy tree. Three
markers carry the expectation, and the middle one matters most:

- **Pass** — exits 0. Anything else is a real failure.
- **Must fail** — exits non-zero _by design_. A generated project's `doctor` is
  the clearest case: it reports unset credentials, so a passing `doctor` on a
  freshly generated project is the bug, not the fix.
- **Inspect** — exits 0 either way; the value in the output is the result.

**Run the CLI with stdin closed.** Append `</dev/null` to every invocation in a
script or loop, and write output to a file rather than capturing it with
`$(…)`. The CLI opens an interactive prompt layer; under command substitution it
can hang or fail with a TTY initialisation error that looks like a product bug
and is not one.

## 1. The repository gate

Fast, hermetic, and what CI runs on every pull request. Run all of these even
when the first fails — one report beats three round trips.

```bash
pnpm install
pnpm lint
```

**Pass** — no output.

```bash
pnpm typecheck
```

**Pass** — no output.

```bash
pnpm test
```

**Pass** — 43 files, 767 tests. All in-memory against a virtual filesystem,
which is what makes it fast and what makes section 2 necessary.

```bash
pnpm build
```

**Pass** — `dist/index.js`, `dist/core.js`, `dist/rules.js`.

```bash
pnpm check:publishable
```

**Pass** — `6 declared entry point(s) present.` A tarball missing `config/`,
`technologies/`, `archetypes/` or `features/` installs fine and fails at
runtime; this is the guard for exactly that.

```bash
pnpm docs:tech-table
git diff --stat README.md
```

**Pass** — empty diff. A diff means the technology table drifted from
`technologies/*/manifest.json`.

## 2. Does the generated output actually work

Section 1 cannot catch a generated project that will not install. Every bug
class this repo has shipped twice was invisible to `pnpm test` alone, so this
half is not optional when a change can reach generated output — `technologies/`,
`assets/`, `features/`, `archetypes/`, dependencies, scripts, any builder.

1. Generate into an empty directory from a fixture or preset.
2. Run the project's own `setup` — git init, `.env`, install, format.
3. Run its checks, the same ones its generated CI workflow runs.
4. Confirm `doctor` fails, because nothing is configured yet.

```bash
# from this repo, after pnpm build
rm -rf /tmp/verify
node dist/index.js --out /tmp/verify \
  --config tests/fixtures/ci-full-stack.json </dev/null
```

**Pass** — `Files 118`.

```bash
cd /tmp/verify
npm run setup
npm run lint && npm run typecheck && npm test && npm run format:check
```

**Pass.** On a web target add `npm run build`: Next.js must build a freshly
generated project with no edits.

```bash
npm run doctor
```

**Must fail** — exit 1, `Setup is incomplete.` It lists every required
environment value still holding its example. A pass here means the check is not
working.

### File counts per entry point

Cheap to check with `--dry-run`, which writes nothing. A count that moves
without an intended reason means a builder started or stopped emitting
something.

| Entry point                  | Flag                                                    | Files |
| ---------------------------- | ------------------------------------------------------- | ----: |
| Mobile full stack            | `--config tests/fixtures/ci-full-stack.json`            |   118 |
| Web full stack               | `--config tests/fixtures/nextjs-full-stack.json`        |    93 |
| Expo + Supabase + RevenueCat | `--config tests/fixtures/expo-supabase-revenuecat.json` |    85 |
| Preset: startup MVP          | `--preset startup-mvp --yes`                            |   118 |
| Preset: web SaaS             | `--preset web-saas --yes`                               |    99 |
| Preset: enterprise           | `--preset enterprise --yes`                             |   101 |
| Archetype: habit tracker     | `--archetype habit-tracker --yes`                       |   127 |
| Hybrid, all seven AI tools   | `--config` (below)                                      |   144 |
| Minimal web                  | `--config` (target `web` + `nextjs` only)               |    59 |

35 technology modules are installed; `--list-modules` prints one line each.

The hybrid case is not a checked-in fixture, because nothing else needs it.
Paste this to reproduce 144 — it exercises both platforms at once and every AI
tool provider:

```json
{
  "projectName": "Hybrid All Tools",
  "choices": {
    "target": "hybrid",
    "mobile": "expo",
    "web": "nextjs",
    "backend": "supabase",
    "auth": "supabase-auth",
    "payments": "stripe",
    "testing": ["jest"],
    "aiTools": ["cursor", "claude", "copilot", "gemini-cli", "continue", "cline", "roo"]
  }
}
```

**Inspect** — warns that a client-visible variable has two names
(`EXPO_PUBLIC_`, `NEXT_PUBLIC_`) and that `.env.example` carries only the first.
That warning is the mechanism working, not a failure. Rule directories appear
for all seven tools.

## 3. The command surface

Exit codes are part of the contract — CI consumes them. `check` distinguishes 2
from 1 deliberately: "this repository has drifted" and "this repository was
never generated by us" need different responses.

| Command                        | Expected                                                                     |   Exit   |
| ------------------------------ | ---------------------------------------------------------------------------- | :------: |
| `add localization`             | Retrofits one technology; existing files preserved                           |    0     |
| `add clerk --replace`          | Swaps the auth answer; the old technology's own files deleted, no empty dirs |    0     |
| `upgrade`                      | Refreshes templates; reports added/updated/unchanged; never touches an edit  |    0     |
| `check --no-advisories`        | Clean project reports `Up to date`                                           |    0     |
| `check --json`                 | `schema: 1`; only JSON on stdout, errors on stderr                           |    0     |
| `check --fail-on info`         | Non-zero once anything has drifted                                           |    1     |
| `check` (outside a project)    | Not a project this tool generated                                            |    2     |
| `review`                       | Grouped findings; a clean project reports none                               |    0     |
| `review` (outside a project)   | Not a project this tool generated                                            |    1     |
| `analyze`                      | Scores any repository, generated or not                                      |    0     |
| `implement authentication`     | Writes plan, checklist, prompts and scaffold                                 |    0     |
| `implement push-notifications` | No notifications technology selected — names what is supported               |    1     |
| `ci init`                      | Writes two workflows; refuses a second run without `--force`                 | 0 then 1 |
| `doctor`                       | Checks this machine's toolchain, not the project                             |    0     |
| `pack list`                    | Lists pinned packs and the local cache                                       |    0     |
| `--dry-run`                    | Prints the summary; creates no directory                                     |    0     |

### Refusals worth confirming

Each should fail cleanly with a message naming the fix, never a stack trace.

| Input                                  | Expected message                                                                                         | Exit |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------- | :--: |
| `--preset nope`                        | Unknown preset                                                                                           |  1   |
| `--preset x --archetype y`             | Cannot be combined                                                                                       |  1   |
| `--out` a non-empty directory          | Directory is not empty; suggests `--force`                                                               |  1   |
| `add not-a-tech`                       | Unknown technology id                                                                                    |  1   |
| `target: web` + `payments: revenuecat` | `"revenuecat" requires "expo", which belongs to "Mobile platform" — ruled out by this project's answers` |  1   |
| `postgresql` + `supabase`              | Cannot be used together                                                                                  |  1   |

## 4. Platform and scaffold spot-checks

These guard the two bug classes this catalogue has shipped more than once: a web
project handed mobile packages, and a scaffold that does not compile where it
lands.

```bash
# in a generated WEB project
grep -c 'expo install\|expo prebuild' docs/setup.md
node -e "const p=require('./package.json');console.log(
  Object.keys({...p.dependencies,...p.devDependencies})
    .filter(k=>/expo|react-native/.test(k)))"
```

**Inspect** — `0` and `[]`. No Expo instructions and no native packages in a web
project. Reverse the check on a mobile project.

An auth SDK follows the target, not the technology:

| Technology | Native                                    | Next.js               | Other web            |
| ---------- | ----------------------------------------- | --------------------- | -------------------- |
| Clerk      | `@clerk/clerk-expo` + `expo-secure-store` | `@clerk/nextjs`       | `@clerk/clerk-react` |
| Auth0      | `react-native-auth0`                      | `@auth0/nextjs-auth0` | `@auth0/auth0-react` |

Scaffolds must compile where they land:

```bash
node dist/index.js implement authentication </dev/null
npx tsc --noEmit
```

**Pass** — no errors. Every relative import a scaffold writes must resolve to a
file something actually creates.

And a scaffold applies whole or not at all, because its files import each other:

```bash
# in an --archetype habit-tracker project
node dist/index.js implement authentication </dev/null
npm run typecheck
```

**Inspect** — `Skipped the scaffold — 4 of its 5 files already exist`, and
typecheck must still pass. The archetype's own code stays; the plan, checklist
and prompts still land.

## 5. Downstream repositories

See `CLAUDE.md` for why a release is not finished at the tag.

### ai-project-bootstrap-site

The catalogue is built from the _installed_ tarball, not a sibling checkout, so
the site describes what is published rather than what is on this repo's `main`.
Both data files are gitignored and regenerated by the `pre*` hooks.

```bash
pnpm install
pnpm build:catalogue
```

**Pass** — `v1.5.1, 16 categories, 35 modules` and `39 rules`.

```bash
pnpm lint && pnpm typecheck && pnpm build
```

**Pass** — 96 static pages.

```bash
npx -y ai-project-bootstrap@1.5.1 --out /tmp/oracle \
  --config <a full-stack config> </dev/null
node scripts/check-rule-formats.mjs /tmp/oracle
```

**Inspect** — 21 mismatches, of which 19 are the deliberate `~P~` project-name
placeholder and 2 are a known open bug (the site renders a literal
`{{envPrefix}}` where the CLI writes `EXPO_PUBLIC_`). Any _other_ mismatch is
new and worth reading.

```bash
curl -s https://ai-project-bootstrap.com/ | grep -o 'v1\.[0-9]*\.[0-9]*' | sort -u
```

**Inspect** — the released version. Confirms the deploy picked up a bump, not
just that the build succeeded.

### ai-project-bootstrap-cloud

Imports `/core` from the published package, so its idea of a valid stack must
match this CLI's exactly. When they disagree, the backend can sell a paying
customer a stack the CLI then refuses to generate.

```bash
pnpm install
pnpm typecheck && pnpm lint && pnpm test
```

**Pass** — 39 files, 530 tests, 11 skipped. The integration suite against real
Postgres runs in CI and needs Docker locally.

```bash
grep -n 'file:\.\./' package.json pnpm-lock.yaml
```

**Must fail** — no matches, so `grep` exits 1. A `file:../ai-project-generator`
link left in place during local development cannot build on deploy.

`tests/proposeStack.test.ts` pins the agreement itself: `web` + `revenuecat` is
rejected (revenuecat requires expo), while `web` + `stripe` and `mobile` +
`revenuecat` are accepted.

### ai-project-bootstrap-action

Wraps `check`. It only needs re-testing when that command's JSON, its exit codes
or its `--fail-on` behaviour change — and then its moving `v1` tag has to be
repointed.

```bash
npm test
```

**Pass** — 5 suites, 34 tests.

## 6. The release path

Pushing a `vX.Y.Z` tag to `main` runs `.github/workflows/release.yml`, which
re-runs the checks, refuses to publish if the tag disagrees with `package.json`,
publishes, and cuts the GitHub Release from the changelog section. The full
procedure is `/release`.

```bash
npm view ai-project-bootstrap version
npx -y ai-project-bootstrap@<version> --version
```

**Inspect** — verify the published tarball runs, not merely that the publish
succeeded. Generate one project from it before calling a release done.

Publishing authenticates with npm trusted publishing (OIDC); there is no token
in this repository. It depends on a trusted publisher configured on npmjs.com
against this repository and the workflow **filename** `release.yml` — rename
that file and publishing breaks. The workflow's preflight can prove the job is
capable of authenticating; it cannot detect a publisher that was never created
on npm's side, which surfaces as `ENEEDAUTH` at `npm publish`.

## 7. Failures that are not failures

Four things reliably look like breakage and are not. Check these before opening
an investigation.

| What you see                                        | What it actually is                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `doctor` exits 1 in a generated project             | Correct. Nothing is configured yet, and it lists every unset value. A pass would be the bug.                                                                                                                                                                                                                            |
| Hundreds of lint errors, or duplicated test files   | A stale `.claude/worktrees/…` checkout with its own build output is being linted and collected. CI never sees it. Confirm with `git worktree list`; remove with `git worktree remove`, not `rm -rf`, which leaves dangling metadata.                                                                                    |
| A TTY initialisation error, or a command that hangs | The CLI was invoked inside `$(…)` or a nested subshell without stdin closed. Re-run with `</dev/null` and redirect to a file.                                                                                                                                                                                           |
| `tests/check.test.ts` times out after 5000ms        | That suite makes a live advisory lookup with no stub, so it is only as fast as the network. CI passes; a slow endpoint fails it locally. Confirm with `AI_PROJECT_BOOTSTRAP_API_URL=http://127.0.0.1:9 npx vitest run tests/check.test.ts`, which passes instantly because `check` degrades to no advisories by design. |
| `check` lists advisories on a clean project         | Expected. Advisories are vendor changes affecting the stack, not drift, and never fail a build unless `--fail-on` asks. Use `--no-advisories` for an offline, deterministic run.                                                                                                                                        |
