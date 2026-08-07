import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { mergeChoice, parseAddFlags, replaceChoice } from '../src/cli/add.js';
import { GeneratorError } from '../src/core/resolve/errors.js';
import { preservedPaths, readFingerprints, removablePaths } from '../src/core/vfs/preserve.js';
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
    expect((error as GeneratorError).hint).toMatch(/--replace/);
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

describe('replaceChoice', () => {
  it('fills an empty single-select category, reporting nothing to replace', () => {
    const stripe = makeModule({ id: 'stripe', category: 'payments' });
    const selection = select({});

    const oldId = replaceChoice(selection, stripe, single);

    expect(selection.choices.payments).toBe('stripe');
    expect(oldId).toBeUndefined();
  });

  it('fills a single-select category answered "none", reporting nothing to replace', () => {
    const stripe = makeModule({ id: 'stripe', category: 'payments' });
    const selection = select({ payments: 'none' });

    const oldId = replaceChoice(selection, stripe, single);

    expect(selection.choices.payments).toBe('stripe');
    expect(oldId).toBeUndefined();
  });

  it('swaps an already-answered single-select category, returning the old id', () => {
    const revenuecat = makeModule({ id: 'revenuecat', category: 'payments' });
    const selection = select({ payments: 'stripe' });

    const oldId = replaceChoice(selection, revenuecat, single);

    expect(selection.choices.payments).toBe('revenuecat');
    expect(oldId).toBe('stripe');
  });

  it('refuses to "replace" what is already selected', () => {
    const stripe = makeModule({ id: 'stripe', category: 'payments' });
    const selection = select({ payments: 'stripe' });

    expect(() => replaceChoice(selection, stripe, single)).toThrow(/already part of this project/);
    // Refusing must not have mutated the selection.
    expect(selection.choices.payments).toBe('stripe');
  });

  it('refuses a multi-select category — --replace does not apply to it', () => {
    const posthog = makeModule({ id: 'posthog', category: 'analytics' });
    const selection = select({ analytics: ['sentry-analytics'] });

    let error: unknown;
    try {
      replaceChoice(selection, posthog, multi);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(GeneratorError);
    expect((error as GeneratorError).code).toBe('INVALID_CONFIG');
    // Refusing must not have mutated the selection.
    expect(selection.choices.analytics).toEqual(['sentry-analytics']);
  });
});

describe('parseAddFlags', () => {
  it('reads the technology id as the first bare argument', () => {
    expect(parseAddFlags(['stripe'])).toMatchObject({
      moduleId: 'stripe',
      dryRun: false,
      help: false,
    });
  });

  it('reads --dir and --dry-run', () => {
    expect(parseAddFlags(['stripe', '--dir', './my-app', '--dry-run'])).toMatchObject({
      moduleId: 'stripe',
      dir: './my-app',
      dryRun: true,
    });
  });

  it('reads --replace', () => {
    expect(parseAddFlags(['supabase', '--replace']).replace).toBe(true);
    expect(parseAddFlags(['supabase']).replace).toBe(false);
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
    fs.writeFileSync(
      setupPath,
      `${fs.readFileSync(setupPath, 'utf8')}\n\n## A note I added\n`,
      'utf8',
    );

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
    expect(fs.existsSync(path.join(targetDir, '.claude', 'skills', 'sentry', 'SKILL.md'))).toBe(
      true,
    );
  });
});

/**
 * Mirrors `runAdd`'s --replace branch in src/cli/index.ts step for step, so
 * these tests exercise the same sequence a real `add <id> --replace` run
 * does: generate against the already-swapped selection, refuse outright if
 * any of the old module's own files were hand-edited, otherwise delete them
 * before flushing the rest (new/updated content, unrelated hand-edits
 * preserved as always).
 */
function applyReplace(
  targetDir: string,
  registry: ReturnType<typeof loadRegistry>,
  selection: Selection,
  dryRun = false,
) {
  const configFile = path.join(targetDir, CONFIG_FILENAME);
  const recorded = readFingerprints(configFile);

  const result = generate({ rootDir: ROOT, targetDir, selection, builders, registry });
  const newFiles = result.vfs.snapshot().files;
  const { safe, handEdited } = removablePaths(targetDir, recorded, newFiles);

  if (handEdited.length > 0) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      `Cannot replace — ${handEdited.length} file(s) hand-edited since generation.`,
      `Move or remove ${handEdited.join(', ')} yourself, then try again. Nothing was changed.`,
    );
  }

  if (!dryRun) {
    for (const relative of safe)
      fs.rmSync(path.join(targetDir, ...relative.split('/')), { force: true });
  }

  const preserve = new Set(preservedPaths(targetDir, newFiles, recorded));
  const flushed = result.vfs.flush(targetDir, { dryRun, force: true, preserve });

  return { removed: safe, flushed };
}

