import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { loadFeatures } from '../src/core/registry/loadFeatures.js';
import { loadRegistry } from '../src/core/registry/loadModules.js';
import { GeneratorError } from '../src/core/resolve/errors.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Validates every feature under features/ against the file contract — same
 * role for `implement` that moduleContract.test.ts plays for technologies/:
 * a feature added tomorrow is covered the moment its folder exists.
 */
describe('feature contract (the real features/ directory)', () => {
  const registry = loadRegistry(ROOT);
  const features = loadFeatures(ROOT, registry.byId, registry.categories);

  it('discovers every feature folder', () => {
    const folders = fs
      .readdirSync(path.join(ROOT, 'features'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
      .map((entry) => entry.name)
      .sort();

    expect(features.map((feature) => feature.manifest.id).sort()).toEqual(folders);
  });

  it.each(features.map((feature) => [feature.manifest.id, feature] as const))(
    '%s satisfies the contract',
    (_id, feature) => {
      expect(feature.manifest.name.length).toBeGreaterThan(0);
      expect(feature.manifest.description.length).toBeGreaterThan(0);
      // The category must be real — this is what `implement` reads the
      // selected provider from.
      expect(
        registry.categories.some((category) => category.id === feature.manifest.category),
      ).toBe(true);
      expect(feature.manifest.providers.length).toBeGreaterThan(0);

      for (const providerId of feature.manifest.providers) {
        // Every declared provider must be a real technology id, and must
        // actually belong to this feature's own category — implement reads
        // one provider id out of exactly that category's answer.
        const module = registry.byId.get(providerId);
        expect(module, `"${providerId}" must be a real technology id`).toBeDefined();
        expect(module?.manifest.category).toBe(feature.manifest.category);

        const content = feature.providers.get(providerId);
        expect(content).toBeDefined();
        // A provider with nothing to write would be a silent no-op for
        // `implement` — every one must ship at least a plan.
        expect(
          content?.plan,
          `${feature.manifest.id}/${providerId} should ship a plan.md`,
        ).toBeDefined();
      }
    },
  );

  it('every provider ships at least one prompt', () => {
    for (const feature of features) {
      for (const [providerId, content] of feature.providers) {
        expect(
          content.prompts.length,
          `${feature.manifest.id}/${providerId} should ship at least one prompt`,
        ).toBeGreaterThan(0);
      }
    }
  });
});

describe('loadFeatures validation', () => {
  const registry = loadRegistry(ROOT);
  const dirs: string[] = [];

  afterEach(() => {
    while (dirs.length > 0) fs.rmSync(dirs.pop() as string, { recursive: true, force: true });
  });

  function fixtureRoot(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'load-features-'));
    dirs.push(dir);
    return dir;
  }

  function write(root: string, relative: string, content: string): void {
    const full = path.join(root, relative);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, 'utf8');
  }

  it('returns an empty list when features/ does not exist', () => {
    const root = fixtureRoot();
    expect(loadFeatures(root, registry.byId, registry.categories)).toEqual([]);
  });

  it('rejects a feature with no manifest.json', () => {
    const root = fixtureRoot();
    fs.mkdirSync(path.join(root, 'features', 'onboarding'), { recursive: true });

    expect(() => loadFeatures(root, registry.byId, registry.categories)).toThrow(GeneratorError);
    expect(() => loadFeatures(root, registry.byId, registry.categories)).toThrow(
      /no manifest\.json/,
    );
  });

  it('rejects a manifest whose id does not match its folder name', () => {
    const root = fixtureRoot();
    write(
      root,
      'features/onboarding/manifest.json',
      JSON.stringify({
        id: 'wrong-id',
        name: 'Onboarding',
        description: 'x',
        category: 'auth',
        providers: ['supabase-auth'],
      }),
    );

    expect(() => loadFeatures(root, registry.byId, registry.categories)).toThrow(
      /declares id "wrong-id"/,
    );
  });

  it('rejects a manifest with an unknown category', () => {
    const root = fixtureRoot();
    write(
      root,
      'features/onboarding/manifest.json',
      JSON.stringify({
        id: 'onboarding',
        name: 'Onboarding',
        description: 'x',
        category: 'not-a-real-category',
        providers: ['supabase-auth'],
      }),
    );

    expect(() => loadFeatures(root, registry.byId, registry.categories)).toThrow(
      /has no wizard question/,
    );
  });

  it('rejects a manifest declaring a provider that is not a real technology id', () => {
    const root = fixtureRoot();
    write(
      root,
      'features/onboarding/manifest.json',
      JSON.stringify({
        id: 'onboarding',
        name: 'Onboarding',
        description: 'x',
        category: 'auth',
        providers: ['not-a-real-technology'],
      }),
    );

    expect(() => loadFeatures(root, registry.byId, registry.categories)).toThrow(
      /not a real technology id/,
    );
  });

  it('rejects a declared provider with no providers/<id>/ directory', () => {
    const root = fixtureRoot();
    write(
      root,
      'features/onboarding/manifest.json',
      JSON.stringify({
        id: 'onboarding',
        name: 'Onboarding',
        description: 'x',
        category: 'auth',
        providers: ['supabase-auth'],
      }),
    );

    expect(() => loadFeatures(root, registry.byId, registry.categories)).toThrow(
      /has no providers\/supabase-auth\//,
    );
  });

  it('loads plan, checklist, prompts and scaffold for a well-formed feature', () => {
    const root = fixtureRoot();
    write(
      root,
      'features/onboarding/manifest.json',
      JSON.stringify({
        id: 'onboarding',
        name: 'Onboarding',
        description: 'x',
        category: 'auth',
        providers: ['supabase-auth'],
      }),
    );
    write(root, 'features/onboarding/providers/supabase-auth/plan.md', 'Plan for {{projectName}}');
    write(root, 'features/onboarding/providers/supabase-auth/checklist.md', 'Checklist');
    write(root, 'features/onboarding/providers/supabase-auth/prompts/implement.md', 'Prompt');
    write(
      root,
      'features/onboarding/providers/supabase-auth/scaffold/src/onboarding/Step1.tsx',
      'stub',
    );

    const [feature] = loadFeatures(root, registry.byId, registry.categories);
    const content = feature?.providers.get('supabase-auth');

    expect(content?.plan).toBe('Plan for {{projectName}}');
    expect(content?.checklist).toBe('Checklist');
    expect(content?.prompts).toEqual([{ relativePath: 'implement.md', content: 'Prompt' }]);
    expect(content?.scaffold).toEqual([
      { relativePath: 'src/onboarding/Step1.tsx', content: 'stub' },
    ]);
  });

  it('a provider missing plan.md/checklist.md simply has them undefined, not an error', () => {
    const root = fixtureRoot();
    write(
      root,
      'features/onboarding/manifest.json',
      JSON.stringify({
        id: 'onboarding',
        name: 'Onboarding',
        description: 'x',
        category: 'auth',
        providers: ['supabase-auth'],
      }),
    );
    write(root, 'features/onboarding/providers/supabase-auth/prompts/implement.md', 'Prompt');

    const [feature] = loadFeatures(root, registry.byId, registry.categories);
    const content = feature?.providers.get('supabase-auth');

    expect(content?.plan).toBeUndefined();
    expect(content?.checklist).toBeUndefined();
    expect(content?.prompts).toHaveLength(1);
  });
});
