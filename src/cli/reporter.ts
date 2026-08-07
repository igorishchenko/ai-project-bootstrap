import pc from 'picocolors';
import type { BuilderRun } from '../core/pipeline/runPipeline.js';
import type { CheckResult } from './doctorChecks.js';
import type { Finding, FindingCategory } from './reviewChecks.js';
import type { CategoryScore, DetectedTechnology } from './analyzeChecks.js';
import { isGeneratorError } from '../core/resolve/errors.js';

/** All user-facing output, kept in one place so the CLI voice stays consistent. */
export class Reporter {
  constructor(private readonly stream: NodeJS.WriteStream = process.stdout) {}

  private write(line = ''): void {
    this.stream.write(`${line}\n`);
  }

  intro(version: string): void {
    this.write();
    this.write(pc.bold(pc.cyan('ai-project-bootstrap')) + pc.dim(` v${version}`));
    this.write(pc.dim('The development environment for AI-assisted development.'));
    this.write();
  }

  step(run: BuilderRun): void {
    if (!run.ran) {
      this.write(`${pc.dim('○')} ${pc.dim(`${run.label} (skipped)`)}`);
      return;
    }
    this.write(`${pc.green('✔')} ${run.label}`);
  }

  summary(input: {
    targetDir: string;
    fileCount: number;
    preserved: string[];
    /** Deleted because the technology that owned them is no longer selected — see `add --replace`. */
    removed?: string[];
    modules: string[];
    autoIncluded: string[];
    warnings: string[];
    dryRun: boolean;
  }): void {
    this.write();

    if (input.removed && input.removed.length > 0) {
      const verb = input.dryRun ? 'Would remove' : 'Removed';
      this.write(
        `${pc.red('✖')} ${verb} — no longer part of this project: ${input.removed.length} file${input.removed.length > 1 ? 's' : ''}:`,
      );
      for (const file of input.removed.slice(0, 8)) this.write(pc.dim(`    ${file}`));
      if (input.removed.length > 8) this.write(pc.dim(`    …and ${input.removed.length - 8} more`));
      this.write();
    }

    if (input.preserved.length > 0) {
      this.write(
        `${pc.cyan('ℹ')} Kept your edits — ${input.preserved.length} file${input.preserved.length > 1 ? 's' : ''} changed since generation:`,
      );
      for (const file of input.preserved.slice(0, 8)) this.write(pc.dim(`    ${file}`));
      if (input.preserved.length > 8) {
        this.write(pc.dim(`    …and ${input.preserved.length - 8} more`));
      }
      this.write();
    }

    if (input.autoIncluded.length > 0) {
      this.write(
        `${pc.cyan('ℹ')} Added as prerequisites: ${input.autoIncluded.map((id) => pc.bold(id)).join(', ')}`,
      );
    }

    for (const warning of input.warnings) {
      this.write(`${pc.yellow('!')} ${warning}`);
    }
    if (input.warnings.length > 0) this.write();

    this.write(`${pc.bold('Stack')}      ${input.modules.join(', ') || 'baseline only'}`);
    this.write(`${pc.bold('Files')}      ${input.fileCount}`);
    this.write(`${pc.bold('Location')}   ${input.targetDir}`);
    this.write();

    if (input.dryRun) {
      this.write(pc.yellow('Dry run — nothing was written.'));
      this.write();
      return;
    }

    this.write(pc.bold('Done.'));
    this.write();
    // Deliberately two commands, not a list of steps: the ordering matters
    // (hooks do not install before `git init`) and repeating it here is how it
    // drifted out of sync with the docs three times.
    this.write('Next steps:');
    this.write(pc.dim(`  cd ${input.targetDir}`));
    this.write(pc.dim('  npm run setup      ') + pc.dim('# git init, .env, install, format'));
    this.write(pc.dim('  npm run doctor     ') + pc.dim('# what is still missing'));
    this.write();
    this.write(pc.dim('Full guide: docs/setup.md'));
    this.write();
  }

  checks(results: CheckResult[]): void {
    this.write();
    for (const result of results) {
      if (result.ok) {
        this.write(`${pc.green('✔')} ${result.name}${pc.dim(` — ${result.detail}`)}`);
        continue;
      }
      const marker = result.severity === 'required' ? pc.red('✖') : pc.yellow('!');
      this.write(`${marker} ${result.name}${pc.dim(` — ${result.detail}`)}`);
      if (result.hint) this.write(pc.dim(`    → ${result.hint}`));
    }
    this.write();
  }

  doctorSummary(ready: boolean): void {
    if (ready) {
      this.write(pc.green('Ready.') + ' Nothing required is missing.');
    } else {
      this.write(pc.red('Not ready.') + ' Fix the items marked ✖ above before generating.');
    }
    this.write();
  }

  private fileList(label: string, files: string[]): void {
    this.write(`${pc.bold(label)}  ${files.length}`);
    for (const file of files.slice(0, 8)) this.write(pc.dim(`    ${file}`));
    if (files.length > 8) this.write(pc.dim(`    …and ${files.length - 8} more`));
  }

