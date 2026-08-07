import fs from 'node:fs';
import path from 'node:path';
import { builders } from '../builders/index.js';
import { CONFIG_FILENAME } from '../builders/configBuilder.js';
import { generate } from '../core/pipeline/generate.js';
import { loadRegistry } from '../core/registry/loadModules.js';
import { readGeneratorPackageInfo } from '../core/registry/packageInfo.js';
import { resolveSelection } from '../core/resolve/resolveSelection.js';
import { gatingCategoryIds } from '../core/resolve/validate.js';
import { GeneratorError } from '../core/resolve/errors.js';
import { preservedPaths, readFingerprints } from '../core/vfs/preserve.js';
import { loadSelectionFile } from './configFile.js';
import type { Reporter } from './reporter.js';
import {
  checkEnvGitignored,
  checkHardcodedSecrets,
  checkLintSuppressions,
  checkMissingFolders,
  checkStaleFiles,
  checklistReminders,
  meetsThreshold,
  performancePointers,
  type Finding,
  type FindingSeverity,
} from './reviewChecks.js';

export interface ReviewFlags {
  dir?: string;
  report: boolean;
  failOn: FindingSeverity;
  help: boolean;
}

const SEVERITIES: FindingSeverity[] = ['info', 'warning', 'critical'];
const BOOLEANS = new Set(['--report', '-h', '--help']);
const VALUED = new Set(['--dir', '--fail-on']);

/** Parses `review`'s own small flag set — deliberately separate from the main parser. */
export function parseReviewFlags(argv: string[]): ReviewFlags {
  const flags: ReviewFlags = { report: false, failOn: 'critical', help: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] as string;

    if (BOOLEANS.has(arg)) {
      if (arg === '--report') flags.report = true;
      if (arg === '-h' || arg === '--help') flags.help = true;
      continue;
    }

    if (VALUED.has(arg)) {
      const value = argv[++i];
      if (value === undefined) {
        throw new GeneratorError(
          'INVALID_CONFIG',
          `${arg} needs a value.`,
          `Example: ${arg} ${arg === '--fail-on' ? 'warning' : './my-app'}`,
        );
      }
      if (arg === '--fail-on') {
        if (!SEVERITIES.includes(value as FindingSeverity)) {
          throw new GeneratorError(
            'INVALID_CONFIG',
            `--fail-on must be one of ${SEVERITIES.join(', ')} (got "${value}").`,
          );
        }
        flags.failOn = value as FindingSeverity;
      } else {
        flags.dir = value;
      }
      continue;
    }

    throw new GeneratorError(
      'INVALID_CONFIG',
      `Unknown flag ${arg}.`,
      'Run `ai-project-bootstrap review --help` to see every flag.',
    );
  }

  return flags;
}

export const REVIEW_HELP_TEXT = `
ai-project-bootstrap review — a static, AI-oriented review of a generated project.

Usage
  npx ai-project-bootstrap review [options]

Scans the project for issues across four categories — architecture, security,
performance, dx — using pattern-based checks (missing folders, secrets
committed to source, suppressed lint rules, an unprotected .env, generated
files that have drifted from today's templates). This is not a general-purpose
static analyzer or a linter, and it does not call an AI model: it is the same
kind of check \`doctor\` and \`upgrade\` already do, aimed at code instead of
environment or templates.

Options
      --dir <path>     Project to review (default: the current directory)
      --report         Also write review-report.md into the project
      --fail-on <lvl>  Exit non-zero at or above this severity:
                        info, warning, critical (default: critical)
  -h, --help           Show this help
`.trim();

const SEVERITY_LABEL: Record<FindingSeverity, string> = {
  critical: 'CRITICAL',
  warning: 'WARNING',
  info: 'INFO',
};

const CATEGORY_LABEL: Record<Finding['category'], string> = {
  architecture: 'Architecture',
  security: 'Security',
  performance: 'Performance',
  dx: 'DX',
  documentation: 'Documentation',
};

