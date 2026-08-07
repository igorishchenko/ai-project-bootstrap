import fs from 'node:fs';
import path from 'node:path';
import type { LoadedModule } from '../core/types.js';
import type { Registry } from '../core/registry/loadModules.js';
import {
  checkEnvGitignored,
  checkHardcodedSecrets,
  checkLintSuppressions,
} from './reviewChecks.js';
import type { Finding } from './reviewChecks.js';

export interface CategoryScore {
  /** 0-100, per this category's own additive/subtractive rubric — see the functions below. */
  score: number;
  findings: Finding[];
}

// ── Stack detection ─────────────────────────────────────────────────────────

export type DetectionConfidence = 'high' | 'medium';

export interface DetectedTechnology {
  id: string;
  name: string;
  categoryLabel: string;
  confidence: DetectionConfidence;
  /** Human-readable evidence — shown so a guess never reads as a fact. */
  signal: string;
}

interface PackageJsonShape {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  description?: string;
  scripts?: Record<string, string>;
}

function readPackageJson(targetDir: string): PackageJsonShape | undefined {
  const file = path.join(targetDir, 'package.json');
  if (!fs.existsSync(file)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as PackageJsonShape;
  } catch {
    return undefined;
  }
}

/**
 * A module's own declared npm package names — from the already-parsed
 * `dependencies.json` when it wasn't templated, or regex-extracted from the
 * raw text when it was (one module, `jest`, currently templates it; the
 * `"name": "..."` fields themselves are never inside a `{{#if}}` block, so
 * this needs no awareness of the templating syntax at all).
 */
function packageNamesOf(module: LoadedModule): string[] {
  if (module.dependencies?.packages) {
    return module.dependencies.packages.map((spec) => spec.name);
  }
  if (module.dependenciesRaw) {
    return [...module.dependenciesRaw.matchAll(/"name"\s*:\s*"([^"]+)"/g)].map(
      (match) => match[1] as string,
    );
  }
  return [];
}

/**
 * A module's optional `detect.json` — `{ "configFiles": [...] }`, paths
 * relative to the analyzed repo's root. Only a handful of modules ship one:
 * the ones with no npm package of their own to match against (a CI config, a
 * Python framework).
 */
function detectConfigFilesOf(module: LoadedModule): string[] {
  const file = path.join(module.root, 'detect.json');
  if (!fs.existsSync(file)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as { configFiles?: string[] };
    return parsed.configFiles ?? [];
  } catch {
    return [];
  }
}

/**
 * Package names more than one module declares (`react`, shared by `nextjs`,
 * `react-native` and the Vite `react` module — see each one's own
 * `dependencies.json`) can't distinguish between them, so they're excluded
 * from matching entirely rather than handed to whichever module happens to
 * be checked first.
 */
function ambiguousPackageNames(registry: Registry): Set<string> {
  const owners = new Map<string, Set<string>>();
  for (const module of registry.modules) {
    for (const name of packageNamesOf(module)) {
      const moduleIds = owners.get(name) ?? new Set<string>();
      moduleIds.add(module.manifest.id);
      owners.set(name, moduleIds);
    }
  }
  return new Set([...owners].filter(([, moduleIds]) => moduleIds.size > 1).map(([name]) => name));
}

/**
 * Infers likely technologies from the target repo's own filesystem —
 * genuinely a guess, so every result carries the evidence it's based on.
 * A `package.json` dependency name match is `high` confidence (the repo
 * explicitly declares it); a config file's mere presence is `medium` (e.g.
 * `requirements.txt` says "some Python framework", not specifically which).
 */
