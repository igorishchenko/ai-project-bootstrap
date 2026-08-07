import fs from 'node:fs';
import path from 'node:path';
import type { CategoryQuestion, LoadedModule, Preset, Selection } from '../types.js';
import { GeneratorError } from '../resolve/errors.js';
import { gatingCategoryIds, validateSelection } from '../resolve/validate.js';
import { resolveSelection } from '../resolve/resolveSelection.js';

function readJson<T>(file: string): T {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch (error) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      `Could not read ${file}: ${(error as Error).message}`,
    );
  }
}

/**
 * Loads `config/presets.json` and validates every preset through the exact
 * same pipeline a hand-written `--config` selection goes through —
 * `validateSelection` (structure) then `resolveSelection` (requires closure,
 * conflicts, cycles). A preset that references a module id that does not
 * exist, or bundles two modules that conflict, is an authoring mistake in
 * this repo, not a runtime error a user should ever be able to hit — so it
 * fails loudly here, on every invocation, rather than only when someone
 * happens to pass `--preset`.
 */
export function loadPresets(
  rootDir: string,
  categories: CategoryQuestion[],
  byId: Map<string, LoadedModule>,
): Preset[] {
  const file = path.join(rootDir, 'config', 'presets.json');
  if (!fs.existsSync(file)) return [];

  const presets = readJson<unknown>(file);
  if (!Array.isArray(presets)) {
    throw new GeneratorError('INVALID_CONFIG', `${file} must contain an array of presets.`);
  }

  const availableCategories = new Set([...byId.values()].map((module) => module.manifest.category));
  const gating = gatingCategoryIds(categories);
  const seenIds = new Set<string>();

  for (const raw of presets) {
    const preset = raw as Partial<Preset>;
    if (
      typeof preset.id !== 'string' ||
      typeof preset.name !== 'string' ||
      typeof preset.description !== 'string' ||
      typeof preset.choices !== 'object' ||
      preset.choices === null
    ) {
      throw new GeneratorError(
        'INVALID_CONFIG',
        `${file} has a preset missing "id", "name", "description" or "choices".`,
      );
    }
    if (seenIds.has(preset.id)) {
      throw new GeneratorError(
        'INVALID_CONFIG',
        `${file}: preset id "${preset.id}" is declared more than once.`,
      );
    }
    seenIds.add(preset.id);

    const selection: Selection = { projectName: `preset:${preset.id}`, choices: preset.choices };
    try {
      validateSelection(selection, categories, byId, availableCategories);
      resolveSelection(selection, byId, gating);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new GeneratorError(
        'INVALID_CONFIG',
        `${file}: preset "${preset.id}" is invalid — ${reason}`,
        'Fix the preset\'s "choices" in config/presets.json, or drop the offending category.',
      );
    }
  }

  return presets as Preset[];
}