function renderReportMarkdown(input: {
  projectName: string;
  findings: Finding[];
  performancePointers: string[];
  checklists: string[];
}): string {
  const lines: string[] = [`# Review report — ${input.projectName}`, ''];
  const order: Finding['category'][] = ['architecture', 'security', 'performance', 'dx'];

  for (const category of order) {
    lines.push(`## ${CATEGORY_LABEL[category]}`, '');

    if (category === 'performance') {
      if (input.performancePointers.length === 0) {
        lines.push('No stack-specific guidance found for this project.', '');
      } else {
        for (const pointer of input.performancePointers) lines.push(`- ${pointer}`);
        lines.push('');
      }
      continue;
    }

    const inCategory = input.findings.filter((finding) => finding.category === category);
    if (inCategory.length === 0) {
      lines.push('No issues found.', '');
      continue;
    }
    for (const finding of inCategory) {
      lines.push(`- **${SEVERITY_LABEL[finding.severity]}** — ${finding.summary}`);
      if (finding.location) lines.push(`  - Where: \`${finding.location}\``);
      if (finding.suggestion) lines.push(`  - Fix: ${finding.suggestion}`);
    }
    lines.push('');
  }

  if (input.checklists.length > 0) {
    lines.push('## Recommended before shipping', '');
    for (const checklist of input.checklists) lines.push(`- ${checklist}`);
    lines.push('');
  }

  return lines.join('\n');
}

export async function runReview(
  argv: string[],
  rootDir: string,
  reporter: Reporter,
): Promise<number> {
  const flags = parseReviewFlags(argv);

  if (flags.help) {
    reporter.plain(REVIEW_HELP_TEXT);
    return 0;
  }

  const registry = loadRegistry(rootDir);
  const targetDir = path.resolve(flags.dir ?? process.cwd());
  const configFile = path.join(targetDir, CONFIG_FILENAME);

  if (!fs.existsSync(configFile)) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      `No ${CONFIG_FILENAME} found in ${targetDir}.`,
      'This must be a project ai-project-bootstrap already generated. Pass --dir to point at one.',
    );
  }

  const selection = loadSelectionFile(configFile);
  const version = readGeneratorPackageInfo(rootDir).version;

  reporter.intro(version);
  reporter.plain(`Reviewing ${selection.projectName}…\n`);

  const gating = gatingCategoryIds(registry.categories);
  const { modules } = resolveSelection(selection, registry.byId, gating);

  // Dry-run only — used to see which generated files have drifted from
  // today's templates, never to write anything.
  const result = generate({
    rootDir,
    targetDir,
    selection,
    builders,
    registry,
    generatorVersion: version,
  });
  // Anything the user hand-edited since generation (fingerprint mismatch) is
  // theirs, not drift — same rule `upgrade` uses to decide what to touch.
  const preserve = new Set(
    preservedPaths(targetDir, result.vfs.snapshot().files, readFingerprints(configFile)),
  );
  const flushed = result.vfs.flush(targetDir, { dryRun: true, force: true, preserve });

  const findings: Finding[] = [
    ...checkMissingFolders(targetDir, modules),
    ...checkEnvGitignored(targetDir),
    ...checkHardcodedSecrets(targetDir),
    ...checkLintSuppressions(targetDir),
    ...checkStaleFiles(flushed.added, flushed.updated),
  ];

  const pointers = performancePointers(targetDir, modules);
  const checklists = checklistReminders(targetDir);
  const failed = findings.some((finding) => meetsThreshold(finding.severity, flags.failOn));

  reporter.reviewFindings({
    findings,
    performancePointers: pointers,
    checklists,
    failOnThreshold: flags.failOn,
    failed,
  });

  if (flags.report) {
    const reportPath = path.join(targetDir, 'review-report.md');
    fs.writeFileSync(
      reportPath,
      renderReportMarkdown({
        projectName: selection.projectName,
        findings,
        performancePointers: pointers,
        checklists,
      }),
    );
    reporter.plain(`Wrote ${path.relative(targetDir, reportPath) || 'review-report.md'}`);
    reporter.plain('');
  }

  return failed ? 1 : 0;
}
