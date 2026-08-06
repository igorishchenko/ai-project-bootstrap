import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { mergeChoice, parseAddFlags } from '../src/cli/add.js';
import { GeneratorError } from '../src/core/resolve/errors.js';
import { preservedPaths, readFingerprints } from '../src/core/vfs/preserve.js';
import { generate } from '../src/core/pipeline/generate.js';
import { loadRegistry } from '../src/core/registry/loadModules.js';
import { builders } from '../src/builders/index.js';
import { CONFIG_FILENAME } from '../src/builders/configBuilder.js';
import type { CategoryQuestion, Selection } from '../src/core/types.js';
import { makeModule } from './helpers/modules.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function select(choices: Selection['choices']): Selection {
  return { projectName: 'Test', choices };
}

const single: CategoryQuestion = {
  id: 'payments',
  label: 'Payments',
  type: 'single',
  required: false,
  allowNone: true,
  order: 50,
};

const multi: CategoryQuestion = {
  id: 'analytics',
  label: 'Analytics',
  type: 'multi',
  required: false,
  allowNone: true,
  order: 60,
};

describe('mergeChoice', () => {
  it('fills an empty single-select category', () => {
    const stripe = makeModule({ id: 'stripe', category: 'payments' });
    const selection = select({});

    mergeChoice(selection, stripe, single);

    expect(selection.choices.payments).toBe('stripe');
  });

  it('fills a single-select category answered "none"', () => {
    const stripe = makeModule({ id: 'stripe', category: 'payments' });
    const selection = select({ payments: 'none' });

    mergeChoice(selection, stripe, single);

    expect(selection.choices.payments).toBe('stripe');
  });

  it('refuses to add what is already selected, single-select', () => {
    const stripe = makeModule({ id: 'stripe', category: 'payments' });
    const selection = select({ payments: 'stripe' });

    expect(() => mergeChoice(selection, stripe, single)).toThrow(GeneratorError);
    expect(() => mergeChoice(selection, stripe, single)).toThrow(/already part of this project/);
  });

  it('refuses to swap an already-answered single-select category', () => {
    const revenuecat = makeModule({ id: 'revenuecat', category: 'payments' });
    const selection = select({ payments: 'stripe' });

    let error: unknown;
    try {
      mergeChoice(selection, revenuecat, single);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(GeneratorError);
    expect((error as GeneratorError).code).toBe('CATEGORY_ALREADY_ANSWERED');
    expect((error as GeneratorError).hint).toMatch(/leave stripe's/);
    // Refusing must not have mutated the selection.
    expect(selection.choices.payments).toBe('stripe');
  });

  it('appends to a multi-select category', () => {
    const posthog = makeModule({ id: 'posthog', category: 'analytics' });
    const selection = select({ analytics: ['sentry-analytics'] });

    mergeChoice(selection, posthog, multi);

    expect(selection.choices.analytics).toEqual(['sentry-analytics', 'posthog']);
  });

  it('starts a multi-select category from empty', () => {
    const posthog = makeModule({ id: 'posthog', category: 'analytics' });
    const selection = select({});

    mergeChoice(selection, posthog, multi);

    expect(selection.choices.analytics).toEqual(['posthog']);
  });

  it('refuses to add what is already in a multi-select category', () => {
    const posthog = makeModule({ id: 'posthog', category: 'analytics' });
    const selection = select({ analytics: ['posthog'] });

    expect(() => mergeChoice(selection, posthog, multi)).toThrow(/already part of this project/);
  });
});

describe('parseAddFlags', () => {
  it('reads the technology id as the first bare argument', () => {
    expect(parseAddFlags(['stripe'])).toMatchObject({ moduleId: 'stripe', dryRun: false, help: false });
  });

  it('reads --dir and --dry-run', () => {
    expect(parseAddFlags(['stripe', '--dir', './my-app', '--dry-run'])).toMatchObject({
      moduleId: 'stripe',
      dir: './my-app',
      dryRun: true,
    });
  });

  it('reads -h and --help', () => {
    expect(parseAddFlags(['-h']).help).toBe(true);
    expect(parseAddFlags(['--help']).help).toBe(true);
  });

  it('rejects a --dir with no value', () => {
    expect(() => parseAddFlags(['stripe', '--dir'])).toThrow(GeneratorError);
  });

  it('rejects an unknown flag', () => {
    expect(() => parseAddFlags(['stripe', '--nope'])).toThrow(GeneratorError);
  });
});

describe('add, end to end', () => {
  const dirs: string[] = [];

  afterEach(() => {
    while (dirs.length > 0) fs.rmSync(dirs.pop() as string, { recursive: true, force: true });
  });

  it('adds a new technology to a generated project without touching hand-edited files', () => {
    const registry = loadRegistry(ROOT);
    const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'add-test-'));
    dirs.push(targetDir);

    const initial = select({
      target: 'mobile',
      mobile: 'expo',
      backend: 'supabase',
      payments: 'revenuecat',
    });

    const first = generate({ rootDir: ROOT, targetDir, selection: initial, builders, registry });
    first.vfs.flush(targetDir, { force: true });

    // The user customises a generated file after the fact.
    const setupPath = path.join(targetDir, 'docs', 'setup.md');
    fs.writeFileSync(setupPath, `${fs.readFileSync(setupPath, 'utf8')}\n\n## A note I added\n`, 'utf8');

    const configFile = path.join(targetDir, CONFIG_FILENAME);
    const sentry = registry.byId.get('sentry');
    if (!sentry) throw new Error('fixture expects a "sentry" module to be installed');
    const category = registry.categories.find((entry) => entry.id === sentry.manifest.category);
    if (!category) throw new Error(`fixture expects a category for "${sentry.manifest.category}"`);

    const selection = JSON.parse(fs.readFileSync(configFile, 'utf8')) as Selection;
    mergeChoice(selection, sentry, category);

    const second = generate({ rootDir: ROOT, targetDir, selection, builders, registry });
    const preserve = new Set(
      preservedPaths(targetDir, second.vfs.snapshot().files, readFingerprints(configFile)),
    );
    const flushed = second.vfs.flush(targetDir, { force: true, preserve });

    expect(flushed.files).toContain('.cursor/rules/sentry.mdc');
    expect(flushed.files).toContain('.claude/skills/sentry/SKILL.md');
    expect(flushed.preserved).toContain('docs/setup.md');

    // The hand-edit survived on disk, byte for byte.
    expect(fs.readFileSync(setupPath, 'utf8')).toContain('## A note I added');
    expect(fs.existsSync(path.join(targetDir, '.claude', 'skills', 'sentry', 'SKILL.md'))).toBe(true);
  });
});
