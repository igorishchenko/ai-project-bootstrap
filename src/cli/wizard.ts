import * as prompts from '@clack/prompts';
import type { CategoryQuestion, LoadedModule, Selection } from '../core/types.js';
import { groupByCategory } from '../core/registry/loadModules.js';
import { NONE } from '../core/resolve/validate.js';

export class WizardCancelled extends Error {
  constructor() {
    super('Cancelled.');
    this.name = 'WizardCancelled';
  }
}

export interface WizardOptions {
  categories: CategoryQuestion[];
  modules: LoadedModule[];
  /** Pre-supplied project name, skipping that question. */
  name?: string;
  /** Accept the first option for every question instead of asking. */
  acceptDefaults?: boolean;
}

/**
 * Runs the interactive setup.
 *
 * Questions come from `config/categories.json`; their options come from the
 * discovered modules grouped by manifest category. A category with no installed
 * modules is skipped rather than shown empty — that is what lets the generator
 * ship with six modules and still grow to a hundred without a code change.
 */
export async function runWizard(options: WizardOptions): Promise<Selection> {
  const grouped = groupByCategory(options.modules);
  const choices: Record<string, string | string[]> = {};

  const projectName = options.name ?? (await askProjectName(options.acceptDefaults));

  for (const category of options.categories) {
    const available = grouped.get(category.id) ?? [];
    if (available.length === 0) continue;

    const answer = await askCategory(category, available, options.acceptDefaults);
    if (answer !== undefined) choices[category.id] = answer;
  }

  return { projectName, choices };
}

async function askProjectName(acceptDefaults?: boolean): Promise<string> {
  if (acceptDefaults) return 'my-ai-project';

  const answer = await prompts.text({
    message: 'Project name',
    placeholder: 'my-ai-project',
    defaultValue: 'my-ai-project',
    validate: (value) =>
      value.trim().length === 0 ? 'Please enter a project name.' : undefined,
  });

  if (prompts.isCancel(answer)) throw new WizardCancelled();
  return answer.trim();
}

async function askCategory(
  category: CategoryQuestion,
  available: LoadedModule[],
  acceptDefaults?: boolean,
): Promise<string | string[] | undefined> {
  const options = available.map((module) => ({
    value: module.manifest.id,
    label: module.manifest.name,
    hint: module.manifest.description,
  }));

  if (acceptDefaults) {
    if (category.type === 'multi') return category.required ? [options[0]?.value as string] : [];
    if (category.required) return options[0]?.value as string;
    return category.allowNone ? NONE : (options[0]?.value as string);
  }

  if (category.type === 'multi') {
    const answer = await prompts.multiselect({
      message: category.label,
      options,
      required: category.required,
    });
    if (prompts.isCancel(answer)) throw new WizardCancelled();
    return answer as string[];
  }

  const answer = await prompts.select({
    message: category.label,
    options:
      category.required || !category.allowNone
        ? options
        : [...options, { value: NONE, label: 'None', hint: 'Skip this layer' }],
  });
  if (prompts.isCancel(answer)) throw new WizardCancelled();
  return answer as string;
}
