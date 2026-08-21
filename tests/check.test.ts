import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import {
  failsThreshold,
  packContributions,
  parseCheckFlags,
  runCheck,
  severityOf,
  type DriftSeverity,
} from '../src/cli/check.js';
import { runUpgrade } from '../src/cli/upgrade.js';
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

describe('parseCheckFlags', () => {
  it('defaults to reporting only — never failing a build nobody asked it to fail', () => {
    expect(parseCheckFlags([])).toEqual({ json: false, failOn: 'none', advisories: true, help: false });
  });

  it('reads --dir, --json and --fail-on', () => {
    expect(parseCheckFlags(['--dir', './my-app', '--json', '--fail-on', 'warning'])).toMatchObject({
      dir: './my-app',
      json: true,
      failOn: 'warning',
    });
  });

  it('rejects a --fail-on level that is not one of the four', () => {
    expect(() => parseCheckFlags(['--fail-on', 'loud'])).toThrow(GeneratorError);
  });

  it('rejects a valued flag with no value, and an unknown flag', () => {
    expect(() => parseCheckFlags(['--dir'])).toThrow(GeneratorError);
    expect(() => parseCheckFlags(['--nope'])).toThrow(GeneratorError);
  });
});

describe('severityOf', () => {
  const empty = { behind: [], missing: [], added: [], orphaned: [], newAiTools: [] };

  it('is none for a project that matches today’s templates', () => {
    expect(severityOf(empty, false)).toBe('none');
  });

  it('is warning when rules are behind, or orphaned', () => {
    expect(severityOf({ ...empty, behind: ['.cursor/rules/nextjs.mdc'] }, false)).toBe('warning');
    expect(severityOf({ ...empty, orphaned: ['.cursor/rules/gone.mdc'] }, false)).toBe('warning');
  });

  it('is info for everything short of drift', () => {
    expect(severityOf({ ...empty, missing: ['a'] }, false)).toBe('info');
    expect(severityOf({ ...empty, added: ['a'] }, false)).toBe('info');
    expect(severityOf({ ...empty, newAiTools: ['cline'] }, false)).toBe('info');
    expect(severityOf(empty, true)).toBe('info');
  });
});

describe('failsThreshold', () => {
  it('never fails under the default, whatever was found', () => {
    for (const severity of ['none', 'info', 'warning', 'critical'] as DriftSeverity[]) {
      expect(failsThreshold(severity, 'none')).toBe(false);
    }
  });

  it('fails at or above the requested level', () => {
    expect(failsThreshold('warning', 'warning')).toBe(true);
    expect(failsThreshold('warning', 'info')).toBe(true);
    expect(failsThreshold('info', 'warning')).toBe(false);
    // Nothing emits `critical` until advisories exist, so a job asking for it
    // must pass today rather than fail on drift it did not ask about.
    expect(failsThreshold('warning', 'critical')).toBe(false);
  });
});

