import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadRegistry } from '../src/core/registry/loadModules.js';
import { extractGlobs } from '../src/builders/ruleSources.js';
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
        expect(
          variable.description.length,
          `${manifest.id}:${variable.key} description`,
        ).toBeGreaterThan(0);
      }

      for (const folder of module.folders) {
        expect(folder, `${manifest.id} folder`).not.toMatch(/^[/\\]|\.\./);
      }
    },
  );

  it.each(all.map((module) => [module.manifest.id, module] as const))(
    '%s ships templates that render',
    (_id, module) => {
      const data = {
        projectName: 'Test Project',
        projectSlug: 'test-project',
        stack: [],
        modules: [],
      };
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
      for (const asset of module.templates.filter((entry) =>
        entry.relativePath.endsWith('.json'),
      )) {
        const rendered = render(asset.content, {
          projectName: 'Test Project',
          projectSlug: 'test-project',
        });
        expect(
          () => JSON.parse(rendered),
          `${module.manifest.id}/${asset.relativePath}`,
        ).not.toThrow();
      }
    },
  );

  it('has no duplicate category/name collisions that would confuse the wizard', () => {
    const seen = new Map<string, string>();
    for (const module of registry.modules) {
      const key = `${module.manifest.category}:${module.manifest.name.toLowerCase()}`;
      expect(seen.has(key), `${key} declared by ${seen.get(key)} and ${module.manifest.id}`).toBe(
        false,
      );
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

/**
 * The base module's stack-agnostic topics are the one place a rule is authored
 * twice: once as a Cursor `.mdc` and once as a Claude `SKILL.md`, because the
 * two tools want different shapes and neither can be derived from the other.
 * Every other provider re-renders the `_cursor` copy via `extraBaseRuleSources`,
 * so a topic added on the Cursor side reaches five tools and silently skips
 * Claude Code — which is exactly how `typescript` went missing. These tests
 * fail on the asset files themselves, before any generation runs.
 */
describe('base stack-agnostic topics', () => {
  const registry = loadRegistry(ROOT);
  const base = registry.base;

  const cursorTopics = new Map<string, string>();
  const claudeTopics = new Map<string, string>();
  for (const asset of base?.templates ?? []) {
    const cursor = asset.relativePath.match(/^_cursor\/rules\/([a-z0-9-]+)\.mdc$/);
    if (cursor?.[1]) cursorTopics.set(cursor[1], asset.content);
    const claude = asset.relativePath.match(/^_claude\/skills\/([a-z0-9-]+)\/SKILL\.md$/);
    if (claude?.[1]) claudeTopics.set(claude[1], asset.content);
  }

  it('finds the topics on disk at all', () => {
    expect(base, 'no base module loaded').toBeDefined();
    expect(cursorTopics.size).toBeGreaterThan(0);
  });

  it('covers the same topic set for Cursor and Claude Code', () => {
    expect(
      [...claudeTopics.keys()].sort(),
      'every _cursor/rules/<topic>.mdc needs a _claude/skills/<topic>/SKILL.md, and vice versa',
    ).toEqual([...cursorTopics.keys()].sort());
  });

  it.each([...claudeTopics.keys()].sort())(
    '%s/SKILL.md declares frontmatter Claude Code can discover it by',
    (topic) => {
      const content = claudeTopics.get(topic) as string;
      expect(content).toMatch(/^---\n/);
      expect(content).toMatch(new RegExp(`^name: ${topic}$`, 'm'));
      expect(content).toMatch(/^description: .+$/m);
    },
  );

  it.each([...claudeTopics.keys()].sort())('%s scopes both tools to the same files', (topic) => {
    // Cursor's `globs` and the skill's `paths` are the same idea under two
    // names; a topic scoped to `.ts` in one tool and everywhere in the other
    // fires at the wrong times rather than failing loudly.
    const globs = extractGlobs(cursorTopics.get(topic)?.match(/^---\n([\s\S]*?)\n---/)?.[1]);
    const paths = claudeTopics.get(topic)?.match(/^paths:\s*(\[.*\])\s*$/m)?.[1];
    expect(paths ? (JSON.parse(paths) as string[]) : undefined).toEqual(globs);
  });
});
