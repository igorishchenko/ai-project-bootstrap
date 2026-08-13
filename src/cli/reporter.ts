import pc from 'picocolors';
import type { BuilderRun } from '../core/pipeline/runPipeline.js';
import type { CheckResult } from './doctorChecks.js';
import type { Finding, FindingCategory } from './reviewChecks.js';
import type { CategoryScore, DetectedTechnology } from './analyzeChecks.js';
import type { CostSummary } from '../core/pricing.js';
import { isGeneratorError } from '../core/resolve/errors.js';
import { isEpipe } from './epipe.js';

/** All user-facing output, kept in one place so the CLI voice stays consistent. */
export class Reporter {
  constructor(private readonly stream: NodeJS.WriteStream = process.stdout) {}

  private write(line = ''): void {
    this.writeTo(this.stream, `${line}\n`);
  }

  /**
   * The stream is injectable, so it may be one nothing else has made safe — a
   * write that lands after its reader has gone throws EPIPE here rather than
   * emitting it, and truncated output is not worth a stack trace. See
   * `ignoreEpipe`, which handles the emitted half of the same problem.
   */
  private writeTo(stream: NodeJS.WriteStream, text: string): void {
    try {
      stream.write(text);
    } catch (error) {
      if (!isEpipe(error)) throw error;
    }
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
    costSummary: CostSummary;
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
    this.writeCostLine(input.costSummary);
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

  /** Silent when nothing in the stack has a cost or a usage-based caveat worth surfacing here. */
  private writeCostLine(costSummary: CostSummary): void {
    const { estimated, usageBased, totalUsd } = costSummary;
    if (estimated.length === 0 && usageBased.length === 0) return;

    const parts: string[] = [];
    if (estimated.length > 0) {
      parts.push(`$${totalUsd}/mo (${estimated.map((item) => item.moduleName).join(', ')})`);
    }
    if (usageBased.length > 0) {
      parts.push(
        `${usageBased.length} usage-based service${usageBased.length > 1 ? 's' : ''} not counted`,
      );
    }

    this.write(`${pc.bold('Est. cost')}  ${parts.join(' — ')}`);
    this.write(pc.dim('             published pricing, not a quote — see docs/costs.md'));
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

  /**
   * `check`'s report.
   *
   * Ordered by what a reader should do about it, not by count: drift first
   * because it is the only actionable part, then the files we deliberately
   * left alone. The "preserved" block is phrased as a guarantee rather than a
   * warning — someone scanning this in CI should never read their own edits as
   * a problem, or they will learn to ignore the whole report.
   */
  checkSummary(report: {
    projectName: string;
    targetDir: string;
    recordedVersion: string | undefined;
    installedVersion: string;
    current: string[];
    behind: string[];
    edited: string[];
    missing: string[];
    added: string[];
    orphaned: string[];
    newAiTools: string[];
    advisories?: Array<{
      id: string;
      severity: 'info' | 'warning' | 'critical';
      publishedAt: string;
      summary?: string;
      url?: string;
    }>;
    advisoriesEntitled?: boolean;
    advisoryNote?: string;
  }): void {
    const versionLine =
      report.recordedVersion === undefined
        ? pc.dim(`generated before versions were recorded · installed v${report.installedVersion}`)
        : report.recordedVersion === report.installedVersion
          ? pc.dim(`v${report.installedVersion}`)
          : `${pc.dim(`v${report.recordedVersion}`)} → ${pc.bold(`v${report.installedVersion}`)}`;

    this.write();
    this.write(`${pc.bold('Project')}    ${report.projectName}  ${pc.dim('·')}  ${versionLine}`);
    this.write();

    /*
     * The note belongs to the group, so it sits on the header line — below the
     * files it read as a comment on whichever path happened to be last.
     * `remedy`, where a group has one, follows the file list for the same
     * reason: it is what to do about the whole group.
     *
     * Padded to the longest label ("Orphaned") plus a space, so the counts
     * line up in a column whichever groups happen to be present.
     */
    const LABEL_WIDTH = 'Orphaned'.length + 1;
    const group = (label: string, files: string[], note: string, remedy?: string): void => {
      if (files.length === 0) return;
      this.write(`${pc.bold(label.padEnd(LABEL_WIDTH))}${files.length}  ${pc.dim(`· ${note}`)}`);
      for (const file of files.slice(0, 8)) this.write(pc.dim(`    ${file}`));
      if (files.length > 8) this.write(pc.dim(`    …and ${files.length - 8} more`));
      if (remedy) this.write(pc.dim(`    → ${remedy}`));
      this.write();
    };

    group('Behind', report.behind, 'untouched since generation, safe to refresh');
    group('Missing', report.missing, 'generated once, no longer on disk');
    group('New', report.added, 'this version writes these; the one that generated it did not');
    // Carries its own remedy because it is the one bucket `upgrade` does not
    // resolve — the closing "run upgrade" line would send someone to a command
    // that leaves these exactly where they are.
    group(
      'Orphaned',
      report.orphaned,
      'still on disk, no longer part of this stack',
      'upgrade will not remove these — delete them, or use `add <id> --replace`',
    );

    if (report.edited.length > 0) {
      this.write(
        `${pc.cyan('ℹ')} ${report.edited.length} file${report.edited.length > 1 ? 's' : ''} you edited — ${pc.bold('upgrade will not touch')} ${report.edited.length > 1 ? 'them' : 'it'}:`,
      );
      for (const file of report.edited.slice(0, 8)) this.write(pc.dim(`    ${file}`));
      if (report.edited.length > 8) {
        this.write(pc.dim(`    …and ${report.edited.length - 8} more`));
      }
      this.write();
    }

    if (report.newAiTools.length > 0) {
      const plural = report.newAiTools.length > 1;
      this.write(
        `${pc.cyan('ℹ')} ${report.newAiTools.length} more AI tool${plural ? 's' : ''} ${plural ? 'are' : 'is'} now supported: ${report.newAiTools.join(', ')}.`,
      );
      this.write(
        pc.dim('  Add to "aiTools" in ai-project.config.json and upgrade again to include them.'),
      );
      this.write();
    }

    /*
     * Advisories sit after the drift summary because they are about the world
     * rather than about this repository — "your rules are behind" first, then
     * "and here is the vendor change that is why".
     *
     * Worst first. An unentitled reader gets the count and the severities and
     * one line about what reveals the rest: never a claim that there is
     * nothing, which would be the one thing that makes the feed untrustworthy.
     */
    if (report.advisories && report.advisories.length > 0) {
      const worst = { critical: pc.red, warning: pc.yellow, info: pc.cyan };
      const count = report.advisories.length;
      this.write(
        `${pc.bold('Advisories')}  ${count}  ${pc.dim('· vendor changes affecting this stack')}`,
      );

      for (const advisory of report.advisories.slice(0, 10)) {
        const tag = worst[advisory.severity](advisory.severity.padEnd(8));
        this.write(
          `    ${tag} ${advisory.summary ?? pc.dim(`${advisory.id} — subscribe to read this`)}`,
        );
        if (advisory.url) this.write(pc.dim(`             ${advisory.url}`));
      }
      if (count > 10) this.write(pc.dim(`    …and ${count - 10} more`));

      if (report.advisoriesEntitled === false) {
        this.write(
          pc.dim(
            '    → Subscribing shows what each one says and what to do about it: ai-project-bootstrap login',
          ),
        );
      }
      this.write();
    }

    // Said even when nothing is wrong, because "advisories were skipped" and
    // "no advisories apply" are different answers and a reader acting on the
    // second deserves to know which one they got.
    if (report.advisoryNote) {
      this.write(pc.dim(`ℹ ${report.advisoryNote}`));
      this.write();
    }

    // Orphans are deliberately not in this count: `upgrade` does not resolve
    // them, so folding them in would overstate what the suggested command
    // fixes. They get their own line above, with their own remedy.
    const stale = report.behind.length + report.missing.length + report.added.length;
    if (stale > 0) {
      this.write(
        `${stale} file${stale > 1 ? 's' : ''} would change. ${pc.bold('npx ai-project-bootstrap upgrade')}`,
      );
      this.write();
    } else if (report.orphaned.length === 0) {
      this.write(
        `${pc.green('Up to date.')} ${pc.dim(`${report.current.length} generated file${report.current.length === 1 ? '' : 's'} match today's templates.`)}`,
      );
      this.write();
    }
    // Nothing written in the orphans-only case: the group above already ended
    // with a blank line, and a second one reads as a missing closing sentence.
  }

  /** `ci init`'s report — two files, and what to do with them. */
  ciInitSummary(input: { targetDir: string; files: string[]; dryRun: boolean }): void {
    this.write();
    this.fileList(input.dryRun ? 'Would write' : 'Wrote', input.files);
    this.write();
    this.write(pc.dim(`  ${input.targetDir}`));
    this.write();

    if (input.dryRun) {
      this.write(pc.yellow('Dry run — nothing was written.'));
      this.write();
      return;
    }

    this.write('Commit them, and the next pull request gets a drift report.');
    this.write(
      pc.dim(
        '  Neither workflow blocks a build by default. Both are yours to edit — nothing regenerates them.',
      ),
    );
    this.write();
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
    this.writeTo(stderr, '\n');

    if (isGeneratorError(error)) {
      this.writeTo(stderr, `${pc.red('✖')} ${error.message}\n`);
      if (error.hint) this.writeTo(stderr, `${pc.dim(`  → ${error.hint}`)}\n`);
    } else if (error instanceof Error) {
      this.writeTo(stderr, `${pc.red('✖')} ${error.message}\n`);
    } else {
      this.writeTo(stderr, `${pc.red('✖')} ${String(error)}\n`);
    }

    this.writeTo(stderr, '\n');
  }
}
