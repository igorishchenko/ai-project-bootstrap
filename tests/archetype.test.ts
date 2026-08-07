import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { generate } from '../src/core/pipeline/generate.js';
import { slugify } from '../src/core/pipeline/buildContext.js';
import { loadRegistry } from '../src/core/registry/loadModules.js';
import { loadArchetype } from '../src/core/registry/loadArchetypes.js';
import { builders } from '../src/builders/index.js';
import { applyArchetype } from '../src/cli/archetype.js';
import type { Selection } from '../src/core/types.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registry = loadRegistry(ROOT);

/** Exactly what `index.ts` does for `--archetype habit-tracker`, without going through the CLI. */
function generateFromArchetype(projectName: string) {
  const archetype = loadArchetype(ROOT, 'habit-tracker', registry.byId, registry.categories);
  const selection: Selection = { projectName, choices: archetype.manifest.choices };

  const result = generate({
    rootDir: ROOT,
    targetDir: '/virtual/out',
    selection,
    builders,
    registry,
  });
  applyArchetype(result.vfs, archetype, { projectName, projectSlug: slugify(projectName) });

  return { archetype, result };
}

describe('habit-tracker archetype, end to end', () => {
  const { result } = generateFromArchetype('Habit App');
  const files = result.vfs.snapshot().files;
  const read = (file: string): string => {
    const content = result.vfs.read(file);
    expect(content, `${file} should exist`).toBeDefined();
    return content as string;
  };

  it('resolves the preset stack (Expo, Supabase, Supabase Auth, Dark Theme) with no warnings', () => {
    expect(result.moduleNames).toEqual(
      expect.arrayContaining(['Expo', 'React Native', 'Supabase', 'Supabase Auth', 'Dark Theme']),
    );
    expect(result.warnings).toEqual([]);
  });

  it('generates the normal doc set alongside the archetype content', () => {
    for (const doc of [
      'docs/setup.md',
      'docs/architecture.md',
      'docs/roadmap.md',
      'docs/costs.md',
    ]) {
      expect(files).toContain(doc);
    }
  });

  it('writes every scaffold file the archetype declares', () => {
    for (const path of [
      'App.tsx',
      'supabase/migrations/20260807120000_habit_tracker_schema.sql',
      'src/services/supabase/client.ts',
      'src/hooks/auth/useAuth.ts',
      'src/features/auth/authClient.ts',
      'src/features/auth/screens/SignInScreen.tsx',
      'src/features/habits/habitsClient.ts',
      'src/features/habits/streak.ts',
      'src/features/habits/useHabits.ts',
      'src/features/habits/screens/HabitListScreen.tsx',
      'src/features/habits/screens/AddHabitScreen.tsx',
      'docs/starter-template.md',
    ]) {
      expect(files, path).toContain(path);
    }
  });

  it('interpolates the project name into scaffold content', () => {
    expect(read('src/features/auth/screens/SignInScreen.tsx')).toContain('Habit App');
    expect(read('docs/starter-template.md')).toContain('Habit App');
  });

  it('never leaks the generator template syntax into scaffold output', () => {
    for (const path of files.filter((file) => file.startsWith('src/') || file === 'App.tsx')) {
      expect(read(path), path).not.toMatch(/\{\{[a-zA-Z#/]/);
    }
  });

  it('references only the real theme module API (useTheme, themeTokens) the dark-theme module ships', () => {
    const provider = read('src/theme/ThemeProvider.tsx');
    expect(provider).toContain('export function useTheme');
    expect(read('src/features/habits/screens/HabitListScreen.tsx')).toContain(
      "from '../../../theme/ThemeProvider'",
    );
  });

  it('merges the Expo entry point into package.json without clobbering the rest of it', () => {
    const pkg = JSON.parse(read('package.json')) as {
      main?: string;
      name?: string;
      dependencies?: object;
    };
    expect(pkg.main).toBe('node_modules/expo/AppEntry.js');
    expect(pkg.name).toBe('habit-app');
    expect(pkg.dependencies).toBeDefined();
  });

  it('produces a schema with RLS enabled and a policy on every table', () => {
    const sql = read('supabase/migrations/20260807120000_habit_tracker_schema.sql');
    expect(sql).toContain('create table if not exists habits');
    expect(sql).toContain('create table if not exists habit_checkins');
    expect(sql.match(/enable row level security/g)).toHaveLength(2);
    expect(sql.match(/create policy/g)).toHaveLength(2);
  });

  it('estimates a real cost for the paid part of the stack', () => {
    expect(result.costSummary.estimated.map((item) => item.moduleId)).toContain('supabase');
    expect(result.costSummary.totalUsd).toBeGreaterThan(0);
  });
});

describe('habit-tracker archetype, generated a second time', () => {
  it('is deterministic — the same project name produces byte-identical scaffold output', () => {
    const first = generateFromArchetype('Same App').result.vfs.entries();
    const second = generateFromArchetype('Same App').result.vfs.entries();
    expect(first).toEqual(second);
  });
});
