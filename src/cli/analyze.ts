import fs from 'node:fs';
import path from 'node:path';
import { CONFIG_FILENAME } from '../builders/configBuilder.js';
import { loadRegistry } from '../core/registry/loadModules.js';
import { readGeneratorPackageInfo } from '../core/registry/packageInfo.js';
import { GeneratorError } from '../core/resolve/errors.js';
import type { Reporter } from './reporter.js';
import {
  detectStack,
  scoreArchitecture,
  scoreDocumentation,
  scorePerformance,
  scoreSecurity,
  type CategoryScore,
  type DetectedTechnology,
} from './analyzeChecks.js';

export interface AnalyzeFlags {
  dir?: string;
  report: boolean;
  help: boolean;
}

const BOOLEANS = new Set(['--report', '-h', '--help']);
const VALUED = new Set(['--dir']);

/** Parses `analyze`'s own small flag set — deliberately separate from the main parser. */
export function parseAnalyzeFlags(argv: string[]): AnalyzeFlags {
  const flags: AnalyzeFlags = { report: false, help: false };

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
          `Example: ${arg} ./some-repo`,
        );
      }
      flags.dir = value;
      continue;
    }

    throw new GeneratorError(
      'INVALID_CONFIG',
      `Unknown flag ${arg}.`,
      'Run `ai-project-bootstrap analyze --help` to see every flag.',
    );
  }

  return flags;
}

export const ANALYZE_HELP_TEXT = `
ai-project-bootstrap analyze — score and suggest improvements for any repository.

Usage
  npx ai-project-bootstrap analyze [options]

Unlike \`review\`, this does not assume the target is a project
ai-project-bootstrap generated — it works against any repository, inferring
the stack from package.json dependencies and known config files instead of
reading a saved selection. Every detection names its own evidence and
confidence (high: an exact package.json dependency; medium: a config file's
mere presence) — a guess is never presented as a fact.

Scores four categories out of 100 each against a fixed, documented rubric
(see README) rather than a black box: architecture, security,
performance-relevant patterns, and documentation coverage.
Dependency-vulnerability scanning is intentionally not included — run
\`npm audit\` yourself for that; anything trustworthy there needs a live
registry lookup, and this command stays fully offline.

Options
      --dir <path>   Repository to analyze (default: the current directory)
      --report       Also write analyze-report.md into the target
  -h, --help          Show this help
`.trim();

type CategoryKey = 'architecture' | 'security' | 'performance' | 'documentation';

const CATEGORY_ORDER: Array<{ key: CategoryKey; label: string }> = [
  { key: 'architecture', label: 'Architecture' },
  { key: 'security', label: 'Security' },
  { key: 'performance', label: 'Performance' },
  { key: 'documentation', label: 'Documentation' },
];

function renderReportMarkdown(input: {
  targetName: string;
  detected: DetectedTechnology[];
  scores: Record<CategoryKey, CategoryScore>;
  overall: number;
}): string {
  const lines: string[] = [
    `# Analysis report — ${input.targetName}`,
    '',
    `Overall: ${input.overall}/100`,
    '',
  ];

  lines.push('## Detected stack', '');
  if (input.detected.length === 0) {
    lines.push('Nothing recognized — no package.json dependency or known config file matched.', '');
  } else {
    for (const tech of input.detected) {
      lines.push(
        `- **${tech.name}** (${tech.categoryLabel}) — ${tech.confidence} confidence: ${tech.signal}`,
      );
    }
    lines.push('');
  }

  for (const { key, label } of CATEGORY_ORDER) {
    const result = input.scores[key];
    lines.push(`## ${label}: ${result.score}/100`, '');
    if (result.findings.length === 0) {
      lines.push('No issues found.', '');
      continue;
    }
    for (const finding of result.findings) {
      lines.push(`- **${finding.severity.toUpperCase()}** — ${finding.summary}`);
      if (finding.location) lines.push(`  - Where: \`${finding.location}\``);
      if (finding.suggestion) lines.push(`  - Suggestion: ${finding.suggestion}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export async function runAnalyze(
  argv: string[],
  rootDir: string,
  reporter: Reporter,
): Promise<number> {
  const flags = parseAnalyzeFlags(argv);

  if (flags.help) {
    reporter.plain(ANALYZE_HELP_TEXT);
    return 0;
  }

  const targetDir = path.resolve(flags.dir ?? process.cwd());
  if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      `${targetDir} is not a directory.`,
      'Pass --dir to point at the repository to analyze.',
    );
  }

  const registry = loadRegistry(rootDir);
  const version = readGeneratorPackageInfo(rootDir).version;

  reporter.intro(version);
  reporter.plain(`Analyzing ${targetDir}…`);

  // `review` already knows this project's exact stack from its saved
  // selection and gives more precise findings — but `analyze` still works
  // here, just via the same generic, filesystem-only path as any other repo.
  if (fs.existsSync(path.join(targetDir, CONFIG_FILENAME))) {
    reporter.plain(
      `This looks like a project ai-project-bootstrap generated — \`review\` knows its exact stack and gives more precise findings. Continuing with the generic analysis anyway.`,
    );
  }
  reporter.plain('');

  const detected = detectStack(targetDir, registry);
  const scores: Record<CategoryKey, CategoryScore> = {
    architecture: scoreArchitecture(targetDir),
    security: scoreSecurity(targetDir),
    performance: scorePerformance(targetDir),
    documentation: scoreDocumentation(targetDir),
  };
  const overall = Math.round(
    CATEGORY_ORDER.reduce((sum, { key }) => sum + scores[key].score, 0) / CATEGORY_ORDER.length,
  );

  reporter.analyzeSummary({ detected, scores, overall });

  if (flags.report) {
    const reportPath = path.join(targetDir, 'analyze-report.md');
    fs.writeFileSync(
      reportPath,
      renderReportMarkdown({ targetName: path.basename(targetDir), detected, scores, overall }),
    );
    reporter.plain(`Wrote ${path.relative(targetDir, reportPath) || 'analyze-report.md'}`);
    reporter.plain('');
  }

  return 0;
}