  upgradeSummary(input: {
    targetDir: string;
    fromVersion: string;
    toVersion: string;
    added: string[];
    updated: string[];
    unchanged: string[];
    preserved: string[];
    newProviders: string[];
    warnings: string[];
    dryRun: boolean;
  }): void {
    this.write();

    if (input.preserved.length > 0) {
      this.write(
        `${pc.cyan('ℹ')} Kept your edits — ${input.preserved.length} file${input.preserved.length > 1 ? 's' : ''} changed since generation:`,
      );
      for (const file of input.preserved.slice(0, 8)) this.write(pc.dim(`    ${file}`));
      if (input.preserved.length > 8) {
        this.write(pc.dim(`    …and ${input.preserved.length - 8} more`));
      }
      this.write();
    }

    for (const warning of input.warnings) this.write(`${pc.yellow('!')} ${warning}`);
    if (input.warnings.length > 0) this.write();

    if (input.newProviders.length > 0) {
      const are = input.newProviders.length > 1 ? 'are' : 'is';
      this.write(
        `${pc.cyan('ℹ')} ${input.newProviders.length} more AI tool${input.newProviders.length > 1 ? 's' : ''} ${are} now supported: ${input.newProviders.join(', ')}.`,
      );
      this.write(
        pc.dim(
          '  Not requested when this project was generated. Add to "aiTools" in ai-project.config.json and upgrade again to include them.',
        ),
      );
      this.write();
    }

    if (input.added.length === 0 && input.updated.length === 0) {
      this.write(pc.green('Up to date.') + ' Nothing to regenerate.');
      this.write();
      return;
    }

    if (input.added.length > 0) this.fileList('Added', input.added);
    if (input.updated.length > 0) this.fileList('Updated', input.updated);
    if (input.unchanged.length > 0) {
      this.write(pc.dim(`${'Unchanged'.padEnd(7)}  ${input.unchanged.length}`));
    }
    this.write();

    this.write(`${pc.bold(input.fromVersion)} → ${pc.bold(input.toVersion)}`);
    this.write(pc.dim(`  ${input.targetDir}`));
    this.write();

    if (input.dryRun) {
      this.write(pc.yellow('Dry run — nothing was written.'));
      this.write();
    }
  }

  implementSummary(input: {
    targetDir: string;
    featureName: string;
    providerName: string;
    planPath?: string;
    checklistPath?: string;
    promptPaths: string[];
    scaffoldPaths: string[];
    preserved: string[];
    dryRun: boolean;
  }): void {
    this.write();

    if (input.preserved.length > 0) {
      this.write(
        `${pc.cyan('ℹ')} Kept your edits — ${input.preserved.length} file${input.preserved.length > 1 ? 's' : ''} changed since last time:`,
      );
      for (const file of input.preserved.slice(0, 8)) this.write(pc.dim(`    ${file}`));
      if (input.preserved.length > 8) {
        this.write(pc.dim(`    …and ${input.preserved.length - 8} more`));
      }
      this.write();
    }

    this.write(`${pc.bold('Feature')}    ${input.featureName} — ${input.providerName}`);
    if (input.planPath) this.write(`${pc.bold('Plan')}       ${input.planPath}`);
    if (input.checklistPath) this.write(`${pc.bold('Checklist')}  ${input.checklistPath}`);
    if (input.promptPaths.length > 0) {
      this.write(`${pc.bold('Prompts')}    ${input.promptPaths.length}`);
      for (const file of input.promptPaths) this.write(pc.dim(`    ${file}`));
    }
    if (input.scaffoldPaths.length > 0) this.fileList('Scaffold', input.scaffoldPaths);
    this.write();
    this.write(pc.dim(`  ${input.targetDir}`));
    this.write();

    if (input.dryRun) {
      this.write(pc.yellow('Dry run — nothing was written.'));
      this.write();
      return;
    }

    this.write(pc.bold('Done.'));
    this.write();
    this.write('Next steps:');
    this.write(pc.dim(`  Read ${input.planPath ?? 'the plan'}`));
    if (input.promptPaths[0]) {
      this.write(pc.dim(`  Hand ${input.promptPaths[0]} to your AI assistant when you're ready`));
    }
    this.write();
  }

