import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadRegistry } from '../src/core/registry/loadModules.js';
import { render } from '../src/core/template/render.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Validates every module on disk against the file contract.
 *
 * This is the test that makes the system extensible in practice: a technology
 * added tomorrow is covered the moment its folder exists, without anybody
 * writing a test for it.
 */
describe('module contract', () => {
  const registry = loadRegistry(ROOT);
  const all = registry.base ? [registry.base, ...registry.modules] : registry.modules;
  const ids = new Set(registry.modules.map((module) => module.manifest.id));

  it('discovers every technology folder', () => {
    const folders = fs
      .readdirSync(path.join(ROOT, 'technologies'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
      .map((entry) => entry.name)
      .sort();

    expect(registry.modules.map((module) => module.manifest.id).sort()).toEqual(folders);
  });

  it('loads a base module', () => {
    expect(registry.base).toBeDefined();
  });

  it.each(all.map((module) => [module.manifest.id, module] as const))(
    '%s satisfies the contract',
    (_id, module) => {
      const { manifest } = module;

      expect(manifest.name.length).toBeGreaterThan(0);
      expect(manifest.description.length).toBeGreaterThan(0);

      // Every relationship must point at a module that exists, or the resolver
      // fails at generation time with a confusing message.
      for (const required of manifest.requires) expect(ids).toContain(required);
      for (const dependency of manifest.dependencies) expect(ids).toContain(dependency);
      expect(manifest.requires).not.toContain(manifest.id);
      expect(manifest.conflicts).not.toContain(manifest.id);

      // Env tables parsed at load time; here we only assert they are complete.
      for (const variable of module.env) {
        expect(variable.key, `${manifest.id} env key`).toMatch(/^[A-Z][A-Z0-9_]*$/);
        expect(variable.description.length, `${manifest.id}:${variable.key} description`).toBeGreaterThan(0);
      }

      for (const folder of module.folders) {
        expect(folder, `${manifest.id} folder`).not.toMatch(/^[/\\]|\.\./);
      }
    },
  );

  it.each(all.map((module) => [module.manifest.id, module] as const))(
    '%s ships templates that render',
    (_id, module) => {
      const data = { projectName: 'Test Project', projectSlug: 'test-project', stack: [], modules: [] };
      const sources = [
        module.setup,
        module.ios,
        module.android,
        module.architecture,
        module.cursorRule,
        module.claudeSkill,
        ...module.prompts.map((asset) => asset.content),
        ...module.checklists.map((asset) => asset.content),
        ...module.templates.map((asset) => asset.content),
      ].filter((source): source is string => typeof source === 'string');

      for (const source of sources) {
        expect(() => render(source, data)).not.toThrow();
      }
    },
  );

  it.each(all.map((module) => [module.manifest.id, module] as const))(
    '%s ships valid JSON assets',
    (_id, module) => {
      if (module.packageFragment) expect(typeof module.packageFragment).toBe('object');

      for (const spec of module.dependencies?.packages ?? []) {
        expect(spec.name.length).toBeGreaterThan(0);
        expect(spec.version.length).toBeGreaterThan(0);
      }

      // JSON templates must survive rendering and still parse.
      for (const asset of module.templates.filter((entry) => entry.relativePath.endsWith('.json'))) {
        const rendered = render(asset.content, {
          projectName: 'Test Project',
          projectSlug: 'test-project',
        });
        expect(() => JSON.parse(rendered), `${module.manifest.id}/${asset.relativePath}`).not.toThrow();
      }
    },
  );

  it('has no duplicate category/name collisions that would confuse the wizard', () => {
    const seen = new Map<string, string>();
    for (const module of registry.modules) {
      const key = `${module.manifest.category}:${module.manifest.name.toLowerCase()}`;
      expect(seen.has(key), `${key} declared by ${seen.get(key)} and ${module.manifest.id}`).toBe(false);
      seen.set(key, module.manifest.id);
    }
  });

  it('only uses categories declared in config/categories.json', () => {
    const declared = new Set(registry.categories.map((category) => category.id));
    for (const module of registry.modules) {
      expect(declared, `${module.manifest.id}`).toContain(module.manifest.category);
    }
  });
});
