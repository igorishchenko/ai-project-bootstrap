import fs from 'node:fs';
import path from 'node:path';
import type { LoadedModule } from '../core/types.js';

export type FindingSeverity = 'critical' | 'warning' | 'info';
/**
 * `dx` only ever comes from `review` (drift from today's templates — a
 * concept that needs `ai-project.config.json` to mean anything); `documentation`
 * only ever comes from `analyze` (arbitrary repos have no generated docs to
 * drift from, but doc coverage is exactly what `analyze` can check instead).
 * One shared union so the two commands' overlapping checks (security,
 * architecture, performance) return a `Finding[]` either can consume.
 */
export type FindingCategory = 'architecture' | 'security' | 'performance' | 'dx' | 'documentation';

export interface Finding {
  category: FindingCategory;
  severity: FindingSeverity;
  summary: string;
  /** Usually a file, or file:line — where to look. */
  location?: string;
  /** What to do about it. */
  suggestion?: string;
}

const SEVERITY_RANK: Record<FindingSeverity, number> = { info: 0, warning: 1, critical: 2 };

export function meetsThreshold(severity: FindingSeverity, threshold: FindingSeverity): boolean {
  return SEVERITY_RANK[severity] >= SEVERITY_RANK[threshold];
}

// ── Architecture ─────────────────────────────────────────────────────────────

/**
 * A folder every selected module declared (`folders.json`) should still
 * exist. It's just as likely to mean "renamed on purpose" as "deleted by
 * accident" — hence `warning`, not `critical` — but either way it's worth a
 * human's attention rather than staying silent.
 */
export function checkMissingFolders(
  targetDir: string,
  modules: readonly LoadedModule[],
): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<string>();

  for (const module of modules) {
    for (const folder of module.folders) {
      if (seen.has(folder)) continue; // multiple modules can declare the same folder
      seen.add(folder);
      const full = path.join(targetDir, ...folder.split('/'));
      if (!fs.existsSync(full)) {
        findings.push({
          category: 'architecture',
          severity: 'warning',
          summary: `Expected folder "${folder}" is missing.`,
          location: folder,
          suggestion: `Declared by ${module.manifest.name} — restore it, or ignore this if you moved it on purpose.`,
        });
      }
    }
  }

  return findings;
}

// ── Security ─────────────────────────────────────────────────────────────────

/** `.env` holds real values by definition — it must never be trackable by git. */
export function checkEnvGitignored(targetDir: string): Finding[] {
  const envPath = path.join(targetDir, '.env');
  if (!fs.existsSync(envPath)) return [];

  const gitignorePath = path.join(targetDir, '.gitignore');
  const gitignore = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
  const lines = gitignore.split(/\r?\n/).map((line) => line.trim());
  const ignored = lines.some((line) => line === '.env' || line === '/.env' || line === '.env*');

  if (ignored) return [];

  return [
    {
      category: 'security',
      severity: 'critical',
      summary: '.env exists but is not listed in .gitignore.',
      location: '.gitignore',
      suggestion:
        'Add ".env" to .gitignore immediately — real secrets are one `git add .` away from being committed.',
    },
  ];
}

const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const SKIP_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  'ios',
  'android',
]);
/** Scanned directories only — doc/config/root files are out of scope for a "secret in code" check. */
const SCAN_ROOTS = ['src', 'server', 'app', 'api'];

function isTestFile(relativePath: string): boolean {
  return /\.(test|spec)\.[jt]sx?$/.test(relativePath) || /(^|\/)__tests__\//.test(relativePath);
}

/** Recursively lists code files under `root`, relative to `targetDir`. */
function listCodeFiles(targetDir: string, root: string): string[] {
  const base = path.join(targetDir, root);
  if (!fs.existsSync(base)) return [];

  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRECTORIES.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && CODE_EXTENSIONS.has(path.extname(entry.name))) {
        files.push(path.relative(targetDir, full).split(path.sep).join('/'));
      }
    }
  };
  walk(base);
  return files;
}

