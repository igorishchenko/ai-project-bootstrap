#!/usr/bin/env node
/**
 * Verify a repository against the workspace repository standard.
 *
 * The standard is `context/global/repo-standards.md`. This script is its enforcement:
 * every rule it checks cites the rule it comes from, so a failure tells you what to read.
 *
 *   node scripts/verify-repo-standards.mjs            # this repo, full check
 *   node scripts/verify-repo-standards.mjs --quiet    # only WARN and FAIL
 *   node scripts/verify-repo-standards.mjs <path>     # another repo
 *
 * Exit code: 0 when nothing FAILed, 1 otherwise. WARN never fails the run — it marks
 * something to fix that would be wrong to block a build over.
 *
 * ── This file is generated, not authored ──────────────────────────────────────────
 * The canonical copy is `context/tools/verify-repo-standards.mjs` in the private repo
 * igorishchenko/workspace-context. Each repo carries a byte-identical copy at
 * `scripts/verify-repo-standards.mjs`, because CI cannot read a private repo it is not
 * checked out from. Edit the canonical copy, then re-run:
 *
 *   python3 context/tools/sync_repo_standards.py --write
 *
 * `verify_context.py` fails if a repo's copy has drifted from the canonical one.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const quiet = args.includes('--quiet');
const ROOT = resolve(args.find((a) => !a.startsWith('--')) ?? '.');

const counts = { PASS: 0, WARN: 0, FAIL: 0 };
const report = (status, rule, message) => {
  counts[status] += 1;
  if (status !== 'PASS' || !quiet) console.log(`  ${status.padEnd(4)}  ${rule.padEnd(3)}  ${message}`);
};
const pass = (rule, m) => report('PASS', rule, m);
const warn = (rule, m) => report('WARN', rule, m);
const fail = (rule, m) => report('FAIL', rule, m);

const has = (...p) => existsSync(join(ROOT, ...p));
const read = (...p) => {
  try {
    return readFileSync(join(ROOT, ...p), 'utf8');
  } catch {
    return null;
  }
};
const readJson = (...p) => {
  const raw = read(...p);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};
const git = (...a) => {
  try {
    return execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
};

/**
 * Variables the runner or the toolchain provides. Nobody configures these, so they are not
 * what R7's "every configurable variable by name" is about.
 */
const PROVIDED_ENV =
  /^(GITHUB_|RUNNER_|CI$|NODE_ENV$|npm_|VERCEL_|RAILWAY_|PORT$|HOME$|PATH$|TZ$|LANG$|LC_|VITEST|JEST_|EXPO_OS$|NEXT_RUNTIME$)/;

