import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { preservedPaths, readFingerprints, removablePaths } from '../src/core/vfs/preserve.js';
import { fingerprint } from '../src/core/vfs/fingerprint.js';
import { VirtualFs } from '../src/core/vfs/virtualFs.js';

const dirs: string[] = [];

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'preserve-test-'));
  dirs.push(dir);
  return dir;
}

function write(dir: string, file: string, content: string): void {
  const full = path.join(dir, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
}

afterEach(() => {
  while (dirs.length > 0) fs.rmSync(dirs.pop() as string, { recursive: true, force: true });
});

describe('preservedPaths', () => {
  it('preserves a file the user edited after generation', () => {
    const dir = tempDir();
    write(dir, 'docs/setup.md', 'edited by hand');

    const preserved = preservedPaths(dir, ['docs/setup.md'], {
      'docs/setup.md': fingerprint('as generated'),
    });

    expect(preserved).toEqual(['docs/setup.md']);
  });

  it('does not preserve a file that is untouched since generation', () => {
    const dir = tempDir();
    write(dir, 'docs/setup.md', 'as generated');

    const preserved = preservedPaths(dir, ['docs/setup.md'], {
      'docs/setup.md': fingerprint('as generated'),
    });

    expect(preserved).toEqual([]);
  });

  it('ignores files the generator never produced', () => {
    const dir = tempDir();
    write(dir, 'src/mine.ts', 'my own code');

    expect(preservedPaths(dir, ['src/mine.ts'], { 'docs/setup.md': 'abc' })).toEqual([]);
  });

  it('ignores a recorded file that no longer exists', () => {
    const dir = tempDir();

    expect(preservedPaths(dir, ['docs/gone.md'], { 'docs/gone.md': 'abc' })).toEqual([]);
  });

  it('preserves nothing on a first generation', () => {
    const dir = tempDir();
    write(dir, 'docs/setup.md', 'anything');

    expect(preservedPaths(dir, ['docs/setup.md'], undefined)).toEqual([]);
    expect(preservedPaths(dir, ['docs/setup.md'], {})).toEqual([]);
  });
});

describe('removablePaths', () => {
  it('reports a vanished, untouched file as safe to delete', () => {
    const dir = tempDir();
    write(dir, '.cursor/rules/firebase.mdc', 'as generated');

    const result = removablePaths(
      dir,
      { '.cursor/rules/firebase.mdc': fingerprint('as generated') },
      [], // the new generation no longer produces this file at all
    );

    expect(result.safe).toEqual(['.cursor/rules/firebase.mdc']);
    expect(result.handEdited).toEqual([]);
  });

  it('refuses to classify a hand-edited vanished file as safe', () => {
    const dir = tempDir();
    write(dir, '.cursor/rules/firebase.mdc', 'MY EDIT, not what was generated');

    const result = removablePaths(
      dir,
      { '.cursor/rules/firebase.mdc': fingerprint('as generated') },
      [],
    );

    expect(result.handEdited).toEqual(['.cursor/rules/firebase.mdc']);
    expect(result.safe).toEqual([]);
  });

  it('does not consider a file that the new generation still produces', () => {
    const dir = tempDir();
    write(dir, 'package.json', 'as generated');

    // package.json persists across a replace (merged output, not deleted) —
    // it's in currentFiles, so it must never show up here even though its
    // content will differ once the new selection is generated.
    const result = removablePaths(dir, { 'package.json': fingerprint('as generated') }, [
      'package.json',
    ]);

    expect(result.safe).toEqual([]);
    expect(result.handEdited).toEqual([]);
  });

  it('ignores a vanished file that is already gone from disk', () => {
    const dir = tempDir();

    const result = removablePaths(dir, { '.cursor/rules/firebase.mdc': 'abc' }, []);

    expect(result.safe).toEqual([]);
    expect(result.handEdited).toEqual([]);
  });

  it('reports nothing removable without fingerprint history', () => {
    const dir = tempDir();
    write(dir, '.cursor/rules/firebase.mdc', 'anything');

    expect(removablePaths(dir, undefined, []).safe).toEqual([]);
    expect(removablePaths(dir, {}, []).safe).toEqual([]);
  });
});

describe('readFingerprints', () => {
  it('reads the generated map from a config file', () => {
    const dir = tempDir();
    write(dir, 'ai-project.config.json', JSON.stringify({ generated: { 'a.md': 'ff' } }));

    expect(readFingerprints(path.join(dir, 'ai-project.config.json'))).toEqual({ 'a.md': 'ff' });
  });

  it('returns undefined for a missing or unreadable config', () => {
    const dir = tempDir();
    expect(readFingerprints(path.join(dir, 'nope.json'))).toBeUndefined();

    write(dir, 'broken.json', '{ not json');
    expect(readFingerprints(path.join(dir, 'broken.json'))).toBeUndefined();
  });
});

describe('VirtualFs.flush with preserve', () => {
  it('leaves preserved files on disk untouched and reports them', () => {
    const dir = tempDir();
    write(dir, 'docs/setup.md', 'MY EDIT');
    write(dir, 'README.md', 'old readme');

    const vfs = new VirtualFs();
    vfs.setOwner('docs');
    vfs.write('docs/setup.md', 'regenerated');
    vfs.write('README.md', 'new readme');

    const result = vfs.flush(dir, { force: true, preserve: new Set(['docs/setup.md']) });

    expect(fs.readFileSync(path.join(dir, 'docs/setup.md'), 'utf8')).toBe('MY EDIT');
    expect(fs.readFileSync(path.join(dir, 'README.md'), 'utf8')).toBe('new readme');
    expect(result.preserved).toEqual(['docs/setup.md']);
    expect(result.files).toEqual(['README.md']);
  });
});
