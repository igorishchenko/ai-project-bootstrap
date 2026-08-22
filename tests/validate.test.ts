import { describe, expect, it } from 'vitest';
import { validateSelection, selectedModuleIds, NONE } from '../src/core/resolve/validate.js';
import { parseManifest } from '../src/core/registry/manifestSchema.js';
import { GeneratorError } from '../src/core/resolve/errors.js';
import type { CategoryQuestion, Selection } from '../src/core/types.js';
import { makeModule, makeRegistry } from './helpers/modules.js';

const categories: CategoryQuestion[] = [
  {
    id: 'platform',
    label: 'Platform',
    type: 'single',
    required: true,
    allowNone: false,
    order: 10,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    type: 'multi',
    required: false,
    allowNone: true,
    order: 20,
  },
];

const registry = makeRegistry([
  makeModule({ id: 'expo-like', category: 'platform' }),
  makeModule({ id: 'tracker', category: 'analytics' }),
]);

const available = new Set(['platform', 'analytics']);

function select(choices: Selection['choices'], projectName = 'Test'): Selection {
  return { projectName, choices };
}

describe('selectedModuleIds', () => {
  it('flattens single and multi answers, dropping none and duplicates', () => {
    expect(selectedModuleIds(select({ a: 'x', b: ['y', 'x'], c: NONE, d: [] })).sort()).toEqual([
      'x',
      'y',
    ]);
  });
});

describe('validateSelection', () => {
  it('accepts a valid selection', () => {
    expect(() =>
      validateSelection(
        select({ platform: 'expo-like', analytics: ['tracker'] }),
        categories,
        registry,
        available,
      ),
    ).not.toThrow();
  });

  it('requires a project name', () => {
    expect(() =>
      validateSelection(select({ platform: 'expo-like' }, '  '), categories, registry, available),
    ).toThrow(/projectName/);
  });

  it('rejects a missing answer for a required category', () => {
    expect(() => validateSelection(select({}), categories, registry, available)).toThrow(
      /required category/,
    );
  });

  it('rejects "none" for a required category', () => {
    expect(() =>
      validateSelection(select({ platform: NONE }), categories, registry, available),
    ).toThrow(GeneratorError);
  });

  it('skips a required category that has no installed modules', () => {
    // This is what lets the generator ship six modules and still grow.
    expect(() =>
      validateSelection(select({}), categories, registry, new Set(['analytics'])),
    ).not.toThrow();
  });

  it('rejects an unknown module id', () => {
    expect(() =>
      validateSelection(select({ platform: 'nope' }), categories, registry, available),
    ).toThrow(/Unknown module/);
  });

  it('rejects a module selected under the wrong category', () => {
    expect(() =>
      validateSelection(select({ platform: 'tracker' }), categories, registry, available),
    ).toThrow(/belongs to category/);
  });

  it('rejects the same module chosen twice in one multi-select', () => {
    expect(() =>
      validateSelection(
        select({ platform: 'expo-like', analytics: ['tracker', 'tracker'] }),
        categories,
        registry,
        available,
      ),
    ).toThrow(/twice/);
  });
});

describe('parseManifest', () => {
  const valid = { id: 'a-b', name: 'A B', category: 'payments', description: 'x' };

  it('applies defaults for the optional fields', () => {
    expect(parseManifest(valid, 'm.json')).toEqual({
      ...valid,
      requires: [],
      conflicts: [],
      dependencies: [],
      priority: 50,
    });
  });

  it('rejects a non-kebab-case id', () => {
    expect(() => parseManifest({ ...valid, id: 'Not_Kebab' }, 'm.json')).toThrow(/kebab-case/);
  });

  it('rejects a missing required field, naming the file', () => {
    expect(() => parseManifest({ id: 'a' }, 'technologies/a/manifest.json')).toThrow(
      /technologies\/a\/manifest.json/,
    );
  });

  it('rejects a negative priority', () => {
    expect(() => parseManifest({ ...valid, priority: -1 }, 'm.json')).toThrow(GeneratorError);
  });
});

/**
 * The wizard has always refused to *offer* a mobile-only technology to a web
 * project. Nothing refused to *accept* one: `--config` with `"target": "web"`
 * and `"payments": "revenuecat"` generated happily, pulling Expo and React
 * Native in through `requires` and writing `npx expo install` into the setup
 * guide of a Next.js repository.
 */
describe('validateSelection rejects what the gating answers rule out', () => {
  const gatedCategories: CategoryQuestion[] = [
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
      ],
    },
    {
      id: 'mobile',
      label: 'Mobile platform',
      type: 'single',
      required: false,
      allowNone: true,
      order: 10,
      showWhen: { target: ['mobile'] },
    },
    {
      id: 'payments',
      label: 'Payments',
      type: 'single',
      required: false,
      allowNone: true,
      order: 20,
    },
  ];

  const gatedRegistry = makeRegistry([
    makeModule({ id: 'native-platform', category: 'mobile' }),
    makeModule({ id: 'native-payments', category: 'payments', requires: ['native-platform'] }),
    makeModule({ id: 'web-payments', category: 'payments' }),
  ]);
  const gatedAvailable = new Set(['mobile', 'payments']);

  const check = (choices: Selection['choices']): void =>
    validateSelection(select(choices), gatedCategories, gatedRegistry, gatedAvailable);

  it('rejects a module whose own category the target rules out', () => {
    expect(() => check({ target: 'web', mobile: 'native-platform' })).toThrow(
      /"native-platform" belongs to "Mobile platform"/,
    );
  });

  it('rejects a module that reaches a ruled-out category through requires', () => {
    // The one that actually bites: `payments` is a category no target rules
    // out, so only the transitive walk finds this.
    expect(() => check({ target: 'web', payments: 'native-payments' })).toThrow(
      /"native-payments" requires "native-platform"/,
    );
  });

  it('names the answer to change rather than only what is wrong', () => {
    try {
      check({ target: 'web', payments: 'native-payments' });
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as GeneratorError).hint).toMatch(
        /target is mobile.*this project has target: web/,
      );
    }
  });

  it('allows the same module when the target permits it', () => {
    expect(() => check({ target: 'mobile', payments: 'native-payments' })).not.toThrow();
  });

  it('allows a module no gating answer rules out', () => {
    expect(() => check({ target: 'web', payments: 'web-payments' })).not.toThrow();
  });

  it('treats an unanswered gating question as ruling nothing out', () => {
    // Gating questions are exempt from the required-answer check, so a config
    // saved before `target` existed has none. Reading that silence as "web"
    // would reject projects that generate correctly today.
    expect(() => check({ payments: 'native-payments' })).not.toThrow();
  });
});
