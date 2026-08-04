import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { CategoryQuestion } from '../src/core/types.js';
import { makeModule } from './helpers/modules.js';

/**
 * The wizard must never offer an option it would later reject. Answering every
 * question and only then being told the combination is invalid is not a choice.
 */
const asked: Array<{ message: string; values: string[] }> = [];
let answers: Record<string, string | string[]> = {};

vi.mock('@clack/prompts', () => ({
  isCancel: () => false,
  text: async () => 'Test Project',
  select: async ({ message, options }: { message: string; options: Array<{ value: string }> }) => {
    asked.push({ message, values: options.map((option) => option.value) });
    return answers[message] ?? options[0]?.value;
  },
  multiselect: async ({
    message,
    options,
  }: {
    message: string;
    options: Array<{ value: string }>;
  }) => {
    asked.push({ message, values: options.map((option) => option.value) });
    return answers[message] ?? [];
  },
}));

const { runWizard } = await import('../src/cli/wizard.js');

const categories: CategoryQuestion[] = [
  { id: 'backend', label: 'Backend', type: 'single', required: false, allowNone: true, order: 10 },
  { id: 'database', label: 'Database', type: 'single', required: false, allowNone: true, order: 20 },
  { id: 'auth', label: 'Auth', type: 'single', required: false, allowNone: true, order: 30 },
  {
    id: 'analytics',
    label: 'Analytics',
    type: 'multi',
    required: false,
    allowNone: true,
    order: 40,
  },
];

const modules = [
  makeModule({ id: 'supabase', name: 'Supabase', category: 'backend' }),
  makeModule({ id: 'postgresql', name: 'Postgres', category: 'database', conflicts: ['supabase'] }),
  makeModule({ id: 'sqlite', name: 'SQLite', category: 'database' }),
  makeModule({ id: 'supabase-auth', name: 'Supabase Auth', category: 'auth', requires: ['supabase'] }),
  makeModule({ id: 'clerk', name: 'Clerk', category: 'auth', conflicts: ['supabase-auth'] }),
  makeModule({ id: 'posthog', name: 'PostHog', category: 'analytics' }),
];

const optionsFor = (label: string): string[] =>
  asked.find((entry) => entry.message === label)?.values ?? [];

beforeEach(() => {
  asked.length = 0;
  answers = {};
});

describe('runWizard', () => {
  it('hides an option that conflicts with an earlier answer', async () => {
    answers = { Backend: 'supabase' };

    await runWizard({ categories, modules, name: 'Test' });

    expect(optionsFor('Database')).not.toContain('postgresql');
    expect(optionsFor('Database')).toContain('sqlite');
  });

  it('keeps the option when nothing conflicts with it', async () => {
    answers = { Backend: 'none' };

    await runWizard({ categories, modules, name: 'Test' });

    expect(optionsFor('Database')).toContain('postgresql');
  });

  it('applies conflicts declared in the other direction', async () => {
    // postgresql declares the conflict; supabase says nothing about it.
    answers = { Backend: 'none', Database: 'postgresql' };

    const selection = await runWizard({ categories, modules, name: 'Test' });

    expect(selection.choices.database).toBe('postgresql');
  });

  it('accounts for modules pulled in as prerequisites', async () => {
    // Choosing supabase-auth would require supabase, which conflicts with
    // postgresql — so picking postgres first must remove it from auth.
    answers = { Backend: 'none', Database: 'postgresql' };

    await runWizard({ categories, modules, name: 'Test' });

    expect(optionsFor('Auth')).not.toContain('supabase-auth');
    expect(optionsFor('Auth')).toContain('clerk');
  });

  it('skips a category left with no compatible options', async () => {
    const narrow = [
      makeModule({ id: 'supabase', name: 'Supabase', category: 'backend' }),
      makeModule({ id: 'postgresql', name: 'Postgres', category: 'database', conflicts: ['supabase'] }),
    ];
    answers = { Backend: 'supabase' };

    await runWizard({ categories, modules: narrow, name: 'Test' });

    expect(asked.map((entry) => entry.message)).not.toContain('Database');
  });

  it('offers None on every question, single and multi select alike', async () => {
    await runWizard({ categories, modules, name: 'Test' });

    for (const label of ['Backend', 'Database', 'Auth', 'Analytics']) {
      expect(optionsFor(label), `${label} should offer None`).toContain('none');
    }
  });

  it('does not persist None as if it were a module', async () => {
    answers = { Backend: 'none', Database: 'none', Auth: 'none', Analytics: ['none'] };

    const selection = await runWizard({ categories, modules, name: 'Test' });

    expect(selection.choices.backend).toBe('none');
    // A multi-select answer of "None" becomes an empty list, not ["none"].
    expect(selection.choices.analytics).toEqual([]);
  });

  it('never offers a combination the resolver would reject', async () => {
    answers = { Backend: 'supabase' };

    const selection = await runWizard({ categories, modules, name: 'Test' });

    // Whatever the wizard produced must survive resolution.
    const { resolveSelection } = await import('../src/core/resolve/resolveSelection.js');
    const byId = new Map(modules.map((module) => [module.manifest.id, module]));

    expect(() => resolveSelection(selection, byId)).not.toThrow();
  });
});
