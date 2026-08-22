import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { parseReviewFlags, runReview } from '../src/cli/review.js';
import { GeneratorError } from '../src/core/resolve/errors.js';
import { fingerprint } from '../src/core/vfs/fingerprint.js';
import { generate } from '../src/core/pipeline/generate.js';
import { loadRegistry } from '../src/core/registry/loadModules.js';
import { builders } from '../src/builders/index.js';
import { CONFIG_FILENAME } from '../src/builders/configBuilder.js';
import { Reporter } from '../src/cli/reporter.js';
import type { Selection } from '../src/core/types.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function select(choices: Selection['choices']): Selection {
  return { projectName: 'Test', choices };
}

function capturingReporter(): { reporter: Reporter; output: () => string } {
  let buffer = '';
  const stream = {
    write: (chunk: string) => {
      buffer += chunk;
      return true;
    },
  } as unknown as NodeJS.WriteStream;
  return { reporter: new Reporter(stream), output: () => buffer };
}

describe('parseReviewFlags', () => {
  it('reads --dir, --report and --fail-on', () => {
    expect(parseReviewFlags(['--dir', './my-app', '--report', '--fail-on', 'warning'])).toEqual({
      dir: './my-app',
      report: true,
      failOn: 'warning',
      help: false,
    });
  });

  it('defaults report to false and failOn to critical', () => {
    expect(parseReviewFlags([])).toEqual({ report: false, failOn: 'critical', help: false });
  });

  it('reads -h and --help', () => {
    expect(parseReviewFlags(['-h']).help).toBe(true);
    expect(parseReviewFlags(['--help']).help).toBe(true);
  });

  it('rejects an invalid --fail-on value', () => {
    expect(() => parseReviewFlags(['--fail-on', 'nope'])).toThrow(GeneratorError);
  });

  it('rejects a --dir with no value', () => {
    expect(() => parseReviewFlags(['--dir'])).toThrow(GeneratorError);
  });

  it('rejects an unknown flag', () => {
    expect(() => parseReviewFlags(['--nope'])).toThrow(GeneratorError);
  });
});

