import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { parseUpgradeFlags, runUpgrade } from '../src/cli/upgrade.js';
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

describe('parseUpgradeFlags', () => {
  it('reads --dir and --dry-run', () => {
    expect(parseUpgradeFlags(['--dir', './my-app', '--dry-run'])).toMatchObject({
      dir: './my-app',
      dryRun: true,
      help: false,
    });
  });

  it('defaults dir to undefined and dryRun/help to false', () => {
    expect(parseUpgradeFlags([])).toEqual({ dryRun: false, help: false });
  });

  it('reads -h and --help', () => {
    expect(parseUpgradeFlags(['-h']).help).toBe(true);
    expect(parseUpgradeFlags(['--help']).help).toBe(true);
  });

  it('rejects a --dir with no value', () => {
    expect(() => parseUpgradeFlags(['--dir'])).toThrow(GeneratorError);
  });

  it('rejects an unknown flag', () => {
    expect(() => parseUpgradeFlags(['--nope'])).toThrow(GeneratorError);
  });
});

describe('upgrade, end to end', () => {
  const dirs: string[] = [];

  afterEach(() => {
    while (dirs.length > 0) fs.rmSync(dirs.pop() as string, { recursive: true, force: true });
  });

  function freshProject(selection: Selection): string {
    const registry = loadRegistry(ROOT);
    const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upgrade-test-'));
    dirs.push(targetDir);
    const result = generate({ rootDir: ROOT, targetDir, selection, builders, registry });
    result.vfs.flush(targetDir, { force: true });
    return targetDir;
  }

  it('errors when the target has no ai-project.config.json', async () => {
    const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upgrade-test-'));
    dirs.push(targetDir);
    const { reporter } = capturingReporter();

    await expect(runUpgrade(['--dir', targetDir], ROOT, reporter)).rejects.toThrow(GeneratorError);
    await expect(runUpgrade(['--dir', targetDir], ROOT, reporter)).rejects.toThrow(
      new RegExp(CONFIG_FILENAME),
    );
  });

  it('records generatorVersion, and upgrade reports it in the "from → to" line', async () => {
    const targetDir = freshProject(select({ target: 'web', web: 'nextjs' }));
    const configFile = path.join(targetDir, CONFIG_FILENAME);

    const before = JSON.parse(fs.readFileSync(configFile, 'utf8')) as { generatorVersion?: string };
    expect(before.generatorVersion).toBeDefined();

    const { reporter, output } = capturingReporter();
    await runUpgrade(['--dir', targetDir], ROOT, reporter);

    expect(output()).toContain(`${before.generatorVersion} →`);
  });

  it('treats a config with no recorded generatorVersion as an older project, not an error', async () => {
    const targetDir = freshProject(select({ target: 'web', web: 'nextjs' }));
    const configFile = path.join(targetDir, CONFIG_FILENAME);

    const config = JSON.parse(fs.readFileSync(configFile, 'utf8')) as Record<string, unknown>;
    delete config.generatorVersion;
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf8');

    const { reporter } = capturingReporter();
    const code = await runUpgrade(['--dir', targetDir], ROOT, reporter);

    expect(code).toBe(0);
  });

  it('preserves a hand-edited file while upgrading the rest', async () => {
    const targetDir = freshProject(
      select({ target: 'mobile', mobile: 'expo', backend: 'supabase', payments: 'revenuecat' }),
    );

    const setupPath = path.join(targetDir, 'docs', 'setup.md');
    fs.writeFileSync(
      setupPath,
      `${fs.readFileSync(setupPath, 'utf8')}\n\n## A note I added\n`,
      'utf8',
    );

    const { reporter, output } = capturingReporter();
    const code = await runUpgrade(['--dir', targetDir], ROOT, reporter);

    expect(code).toBe(0);
    expect(fs.readFileSync(setupPath, 'utf8')).toContain('## A note I added');
    expect(output()).toContain('Kept your edits');
    expect(output()).toContain('docs/setup.md');
  });

  it('brings a stale generated file back in line, leaving byte-identical ones alone', async () => {
    const targetDir = freshProject(select({ target: 'web', web: 'nextjs' }));
    const configFile = path.join(targetDir, CONFIG_FILENAME);
    const target = 'docs/coding-standards.md';
    const freshContent = fs.readFileSync(path.join(targetDir, target), 'utf8');

    // Simulate "an older template produced different content, and nobody has
    // touched the file since": the disk content must still match its own
    // recorded fingerprint, or the preserve check would (correctly) treat it
    // as a hand-edit and leave it alone instead.
    const staleContent = 'STALE CONTENT FROM AN OLDER TEMPLATE VERSION\n';
    fs.writeFileSync(path.join(targetDir, target), staleContent, 'utf8');
    const config = JSON.parse(fs.readFileSync(configFile, 'utf8')) as {
      generated: Record<string, string>;
    };
    config.generated[target] = fingerprint(staleContent);
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf8');

    const { reporter, output } = capturingReporter();
    const code = await runUpgrade(['--dir', targetDir], ROOT, reporter);

    expect(code).toBe(0);
    expect(fs.readFileSync(path.join(targetDir, target), 'utf8')).toBe(freshContent);
    expect(output()).toContain('Updated');
    expect(output()).toContain(target);
  });

  it('reports "up to date" and changes nothing when nothing has changed', async () => {
    const targetDir = freshProject(select({ target: 'web', web: 'nextjs' }));
    const before = fs.readFileSync(path.join(targetDir, 'docs', 'setup.md'), 'utf8');

    const { reporter, output } = capturingReporter();
    const code = await runUpgrade(['--dir', targetDir], ROOT, reporter);

    expect(code).toBe(0);
    expect(output()).toContain('Up to date');
    expect(fs.readFileSync(path.join(targetDir, 'docs', 'setup.md'), 'utf8')).toBe(before);
  });

  it('--dry-run reports what would change without writing anything', async () => {
    const targetDir = freshProject(select({ target: 'web', web: 'nextjs' }));
    const configFile = path.join(targetDir, CONFIG_FILENAME);
    const target = 'docs/coding-standards.md';

    const staleContent = 'STALE CONTENT FROM AN OLDER TEMPLATE VERSION\n';
    fs.writeFileSync(path.join(targetDir, target), staleContent, 'utf8');
    const config = JSON.parse(fs.readFileSync(configFile, 'utf8')) as {
      generated: Record<string, string>;
    };
    config.generated[target] = fingerprint(staleContent);
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf8');

    const mtimeBefore = fs.statSync(path.join(targetDir, target)).mtimeMs;
    const configBefore = fs.readFileSync(configFile, 'utf8');

    const { reporter, output } = capturingReporter();
    const code = await runUpgrade(['--dir', targetDir, '--dry-run'], ROOT, reporter);

    expect(code).toBe(0);
    expect(output()).toContain('Updated');
    expect(output()).toContain('Dry run');
    // The stale content — and its mtime — must be exactly as this test left it.
    expect(fs.readFileSync(path.join(targetDir, target), 'utf8')).toBe(staleContent);
    expect(fs.statSync(path.join(targetDir, target)).mtimeMs).toBe(mtimeBefore);
    expect(fs.readFileSync(configFile, 'utf8')).toBe(configBefore);
  });

  it('flags newly-supported AI providers that this project never opted into', async () => {
    // Generated before aiTools existed: no key at all, so the recorded
    // selection is today's implicit default (cursor + claude).
    const targetDir = freshProject(select({ target: 'web', web: 'nextjs' }));
    const configFile = path.join(targetDir, CONFIG_FILENAME);
    const config = JSON.parse(fs.readFileSync(configFile, 'utf8')) as Record<string, unknown>;
    delete (config.choices as Record<string, unknown>).aiTools;
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf8');

    const { reporter, output } = capturingReporter();
    await runUpgrade(['--dir', targetDir], ROOT, reporter);

    expect(output()).toContain('more AI tool');
    expect(output()).toContain('copilot');
  });

  it('does not flag any new AI providers once every one is already selected', async () => {
    const targetDir = freshProject(
      select({
        target: 'web',
        web: 'nextjs',
        aiTools: ['cursor', 'claude', 'copilot', 'gemini-cli', 'continue', 'cline', 'roo'],
      }),
    );

    const { reporter, output } = capturingReporter();
    await runUpgrade(['--dir', targetDir], ROOT, reporter);

    expect(output()).not.toContain('more AI tool');
  });
});
