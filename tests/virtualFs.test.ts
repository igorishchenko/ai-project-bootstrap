import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { VirtualFs } from '../src/core/vfs/virtualFs.js';
import { GeneratorError } from '../src/core/resolve/errors.js';

const tempDirs: string[] = [];

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vfs-test-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    fs.rmSync(tempDirs.pop() as string, { recursive: true, force: true });
  }
});

describe('VirtualFs', () => {
  it('records files and their ancestor directories', () => {
    const vfs = new VirtualFs();
    vfs.setOwner('a');
    vfs.write('docs/guides/setup.md', 'x');

    const snapshot = vfs.snapshot();
    expect(snapshot.files).toEqual(['docs/guides/setup.md']);
    expect(snapshot.directories).toEqual(['docs', 'docs/guides']);
  });

  it('normalises separators and leading ./', () => {
    const vfs = new VirtualFs();
    vfs.setOwner('a');
    vfs.write('./docs/a.md', 'x');

    expect(vfs.has('docs/a.md')).toBe(true);
  });

  it('lets the same builder overwrite its own file', () => {
    const vfs = new VirtualFs();
    vfs.setOwner('a');
    vfs.write('f.md', 'first');
    vfs.write('f.md', 'second');

    expect(vfs.read('f.md')).toBe('second');
  });

  it('rejects two builders writing the same path, naming both', () => {
    const vfs = new VirtualFs();
    vfs.setOwner('a');
    vfs.write('f.md', 'x');
    vfs.setOwner('b');

    expect(() => vfs.write('f.md', 'y')).toThrow(/"a".*"b"|"b".*"a"/);
  });

  it('refuses to write outside the project', () => {
    const vfs = new VirtualFs();
    vfs.setOwner('a');

    expect(() => vfs.write('../escape.md', 'x')).toThrow(GeneratorError);
  });

  it('deep-merges JSON across repeated calls', () => {
    const vfs = new VirtualFs();
    vfs.setOwner('a');
    vfs.mergeJson('package.json', { scripts: { lint: 'x' } });
    vfs.mergeJson('package.json', { scripts: { test: 'y' } });

    expect(JSON.parse(vfs.read('package.json') as string)).toEqual({
      scripts: { lint: 'x', test: 'y' },
    });
  });

  it('writes nothing to disk on a dry run', () => {
    const dir = tempDir();
    const vfs = new VirtualFs();
    vfs.setOwner('a');
    vfs.write('a.md', 'x');

    const result = vfs.flush(dir, { dryRun: true });

    expect(result.files).toEqual(['a.md']);
    expect(fs.readdirSync(dir)).toEqual([]);
  });

  it('writes files and empty directories to disk', () => {
    const dir = tempDir();
    const vfs = new VirtualFs();
    vfs.setOwner('a');
    vfs.write('docs/a.md', 'hello');
    vfs.mkdir('scripts');

    vfs.flush(dir);

    expect(fs.readFileSync(path.join(dir, 'docs', 'a.md'), 'utf8')).toBe('hello');
    expect(fs.existsSync(path.join(dir, 'scripts'))).toBe(true);
  });

  it('refuses a non-empty target without force', () => {
    const dir = tempDir();
    fs.writeFileSync(path.join(dir, 'existing.txt'), 'x');

    const vfs = new VirtualFs();
    vfs.setOwner('a');
    vfs.write('a.md', 'x');

    expect(() => vfs.flush(dir)).toThrow(/not empty/);
  });

  it('writes into a non-empty target with force, and ignores .git', () => {
    const dir = tempDir();
    fs.mkdirSync(path.join(dir, '.git'));

    const vfs = new VirtualFs();
    vfs.setOwner('a');
    vfs.write('a.md', 'x');

    expect(() => vfs.flush(dir)).not.toThrow(); // .git alone does not count
    expect(fs.existsSync(path.join(dir, 'a.md'))).toBe(true);

    const second = new VirtualFs();
    second.setOwner('a');
    second.write('b.md', 'y');
    second.flush(dir, { force: true });

    expect(fs.existsSync(path.join(dir, 'b.md'))).toBe(true);
  });
});
