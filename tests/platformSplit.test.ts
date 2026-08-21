import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { generate } from '../src/core/pipeline/generate.js';
import { loadRegistry } from '../src/core/registry/loadModules.js';
import { builders } from '../src/builders/index.js';
import type { Selection } from '../src/core/types.js';

/**
 * The catalogue was authored mobile-first, so for several releases a web
 * project was handed Expo packages, Expo instructions and `EXPO_PUBLIC_`
 * variables that Next.js never inlines. Nothing failed: the output was
 * plausible, installed, and wrong.
 *
 * These are the assertions that make that loud. They deliberately check the
 * *absence* of the other platform's content, because everything here was
 * already present and correct for one target — what was missing was any test
 * that the two targets produce different output.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registry = loadRegistry(ROOT);

const read = (file: string): Selection =>
  JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures', file), 'utf8')) as Selection;

function run(selection: Selection) {
  const result = generate({
    rootDir: ROOT,
    targetDir: '/virtual/out',
    selection,
    builders,
    registry,
  });
  const readFile = (file: string): string => {
    const content = result.vfs.read(file);
    expect(content, `${file} should exist`).toBeDefined();
    return content as string;
  };
  return {
    result,
    readFile,
    files: result.vfs.snapshot().files,
    packageJson: JSON.parse(readFile('package.json')) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    },
  };
}

const NATIVE_ONLY = /\b(expo-[a-z-]+|@expo\/[a-z-]+|react-native[a-z-]*|@react-native[\w/-]*)\b/;

describe('a web project gets web content', () => {
  const web = run(read('nextjs-full-stack.json'));
  const allDeps = { ...web.packageJson.dependencies, ...web.packageJson.devDependencies };

  it('installs no React Native or Expo package', () => {
    const native = Object.keys(allDeps).filter((name) => NATIVE_ONLY.test(name));
    expect(native, 'native packages leaked into a web project').toEqual([]);
  });

  it('installs the web SDK where a technology ships one per platform', () => {
    expect(allDeps).toHaveProperty('@sentry/nextjs');
    expect(allDeps).toHaveProperty('posthog-js');
    expect(allDeps).toHaveProperty('@supabase/ssr');
    expect(allDeps).not.toHaveProperty('@sentry/react-native');
    expect(allDeps).not.toHaveProperty('posthog-react-native');
  });

  it('names client variables with the prefix Next.js actually inlines', () => {
    const env = web.readFile('.env.example');
    expect(env).toContain('NEXT_PUBLIC_SUPABASE_URL');
    expect(env).toContain('NEXT_PUBLIC_SENTRY_DSN');
    expect(env).toContain('NEXT_PUBLIC_POSTHOG_KEY');
    expect(env).not.toContain('EXPO_PUBLIC_');
  });

  it('documents the web integration path, not the Expo one', () => {
    const setup = web.readFile('docs/setup.md');
    expect(setup).not.toMatch(/npx expo (install|prebuild)/);
    expect(setup).not.toContain('EXPO_PUBLIC_');
    expect(setup).not.toContain('@react-native-async-storage/async-storage');
  });

  it('never tells a web project to bump a build number for the app stores', () => {
    // These read as instructions, not context: a release checklist item nobody
    // can satisfy is one people learn to tick without reading.
    const release = web.readFile('docs/release.md') + web.readFile('checklists/release.md');
    expect(release).not.toMatch(/build number/i);
    expect(web.readFile('prompts/release.md')).not.toMatch(/build number/i);
    expect(web.readFile('docs/setup.md')).not.toContain('App Store rejection');
    expect(web.readFile('checklists/payments-web.md')).not.toMatch(/^## Mobile/m);
  });

  it('leaks no native content into the rules the AI assistant reads', () => {
    const ruleFiles = web.files.filter(
      (file) => file.startsWith('.claude/skills/') || file.startsWith('.cursor/rules/'),
    );
    expect(ruleFiles.length).toBeGreaterThan(0);
    for (const file of ruleFiles) {
      expect(web.readFile(file), `${file} mentions EXPO_PUBLIC_`).not.toContain('EXPO_PUBLIC_');
    }
  });
});

describe('a mobile project still gets native content', () => {
  const mobile = run(read('ci-full-stack.json'));
  const allDeps = {
    ...mobile.packageJson.dependencies,
    ...mobile.packageJson.devDependencies,
  };

  it('installs the native SDKs', () => {
    expect(allDeps).toHaveProperty('@sentry/react-native');
    expect(allDeps).toHaveProperty('posthog-react-native');
    expect(allDeps).toHaveProperty('@react-native-async-storage/async-storage');
  });

  it('installs no web-only SDK', () => {
    expect(allDeps).not.toHaveProperty('@sentry/nextjs');
    expect(allDeps).not.toHaveProperty('posthog-js');
    expect(allDeps).not.toHaveProperty('@supabase/ssr');
  });

  it('keeps the app-store release steps a mobile project does need', () => {
    expect(mobile.readFile('checklists/release.md')).toMatch(/build number/i);
    expect(mobile.readFile('docs/release.md')).toMatch(/build number/i);
  });

  it('names client variables with the prefix Expo actually inlines', () => {
    const env = mobile.readFile('.env.example');
    expect(env).toContain('EXPO_PUBLIC_SUPABASE_URL');
    expect(env).not.toContain('NEXT_PUBLIC_');
    expect(env).not.toContain('VITE_');
  });
});

describe('the env prefix mechanism itself', () => {
  it('leaves no unrendered tag in a generated .env.example', () => {
    for (const file of ['nextjs-full-stack.json', 'ci-full-stack.json']) {
      const env = run(read(file)).readFile('.env.example');
      expect(env, `${file} left a template tag in .env.example`).not.toMatch(/\{\{/);
    }
  });

  it('warns when a stack builds two client bundles, rather than silently picking one', () => {
    const hybrid: Selection = {
      projectName: 'Hybrid',
      choices: { target: 'hybrid', mobile: 'expo', web: 'nextjs', backend: 'supabase' },
    };
    const { result, readFile } = run(hybrid);

    // One row per key is all `.env.example` can carry, so the other app's name
    // for the same value has to be added by hand — say so rather than ship a
    // variable one of the two bundles will always read as undefined.
    expect(result.warnings.join('\n')).toMatch(/more than one client bundle/);
    const env = readFile('.env.example');
    expect(env).toContain('SUPABASE_URL');
    expect(env).not.toMatch(/\{\{/);
  });
});