export function detectStack(targetDir: string, registry: Registry): DetectedTechnology[] {
  const pkg = readPackageJson(targetDir);
  const declaredDeps = new Set([
    ...Object.keys(pkg?.dependencies ?? {}),
    ...Object.keys(pkg?.devDependencies ?? {}),
  ]);
  const categoryLabels = new Map(
    registry.categories.map((category) => [category.id, category.label]),
  );
  const ambiguous = ambiguousPackageNames(registry);
  const results: DetectedTechnology[] = [];

  for (const module of registry.modules) {
    const categoryLabel = categoryLabels.get(module.manifest.category) ?? module.manifest.category;

    const matchedPackage = packageNamesOf(module)
      .filter((name) => !ambiguous.has(name))
      .find((name) => declaredDeps.has(name));
    if (matchedPackage) {
      results.push({
        id: module.manifest.id,
        name: module.manifest.name,
        categoryLabel,
        confidence: 'high',
        signal: `package.json dependency "${matchedPackage}"`,
      });
      continue;
    }

    const matchedFile = detectConfigFilesOf(module).find((relative) =>
      fs.existsSync(path.join(targetDir, relative)),
    );
    if (matchedFile) {
      results.push({
        id: module.manifest.id,
        name: module.manifest.name,
        categoryLabel,
        confidence: 'medium',
        signal: `${matchedFile} present`,
      });
    }
  }

  return results.sort(
    (a, b) => a.categoryLabel.localeCompare(b.categoryLabel) || a.name.localeCompare(b.name),
  );
}

// ── Shared filesystem helpers ───────────────────────────────────────────────

const SKIP_DIRECTORIES = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next']);

/** Recursively lists every file under `root` (absolute), skipping build/dependency directories. */
function listAllFiles(root: string, maxDepth = 6): string[] {
  const files: string[] = [];
  const walk = (dir: string, depth: number): void => {
    if (depth > maxDepth || !fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRECTORIES.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, depth + 1);
      else if (entry.isFile()) files.push(full);
    }
  };
  walk(root, 0);
  return files;
}

// ── Documentation coverage ──────────────────────────────────────────────────

/**
 * Rubric (100 pts, additive): README (40) — the one thing every contributor
 * reads first; CONTRIBUTING.md (20); a LICENSE file (15); a `docs/` directory
 * with at least one markdown file (15); `package.json`'s `description` field
 * filled in (10, skipped — not just zeroed differently — the same as missing
 * when there's no `package.json` at all).
 */
export function scoreDocumentation(targetDir: string): CategoryScore {
  const findings: Finding[] = [];
  let score = 0;

  if (fs.existsSync(path.join(targetDir, 'README.md'))) {
    score += 40;
  } else {
    findings.push({
      category: 'documentation',
      severity: 'warning',
      summary: 'No README.md found.',
      suggestion:
        'Add one covering what this is, how to run it, and how to contribute — the first thing anyone (human or AI assistant) opens.',
    });
  }

  if (fs.existsSync(path.join(targetDir, 'CONTRIBUTING.md'))) {
    score += 20;
  } else {
    findings.push({
      category: 'documentation',
      severity: 'info',
      summary: 'No CONTRIBUTING.md found.',
      suggestion: 'Document the contribution workflow — setup, tests, PR expectations.',
    });
  }

  const hasLicense = ['LICENSE', 'LICENSE.md', 'LICENSE.txt'].some((name) =>
    fs.existsSync(path.join(targetDir, name)),
  );
  if (hasLicense) {
    score += 15;
  } else {
    findings.push({
      category: 'documentation',
      severity: 'info',
      summary: 'No LICENSE file found.',
      suggestion: 'Add one — without it, the legal default is "no rights granted" to anyone else.',
    });
  }

  const docsDir = path.join(targetDir, 'docs');
  const hasDocs =
    fs.existsSync(docsDir) &&
    fs.readdirSync(docsDir).some((name) => name.toLowerCase().endsWith('.md'));
  if (hasDocs) {
    score += 15;
  } else {
    findings.push({
      category: 'documentation',
      severity: 'info',
      summary: 'No docs/ directory with markdown content found.',
      suggestion:
        'Even a few pages (architecture, setup, deployment) save every future contributor real time.',
    });
  }

  const pkg = readPackageJson(targetDir);
  if (pkg?.description && pkg.description.trim().length > 0) {
    score += 10;
  } else if (pkg) {
    findings.push({
      category: 'documentation',
      severity: 'info',
      summary: 'package.json has no "description".',
      suggestion:
        "A one-line description shows up on npm, GitHub's sidebar, and search — cheap to add.",
    });
  }

  return { score, findings };
}