describe('check, end to end', () => {
  const dirs: string[] = [];

  afterEach(() => {
    while (dirs.length > 0) fs.rmSync(dirs.pop() as string, { recursive: true, force: true });
  });

  function freshProject(selection: Selection): string {
    const registry = loadRegistry(ROOT);
    const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-test-'));
    dirs.push(targetDir);
    const result = generate({ rootDir: ROOT, targetDir, selection, builders, registry });
    result.vfs.flush(targetDir, { force: true });
    return targetDir;
  }

  function readConfig(targetDir: string): Record<string, never> & {
    generated: Record<string, string>;
    generatorVersion?: string;
  } {
    return JSON.parse(fs.readFileSync(path.join(targetDir, CONFIG_FILENAME), 'utf8'));
  }

  function writeConfig(targetDir: string, config: unknown): void {
    fs.writeFileSync(
      path.join(targetDir, CONFIG_FILENAME),
      `${JSON.stringify(config, null, 2)}\n`,
      'utf8',
    );
  }

  /**
   * Makes a file read as "our templates moved on": different from what we
   * would write today, but matching the fingerprint recorded at generation, so
   * nothing thinks a human touched it.
   */
  function makeBehind(targetDir: string, relative: string): void {
    const full = path.join(targetDir, ...relative.split('/'));
    const content = `${fs.readFileSync(full, 'utf8')}\n<!-- what an older template wrote -->\n`;
    fs.writeFileSync(full, content, 'utf8');
    const config = readConfig(targetDir);
    config.generated[relative] = fingerprint(content);
    writeConfig(targetDir, config);
  }

  it('reports a freshly generated project as up to date', async () => {
    const targetDir = freshProject(select({ target: 'web', web: 'nextjs' }));
    const { reporter, output } = capturingReporter();

    const code = await runCheck(['--dir', targetDir], ROOT, reporter);

    expect(code).toBe(0);
    expect(output()).toContain('Up to date.');
  });

  it('exits 2 when the target was never generated by us', async () => {
    const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-test-'));
    dirs.push(targetDir);
    const { reporter } = capturingReporter();

    // Deliberately not a thrown error: a CI job has to tell "this repo has
    // drifted" (1) apart from "this repo is not ours" (2).
    expect(await runCheck(['--dir', targetDir], ROOT, reporter)).toBe(2);
  });

  it('reports a drifted rule as behind, not as an edit', async () => {
    const targetDir = freshProject(select({ target: 'web', web: 'nextjs' }));
    makeBehind(targetDir, '.cursor/rules/nextjs.mdc');

    const { reporter, output } = capturingReporter();
    await runCheck(['--dir', targetDir, '--json'], ROOT, reporter);
    const report = JSON.parse(output());

    expect(report.behind).toContain('.cursor/rules/nextjs.mdc');
    expect(report.edited).toHaveLength(0);
    expect(report.severity).toBe('warning');
  });

  it('reports a hand-edited file as edited, and never as drift', async () => {
    const targetDir = freshProject(select({ target: 'web', web: 'nextjs' }));

    const clean = capturingReporter();
    await runCheck(['--dir', targetDir, '--json'], ROOT, clean.reporter);
    const before = JSON.parse(clean.output());

    fs.appendFileSync(path.join(targetDir, 'docs', 'setup.md'), '\nMy own paragraph.\n');

    const { reporter, output } = capturingReporter();
    await runCheck(['--dir', targetDir, '--json'], ROOT, reporter);
    const report = JSON.parse(output());

    expect(report.edited).toContain('docs/setup.md');
    expect(report.behind).not.toContain('docs/setup.md');
    expect(report.missing).not.toContain('docs/setup.md');
    /*
     * An edit is the preservation guarantee working, so it must contribute
     * nothing to severity. Compared against the same project before the edit
     * rather than asserted as `none` outright — this fixture already reports
     * `info` for the AI tools it never opted into, and that is unrelated.
     */
    expect(report.severity).toBe(before.severity);
  });

  it('tells a deleted file apart from one a newer version introduces', async () => {
    const targetDir = freshProject(select({ target: 'web', web: 'nextjs' }));
    const config = readConfig(targetDir);

    // Deleted: still in the fingerprint map, gone from disk.
    fs.rmSync(path.join(targetDir, '.cursor', 'rules', 'nextjs.mdc'));
    // Introduced later: gone from disk *and* never recorded.
    fs.rmSync(path.join(targetDir, '.cursor', 'rules', 'typescript.mdc'));
    delete config.generated['.cursor/rules/typescript.mdc'];
    writeConfig(targetDir, config);

    const { reporter, output } = capturingReporter();
    await runCheck(['--dir', targetDir, '--json'], ROOT, reporter);
    const report = JSON.parse(output());

    expect(report.missing).toContain('.cursor/rules/nextjs.mdc');
    expect(report.added).toContain('.cursor/rules/typescript.mdc');
  });

  it('reports a leftover file from a dropped module as orphaned, not missing', async () => {
    const targetDir = freshProject(select({ target: 'web', web: 'nextjs' }));
    const config = readConfig(targetDir);

    // What a module removed from the catalogue leaves behind: recorded at
    // generation, present on disk, and not something this version produces.
    const leftover = '.cursor/rules/gone.mdc';
    fs.writeFileSync(path.join(targetDir, '.cursor', 'rules', 'gone.mdc'), '# Gone\n', 'utf8');
    config.generated[leftover] = fingerprint('# Gone\n');
    writeConfig(targetDir, config);

    const { reporter, output } = capturingReporter();
    await runCheck(['--dir', targetDir, '--json'], ROOT, reporter);
    const report = JSON.parse(output());

    expect(report.orphaned).toContain(leftover);
    // "missing" means the opposite — recorded and gone from disk. This file is
    // present, and its presence is the problem.
    expect(report.missing).not.toContain(leftover);
    expect(report.severity).toBe('warning');
  });

  it('does not tell you to run upgrade for an orphan, which upgrade will not remove', async () => {
    const targetDir = freshProject(select({ target: 'web', web: 'nextjs' }));
    const config = readConfig(targetDir);
    fs.writeFileSync(path.join(targetDir, '.cursor', 'rules', 'gone.mdc'), '# Gone\n', 'utf8');
    config.generated['.cursor/rules/gone.mdc'] = fingerprint('# Gone\n');
    writeConfig(targetDir, config);

    const { reporter, output } = capturingReporter();
    await runCheck(['--dir', targetDir], ROOT, reporter);

    expect(output()).toContain('Orphaned');
    expect(output()).toContain('upgrade will not remove these');
    // Neither the "N files would change" nudge nor a false all-clear.
    expect(output()).not.toContain('would change');
    expect(output()).not.toContain('Up to date.');
  });

  it('never counts ai-project.config.json as drift', async () => {
    const targetDir = freshProject(select({ target: 'web', web: 'nextjs' }));
    const config = readConfig(targetDir);

    // The bookkeeping file changes on any run that changes anything, so a
    // stale version stamp must not manufacture a second, meaningless finding.
    config.generatorVersion = '0.0.1';
    writeConfig(targetDir, config);

    const { reporter, output } = capturingReporter();
    await runCheck(['--dir', targetDir, '--json'], ROOT, reporter);
    const report = JSON.parse(output());

    for (const bucket of [report.behind, report.edited, report.missing, report.added]) {
      expect(bucket).not.toContain(CONFIG_FILENAME);
    }
  });

  it('honours --fail-on, and reports only by default', async () => {
    const targetDir = freshProject(select({ target: 'web', web: 'nextjs' }));
    makeBehind(targetDir, '.cursor/rules/nextjs.mdc');
    const { reporter } = capturingReporter();

    expect(await runCheck(['--dir', targetDir], ROOT, reporter)).toBe(0);
    expect(await runCheck(['--dir', targetDir, '--fail-on', 'warning'], ROOT, reporter)).toBe(1);
    expect(await runCheck(['--dir', targetDir, '--fail-on', 'info'], ROOT, reporter)).toBe(1);
    expect(await runCheck(['--dir', targetDir, '--fail-on', 'critical'], ROOT, reporter)).toBe(0);
  });

  it('emits nothing but JSON under --json, so a CI job can pipe it', async () => {
    const targetDir = freshProject(select({ target: 'web', web: 'nextjs' }));
    const { reporter, output } = capturingReporter();

    await runCheck(['--dir', targetDir, '--json'], ROOT, reporter);

    expect(() => JSON.parse(output())).not.toThrow();
    expect(JSON.parse(output()).schema).toBe(1);
  });

  it('agrees with upgrade: what check reports is exactly what upgrade changes', async () => {
    const targetDir = freshProject(
      select({ target: 'web', web: 'nextjs', backend: 'supabase', payments: 'stripe' }),
    );
    makeBehind(targetDir, '.cursor/rules/nextjs.mdc');
    fs.rmSync(path.join(targetDir, '.claude', 'skills', 'stripe', 'SKILL.md'));
    fs.appendFileSync(path.join(targetDir, 'docs', 'setup.md'), '\nMine.\n');

    const before = capturingReporter();
    await runCheck(['--dir', targetDir, '--json'], ROOT, before.reporter);
    const report = JSON.parse(before.output());
    expect(report.behind).toContain('.cursor/rules/nextjs.mdc');
    expect(report.missing).toContain('.claude/skills/stripe/SKILL.md');

    await runUpgrade(['--dir', targetDir], ROOT, capturingReporter().reporter);

    // Everything check called drift is gone; the hand-edited file is still
    // reported as the user's, and is still untouched on disk.
    const after = capturingReporter();
    await runCheck(['--dir', targetDir, '--json'], ROOT, after.reporter);
    const settled = JSON.parse(after.output());

    expect(settled.behind).toHaveLength(0);
    expect(settled.missing).toHaveLength(0);
    expect(settled.added).toHaveLength(0);
    expect(settled.edited).toContain('docs/setup.md');
    expect(fs.readFileSync(path.join(targetDir, 'docs', 'setup.md'), 'utf8')).toContain(
      '\nMine.\n',
    );
  });

  it('treats a config with no recorded generatorVersion as an older project, not an error', async () => {
    const targetDir = freshProject(select({ target: 'web', web: 'nextjs' }));
    const config = readConfig(targetDir);
    delete config.generatorVersion;
    writeConfig(targetDir, config);

    const { reporter, output } = capturingReporter();

    expect(await runCheck(['--dir', targetDir], ROOT, reporter)).toBe(0);
    expect(output()).toContain('generated before versions were recorded');
  });
});


