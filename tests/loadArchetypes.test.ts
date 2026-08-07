import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { listArchetypeIds, loadArchetype } from '../src/core/registry/loadArchetypes.js';
import { loadRegistry } from '../src/core/registry/loadModules.js';
import { GeneratorError } from '../src/core/resolve/errors.js';
import { render } from '../src/core/template/render.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registry = loadRegistry(ROOT);

describe('listArchetypeIds', () => {
  it('finds the real habit-tracker archetype on disk', () => {
    expect(listArchetypeIds(ROOT)).toContain('habit-tracker');
  });

  it('is empty for a root with no archetypes/ directory', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'archetypes-test-'));
    try {
      expect(listArchetypeIds(dir)).toEqual([]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('loadArchetype', () => {
  it('loads and validates the real habit-tracker archetype', () => {
    const archetype = loadArchetype(ROOT, 'habit-tracker', registry.byId, registry.categories);

    expect(archetype.manifest.id).toBe('habit-tracker');
    expect(archetype.manifest.name.length).toBeGreaterThan(0);
    expect(archetype.manifest.choices.backend).toBe('supabase');
    expect(archetype.scaffold.length).toBeGreaterThan(0);
    expect(archetype.scaffold.some((asset) => asset.relativePath === 'App.tsx')).toBe(true);
    expect(archetype.packageFragment).toMatchObject({ main: 'node_modules/expo/AppEntry.js' });
  });

  it('throws a clear, listing error for an unknown archetype id', () => {
    expect(() => loadArchetype(ROOT, 'does-not-exist', registry.byId, registry.categories)).toThrow(
      GeneratorError,
    );
    try {
      loadArchetype(ROOT, 'does-not-exist', registry.byId, registry.categories);
    } catch (error) {
      expect((error as GeneratorError).message).toContain('Unknown archetype');
      expect((error as GeneratorError).hint).toContain('habit-tracker');
    }
  });

  describe('against synthetic archetype fixtures', () => {
    const dirs: string[] = [];

    afterEach(() => {
      while (dirs.length > 0) fs.rmSync(dirs.pop() as string, { recursive: true, force: true });
    });

    function fixtureRoot(): string {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'archetype-fixture-'));
      dirs.push(dir);
      return dir;
    }

    function writeManifest(root: string, id: string, manifest: unknown): void {
      const dir = path.join(root, 'archetypes', id);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
    }

    it('rejects a manifest whose id does not match its folder name', () => {
      const root = fixtureRoot();
      writeManifest(root, 'mismatched', {
        id: 'something-else',
        name: 'Mismatched',
        description: 'x',
        choices: {},
      });

      expect(() => loadArchetype(root, 'mismatched', registry.byId, registry.categories)).toThrow(
        /must match its folder name/,
      );
    });

    it('rejects a selection that references an unknown module id', () => {
      const root = fixtureRoot();
      writeManifest(root, 'broken', {
        id: 'broken',
        name: 'Broken',
        description: 'x',
        choices: { backend: 'not-a-real-module' },
      });

      expect(() => loadArchetype(root, 'broken', registry.byId, registry.categories)).toThrow(
        /invalid selection/,
      );
    });

    it('rejects a selection that bundles two conflicting modules', () => {
      const root = fixtureRoot();
      writeManifest(root, 'conflicting', {
        id: 'conflicting',
        name: 'Conflicting',
        description: 'x',
        choices: { backend: 'supabase', database: 'postgresql' },
      });

      expect(() => loadArchetype(root, 'conflicting', registry.byId, registry.categories)).toThrow(
        /invalid selection/,
      );
    });

    it('has no scaffold/ and no package.fragment.json when neither is present', () => {
      const root = fixtureRoot();
      writeManifest(root, 'minimal', {
        id: 'minimal',
        name: 'Minimal',
        description: 'x',
        choices: { target: 'web', web: 'nextjs' },
      });

      const archetype = loadArchetype(root, 'minimal', registry.byId, registry.categories);
      expect(archetype.scaffold).toEqual([]);
      expect(archetype.packageFragment).toBeUndefined();
    });
  });
});

/**
 * Validates every archetype actually on disk against the content contract —
 * same purpose as `moduleContract.test.ts` for `technologies/*`: a new
 * archetype folder is covered the moment it exists, without anyone writing
 * a dedicated test for it.
 */
describe('archetype contract', () => {
  it.each(listArchetypeIds(ROOT))('%s satisfies the contract', (id) => {
    const archetype = loadArchetype(ROOT, id, registry.byId, registry.categories);

    expect(archetype.manifest.name.length).toBeGreaterThan(0);
    expect(archetype.manifest.description.length).toBeGreaterThan(0);
    expect(Object.keys(archetype.manifest.choices).length).toBeGreaterThan(0);

    const data = { projectName: 'Test Project', projectSlug: 'test-project' };
    for (const asset of archetype.scaffold) {
      expect(() => render(asset.content, data), asset.relativePath).not.toThrow();
      // The generator's own {{...}} must never survive into scaffold output —
      // it would mean a stray tag silently ate real content (see
      // tests/archetype.test.ts for the incident this guards against).
      expect(render(asset.content, data), asset.relativePath).not.toMatch(/\{\{[a-zA-Z#/]/);
    }

    for (const asset of archetype.scaffold.filter((entry) =>
      entry.relativePath.endsWith('.json'),
    )) {
      expect(() => JSON.parse(render(asset.content, data)), asset.relativePath).not.toThrow();
    }
  });
});
