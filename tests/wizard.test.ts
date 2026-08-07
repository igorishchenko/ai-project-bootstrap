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
  {
    id: 'database',
    label: 'Database',
    type: 'single',
    required: false,
    allowNone: true,
    order: 20,
  },
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
  makeModule({
    id: 'supabase-auth',
    name: 'Supabase Auth',
    category: 'auth',
    requires: ['supabase'],
  }),
  makeModule({ id: 'clerk', name: 'Clerk', category: 'auth', conflicts: ['supabase-auth'] }),
  makeModule({ id: 'posthog', name: 'PostHog', category: 'analytics' }),
];

/** A target question that reveals the mobile and/or web questions. */
const targeted: CategoryQuestion[] = [
  {
    id: 'target',
    label: 'What are you building?',
    type: 'single',
    required: true,
    allowNone: false,
    order: 5,
    choices: [
      { value: 'mobile', label: 'Mobile app' },
      { value: 'web', label: 'Web app' },
      { value: 'hybrid', label: 'Both' },
    ],
  },
  {
    id: 'mobile',
    label: 'Mobile platform',
    type: 'single',
    required: false,
    allowNone: true,
    order: 10,
    showWhen: { target: ['mobile', 'hybrid'] },
  },
  {
    id: 'web',
    label: 'Web framework',
    type: 'single',
    required: false,
    allowNone: true,
    order: 15,
    showWhen: { target: ['web', 'hybrid'] },
  },
];

const platforms = [
  makeModule({ id: 'rn', name: 'RN', category: 'mobile' }),
  makeModule({ id: 'nextish', name: 'Nextish', category: 'web' }),
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
      makeModule({
        id: 'postgresql',
        name: 'Postgres',
        category: 'database',
        conflicts: ['supabase'],
      }),
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

  it('asks only the mobile question for a mobile target', async () => {
    answers = { 'What are you building?': 'mobile' };

    await runWizard({ categories: targeted, modules: platforms, name: 'Test' });
    const asked_ = asked.map((entry) => entry.message);

    expect(asked_).toContain('Mobile platform');
    expect(asked_).not.toContain('Web framework');
  });

  it('asks only the web question for a web target', async () => {
    answers = { 'What are you building?': 'web' };

    await runWizard({ categories: targeted, modules: platforms, name: 'Test' });
    const asked_ = asked.map((entry) => entry.message);

    expect(asked_).toContain('Web framework');
    expect(asked_).not.toContain('Mobile platform');
  });

  it('asks mobile then web for a hybrid target, in that order', async () => {
    answers = { 'What are you building?': 'hybrid' };

    const selection = await runWizard({ categories: targeted, modules: platforms, name: 'Test' });
    const asked_ = asked.map((entry) => entry.message);

    expect(asked_.indexOf('Mobile platform')).toBeGreaterThan(-1);
    expect(asked_.indexOf('Web framework')).toBeGreaterThan(asked_.indexOf('Mobile platform'));
    // The gating answer is recorded but is not a module.
    expect(selection.choices.target).toBe('hybrid');
  });

  it('records a multi-select gating answer (e.g. which AI tools) as an array, not a module', async () => {
    const withAiTools: CategoryQuestion[] = [
      {
        id: 'aiTools',
        label: 'Which AI coding tools do you use?',
        type: 'multi',
        required: false,
        allowNone: false,
        order: 1,
        defaultChoices: ['cursor', 'claude'],
        choices: [
          { value: 'cursor', label: 'Cursor' },
          { value: 'claude', label: 'Claude Code' },
          { value: 'copilot', label: 'GitHub Copilot' },
        ],
      },
      ...targeted,
    ];
    answers = {
      'Which AI coding tools do you use?': ['copilot'],
      'What are you building?': 'mobile',
    };

    const selection = await runWizard({
      categories: withAiTools,
      modules: platforms,
      name: 'Test',
    });

    expect(selection.choices.aiTools).toEqual(['copilot']);
  });

  it("accepts a multi-select gating question's defaultChoices under --yes", async () => {
    const withAiTools: CategoryQuestion[] = [
      {
        id: 'aiTools',
        label: 'Which AI coding tools do you use?',
        type: 'multi',
        required: false,
        allowNone: false,
        order: 1,
        defaultChoices: ['cursor', 'claude'],
        choices: [
          { value: 'cursor', label: 'Cursor' },
          { value: 'claude', label: 'Claude Code' },
        ],
      },
      ...targeted,
    ];

    const selection = await runWizard({
      categories: withAiTools,
      modules: platforms,
      name: 'Test',
      acceptDefaults: true,
    });

    expect(selection.choices.aiTools).toEqual(['cursor', 'claude']);
    // --yes must never prompt at all.
    expect(asked).toEqual([]);
  });

  it('does not offer a module that would contradict an earlier answer', async () => {
    // Choosing web-only means no mobile platform, so a mobile-only tool must
    // not be offered — accepting it would silently add React Native.
    const withMobileTool = [
      ...platforms,
      makeModule({ id: 'e2e', name: 'E2E', category: 'testing', requires: ['rn'] }),
      makeModule({ id: 'unit', name: 'Unit', category: 'testing' }),
    ];
    const categoriesWithTesting = [
      ...targeted,
      {
        id: 'testing',
        label: 'Testing',
        type: 'multi' as const,
        required: false,
        allowNone: true,
        order: 50,
      },
    ];
    answers = { 'What are you building?': 'web', 'Web framework': 'nextish' };

    await runWizard({ categories: categoriesWithTesting, modules: withMobileTool, name: 'Test' });

    expect(optionsFor('Testing')).toContain('unit');
    expect(optionsFor('Testing')).not.toContain('e2e');
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