// Deliberately conservative: only variable/property names that unambiguously
// mean "this holds a credential", assigned a string literal directly (not a
// reference — `= getToken()` never matches) of a length too long to be a
// placeholder. False negatives are fine here; false positives erode trust in
// every other finding this command makes.
const SECRET_ASSIGNMENT =
  /\b(secret|secretKey|apiKey|privateKey|password|accessKey)\s*[:=]\s*['"`]([^'"`]{12,})['"`]/gi;
const PLACEHOLDER = /^(your|xxx|example|placeholder|changeme|replace|<|\$\{)/i;

/**
 * Hardcoded credentials in source — distinct from `doctor`'s env-completeness
 * check in a generated project (`npm run doctor`), which checks whether
 * `.env` is filled in, never whether a secret leaked into code instead of
 * living there.
 */
export function checkHardcodedSecrets(targetDir: string): Finding[] {
  const findings: Finding[] = [];

  for (const root of SCAN_ROOTS) {
    for (const relativePath of listCodeFiles(targetDir, root)) {
      if (isTestFile(relativePath)) continue;

      const content = fs.readFileSync(path.join(targetDir, relativePath), 'utf8');
      const lines = content.split(/\r?\n/);

      lines.forEach((line, index) => {
        SECRET_ASSIGNMENT.lastIndex = 0;
        const match = SECRET_ASSIGNMENT.exec(line);
        if (!match) return;
        const value = match[2] ?? '';
        if (PLACEHOLDER.test(value)) return;

        findings.push({
          category: 'security',
          severity: 'critical',
          summary: `Possible hardcoded credential ("${match[1]}").`,
          location: `${relativePath}:${index + 1}`,
          suggestion:
            'Move it to .env and read it via process.env, or via app config for a public key.',
        });
      });
    }
  }

  return findings;
}

// Anchored to a `//` comment start so this only matches an actual directive
// — a string or array literal that merely mentions "eslint-disable" (this
// file's own SUPPRESSION regex, for instance) doesn't count.
const SUPPRESSION = /\/\/\s*(eslint-disable(?:-next-line|-line)?|@ts-ignore|@ts-nocheck)\b/;

/**
 * The project's own generated rules say never to do this (see CLAUDE.md /
 * .cursor/rules/base.mdc) — eslint itself won't flag its own disable
 * comments, so this is genuinely something `eslint`/`tsc` don't already
 * surface.
 */
export function checkLintSuppressions(targetDir: string): Finding[] {
  const findings: Finding[] = [];

  for (const root of SCAN_ROOTS) {
    for (const relativePath of listCodeFiles(targetDir, root)) {
      const content = fs.readFileSync(path.join(targetDir, relativePath), 'utf8');
      content.split(/\r?\n/).forEach((line, index) => {
        const match = SUPPRESSION.exec(line);
        if (!match) return;
        findings.push({
          category: 'security',
          severity: 'warning',
          summary: `${match[1]} suppresses a check instead of fixing the cause.`,
          location: `${relativePath}:${index + 1}`,
          suggestion:
            'Fix the underlying issue, or leave a comment explaining why this one is a deliberate exception.',
        });
      });
    }
  }

  return findings;
}

// ── DX ───────────────────────────────────────────────────────────────────────

/** Reuses `upgrade`'s own staleness classification — see VirtualFs.flush(). */
export function checkStaleFiles(added: readonly string[], updated: readonly string[]): Finding[] {
  const stale = [...added, ...updated];
  if (stale.length === 0) return [];

  return [
    {
      category: 'dx',
      severity: 'info',
      summary: `${stale.length} file${stale.length > 1 ? 's' : ''} would change if regenerated with today's templates.`,
      location:
        stale.slice(0, 5).join(', ') + (stale.length > 5 ? `, …and ${stale.length - 5} more` : ''),
      suggestion:
        'Run `ai-project-bootstrap upgrade --dry-run` to see exactly what, then `upgrade` to apply it.',
    },
  ];
}

/** Pointers, not findings — this project's own checklists are the closest thing to a pre-ship review it already has. */
export function checklistReminders(targetDir: string): string[] {
  const dir = path.join(targetDir, 'checklists');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => `checklists/${name}`);
}

// ── Performance ──────────────────────────────────────────────────────────────

/** Where a module's stack-specific rule content could have landed — checked in this order, first match wins. */
function ruleCandidates(id: string): string[] {
  return [
    `.cursor/rules/${id}.mdc`,
    `.claude/skills/${id}/SKILL.md`,
    `.github/instructions/${id}.instructions.md`,
    `.continue/rules/${id}.md`,
    `.clinerules/${id}.md`,
    `.roo/rules/${id}.md`,
  ];
}

/**
 * Deliberately not a set of pass/fail findings: verifying most performance
 * concerns (unnecessary re-renders, N+1 queries, bundle size) needs runtime
 * profiling or a real bundler pass, neither of which this command can do
 * statically. What it *can* do honestly is point at the stack-specific
 * guidance already generated for this exact stack — checked against disk
 * rather than assumed, since which AI tool(s) a project generated rules for
 * is itself a choice (see the `aiTools` wizard question).
 */
export function performancePointers(targetDir: string, modules: readonly LoadedModule[]): string[] {
  const pointers: string[] = [];

  for (const module of modules) {
    if (module.isBase || !module.cursorRule) continue;
    const rulePath = ruleCandidates(module.manifest.id).find((candidate) =>
      fs.existsSync(path.join(targetDir, candidate)),
    );
    if (rulePath) pointers.push(`${rulePath} (${module.manifest.name})`);
  }

  return pointers.sort();
}
