import type { CategoryQuestion, LoadedModule, Selection } from '../types.js';
import { GeneratorError } from './errors.js';

/** The sentinel a single-select question stores when the user picks "None". */
export const NONE = 'none';

/** Flattens a selection's choices into a de-duplicated list of module ids. */
export function selectedModuleIds(selection: Selection): string[] {
  const ids: string[] = [];
  for (const value of Object.values(selection.choices)) {
    for (const id of Array.isArray(value) ? value : [value]) {
      if (id && id !== NONE) ids.push(id);
    }
  }
  return [...new Set(ids)];
}

/**
 * Checks the raw selection before resolution: are required questions answered,
 * do the chosen ids exist, and did anything get selected twice.
 */
export function validateSelection(
  selection: Selection,
  categories: CategoryQuestion[],
  byId: Map<string, LoadedModule>,
  availableCategories: Set<string>,
): void {
  if (!selection.projectName || !selection.projectName.trim()) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      'projectName is missing.',
      'Add a "projectName" to your config, or answer the first wizard question.',
    );
  }

  for (const category of categories) {
    // A required category with no installed modules cannot be answered, and is
    // skipped by the wizard — so it is not an error here.
    if (!category.required || !availableCategories.has(category.id)) continue;

    const value = selection.choices[category.id];
    const empty = value === undefined || value === NONE || (Array.isArray(value) && value.length === 0);
    if (empty) {
      throw new GeneratorError(
        'MISSING_REQUIRED_CATEGORY',
        `No choice made for required category "${category.label}".`,
        `Add "${category.id}" to your config's choices.`,
      );
    }
  }

  for (const [categoryId, value] of Object.entries(selection.choices)) {
    const ids = Array.isArray(value) ? value : [value];

    const seen = new Set<string>();
    for (const id of ids) {
      if (!id || id === NONE) continue;
      if (seen.has(id)) {
        throw new GeneratorError(
          'DUPLICATE_MODULE',
          `"${id}" is selected twice under "${categoryId}".`,
          'Remove the duplicate entry.',
        );
      }
      seen.add(id);

      const module = byId.get(id);
      if (!module) {
        throw new GeneratorError(
          'UNKNOWN_MODULE',
          `Unknown module "${id}" selected for "${categoryId}".`,
          'Run with --list-modules to see every available module id.',
        );
      }
      if (module.manifest.category !== categoryId) {
        throw new GeneratorError(
          'UNKNOWN_MODULE',
          `"${id}" belongs to category "${module.manifest.category}", not "${categoryId}".`,
          'Move it to the correct category in your config.',
        );
      }
    }
  }
}
