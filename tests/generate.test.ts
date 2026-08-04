import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { generate } from '../src/core/pipeline/generate.js';
import { loadRegistry } from '../src/core/registry/loadModules.js';
import { builders } from '../src/builders/index.js';
import { GeneratorError } from '../src/core/resolve/errors.js';
import type { Selection } from '../src/core/types.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registry = loadRegistry(ROOT);

const fixture = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'tests/fixtures/expo-supabase-revenuecat.json'), 'utf8'),
) as Selection;

function run(selection: Selection = fixture) {
  return generate({
    rootDir: ROOT,
    targetDir: '/virtual/out',
    selection,
    builders,
    registry,
  });
}

describe('generate', () => {
  const result = run();
  const files = result.vfs.snapshot().files;
  const read = (file: string): string => {
    const content = result.vfs.read(file);
    expect(content, `${file} should exist`).toBeDefined();
    return content as string;
  };

  it('auto-includes the platform required by the chosen framework', () => {
    expect(result.autoIncluded).toEqual(['react-native']);
    expect(result.moduleNames).toContain('React Native');
  });

  it('produces the documentation set the spec calls for', () => {
    for (const doc of [
      'docs/setup.md',
      'docs/architecture.md',
      'docs/deployment.md',
      'docs/testing.md',
      'docs/coding-standards.md',
      'docs/release.md',
    ]) {
      expect(files).toContain(doc);
    }
  });

  it('produces the root files an assistant reads first', () => {
    expect(files).toEqual(
      expect.arrayContaining(['README.md', 'CLAUDE.md', 'AGENTS.md', '.env.example', 'package.json']),
    );
  });

  it('writes a rule and a skill for every selected technology, plus the base set', () => {
    for (const id of ['expo', 'react-native', 'supabase', 'revenuecat', 'sentry', 'posthog']) {
      expect(files).toContain(`.cursor/rules/${id}.mdc`);
      expect(files).toContain(`.claude/skills/${id}.md`);
    }
    expect(files).toContain('.cursor/rules/typescript.mdc');
    expect(files).toContain('.claude/skills/architecture.md');
  });

  it('writes no rule for a technology that was not selected', () => {
    const ruleFiles = files.filter((file) => file.startsWith('.cursor/rules/'));
    expect(ruleFiles.some((file) => file.includes('firebase'))).toBe(false);
  });

  it('ships all nine base prompts', () => {
    const prompts = files.filter((file) => file.startsWith('prompts/') && file.endsWith('.md'));
    expect(prompts).toHaveLength(9);
  });

  it('gives setup.md a section per contributing module', () => {
    const setup = read('docs/setup.md');
    for (const name of ['Expo', 'Supabase', 'RevenueCat', 'Sentry', 'PostHog']) {
      expect(setup).toContain(`## ${name}`);
    }
    expect(setup).toContain('### iOS configuration');
    expect(setup).toContain('### Android configuration');
  });

  it('documents every environment variable exactly once, with a description', () => {
    const env = read('.env.example');
    const keys = [...env.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1]);

    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain('EXPO_PUBLIC_SUPABASE_URL');
    expect(keys).toContain('EXPO_PUBLIC_REVENUECAT_IOS_KEY');
    expect(env).toContain('# Required');
  });

  it('resolves package.json without conflicting versions', () => {
    const pkg = JSON.parse(read('package.json')) as {
      name: string;
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    expect(pkg.name).toBe('demo-app');
    expect(pkg.dependencies['react-native-purchases']).toBeDefined();
    expect(pkg.dependencies['@supabase/supabase-js']).toBeDefined();

    // Nothing may appear in both maps — npm would install the runtime one and
    // the duplicate would silently drift.
    const overlap = Object.keys(pkg.dependencies).filter((name) => name in pkg.devDependencies);
    expect(overlap).toEqual([]);
  });

  it('renders every template — no placeholder survives into the output', () => {
    for (const [file, content] of result.vfs.entries()) {
      // `{{ flex: 1 }}` in prose is JSX, not a template tag; tags have no colon.
      const tags = content.match(/\{\{[^{}:]*\}\}/g) ?? [];
      expect(tags, `${file} has unrendered tags`).toEqual([]);
    }
  });

  it('restores dotfile names from the _ template convention', () => {
    expect(files).toContain('.gitignore');
    expect(files).toContain('.husky/pre-commit');
    expect(files).toContain('.vscode/settings.json');
    expect(files).not.toContain('_gitignore');
  });

  it('keeps empty scaffolding folders, but does not litter folders with content', () => {
    expect(files).toContain('src/services/payments/.gitkeep');
    expect(files).not.toContain('docs/.gitkeep');
    expect(files).not.toContain('src/.gitkeep');
  });

  it('gives every declared script the config file it needs', () => {
    // Regression: `typecheck` shipped without a tsconfig.json, so the script
    // failed on every freshly generated project.
    const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };

    if ('typecheck' in pkg.scripts) expect(files).toContain('tsconfig.json');
    if ('lint' in pkg.scripts) expect(files).toContain('eslint.config.mjs');
    if ('format' in pkg.scripts) expect(files).toContain('.prettierrc.json');
  });

  it('leaves no declared script failing on a freshly generated project', () => {
    // Regression: `jest` exits 1 with "no tests found", and `tsc` exits 1 with
    // TS18003, on a scaffold that has no application code yet — so the first
    // CI run of every generated project was red.
    const withTests = generate({
      rootDir: ROOT,
      targetDir: '/virtual/out',
      selection: {
        projectName: 'Tested',
        choices: { platform: 'expo', testing: ['jest'] },
      },
      builders,
      registry,
    });

    const pkg = JSON.parse(withTests.vfs.read('package.json') as string) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts.test).toContain('--passWithNoTests');
  });

  it('gives tsconfig at least one input so typecheck is not an error out of the box', () => {
    // TS18003: an include path matching nothing is a hard failure, and a fresh
    // scaffold has no application code yet.
    const tsconfig = JSON.parse(read('tsconfig.json')) as { include: string[] };
    const inputs = files.filter(
      (file) =>
        (file.endsWith('.ts') || file.endsWith('.tsx')) &&
        tsconfig.include.some((pattern) => file.startsWith(pattern.replace(/\*.*$/, ''))),
    );

    expect(inputs.length).toBeGreaterThan(0);
  });

  it('declares every environment variable in the generated types', () => {
    const declarations = read('src/types/env.d.ts');
    const envKeys = [...read('.env.example').matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]);

    expect(envKeys.length).toBeGreaterThan(0);
    for (const key of envKeys) expect(declarations).toContain(`${key}?: string;`);
  });

  it('ships ESM configs with an .mjs extension, since package.json is not a module', () => {
    // Otherwise Node emits MODULE_TYPELESS_PACKAGE_JSON on every lint run.
    const pkg = JSON.parse(read('package.json')) as { type?: string };
    if (pkg.type === 'module') return;

    for (const file of files.filter((f) => /^(eslint|commitlint)\.config\./.test(f))) {
      expect(file).toMatch(/\.mjs$/);
    }
  });

  it('references no config plugin that is not also an installed dependency', () => {
    // Regression: app.json listed expo-build-properties, which nothing
    // installed, so `expo prebuild` failed.
    if (!files.includes('app.json')) return;

    const app = JSON.parse(read('app.json')) as { expo: { plugins?: unknown[] } };
    const pkg = JSON.parse(read('package.json')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const installed = new Set([
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ]);

    for (const plugin of app.expo.plugins ?? []) {
      const name = Array.isArray(plugin) ? plugin[0] : plugin;
      if (typeof name === 'string' && name.startsWith('expo-')) expect(installed).toContain(name);
    }
  });

  it('round-trips the selection for regeneration', () => {
    expect(JSON.parse(read('ai-project.config.json'))).toEqual({
      projectName: fixture.projectName,
      choices: fixture.choices,
    });
  });

  it('is deterministic — the same selection twice is byte-identical', () => {
    expect(run().vfs.entries()).toEqual(result.vfs.entries());
  });

  it('is independent of the order the answers were given in', () => {
    const reordered: Selection = {
      projectName: fixture.projectName,
      choices: {
        'crash-reporting': ['sentry'],
        analytics: ['posthog'],
        payments: 'revenuecat',
        backend: 'supabase',
        platform: 'expo',
      },
    };

    expect(run(reordered).vfs.snapshot().files).toEqual(files);
  });

  it('honours --skip by omitting that builder\'s output', () => {
    const skipped = generate({
      rootDir: ROOT,
      targetDir: '/virtual/out',
      selection: fixture,
      builders,
      registry,
      skip: ['cursor'],
    });

    const skippedFiles = skipped.vfs.snapshot().files;

    expect(skipped.runs.find((run) => run.id === 'cursor')?.ran).toBe(false);
    expect(skippedFiles).not.toContain('.cursor/rules/expo.mdc');
    // The stack-agnostic rules ship as base templates, so they are unaffected.
    expect(skippedFiles).toContain('.cursor/rules/typescript.mdc');
  });

  it('generates a project from the required category alone', () => {
    const minimal = generate({
      rootDir: ROOT,
      targetDir: '/virtual/out',
      selection: { projectName: 'Bare', choices: { platform: 'react-native' } },
      builders,
      registry,
    });
    const minimalFiles = minimal.vfs.snapshot().files;

    expect(minimalFiles).toContain('README.md');
    expect(minimalFiles).toContain('.cursor/rules/react-native.mdc');
    expect(minimalFiles).not.toContain('.cursor/rules/supabase.mdc');
    expect(minimal.moduleNames).toEqual(['React Native']);
  });

  it('rejects a selection that omits a required category', () => {
    expect(() =>
      generate({
        rootDir: ROOT,
        targetDir: '/virtual/out',
        selection: { projectName: 'Bare', choices: {} },
        builders,
        registry,
      }),
    ).toThrow(/required category/);
  });

  it('rejects an unknown module with a useful message', () => {
    expect(() =>
      generate({
        rootDir: ROOT,
        targetDir: '/virtual/out',
        selection: { projectName: 'X', choices: { platform: 'nope' } },
        builders,
        registry,
      }),
    ).toThrow(GeneratorError);
  });
});
