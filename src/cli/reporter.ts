import pc from 'picocolors';
import type { BuilderRun } from '../core/pipeline/runPipeline.js';
import { isGeneratorError } from '../core/resolve/errors.js';

/** All user-facing output, kept in one place so the CLI voice stays consistent. */
export class Reporter {
  constructor(private readonly stream: NodeJS.WriteStream = process.stdout) {}

  private write(line = ''): void {
    this.stream.write(`${line}\n`);
  }

  intro(version: string): void {
    this.write();
    this.write(pc.bold(pc.cyan('create-ai-project')) + pc.dim(` v${version}`));
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
    modules: string[];
    autoIncluded: string[];
    warnings: string[];
    dryRun: boolean;
  }): void {
    this.write();

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
    this.write('Next steps:');
    this.write(pc.dim(`  cd ${input.targetDir}`));
    this.write(pc.dim('  cp .env.example .env'));
    this.write(pc.dim('  open docs/setup.md'));
    this.write();
  }

  list(rows: Array<{ id: string; category: string; name: string }>): void {
    const width = Math.max(...rows.map((row) => row.id.length), 4);
    for (const row of rows) {
      this.write(`${pc.bold(row.id.padEnd(width))}  ${pc.dim(row.category.padEnd(16))}  ${row.name}`);
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