/** Every environment variable this repo reads that somebody has to set. */
function configEnvVars() {
  const names = new Set();
  for (const dir of ['src', 'scripts', 'lib', 'app']) {
    if (!has(dir)) continue;
    for (const file of filesUnder(dir)) {
      if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file)) continue;
      const body = read(file) ?? '';
      for (const [, name] of body.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g))
        if (!PROVIDED_ENV.test(name)) names.add(name);
      for (const [, name] of body.matchAll(/process\.env\[['"]([A-Z][A-Z0-9_]*)['"]\]/g))
        if (!PROVIDED_ENV.test(name)) names.add(name);
    }
  }
  return [...names].sort();
}

/**
 * R7 asks that every configurable value is documented **by name**, in the file its audience
 * reads. Which file that is depends on who the audience is:
 *
 *   mobile / web / service   a developer setting the repo up  →  .env.example
 *   package                  someone installing it from npm   →  README.md / USAGE.md
 *   action                   someone writing a workflow       →  action.yml's inputs
 *
 * Checking the names rather than the file's existence is the stronger test: an .env.example
 * that exists and is three variables out of date passes the weaker one.
 */
function checkEnvDocumented(kind) {
  const vars = configEnvVars();
  const surfaces =
    kind === 'package'
      ? ['README.md', 'USAGE.md', '.env.example']
      : kind === 'action'
        ? ['action.yml', 'README.md', '.env.example']
        : ['.env.example'];
  const docs = surfaces.map((f) => read(f) ?? '').join('\n');

  if (vars.length === 0) {
    pass('R7', 'nothing here reads configuration from the environment');
    return;
  }
  const undocumented = vars.filter((name) => !docs.includes(name));
  if (undocumented.length === 0) {
    pass('R7', `${vars.length} environment variable(s), each documented in ${surfaces.find((f) => has(f)) ?? surfaces[0]}`);
    return;
  }
  for (const name of undocumented)
    fail('R7', `${name} is read from the environment but documented in none of ${surfaces.join(', ')}`);
}

// ── R0 · Repo kinds ──────────────────────────────────────────────────────────────
const KINDS = ['mobile', 'web', 'service', 'package', 'action'];

/**
 * What the repo says it is. Declared in package.json, never guessed — a repo whose kind is
 * inferred is a repo one dependency away from being checked as something it is not. The
 * inference below exists only to name the value you should write down.
 */
function readKind(pkg) {
  const declared = pkg?.workspace?.kind;
  if (declared && KINDS.includes(declared)) {
    pass('R0', `kind "${declared}"${pkg.workspace.product ? `, product "${pkg.workspace.product}"` : ''}`);
    if (!pkg.workspace.product)
      warn('R0', 'package.json workspace.product is not set — R8 needs it to know which repo owns the web surface');
    return declared;
  }
  const guess = readJson('app.json')?.expo
    ? 'mobile'
    : has('action.yml')
      ? 'action'
      : pkg?.bin || pkg?.private === false
        ? 'package'
        : has('next.config.ts') || has('next.config.js') || has('vite.config.js') || has('vite.config.ts')
          ? 'web'
          : 'service';
  if (declared) fail('R0', `package.json workspace.kind is "${declared}" — not one of ${KINDS.join(', ')}`);
  else
    fail(
      'R0',
      `package.json has no workspace.kind. This looks like "${guess}" — declare it: ` +
        `"workspace": { "kind": "${guess}", "product": "<product>" }`,
    );
  return guess;
}

// ── R7 · Repository layout ───────────────────────────────────────────────────────
const REQUIRED_FILES = [
  ['README.md', 'what this is, for a human'],
  ['CLAUDE.md', 'the operating manual for an agent'],
  ['CHANGELOG.md', 'Keep a Changelog, with [Unreleased] always present'],
  ['.env.example', 'every variable by name, never a value'],
  ['.gitignore', ''],
  ['.github/workflows/ci.yml', 'the gate'],
  ['.github/pull_request_template.md', 'the R3 checklist'],
  ['.claude/settings.json', 'enables the workspace plugin'],
];

function checkLayout(kind) {
  for (const [file, why] of REQUIRED_FILES) {
    // A continuously deployed site has no releases to number, so no changelog to keep. The
    // git log is its record, and an invented release history would be worse than none.
    if (file === 'CHANGELOG.md' && kind === 'web') {
      pass('R7', 'CHANGELOG.md not required for a web repo — it deploys from main');
      continue;
    }
    // A package's and an action's configuration is documented where their audience reads
    // it — the README on npm, `inputs` in action.yml — not in a .env file neither of them
    // loads. `checkEnvDocumented` holds them to naming every variable; requiring the file
    // as well would be a second place to forget, and would imply a dotenv that is not read.
    if (file === '.env.example' && (kind === 'package' || kind === 'action')) {
      if (has(file)) pass('R7', '.env.example present');
      else pass('R7', `a ${kind} repo documents its variables in its README — see R7 below`);
      continue;
    }
    if (has(file)) pass('R7', `${file} present`);
    else fail('R7', `${file} is missing${why ? ` — ${why}` : ''}`);
  }
  if (kind === 'action' && !has('action.yml')) fail('R7', 'action.yml is missing from an action repo');
}

// ── R7 · secrets stay out of git ─────────────────────────────────────────────────
const IGNORE_PATTERNS = [
  [/^\.env($|\*|\.)/m, '.env', 'all'],
  [/(^|\/)secrets\//m, 'secrets/', 'all'],
  // App Store and Play signing material. Only a mobile repo is anywhere near one, and
  // asking a CLI to ignore a keystore it will never hold is the kind of noise that gets a
  // whole check skimmed past.
  [/\*\.p8/m, '*.p8', 'mobile'],
  [/\*\.(p12|jks|keystore)/m, '*.p12 / *.jks / *.keystore', 'mobile'],
];
const TRACKED_SECRETS = /(^|\/)(\.env(?!\.example)[^/]*|secrets\/.*|[^/]*\.(p8|p12|jks|keystore))$/;

function checkSecrets(kind) {
  const gitignore = read('.gitignore') ?? '';
  for (const [pattern, label, scope] of IGNORE_PATTERNS) {
    if (scope !== 'all' && scope !== kind) continue;
    if (pattern.test(gitignore)) pass('R7', `.gitignore covers ${label}`);
    else fail('R7', `.gitignore does not cover ${label}`);
  }
  const tracked = git('ls-files');
  if (tracked === null) return;
  const leaked = tracked.split('\n').filter((f) => f && TRACKED_SECRETS.test(f));
  if (leaked.length === 0) pass('R7', 'no secret-bearing files are tracked');
  else for (const f of leaked) fail('R7', `tracked file must never be committed: ${f}`);
}

// ── R4 · Versions ────────────────────────────────────────────────────────────────
const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

function checkVersions(kind) {
  const pkg = readJson('package.json');
  if (!pkg) {
    fail('R4', 'package.json is missing or unparseable');
    return;
  }
  if (!pkg.version) fail('R4', 'package.json has no version');
  else if (!SEMVER.test(pkg.version)) fail('R4', `package.json version is not semver: ${pkg.version}`);
  else pass('R4', `package.json version ${pkg.version}`);

  if (kind !== 'mobile') return;
  const appVersion = readJson('app.json')?.expo?.version;
  if (!appVersion) fail('R4', 'app.json has no expo.version');
  else if (appVersion !== pkg.version)
    fail('R4', `app.json ${appVersion} and package.json ${pkg.version} disagree — they must be equal`);
  else pass('R4', `app.json and package.json agree on ${appVersion}`);
}

// ── R3 · CHANGELOG ───────────────────────────────────────────────────────────────
function checkChangelog(kind) {
  if (kind === 'web') return; // no releases to log — see checkLayout
  const changelog = read('CHANGELOG.md');
  if (changelog === null) return; // already FAILed in checkLayout
  if (/^##\s*\[Unreleased\]/mi.test(changelog)) pass('R3', 'CHANGELOG.md has an [Unreleased] section');
  else fail('R3', 'CHANGELOG.md has no [Unreleased] section — every repo keeps one open');
}

// ── R8 · The web surface ─────────────────────────────────────────────────────────
const WEB_ROUTES = ['privacy', 'terms', 'support'];

/** Every filename under `dir`, lowercased, for asking "is there a page for this route?". */
function filesUnder(dir) {
  const out = [];
  const walk = (rel, depth = 0) => {
    if (depth > 6) return;
    let entries;
    try {
      entries = readdirSync(join(ROOT, rel), { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (['node_modules', 'dist', 'build', '.next', 'out'].includes(entry.name)) continue;
      if (entry.name.startsWith('.')) continue;
      const next = join(rel, entry.name);
      if (entry.isDirectory()) walk(next, depth + 1);
      else out.push(next.toLowerCase());
    }
  };
  walk(dir);
  return out;
}

/**
 * R8. A `mobile` repo carries the surface in `web/` and owes two root scripts; a `web` repo
 * IS the surface and owes only the routes. Everything else owes nothing — a CLI, a headless
 * service and an Action have no website, and their product's `web` repo has one for them.
 */
function checkWeb(kind, pkg) {
  if (kind !== 'mobile' && kind !== 'web') {
    pass('R8', `a ${kind} repo carries no web surface — its product's web repo does`);
    return;
  }

  let roots;
  if (kind === 'mobile') {
    if (!has('web')) {
      fail('R8', 'web/ is missing — a mobile product carries its landing, legal and support pages');
      return;
    }
    pass('R8', 'web/ present');
    for (const script of ['dev:web', 'build:web']) {
      if (pkg?.scripts?.[script]) pass('R8', `npm run ${script} exists`);
      else fail('R8', `package.json has no "${script}" script — the web contract needs it`);
    }
    roots = ['web'];
  } else {
    // A web repo's routes are wherever its framework puts them.
    roots = ['app', 'pages', 'src', 'content'].filter((d) => has(d));
    if (roots.length === 0) {
      fail('R8', 'no app/, pages/ or src/ to look for routes in');
      return;
    }
  }

  const blob = roots.flatMap(filesUnder).join('\n');
  for (const route of WEB_ROUTES) {
    if (blob.includes(route)) pass('R8', `/${route} has a page`);
    else fail('R8', `no /${route} page — R8 requires one of a ${kind} repo`);
  }

  // 5.1.1(v), and every privacy law: a product people can log into must let them delete the
  // account. The signal is a sign-in path — anonymous or device-scoped auth is not an account.
  const manifest = read('package.json') ?? '';
  const hasAccounts =
    /apple-authentication|google-signin|auth0|clerk|next-auth|firebase\/auth|lucia/i.test(manifest) ||
    blob.includes('login') ||
    blob.includes('register') ||
    blob.includes('signin');
  if (!hasAccounts) return;
  if (blob.includes('delete-account') || blob.includes('delete_account') || blob.includes('deleteaccount'))
    pass('R8', '/delete-account has a page');
  else fail('R8', 'this product has accounts but has no /delete-account page — App Store 5.1.1(v), and every privacy law');
}

// ── R6 / R9 · what triggers what ─────────────────────────────────────────────────
const RELEASE_ACTIONS = /eas (build|submit)|fastlane|npm publish|pnpm publish|deploy-pages|actions\/deploy-pages/i;

/** Kinds whose release is a tag. A `web` repo deploys from main and never gets one (R6). */
const TAG_RELEASED = ['mobile', 'package', 'action'];

function checkWorkflows(kind) {
  const ci = read('.github/workflows/ci.yml');
  if (ci !== null) {
    const body = ci.replace(/^\s*#.*$/gm, ''); // a commented-out job is a paused job, not a live one
    if (RELEASE_ACTIONS.test(body))
      fail('R9', 'ci.yml builds, submits, publishes or deploys — R9: ci.yml holds gates only');
    else pass('R9', 'ci.yml runs gates only');
    if (/on:[\s\S]*pull_request/.test(ci)) pass('R9', 'ci.yml runs on pull requests');
    else fail('R9', 'ci.yml does not run on pull requests');
    if (/verify-repo-standards/.test(ci)) pass('R9', 'ci.yml runs this standard check');
    else fail('R9', 'ci.yml does not run verify-repo-standards.mjs — R9 step 6');
  }

  if (!TAG_RELEASED.includes(kind)) {
    // A web or service repo deploys from main through its host. There is no tag workflow to
    // require — but there must be no tag workflow pretending otherwise either.
    if (has('.github/workflows/release.yml'))
      warn('R6', `a ${kind} repo has a release.yml — it deploys from main and is not released by a tag (R6)`);
    else pass('R6', `a ${kind} repo deploys from main; no tag release`);
    return;
  }

  const rel = read('.github/workflows/release.yml');
  if (rel === null) {
    fail('R6', '.github/workflows/release.yml is missing — a tag is what releases');
  } else {
    if (/tags:\s*(\n\s*-\s*['"]?v)|tags:\s*\[\s*['"]?v/.test(rel)) pass('R6', 'release.yml triggers on v* tags');
    else fail('R6', 'release.yml does not trigger on v* tags');
    const onBlock = rel.split(/^jobs:/m)[0];
    if (/branches:\s*(\n\s*-\s*['"]?main|\[\s*['"]?main)/.test(onBlock))
      fail('R6', 'release.yml triggers on a branch — R6: a merge to main never releases');
    else pass('R6', 'release.yml does not trigger on a branch');
  }

  if (kind !== 'mobile') return;
  if (has('.github/workflows/deploy-web.yml')) pass('R8', 'deploy-web.yml present');
  else fail('R8', '.github/workflows/deploy-web.yml is missing — web/ deploys from main');
}

// ── R1 / R2 · branch and commits ─────────────────────────────────────────────────
const BRANCH_RE = /^(feat|fix|refactor|perf|test|docs|chore|ci|build|revert)\/[a-z0-9]+(-[a-z0-9]+)*$|^release\/\d+\.\d+\.\d+$/;
const COMMIT_RE = /^(feat|fix|refactor|perf|test|docs|chore|ci|build|revert)(\([a-z0-9._-]+\))?!?: .+/;

function checkBranchAndCommits() {
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
  if (!branch || branch === 'HEAD') return; // detached: a CI checkout, nothing to judge
  if (branch === 'main' || branch === 'master') {
    pass('R1', `on ${branch}`);
    return;
  }
  if (BRANCH_RE.test(branch)) pass('R1', `branch name '${branch}' conforms`);
  else if (branch.startsWith('claude/'))
    warn('R1', `'${branch}' is a worktree branch — rename it to a real prefix before opening a PR`);
  else fail('R1', `branch name '${branch}' does not match <type>/<slug> or release/X.Y.Z`);

  const base = git('merge-base', 'HEAD', 'origin/main') ?? git('merge-base', 'HEAD', 'main');
  if (!base) return;
  // --first-parent: only the commits put on THIS branch. A merge brings someone else's
  // history — another repo's, in a subtree import — and R2 does not reach back into
  // published commits that R5 forbids rewriting anyway.
  const log = git('log', '--no-merges', '--first-parent', '--format=%s', `${base}..HEAD`);
  if (log === null) return;
  const subjects = log.split('\n').filter(Boolean);
  if (subjects.length === 0) {
    pass('R2', 'no commits on this branch yet');
    return;
  }
  const bad = subjects.filter((s) => !COMMIT_RE.test(s));
  if (bad.length === 0) pass('R2', `${subjects.length} commit(s), all Conventional Commits`);
  else for (const s of bad) fail('R2', `commit subject is not a Conventional Commit: "${s}"`);
  const long = subjects.filter((s) => s.length > 72);
  for (const s of long) warn('R2', `commit subject is ${s.length} characters, over 72: "${s.slice(0, 50)}…"`);

  // R4: only a release branch moves the version.
  if (!branch.startsWith('release/')) {
    const baseVersion = git('show', `${base}:package.json`);
    if (baseVersion) {
      try {
        const before = JSON.parse(baseVersion).version;
        const after = readJson('package.json')?.version;
        if (before && after && before !== after)
          fail('R4', `version moved ${before} → ${after} on a feature branch — only a release commit bumps it`);
        else pass('R4', 'the version is untouched on this branch');
      } catch {
        /* unparseable base package.json: nothing to compare */
      }
    }
  }
}

// ── R5 · tags ────────────────────────────────────────────────────────────────────
function checkTags(kind) {
  const tags = git('tag', '--list', 'v*');
  if (tags === null) return;
  const list = tags.split('\n').filter(Boolean);
  if (list.length === 0) {
    // A web repo deploys from main and is never tagged (R6), so having none is correct
    // rather than pending.
    if (kind === 'web') pass('R5', 'no tags, and a web repo takes none — it deploys from main');
    else warn('R5', 'no vX.Y.Z tags yet');
    return;
  }
  if (kind === 'web')
    warn('R5', `a web repo has ${list.length} v* tag(s) — R6 says it deploys from main and is not released by a tag`);
  // R5's one standing exception: an Action's consumers pin `@v1`, so a bare major tag
  // exists and moves. It is allowed here and nowhere else, and only alongside a real vX.Y.Z.
  const movingMajor = kind === 'action' ? /^v\d+$/ : /^$/;
  const malformed = list.filter((t) => !/^v\d+\.\d+\.\d+$/.test(t) && !movingMajor.test(t));
  if (kind === 'action' && list.some((t) => movingMajor.test(t)))
    pass('R5', `moving major tag present — allowed for an action, and only with Ihor's word to move it`);
  if (malformed.length) for (const t of malformed) fail('R5', `tag '${t}' is not vX.Y.Z`);
  else pass('R5', `${list.length} tag(s), all vX.Y.Z`);
  // Existing lightweight tags stay lightweight: R5 makes a published tag immutable, so this
  // is one warning about history, not a job. It is the next tag that has to be annotated.
  const lightweight = list
    .filter((t) => !movingMajor.test(t))
    .filter((t) => git('cat-file', '-t', t) === 'commit');
  if (lightweight.length === 0) pass('R5', 'every tag is annotated');
  else
    warn(
      'R5',
      `${lightweight.length} existing tag(s) are lightweight, not annotated (newest: ${lightweight[lightweight.length - 1]}). ` +
        'Leave them — a published tag is immutable. Annotate from the next release on',
    );
}

// ── R7 · the plugin is enabled ───────────────────────────────────────────────────
function checkPlugin() {
  const settings = readJson('.claude/settings.json');
  if (!settings) return; // already FAILed in checkLayout
  const enabled = Object.keys(settings.enabledPlugins ?? {});
  if (enabled.some((k) => k.startsWith('workspace@')))
    pass('R7', 'the workspace plugin is enabled');
  else fail('R7', '.claude/settings.json does not enable the workspace plugin — the shared skills will not load');
}

// ── run ──────────────────────────────────────────────────────────────────────────
const pkg = readJson('package.json');

console.log(`\nRepository standard · ${ROOT}\n`);
const kind = readKind(pkg);
checkLayout(kind);
checkSecrets(kind);
checkVersions(kind);
checkChangelog(kind);
checkEnvDocumented(kind);
checkWeb(kind, pkg);
checkWorkflows(kind);
checkBranchAndCommits();
checkTags(kind);
checkPlugin();

console.log(`\nSummary: ${counts.PASS} pass, ${counts.WARN} warn, ${counts.FAIL} fail`);
if (counts.FAIL) console.log('Read context/global/repo-standards.md for the rule behind each FAIL.\n');
process.exit(counts.FAIL ? 1 : 0);
