import pc from 'picocolors';
import type { BuilderRun } from '../core/pipeline/runPipeline.js';
import type { CheckResult } from './doctorChecks.js';
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
    modules: string[];
    autoIncluded: string[];
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