// ── Architecture ─────────────────────────────────────────────────────────────

const SOURCE_DIRECTORIES = ['src', 'app', 'lib', 'server', 'api'];
const TEST_DIRECTORIES = ['tests', 'test', '__tests__'];
const TEST_FILE_PATTERN = /\.(test|spec)\.[jt]sx?$/;
const LINT_CONFIG_FILES = [
  '.eslintrc',
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.json',
  'eslint.config.js',
  'eslint.config.mjs',
  'eslint.config.ts',
  'biome.json',
];

/**
 * Rubric (100 pts, additive): a recognized source directory at the repo root
 * (30) rather than everything dumped loose; tests present, a directory or
 * matching filenames (30); a lint config (20); `package.json` declaring both
 * a `build` and a `test`/`lint` script (20). JS/TS-shaped signals throughout
 * — a Python or Go repo will score low here regardless of how well-organized
 * it actually is, which `analyze`'s output says plainly rather than pretend
 * otherwise.
 */
export function scoreArchitecture(targetDir: string): CategoryScore {
  const findings: Finding[] = [];
  let score = 0;

  const hasSourceDir = SOURCE_DIRECTORIES.some((name) => fs.existsSync(path.join(targetDir, name)));
  if (hasSourceDir) {
    score += 30;
  } else {
    findings.push({
      category: 'architecture',
      severity: 'warning',
      summary: `No conventional source directory found (looked for ${SOURCE_DIRECTORIES.join(', ')}).`,
      suggestion:
        'A recognizable layout is what lets a new contributor (or an AI assistant) find things without asking.',
    });
  }

  const hasTestDir = TEST_DIRECTORIES.some((name) => fs.existsSync(path.join(targetDir, name)));
  const hasTestFiles =
    hasTestDir || listAllFiles(targetDir).some((file) => TEST_FILE_PATTERN.test(file));
  if (hasTestFiles) {
    score += 30;
  } else {
    findings.push({
      category: 'architecture',
      severity: 'warning',
      summary: 'No tests found.',
      suggestion:
        'Even a handful of tests around the riskiest logic catches regressions a README never will.',
    });
  }

  const hasLintConfig = LINT_CONFIG_FILES.some((name) => fs.existsSync(path.join(targetDir, name)));
  if (hasLintConfig) {
    score += 20;
  } else {
    findings.push({
      category: 'architecture',
      severity: 'info',
      summary: 'No lint config found.',
      suggestion: 'A shared lint config keeps style debates out of every PR review.',
    });
  }

  const pkg = readPackageJson(targetDir);
  const scripts = pkg?.scripts ?? {};
  if ('build' in scripts && ('test' in scripts || 'lint' in scripts)) {
    score += 20;
  } else if (pkg) {
    findings.push({
      category: 'architecture',
      severity: 'info',
      summary: 'package.json is missing a "build" script, or both "test" and "lint".',
      suggestion:
        'Scripted, one-command build/test/lint is what makes CI (and a new contributor) trust the repo.',
    });
  }

  return { score, findings };
}

// ── Security ─────────────────────────────────────────────────────────────────

const SUPPRESSION_DEDUCTION_CAP = 20;

/**
 * Rubric (100 pts, subtractive from a clean 100): reuses `review`'s own
 * checks, since "is there a hardcoded secret" and "is .env gitignored" mean
 * exactly the same thing whether or not the repo has an
 * `ai-project.config.json`. A hardcoded credential costs 25 pts each; an
 * ungitignored `.env`, 30; `eslint-disable`/`@ts-ignore`/`@ts-nocheck`
 * comments, 5 each up to a 20-pt cap (many small suppressions are a hygiene
 * smell, not a single incident, and shouldn't crater the score the way one
 * leaked secret does); no `.gitignore` at all, 10. Dependency-vulnerability
 * scanning is deliberately not part of this — see README.
 */
