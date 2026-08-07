import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { generate } from '../src/core/pipeline/generate.js';
import { loadRegistry } from '../src/core/registry/loadModules.js';
import { builders } from '../src/builders/index.js';
import type { Selection } from '../src/core/types.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registry = loadRegistry(ROOT);

function select(choices: Selection['choices']): Selection {
  return { projectName: 'Demo App', choices };
}

function run(selection: Selection) {
  const result = generate({
    rootDir: ROOT,
    targetDir: '/virtual/out',
    selection,
    builders,
    registry,
  });
  const read = (file: string): string => {
    const content = result.vfs.read(file);
    expect(content, `${file} should exist`).toBeDefined();
    return content as string;
  };
  return { result, read };
}

const MOBILE_FEATURES = select({
  target: 'mobile',
  mobile: 'expo',
  features: ['dark-theme', 'onboarding', 'localization'],
});

const WEB_FEATURES = select({
  target: 'web',
  web: 'nextjs',
  features: ['dark-theme', 'onboarding', 'localization'],
});

describe('features category', () => {
  it('resolves all three modules together, no conflicts, no warnings', () => {
    const { result } = run(MOBILE_FEATURES);
    expect(result.moduleNames).toEqual(
      expect.arrayContaining(['Dark Theme', 'Onboarding Flow', 'Localization (i18n)']),
    );
    expect(result.warnings).toEqual([]);
  });

  it('merges the async-storage dependency both dark-theme and onboarding declare, without a version conflict warning', () => {
    const { result, read } = run(MOBILE_FEATURES);
    expect(result.warnings.join('\n')).not.toContain('async-storage');

    const pkg = JSON.parse(read('package.json')) as { dependencies?: Record<string, string> };
    expect(pkg.dependencies?.['@react-native-async-storage/async-storage']).toBeDefined();
  });

  it('shows up in the roadmap and architecture diagram automatically, being just another category', () => {
    const { read } = run(MOBILE_FEATURES);
    expect(read('docs/roadmap.md')).toContain('Dark Theme');
    expect(read('docs/architecture.md')).toContain('mod_dark_theme');
  });
});

describe('dark-theme', () => {
  it('scaffolds the React Native implementation for a mobile project', () => {
    const { read } = run(MOBILE_FEATURES);
    const provider = read('src/theme/ThemeProvider.tsx');

    expect(provider).toContain("from 'react-native'");
    expect(provider).toContain('AsyncStorage');
    expect(provider).not.toContain("'use client'");
    expect(provider).not.toContain('matchMedia');
  });

  it('scaffolds the web implementation for a web project', () => {
    const { read } = run(WEB_FEATURES);
    const provider = read('src/theme/ThemeProvider.tsx');

    expect(provider).toContain("'use client'");
    expect(provider).toContain('matchMedia');
    expect(provider).not.toContain("from 'react-native'");
    expect(provider).not.toContain('AsyncStorage');
  });

  it('ships matching light/dark token keys', () => {
    const { read } = run(MOBILE_FEATURES);
    const tokens = read('src/theme/tokens.ts');
    const lightKeys = [...tokens.matchAll(/background|surface|text|textMuted|border|accent/g)];
    expect(lightKeys.length).toBeGreaterThan(0);
  });
});

describe('onboarding', () => {
  it('persists via AsyncStorage on mobile and localStorage on web', () => {
    const mobile = run(MOBILE_FEATURES).read('src/features/onboarding/useOnboarding.ts');
    expect(mobile).toContain('AsyncStorage');
    expect(mobile).not.toContain('localStorage');

    const web = run(WEB_FEATURES).read('src/features/onboarding/useOnboarding.ts');
    expect(web).toContain('localStorage');
    expect(web).not.toContain('AsyncStorage');
  });

  it('renders a well-formed OnboardingFlow component for each platform', () => {
    const mobile = run(MOBILE_FEATURES).read('src/features/onboarding/OnboardingFlow.tsx');
    expect(mobile).toContain("from 'react-native'");

    const web = run(WEB_FEATURES).read('src/features/onboarding/OnboardingFlow.tsx');
    expect(web).toContain("'use client'");
    expect(web).not.toContain("from 'react-native'");
  });
});

describe('localization', () => {
  it('ships two valid, matching-shape locale files using single-brace interpolation', () => {
    const { read } = run(MOBILE_FEATURES);
    const en = JSON.parse(read('src/i18n/locales/en.json')) as Record<string, unknown>;
    const es = JSON.parse(read('src/i18n/locales/es.json')) as Record<string, unknown>;

    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
    expect(JSON.stringify(en)).toContain('{name}');
    // The generator's own {{...}} templating must never have consumed these —
    // that would silently delete the interpolated value instead of failing loudly.
    expect(JSON.stringify(en)).not.toContain('{{');
  });

  it('configures matching single-brace interpolation in the i18next init', () => {
    const { read } = run(MOBILE_FEATURES);
    const init = read('src/i18n/index.ts');
    expect(init).toContain("prefix: '{'");
    expect(init).toContain("suffix: '}'");
  });

  it('never leaks a raw {{...}} into generated docs or code — the generator would silently eat it', () => {
    // Explaining "double-brace interpolation" in prose is exactly the kind
    // of sentence that accidentally becomes a real, silently-swallowed tag —
    // this caught a real instance of it during development.
    const { read } = run(MOBILE_FEATURES);
    expect(read('src/i18n/index.ts')).not.toContain('{{');
    expect(read('docs/setup.md')).not.toMatch(/\{\{[a-zA-Z]/);
  });

  it('uses expo-localization on mobile and the browser language detector on web', () => {
    const mobile = run(MOBILE_FEATURES).read('src/i18n/index.ts');
    expect(mobile).toContain('expo-localization');

    const web = run(WEB_FEATURES).read('src/i18n/index.ts');
    expect(web).toContain('i18next-browser-languagedetector');
  });
});
