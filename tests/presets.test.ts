import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadRegistry } from '../src/core/registry/loadModules.js';
import { loadPresets } from '../src/core/registry/loadPresets.js';
import { resolveSelection } from '../src/core/resolve/resolveSelection.js';
import { gatingCategoryIds } from '../src/core/resolve/validate.js';
import { GeneratorError } from '../src/core/resolve/errors.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registry = loadRegistry(ROOT);

describe('config/presets.json (the real, shipped presets)', () => {
  it('loads at least the curated starting set, each with a real module id', () => {
    expect(registry.presets.length).toBeGreaterThanOrEqual(2);
    for (const preset of registry.presets) {
      expect(preset.id).toMatch(/^[a-z0-9-]+$/);
      expect(preset.name.length).toBeGreaterThan(0);
      expect(preset.description.length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate preset ids', () => {
    const ids = registry.presets.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every preset resolves cleanly through the full selection pipeline', () => {
    const gating = gatingCategoryIds(registry.categories);
    for (const preset of registry.presets) {
      expect(() =>
        resolveSelection(
          { projectName: `preset:${preset.id}`, choices: preset.choices },
          registry.byId,
          gating,
        ),
      ).not.toThrow();
    }
  });
});

describe('loadPresets validation', () => {
  it('rejects a preset that references a module id that does not exist', () => {
    const brokenRoot = path.join(ROOT, 'tests/fixtures/broken-presets');

    expect(() => loadPresets(brokenRoot, registry.categories, registry.byId)).toThrow(
      GeneratorError,
    );
    expect(() => loadPresets(brokenRoot, registry.categories, registry.byId)).toThrow(
      /preset "bogus" is invalid/,
    );
  });

  it('rejects a preset that bundles two modules that conflict with each other', () => {
    const conflictingRoot = path.join(ROOT, 'tests/fixtures/conflicting-preset');

    expect(() => loadPresets(conflictingRoot, registry.categories, registry.byId)).toThrow(
      /preset "conflicting" is invalid/,
    );
  });

  it('returns an empty list when config/presets.json does not exist, rather than erroring', () => {
    // Any directory with no config/presets.json — the module contract says a
    // missing file contributes nothing, same as everywhere else in this tool.
    const noPresetsRoot = path.join(ROOT, 'tests/fixtures');

    expect(loadPresets(noPresetsRoot, registry.categories, registry.byId)).toEqual([]);
  });
});