export function scoreSecurity(targetDir: string): CategoryScore {
  const findings: Finding[] = [
    ...checkHardcodedSecrets(targetDir),
    ...checkEnvGitignored(targetDir),
    ...checkLintSuppressions(targetDir),
  ];

  const secretCount = findings.filter((finding) =>
    finding.summary.includes('hardcoded credential'),
  ).length;
  const envCount = findings.filter((finding) => finding.summary.includes('.env exists')).length;
  const suppressionCount = findings.filter((finding) =>
    ['eslint-disable', '@ts-ignore', '@ts-nocheck'].some((marker) =>
      finding.summary.startsWith(marker),
    ),
  ).length;

  let score = 100;
  score -= secretCount * 25;
  score -= envCount * 30;
  score -= Math.min(suppressionCount * 5, SUPPRESSION_DEDUCTION_CAP);

  if (!fs.existsSync(path.join(targetDir, '.gitignore'))) {
    score -= 10;
    findings.push({
      category: 'security',
      severity: 'info',
      summary: 'No .gitignore found.',
      suggestion:
        'Without one, it is easy to accidentally commit node_modules, build output, or a real .env.',
    });
  }

  return { score: Math.max(0, score), findings };
}

// ── Performance-relevant patterns ───────────────────────────────────────────

const BUNDLER_CONFIG_FILES = [
  'next.config.js',
  'next.config.mjs',
  'next.config.ts',
  'vite.config.js',
  'vite.config.ts',
  'webpack.config.js',
  'metro.config.js',
  'astro.config.mjs',
  'rollup.config.js',
];
const LARGE_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif']);
const LARGE_IMAGE_BYTES = 1_000_000;

function gitignoresNodeModules(targetDir: string): boolean {
  const file = path.join(targetDir, '.gitignore');
  if (!fs.existsSync(file)) return false;
  return fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some(
      (line) => line === 'node_modules' || line === 'node_modules/' || line === '/node_modules',
    );
}

function findLargeImages(targetDir: string): string[] {
  return listAllFiles(targetDir)
    .filter((file) => LARGE_IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .filter((file) => {
      try {
        return fs.statSync(file).size > LARGE_IMAGE_BYTES;
      } catch {
        return false;
      }
    })
    .map((file) => path.relative(targetDir, file));
}

/**
 * Rubric (100 pts, additive): `.gitignore` excludes `node_modules` (30) —
 * committing it bloats every clone and CI checkout; a recognized
 * bundler/build config is present (40) — the prerequisite for code-splitting
 * and minification to happen at all; no committed image over 1MB (30) —
 * cheap to catch, expensive to ship. This is deliberately not "real"
 * performance analysis (no re-render tracing, no query-plan inspection —
 * that needs a running app, not a filesystem scan), the same honesty
 * boundary `review`'s performance category draws.
 */
export function scorePerformance(targetDir: string): CategoryScore {
  const findings: Finding[] = [];
  let score = 0;

  if (gitignoresNodeModules(targetDir)) {
    score += 30;
  } else {
    findings.push({
      category: 'performance',
      severity: 'warning',
      summary: 'No .gitignore rule excludes node_modules.',
      suggestion:
        'Verify it is not committed (`git ls-files | grep node_modules`) — this alone can 10x clone and CI time.',
    });
  }

  const hasBundlerConfig = BUNDLER_CONFIG_FILES.some((name) =>
    fs.existsSync(path.join(targetDir, name)),
  );
  if (hasBundlerConfig) {
    score += 40;
  } else {
    findings.push({
      category: 'performance',
      severity: 'info',
      summary: 'No recognized bundler/build config found.',
      suggestion:
        'If this ships browser JS, verify something is actually minifying and code-splitting it.',
    });
  }

  const largeImages = findLargeImages(targetDir);
  if (largeImages.length === 0) {
    score += 30;
  } else {
    findings.push({
      category: 'performance',
      severity: 'info',
      summary: `${largeImages.length} committed image${largeImages.length > 1 ? 's' : ''} over 1MB.`,
      location: largeImages.slice(0, 3).join(', '),
      suggestion:
        'Compress, resize, or serve from a CDN instead of committing large binaries directly.',
    });
  }

  return { score, findings };
}
