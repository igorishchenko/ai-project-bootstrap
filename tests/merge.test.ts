import { describe, expect, it } from 'vitest';
import { mergeJson, sortKeys } from '../src/core/merge/mergeJson.js';
import { mergeDependencies } from '../src/core/merge/mergeDeps.js';
import { mergeEnv } from '../src/core/merge/mergeEnv.js';
import { mergeFolders, renderFolderTree } from '../src/core/merge/mergeFolders.js';

describe('mergeJson', () => {
  it('merges nested objects rather than replacing them', () => {
    const merged = mergeJson(
      { scripts: { lint: 'eslint .' } },
      { scripts: { test: 'vitest' } },
    );
    expect(merged).toEqual({ scripts: { lint: 'eslint .', test: 'vitest' } });
  });

  it('lets a later value win for a scalar', () => {
    expect(mergeJson({ start: 'a' }, { start: 'b' })).toEqual({ start: 'b' });
  });

  it('concatenates arrays and removes duplicates, including structural ones', () => {
    const merged = mergeJson(
      { plugins: ['a', { name: 'x' }] },
      { plugins: ['a', { name: 'x' }, 'b'] },
    );
    expect(merged).toEqual({ plugins: ['a', { name: 'x' }, 'b'] });
  });

  it('does not mutate its inputs', () => {
    const target = { scripts: { lint: 'x' } };
    mergeJson(target, { scripts: { test: 'y' } });
    expect(target).toEqual({ scripts: { lint: 'x' } });
  });

  it('sorts keys recursively', () => {
    expect(JSON.stringify(sortKeys({ b: 1, a: { d: 2, c: 3 } }))).toBe('{"a":{"c":3,"d":2},"b":1}');
  });
});

describe('mergeDependencies', () => {
  it('deduplicates identical requests', () => {
    const merged = mergeDependencies([
      { name: 'react', version: '^18.0.0', moduleId: 'a' },
      { name: 'react', version: '^18.0.0', moduleId: 'b' },
    ]);

    expect(merged.dependencies).toEqual({ react: '^18.0.0' });
    expect(merged.warnings).toEqual([]);
  });

  it('keeps the higher floor on a version conflict and warns naming both modules', () => {
    const merged = mergeDependencies([
      { name: 'react', version: '^18.0.0', moduleId: 'old' },
      { name: 'react', version: '^18.3.1', moduleId: 'new' },
    ]);

    expect(merged.dependencies.react).toBe('^18.3.1');
    expect(merged.warnings[0]).toContain('old');
    expect(merged.warnings[0]).toContain('new');
  });

  it('resolves the conflict the same way regardless of declaration order', () => {
    const forward = mergeDependencies([
      { name: 'react', version: '^18.0.0', moduleId: 'a' },
      { name: 'react', version: '^18.3.1', moduleId: 'b' },
    ]);
    const reverse = mergeDependencies([
      { name: 'react', version: '^18.3.1', moduleId: 'b' },
      { name: 'react', version: '^18.0.0', moduleId: 'a' },
    ]);

    expect(forward.dependencies.react).toBe(reverse.dependencies.react);
  });

  it('prefers a parseable range over an unparseable one', () => {
    const merged = mergeDependencies([
      { name: 'lib', version: 'workspace:*', moduleId: 'a' },
      { name: 'lib', version: '^2.0.0', moduleId: 'b' },
    ]);

    expect(merged.dependencies.lib).toBe('^2.0.0');
  });

  it('promotes a dev dependency to a runtime one when any module needs it at runtime', () => {
    const merged = mergeDependencies([
      { name: 'lib', version: '^1.0.0', dev: true, moduleId: 'a' },
      { name: 'lib', version: '^1.0.0', moduleId: 'b' },
    ]);

    expect(merged.dependencies).toEqual({ lib: '^1.0.0' });
    expect(merged.devDependencies).toEqual({});
  });

  it('separates peer dependencies and collects native modules', () => {
    const merged = mergeDependencies([
      { name: 'peerlib', version: '^1.0.0', peer: true, moduleId: 'a' },
      { name: 'nativelib', version: '^2.0.0', native: true, moduleId: 'b' },
    ]);

    expect(merged.peerDependencies).toEqual({ peerlib: '^1.0.0' });
    expect(merged.native).toEqual(['nativelib']);
  });

  it('sorts output keys so package.json diffs stay stable', () => {
    const merged = mergeDependencies([
      { name: 'zod', version: '^3.0.0', moduleId: 'a' },
      { name: 'axios', version: '^1.0.0', moduleId: 'b' },
    ]);

    expect(Object.keys(merged.dependencies)).toEqual(['axios', 'zod']);
  });
});

describe('mergeEnv', () => {
  it('groups variables by module with descriptions and requirement comments', () => {
    const { content } = mergeEnv([
      {
        moduleId: 'a',
        moduleName: 'Module A',
        vars: [{ key: 'API_URL', required: true, description: 'Where the API lives', example: 'https://x' }],
      },
    ]);

    expect(content).toContain('─── Module A ───');
    expect(content).toContain('# Where the API lives');
    expect(content).toContain('# Required');
    expect(content).toContain('API_URL=https://x');
  });

  it('emits a duplicated key once and warns', () => {
    const { content, warnings } = mergeEnv([
      { moduleId: 'a', moduleName: 'A', vars: [{ key: 'SHARED', required: true, description: 'from a', example: '1' }] },
      { moduleId: 'b', moduleName: 'B', vars: [{ key: 'SHARED', required: false, description: 'from b', example: '2' }] },
    ]);

    expect(content.match(/^SHARED=/gm)).toHaveLength(1);
    expect(content).toContain('# from a');
    expect(warnings[0]).toContain('SHARED');
  });

  it('still produces a usable file when no module declares variables', () => {
    expect(mergeEnv([]).content).toContain('Never commit .env');
  });
});

describe('mergeFolders', () => {
  it('deduplicates and sorts', () => {
    expect(mergeFolders(['b', 'a', 'a'])).toEqual(['a', 'b']);
  });

  it('drops a parent implied by a deeper path', () => {
    expect(mergeFolders(['app/payments', 'app/payments/checkout'])).toEqual([
      'app/payments/checkout',
    ]);
  });

  it('normalises separators and leading or trailing slashes', () => {
    expect(mergeFolders(['./src/a/', 'src\\a'])).toEqual(['src/a']);
  });

  it('refuses to escape the project root', () => {
    expect(mergeFolders(['../outside', 'ok'])).toEqual(['ok']);
  });

  it('renders a nested tree without repeating shared parents', () => {
    expect(renderFolderTree(['src/a', 'src/b'])).toBe('src/\n  a/\n  b/');
  });
});