/**
 * The claim this exists to make true: a pack that replaces a built-in rule is
 * named, so nobody has to work out for themselves why our section vanished.
 */
describe('packContributions', () => {
  const pack = (id: string, version: string, rules: unknown[]) =>
    ({ id, name: id, version, rules, docs: [], checklists: [] }) as never;

  it('names what a pack replaced, extended and added', () => {
    const entries = packContributions([
      pack('acme', '1.0.0', [
        { id: 'acme-testing', name: 'Testing', replaces: 'testing', content: 'x' },
        { id: 'acme-arch', name: 'Arch', extends: 'architecture', content: 'x' },
        { id: 'acme-log', name: 'Logging', appliesTo: ['nextjs'], content: 'x' },
      ]),
    ]);

    expect(entries).toHaveLength(1);
    const entry = entries[0] as (typeof entries)[number];
    expect(entry.id).toBe('acme');
    expect(entry.version).toBe('1.0.0');
    expect(entry.replaced).toEqual(['testing']);
    expect(entry.extended).toEqual(['architecture']);
    expect(entry.added).toEqual(['acme-log']);
  });

  /**
   * Two packs replacing one rule: only the one that actually took effect may
   * be named. Reading the rule lists directly would credit both, and the
   * report would contradict the file on disk.
   */
  it('credits only the pack whose replacement actually won', () => {
    const entries = packContributions([
      pack('first', '1.0.0', [
        { id: 'first-testing', name: 'T', replaces: 'testing', content: 'x' },
      ]),
      pack('second', '1.0.0', [
        { id: 'second-testing', name: 'T', replaces: 'testing', content: 'y' },
      ]),
    ]);

    expect(entries.find((e) => e.id === 'second')?.replaced).toEqual(['testing']);
    // `first` contributed nothing that survived, so it is not listed at all.
    expect(entries.find((e) => e.id === 'first')).toBeUndefined();
  });

  it('omits a pack that changed nothing, and reports none for no packs', () => {
    expect(packContributions([pack('empty', '1.0.0', [])])).toEqual([]);
    expect(packContributions([])).toEqual([]);
  });
});