describe('review, end to end', () => {
  const dirs: string[] = [];

  afterEach(() => {
    while (dirs.length > 0) fs.rmSync(dirs.pop() as string, { recursive: true, force: true });
  });

  function freshProject(selection: Selection): string {
    const registry = loadRegistry(ROOT);
    const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'review-test-'));
    dirs.push(targetDir);
    const result = generate({ rootDir: ROOT, targetDir, selection, builders, registry });
    result.vfs.flush(targetDir, { force: true });
    return targetDir;
  }

  // Simulates "an older template produced different content, and nobody has
  // touched the file since" — the disk content must still match its own
  // recorded fingerprint, or the preserve check would (correctly) treat it as
  // a hand-edit and leave it out of `checkStaleFiles` entirely.
  function staleify(targetDir: string, target: string, content: string): void {
    fs.writeFileSync(path.join(targetDir, target), content, 'utf8');
    const configFile = path.join(targetDir, CONFIG_FILENAME);
    const config = JSON.parse(fs.readFileSync(configFile, 'utf8')) as {
      generated: Record<string, string>;
    };
    config.generated[target] = fingerprint(content);
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf8');
  }

  it('errors when the target has no ai-project.config.json', async () => {
    const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'review-test-'));
    dirs.push(targetDir);
    const { reporter } = capturingReporter();

    await expect(runReview(['--dir', targetDir], ROOT, reporter)).rejects.toThrow(GeneratorError);
    await expect(runReview(['--dir', targetDir], ROOT, reporter)).rejects.toThrow(
      new RegExp(CONFIG_FILENAME),
    );
  });

  it('reports no false positives on a clean, freshly-generated project', async () => {
    const targetDir = freshProject(select({ target: 'web', web: 'nextjs' }));

    const { reporter, output } = capturingReporter();
    const code = await runReview(['--dir', targetDir], ROOT, reporter);

    expect(code).toBe(0);
    expect(output()).toContain('No issues found.');
    expect(output()).not.toContain('✖');
  });

  it('does not render the performance pointers as if they were findings', async () => {
    // The Performance section lists where this stack's guidance already lives;
    // those are pointers, not issues. Marking them with the same ℹ the info
    // findings use put a column of them directly above a summary line reading
    // "0 info" — a report that contradicts itself on its own screen is one
    // people learn to skip.
    const targetDir = freshProject(select({ target: 'web', web: 'nextjs', auth: 'clerk' }));

    const { reporter, output } = capturingReporter();
    await runReview(['--dir', targetDir], ROOT, reporter);

    const text = output();
    expect(text).toContain('.cursor/rules/clerk.mdc');
    expect(text).toContain('0 critical, 0 warning, 0 info');
    expect(text, 'a pointer was marked as an info finding').not.toContain('ℹ');
  });

  it('flags a hardcoded secret added to the project since generation', async () => {
    const targetDir = freshProject(select({ target: 'web', web: 'nextjs' }));
    fs.mkdirSync(path.join(targetDir, 'src', 'config'), { recursive: true });
    fs.writeFileSync(
      path.join(targetDir, 'src', 'config', 'secrets.ts'),
      `export const apiKey = "sk_live_abcdefghijklmnop";\n`,
      'utf8',
    );

    const { reporter, output } = capturingReporter();
    const code = await runReview(['--dir', targetDir], ROOT, reporter);

    expect(code).toBe(1);
    expect(output()).toContain('hardcoded credential');
    expect(output()).toContain('src/config/secrets.ts:1');
  });

  it('flags an unprotected .env file added to the project', async () => {
    const targetDir = freshProject(select({ target: 'web', web: 'nextjs' }));
    fs.writeFileSync(path.join(targetDir, '.env'), 'SECRET=1\n', 'utf8');
    const gitignorePath = path.join(targetDir, '.gitignore');
    fs.writeFileSync(
      gitignorePath,
      fs
        .readFileSync(gitignorePath, 'utf8')
        .split(/\r?\n/)
        .filter((line) => !line.includes('.env'))
        .join('\n'),
      'utf8',
    );

    const { reporter, output } = capturingReporter();
    const code = await runReview(['--dir', targetDir], ROOT, reporter);

    expect(code).toBe(1);
    expect(output()).toContain('.env exists but is not listed in .gitignore');
  });

  it('reports a stale generated file as info, not failing the default (critical) threshold', async () => {
    const targetDir = freshProject(select({ target: 'web', web: 'nextjs' }));
    const target = 'docs/coding-standards.md';
    staleify(targetDir, target, 'STALE CONTENT FROM AN OLDER TEMPLATE\n');

    const { reporter, output } = capturingReporter();
    const code = await runReview(['--dir', targetDir], ROOT, reporter);

    expect(code).toBe(0);
    expect(output()).toContain('would change if regenerated');
  });

  it('--fail-on info fails the build on that same stale file', async () => {
    const targetDir = freshProject(select({ target: 'web', web: 'nextjs' }));
    const target = 'docs/coding-standards.md';
    staleify(targetDir, target, 'STALE CONTENT FROM AN OLDER TEMPLATE\n');

    const { reporter } = capturingReporter();
    const code = await runReview(['--dir', targetDir, '--fail-on', 'info'], ROOT, reporter);

    expect(code).toBe(1);
  });

  it('does not treat a hand-edited file (matching its own recorded fingerprint) as stale', async () => {
    const targetDir = freshProject(select({ target: 'web', web: 'nextjs' }));
    const setupPath = path.join(targetDir, 'docs', 'setup.md');
    fs.writeFileSync(
      setupPath,
      `${fs.readFileSync(setupPath, 'utf8')}\n\n## A note I added\n`,
      'utf8',
    );

    const { reporter, output } = capturingReporter();
    const code = await runReview(['--dir', targetDir], ROOT, reporter);

    expect(code).toBe(0);
    expect(output()).not.toContain('docs/setup.md');
  });

  it('--report writes review-report.md into the target project', async () => {
    const targetDir = freshProject(select({ target: 'web', web: 'nextjs' }));

    const { reporter } = capturingReporter();
    await runReview(['--dir', targetDir, '--report'], ROOT, reporter);

    const reportPath = path.join(targetDir, 'review-report.md');
    expect(fs.existsSync(reportPath)).toBe(true);
    expect(fs.readFileSync(reportPath, 'utf8')).toContain('# Review report — Test');
  });

  it('does not write a report file unless --report is passed', async () => {
    const targetDir = freshProject(select({ target: 'web', web: 'nextjs' }));

    const { reporter } = capturingReporter();
    await runReview(['--dir', targetDir], ROOT, reporter);

    expect(fs.existsSync(path.join(targetDir, 'review-report.md'))).toBe(false);
  });

  it('points at the stack-specific rule file that actually exists for this project', async () => {
    const targetDir = freshProject(select({ target: 'web', web: 'nextjs' }));

    const { reporter, output } = capturingReporter();
    await runReview(['--dir', targetDir], ROOT, reporter);

    expect(output()).toMatch(/nextjs\.mdc|nextjs\/SKILL\.md/);
  });
});
