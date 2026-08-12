import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { parseCiInitFlags, runCiInit, workflowFiles } from '../src/cli/ciInit.js';
import { GeneratorError } from '../src/core/resolve/errors.js';
import { generate } from '../src/core/pipeline/generate.js';
import { loadRegistry } from '../src/core/registry/loadModules.js';
import { builders } from '../src/builders/index.js';
import { CONFIG_FILENAME } from '../src/builders/configBuilder.js';
import { Reporter } from '../src/cli/reporter.js';
import type { Selection } from '../src/core/types.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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

describe('parseCiInitFlags', () => {
  it('writes both workflows by default', () => {
    expect(parseCiInitFlags([])).toEqual({
      dryRun: false,
      force: false,
      refresh: true,
      help: false,
    });
  });

  it('reads --dir, --dry-run, --force and --no-refresh', () => {
    expect(parseCiInitFlags(['--dir', './app', '--dry-run', '--force', '--no-refresh'])).toEqual({
      dir: './app',
      dryRun: true,
      force: true,
      refresh: false,
      help: false,
    });
  });

  it('rejects an unknown flag', () => {
    expect(() => parseCiInitFlags(['--nope'])).toThrow(GeneratorError);
  });
});

describe('workflowFiles', () => {
  /*
   * The workflows are template literals full of `${{ … }}`, backticks and
   * backslash continuations, every one of which has to survive TypeScript's
   * own escaping to reach the file. These assert the escaping, not the YAML —
   * a broken workflow only shows up on someone else's CI otherwise.
   */
  const written = workflowFiles(true);
  const byName = (name: string) => {
    const found = written.find((file) => file.relativePath.endsWith(`${name}.yml`));
    if (!found) throw new Error(`no ${name}.yml among ${written.length} workflow files`);
    return found;
  };
  const check = byName('ai-rules');
  const refresh = byName('ai-rules-refresh');

  it('emits GitHub expressions unescaped', () => {
    expect(refresh.content).toContain('${{ github.token }}');
    expect(refresh.content).toContain('${{ steps.check.outputs.version }}');
    expect(refresh.content).not.toContain('\\${{');
  });

  it('keeps shell variables as shell variables, not Actions expressions', () => {
    // `${VERSION}` is read from the step's env by bash; if it had become
    // `${{ VERSION }}` the runner would fail to parse the workflow.
    expect(refresh.content).toContain('v${VERSION}');
    expect(refresh.content).toContain('"$BRANCH"');
  });

  it('escapes backticks so the PR body is markdown, not command substitution', () => {
    expect(refresh.content).toContain('\\`ai-project-bootstrap@${VERSION}\\`');
  });

  it('pins the action and does not block a build by default', () => {
    expect(check.content).toContain('igorishchenko/ai-project-bootstrap-action@v1');
    expect(check.content).toContain('fail-on: none');
  });

  it('omits the refresh workflow when asked', () => {
    const only = workflowFiles(false);
    expect(only).toHaveLength(1);
    expect(only[0]?.relativePath).toBe('.github/workflows/ai-rules.yml');
  });
});

describe('ci init, end to end', () => {
  const dirs: string[] = [];

  afterEach(() => {
    while (dirs.length > 0) fs.rmSync(dirs.pop() as string, { recursive: true, force: true });
  });

  function freshProject(): string {
    const registry = loadRegistry(ROOT);
    const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-init-test-'));
    dirs.push(targetDir);
    const selection: Selection = {
      projectName: 'Test',
      choices: { target: 'web', web: 'nextjs' },
    };
    const result = generate({ rootDir: ROOT, targetDir, selection, builders, registry });
    result.vfs.flush(targetDir, { force: true });
    return targetDir;
  }

  const workflow = (dir: string, name: string) =>
    path.join(dir, '.github', 'workflows', `${name}.yml`);

  it('writes both workflows', async () => {
    const targetDir = freshProject();
    const { reporter } = capturingReporter();

    expect(await runCiInit(['init', '--dir', targetDir], ROOT, reporter)).toBe(0);
    expect(fs.existsSync(workflow(targetDir, 'ai-rules'))).toBe(true);
    expect(fs.existsSync(workflow(targetDir, 'ai-rules-refresh'))).toBe(true);
  });

  it('accepts a bare `ci` as `ci init`, since init is the only subcommand', async () => {
    const targetDir = freshProject();
    const { reporter } = capturingReporter();

    expect(await runCiInit(['--dir', targetDir], ROOT, reporter)).toBe(0);
    expect(fs.existsSync(workflow(targetDir, 'ai-rules'))).toBe(true);
  });

  it('refuses to overwrite a workflow the user may have edited', async () => {
    const targetDir = freshProject();
    const { reporter } = capturingReporter();
    await runCiInit(['init', '--dir', targetDir], ROOT, reporter);

    fs.writeFileSync(workflow(targetDir, 'ai-rules'), '# mine\n', 'utf8');

    await expect(runCiInit(['init', '--dir', targetDir], ROOT, reporter)).rejects.toThrow(
      GeneratorError,
    );
    // The point of refusing: the edit survives.
    expect(fs.readFileSync(workflow(targetDir, 'ai-rules'), 'utf8')).toBe('# mine\n');
  });

  it('overwrites only when explicitly forced', async () => {
    const targetDir = freshProject();
    const { reporter } = capturingReporter();
    await runCiInit(['init', '--dir', targetDir], ROOT, reporter);
    fs.writeFileSync(workflow(targetDir, 'ai-rules'), '# mine\n', 'utf8');

    expect(await runCiInit(['init', '--dir', targetDir, '--force'], ROOT, reporter)).toBe(0);
    expect(fs.readFileSync(workflow(targetDir, 'ai-rules'), 'utf8')).toContain('name: AI rules');
  });

  it('writes nothing under --dry-run', async () => {
    const targetDir = freshProject();
    const { reporter, output } = capturingReporter();

    await runCiInit(['init', '--dir', targetDir, '--dry-run'], ROOT, reporter);

    expect(fs.existsSync(workflow(targetDir, 'ai-rules'))).toBe(false);
    expect(output()).toContain('Would write');
  });

  it('errors when the target was never generated by us', async () => {
    const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-init-test-'));
    dirs.push(targetDir);
    const { reporter } = capturingReporter();

    await expect(runCiInit(['init', '--dir', targetDir], ROOT, reporter)).rejects.toThrow(
      new RegExp(CONFIG_FILENAME),
    );
  });

  it('rejects an unknown subcommand rather than guessing', async () => {
    const targetDir = freshProject();
    const { reporter } = capturingReporter();

    await expect(runCiInit(['setup', '--dir', targetDir], ROOT, reporter)).rejects.toThrow(
      GeneratorError,
    );
  });
});
