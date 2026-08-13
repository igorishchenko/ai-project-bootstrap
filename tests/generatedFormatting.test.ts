import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { generate } from '../src/core/pipeline/generate.js';
import { loadRegistry } from '../src/core/registry/loadModules.js';
import { builders } from '../src/builders/index.js';
import { CONFIG_FILENAME } from '../src/builders/configBuilder.js';
import type { Selection } from '../src/core/types.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PRETTIER = path.join(ROOT, 'node_modules', '.bin', 'prettier');

/**
 * A generated project must survive its own tooling.
 *
 * Both assertions here are regressions, and the second is the one that
 * matters. The generator fingerprints every file it writes and treats a
 * mismatch as "the user edited this, never touch it again" — which is the
 * promise `upgrade` rests on. `prettier --write` is an edit. Before the
 * generated `.prettierignore` covered generator-owned output, a single
 * `npm run format` rewrote 26 files, after which `upgrade` silently stopped
 * refreshing them and the rules the AI assistant reads went quietly stale.
 *
 * The generated CI workflow runs `format:check`, so this also kept every new
 * project's first CI run red.
 */
describe('a generated project survives its own formatter', () => {
  const dirs: string[] = [];

  afterEach(() => {
    while (dirs.length > 0) fs.rmSync(dirs.pop() as string, { recursive: true, force: true });
  });

  function freshProject(): string {
    const registry = loadRegistry(ROOT);
    const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'format-test-'));
    dirs.push(targetDir);
    const selection: Selection = {
      projectName: 'Test',
      choices: {
        target: 'web',
        web: 'nextjs',
        backend: 'supabase',
        payments: 'stripe',
        'ci-cd': 'github-actions',
        testing: ['jest'],
      },
    };
    const result = generate({ rootDir: ROOT, targetDir, selection, builders, registry });
    result.vfs.flush(targetDir, { force: true });
    return targetDir;
  }

  const runPrettier = (targetDir: string, ...args: string[]) =>
    spawnSync(PRETTIER, [...args, '.'], { cwd: targetDir, encoding: 'utf8' });

  it('passes the format:check its own CI workflow runs', () => {
    const targetDir = freshProject();

    const result = runPrettier(targetDir, '--check');

    expect(result.status, `prettier --check reported:\n${result.stdout}${result.stderr}`).toBe(0);
  });

  it('leaves every generator-owned file untouched when the user runs format', () => {
    const targetDir = freshProject();
    const recorded = JSON.parse(fs.readFileSync(path.join(targetDir, CONFIG_FILENAME), 'utf8')) as {
      generated: Record<string, string>;
    };

    const before = new Map(
      Object.keys(recorded.generated).map((relative) => [
        relative,
        fs.readFileSync(path.join(targetDir, ...relative.split('/')), 'utf8'),
      ]),
    );

    expect(runPrettier(targetDir, '--write').status).toBe(0);

    const rewritten = [...before.entries()]
      .filter(
        ([relative, contents]) =>
          fs.readFileSync(path.join(targetDir, ...relative.split('/')), 'utf8') !== contents,
      )
      .map(([relative]) => relative);

    expect(
      rewritten,
      `prettier --write rewrote generator-owned files, so upgrade will now treat them as hand-edited and stop refreshing them:\n  ${rewritten.join('\n  ')}\n\nAdd them to assets/base/templates/hygiene/_prettierignore.`,
    ).toEqual([]);
  });
});