describe('add --replace, end to end', () => {
  const dirs: string[] = [];

  afterEach(() => {
    while (dirs.length > 0) fs.rmSync(dirs.pop() as string, { recursive: true, force: true });
  });

  function firebaseProject(): { targetDir: string; registry: ReturnType<typeof loadRegistry> } {
    const registry = loadRegistry(ROOT);
    const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'replace-test-'));
    dirs.push(targetDir);

    const initial = select({ target: 'web', web: 'nextjs', backend: 'firebase' });
    const first = generate({ rootDir: ROOT, targetDir, selection: initial, builders, registry });
    first.vfs.flush(targetDir, { force: true });

    return { targetDir, registry };
  }

  function swapToSupabase(registry: ReturnType<typeof loadRegistry>, targetDir: string): Selection {
    const configFile = path.join(targetDir, CONFIG_FILENAME);
    const selection = JSON.parse(fs.readFileSync(configFile, 'utf8')) as Selection;
    const supabase = registry.byId.get('supabase');
    if (!supabase) throw new Error('fixture expects a "supabase" module to be installed');
    const category = registry.categories.find((entry) => entry.id === supabase.manifest.category);
    if (!category)
      throw new Error(`fixture expects a category for "${supabase.manifest.category}"`);

    const oldId = replaceChoice(selection, supabase, category);
    expect(oldId).toBe('firebase');
    return selection;
  }

  it("deletes the old module's exclusive files and writes the new module's, with no hand-edits present", () => {
    const { targetDir, registry } = firebaseProject();
    expect(fs.existsSync(path.join(targetDir, '.cursor/rules/firebase.mdc'))).toBe(true);

    const selection = swapToSupabase(registry, targetDir);
    const { removed, flushed } = applyReplace(targetDir, registry, selection);

    expect(removed).toContain('.cursor/rules/firebase.mdc');
    expect(removed).toContain('.claude/skills/firebase/SKILL.md');
    expect(fs.existsSync(path.join(targetDir, '.cursor/rules/firebase.mdc'))).toBe(false);
    // The file is deleted; the (now-empty) directory is deliberately left
    // alone — cleaning up empty scaffolding directories is out of scope, see
    // the note in ARCHITECTURE.md / the --replace section of README.md.
    expect(fs.existsSync(path.join(targetDir, '.claude/skills/firebase/SKILL.md'))).toBe(false);

    expect(flushed.files).toContain('.cursor/rules/supabase.mdc');
    expect(fs.existsSync(path.join(targetDir, '.cursor/rules/supabase.mdc'))).toBe(true);

    // Merged output regenerated from scratch reflects only what's still selected.
    const pkg = JSON.parse(fs.readFileSync(path.join(targetDir, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(pkg.dependencies['@supabase/supabase-js']).toBeDefined();
    expect(pkg.dependencies.firebase).toBeUndefined();
    expect(pkg.devDependencies['firebase-tools']).toBeUndefined();

    const env = fs.readFileSync(path.join(targetDir, '.env.example'), 'utf8');
    expect(env).toContain('EXPO_PUBLIC_SUPABASE_URL');
    expect(env).not.toContain('FIREBASE');

    const config = JSON.parse(
      fs.readFileSync(path.join(targetDir, CONFIG_FILENAME), 'utf8'),
    ) as Selection;
    expect(config.choices.backend).toBe('supabase');
  });

  it("refuses the whole replace when one of the old module's files was hand-edited, changing nothing", () => {
    const { targetDir, registry } = firebaseProject();
    const rulePath = path.join(targetDir, '.cursor/rules/firebase.mdc');
    fs.writeFileSync(rulePath, `${fs.readFileSync(rulePath, 'utf8')}\n\n## my note\n`, 'utf8');
    const configBefore = fs.readFileSync(path.join(targetDir, CONFIG_FILENAME), 'utf8');

    const selection = swapToSupabase(registry, targetDir);

    expect(() => applyReplace(targetDir, registry, selection)).toThrow(GeneratorError);
    expect(() => applyReplace(targetDir, registry, selection)).toThrow(/hand-edited/);

    // Nothing changed: the hand-edited file, everything else, and the config
    // (still describing the old selection) are exactly as this test left them.
    expect(fs.readFileSync(rulePath, 'utf8')).toContain('## my note');
    expect(fs.existsSync(path.join(targetDir, '.cursor/rules/supabase.mdc'))).toBe(false);
    expect(fs.readFileSync(path.join(targetDir, CONFIG_FILENAME), 'utf8')).toBe(configBefore);
  });

  it('does not touch a hand-edited file unrelated to the swapped category', () => {
    const { targetDir, registry } = firebaseProject();
    const setupPath = path.join(targetDir, 'docs/setup.md');
    fs.writeFileSync(
      setupPath,
      `${fs.readFileSync(setupPath, 'utf8')}\n\n## unrelated note\n`,
      'utf8',
    );

    const selection = swapToSupabase(registry, targetDir);
    const { flushed } = applyReplace(targetDir, registry, selection);

    expect(flushed.preserved).toContain('docs/setup.md');
    expect(fs.readFileSync(setupPath, 'utf8')).toContain('## unrelated note');
  });

  it('--dry-run reports what would be removed and added without touching disk', () => {
    const { targetDir, registry } = firebaseProject();
    const rulePath = path.join(targetDir, '.cursor/rules/firebase.mdc');
    const mtimeBefore = fs.statSync(rulePath).mtimeMs;
    const configBefore = fs.readFileSync(path.join(targetDir, CONFIG_FILENAME), 'utf8');

    const selection = swapToSupabase(registry, targetDir);
    const { removed, flushed } = applyReplace(targetDir, registry, selection, true);

    expect(removed).toContain('.cursor/rules/firebase.mdc');
    expect(flushed.files).toContain('.cursor/rules/supabase.mdc');

    expect(fs.existsSync(path.join(targetDir, '.cursor/rules/firebase.mdc'))).toBe(true);
    expect(fs.statSync(rulePath).mtimeMs).toBe(mtimeBefore);
    expect(fs.existsSync(path.join(targetDir, '.cursor/rules/supabase.mdc'))).toBe(false);
    expect(fs.readFileSync(path.join(targetDir, CONFIG_FILENAME), 'utf8')).toBe(configBefore);
  });
});