  reviewFindings(input: {
    findings: Finding[];
    performancePointers: string[];
    checklists: string[];
    failOnThreshold: string;
    failed: boolean;
  }): void {
    const order: FindingCategory[] = ['architecture', 'security', 'performance', 'dx'];
    const labels: Record<FindingCategory, string> = {
      architecture: 'Architecture',
      security: 'Security',
      performance: 'Performance',
      dx: 'DX',
      documentation: 'Documentation',
    };
    const markers: Record<Finding['severity'], string> = {
      critical: pc.red('✖'),
      warning: pc.yellow('!'),
      info: pc.cyan('ℹ'),
    };

    this.write();

    for (const category of order) {
      if (category === 'performance') {
        this.write(pc.bold(labels.performance));
        if (input.performancePointers.length === 0) {
          this.write(pc.dim('  No stack-specific guidance found for this project.'));
        } else {
          for (const pointer of input.performancePointers)
            this.write(`  ${pc.cyan('ℹ')} ${pointer}`);
        }
        this.write();
        continue;
      }

      const inCategory = input.findings.filter((finding) => finding.category === category);
      this.write(pc.bold(labels[category]));
      if (inCategory.length === 0) {
        this.write(pc.dim('  No issues found.'));
      } else {
        for (const finding of inCategory) {
          this.write(`  ${markers[finding.severity]} ${finding.summary}`);
          if (finding.location) this.write(pc.dim(`      ${finding.location}`));
          if (finding.suggestion) this.write(pc.dim(`      → ${finding.suggestion}`));
        }
      }
      this.write();
    }

    if (input.checklists.length > 0) {
      this.write(pc.bold('Recommended before shipping'));
      for (const checklist of input.checklists) this.write(`  ${pc.dim('•')} ${checklist}`);
      this.write();
    }

    const critical = input.findings.filter((finding) => finding.severity === 'critical').length;
    const warning = input.findings.filter((finding) => finding.severity === 'warning').length;
    const info = input.findings.filter((finding) => finding.severity === 'info').length;
    this.write(
      pc.dim(
        `${critical} critical, ${warning} warning, ${info} info — failing on ${input.failOnThreshold} and above`,
      ),
    );
    this.write();

    if (input.failed) {
      this.write(pc.red('Findings at or above the threshold were found.'));
    } else {
      this.write(pc.green('Nothing at or above the threshold.'));
    }
    this.write();
  }

  analyzeSummary(input: {
    detected: DetectedTechnology[];
    scores: Record<'architecture' | 'security' | 'performance' | 'documentation', CategoryScore>;
    overall: number;
  }): void {
    const order: Array<{
      key: 'architecture' | 'security' | 'performance' | 'documentation';
      label: string;
    }> = [
      { key: 'architecture', label: 'Architecture' },
      { key: 'security', label: 'Security' },
      { key: 'performance', label: 'Performance' },
      { key: 'documentation', label: 'Documentation' },
    ];
    const markers: Record<Finding['severity'], string> = {
      critical: pc.red('✖'),
      warning: pc.yellow('!'),
      info: pc.cyan('ℹ'),
    };
    const scoreColor = (score: number): ((text: string) => string) =>
      score >= 80 ? pc.green : score >= 50 ? pc.yellow : pc.red;

    this.write();
    this.write(pc.bold('Detected stack'));
    if (input.detected.length === 0) {
      this.write(
        pc.dim('  Nothing recognized — no package.json dependency or known config file matched.'),
      );
    } else {
      for (const tech of input.detected) {
        const confidence = tech.confidence === 'high' ? pc.cyan('high') : pc.dim('medium');
        this.write(
          `  ${pc.cyan('◆')} ${tech.name} ${pc.dim(`(${tech.categoryLabel})`)} — ${confidence} confidence`,
        );
        this.write(pc.dim(`      ${tech.signal}`));
      }
    }
    this.write();

    const overallColor = scoreColor(input.overall);
    this.write(`${pc.bold('Overall')}  ${overallColor(`${input.overall}/100`)}`);
    this.write();

    for (const { key, label } of order) {
      const result = input.scores[key];
      const color = scoreColor(result.score);
      this.write(`${pc.bold(label)}  ${color(`${result.score}/100`)}`);
      if (result.findings.length === 0) {
        this.write(pc.dim('  No issues found.'));
      } else {
        for (const finding of result.findings) {
          this.write(`  ${markers[finding.severity]} ${finding.summary}`);
          if (finding.location) this.write(pc.dim(`      ${finding.location}`));
          if (finding.suggestion) this.write(pc.dim(`      → ${finding.suggestion}`));
        }
      }
      this.write();
    }
  }

  list(rows: Array<{ id: string; category: string; name: string }>): void {
    const width = Math.max(...rows.map((row) => row.id.length), 4);
    for (const row of rows) {
      this.write(
        `${pc.bold(row.id.padEnd(width))}  ${pc.dim(row.category.padEnd(16))}  ${row.name}`,
      );
    }
  }

  plain(text: string): void {
    this.write(text);
  }

  /** Renders an error with its remediation hint, if it carries one. */
  failure(error: unknown): void {
    const stderr = process.stderr;
    stderr.write('\n');

    if (isGeneratorError(error)) {
      stderr.write(`${pc.red('✖')} ${error.message}\n`);
      if (error.hint) stderr.write(`${pc.dim(`  → ${error.hint}`)}\n`);
    } else if (error instanceof Error) {
      stderr.write(`${pc.red('✖')} ${error.message}\n`);
    } else {
      stderr.write(`${pc.red('✖')} ${String(error)}\n`);
    }

    stderr.write('\n');
  }
}
