import type { CategoryQuestion, LoadedModule, Selection } from '../types.js';
import { isGatingQuestion } from '../types.js';
import { GeneratorError } from './errors.js';

/** The sentinel a single-select question stores when the user picks "None". */
export const NONE = 'none';

/**
 * Flattens a selection's choices into a de-duplicated list of module ids.
 *
 * Answers to gating questions ("mobile", "web", "both") are branches in the
 * wizard, not technologies, so they are skipped.
 */
export function selectedModuleIds(
  selection: Selection,
  gatingCategories: ReadonlySet<string> = new Set(),
): string[] {
  const ids: string[] = [];
  for (const [categoryId, value] of Object.entries(selection.choices)) {
    if (gatingCategories.has(categoryId)) continue;
    for (const id of Array.isArray(value) ? value : [value]) {
      if (id && id !== NONE) ids.push(id);
    }
  }
  return [...new Set(ids)];
}

/** The categories whose answers are wizard branches rather than modules. */
export function gatingCategoryIds(categories: readonly CategoryQuestion[]): Set<string> {
  return new Set(categories.filter(isGatingQuestion).map((category) => category.id));
}

/**
 * Whether a question applies, given the answers so far.
 *
 * `showWhen` lists the answers that reveal it. "Both" reveals the mobile and
 * web questions by appearing in each of their conditions — nothing here knows
 * what "both" means.
 *
 * Lives beside the validator rather than in the wizard because both need it and
 * they must agree: the wizard uses it to decide what to *offer*, and
 * `validateSelection` uses it to decide what to *accept*. Two copies would
 * drift, and the direction they drift in is the quiet one — a config naming
 * something the wizard would never have offered, generated without complaint.
 */
export function appliesTo(
  category: CategoryQuestion,
  choices: Record<string, string | string[]>,
): boolean {
  if (!category.showWhen) return true;

  return Object.entries(category.showWhen).every(([dependsOn, accepted]) => {
    const answer = choices[dependsOn];
    const given = Array.isArray(answer) ? answer : [answer];
    return given.some((value) => value !== undefined && accepted.includes(value));
  });
}

/**
 * Whether the answers actively *contradict* a question, as opposed to merely
 * not revealing it yet.
 *
 * Not the negation of `appliesTo`, deliberately. The wizard asks in `order`, so
 * by the time it evaluates a question its gating answer is always present, and
 * "unanswered" can safely mean "do not ask". A saved config is not ordered and
 * need not be complete — `target` is a gating question, and gating questions
 * are exempt from the required-answer check above, so a config predating it has
 * no `target` at all. Treating that silence as "web" would reject projects that
 * generate correctly today.
 */
function ruledOut(category: CategoryQuestion, choices: Record<string, string | string[]>): boolean {
  if (!category.showWhen) return false;

  return Object.entries(category.showWhen).some(([dependsOn, accepted]) => {
    const answer = choices[dependsOn];
    if (answer === undefined) return false;
    const given = Array.isArray(answer) ? answer : [answer];
    return !given.some((value) => accepted.includes(value));
  });
}

/** Adds a module and everything it transitively requires. */
function collectWithPrerequisites(
  id: string,
  target: Set<string>,
  byId: Map<string, LoadedModule>,
): void {
  if (target.has(id)) return;
  const module = byId.get(id);
  if (!module) return;

  target.add(id);
  for (const requiredId of module.manifest.requires) {
    collectWithPrerequisites(requiredId, target, byId);
  }
}

/**
 * Rejects a module the project's own gating answers rule out.
 *
 * The wizard already refuses to offer these (see `isCompatible`), so this only
 * ever fires for a hand-written or hand-edited config — which is exactly the
 * path that had no check at all. `--config` with `"target": "web"` and
 * `"payments": "revenuecat"` used to generate happily, pulling Expo and React
 * Native into a Next.js project through `requires` and writing `npx expo
 * install` into its setup guide.
 *
 * Transitive, because that is how it gets in: `revenuecat` itself belongs to
 * `payments`, a category no target rules out. It is the `expo` it requires that
 * belongs to the ruled-out one.
 */
function assertGatedCategoriesUnselected(
  selection: Selection,
  categories: readonly CategoryQuestion[],
  byId: Map<string, LoadedModule>,
  gating: ReadonlySet<string>,
): void {
  const ruledOutCategories = new Map(
    categories
      .filter((category) => !gating.has(category.id) && ruledOut(category, selection.choices))
      .map((category) => [category.id, category] as const),
  );
  if (ruledOutCategories.size === 0) return;

  for (const id of selectedModuleIds(selection, gating)) {
    const closure = new Set<string>();
    collectWithPrerequisites(id, closure, byId);

    for (const requiredId of closure) {
      const category = ruledOutCategories.get(byId.get(requiredId)?.manifest.category ?? '');
      if (!category) continue;

      const because = Object.entries(category.showWhen ?? {})
        .map(([dependsOn, accepted]) => {
          const answer = selection.choices[dependsOn];
          const given = Array.isArray(answer) ? answer.join(', ') : (answer ?? 'unanswered');
          return `"${category.label}" applies when ${dependsOn} is ${accepted.join(' or ')}; this project has ${dependsOn}: ${given}`;
        })
        .join('. ');

      throw new GeneratorError(
        'INVALID_CONFIG',
        requiredId === id
          ? `"${id}" belongs to "${category.label}", which this project's answers rule out.`
          : `"${id}" requires "${requiredId}", which belongs to "${category.label}" — ruled out by this project's answers.`,
        `${because}. Remove it, or change that answer.`,
      );
    }
  }
}

/**
 * A gating answer must be one of its declared choices. A typo in a hand-written
 * config would otherwise silently hide every question it gates, producing a
 * project missing whole layers with no error.
 */
function assertValidGatingAnswer(
  categoryId: string,
  value: string | string[],
  categories: readonly CategoryQuestion[],
): void {
  const category = categories.find((entry) => entry.id === categoryId);
  const allowed = new Set((category?.choices ?? []).map((choice) => choice.value));

  for (const answer of Array.isArray(value) ? value : [value]) {
    if (!answer || answer === NONE || allowed.has(answer)) continue;
    throw new GeneratorError(
      'INVALID_CONFIG',
      `"${answer}" is not a valid answer for "${categoryId}".`,
      `Expected one of: ${[...allowed].join(', ')}.`,
    );
  }
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

  const gating = gatingCategoryIds(categories);

  for (const category of categories) {
    // A required category with no installed modules cannot be answered, and is
    // skipped by the wizard — so it is not an error here. Gating questions have
    // no modules by design.
    if (!category.required || gating.has(category.id)) continue;
    if (!availableCategories.has(category.id)) continue;

    const value = selection.choices[category.id];
    const empty =
      value === undefined || value === NONE || (Array.isArray(value) && value.length === 0);
    if (empty) {
      throw new GeneratorError(
        'MISSING_REQUIRED_CATEGORY',
        `No choice made for required category "${category.label}".`,
        `Add "${category.id}" to your config's choices.`,
      );
    }
  }

  for (const [categoryId, value] of Object.entries(selection.choices)) {
    if (gating.has(categoryId)) {
      assertValidGatingAnswer(categoryId, value, categories);
      continue;
    }

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

  assertGatedCategoriesUnselected(selection, categories, byId, gating);
}
