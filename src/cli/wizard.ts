import * as prompts from '@clack/prompts';
import type { CategoryQuestion, LoadedModule, Preset, Selection } from '../core/types.js';
import { isGatingQuestion } from '../core/types.js';
import { groupByCategory } from '../core/registry/loadModules.js';
import { NONE } from '../core/resolve/validate.js';
import { validateProjectInput } from './projectTarget.js';

export class WizardCancelled extends Error {
  constructor() {
    super('Cancelled.');
    this.name = 'WizardCancelled';
  }
}

export interface WizardOptions {
  categories: CategoryQuestion[];
  modules: LoadedModule[];
  /** Curated bundles offered as a fast start — `config/presets.json`. */
  presets?: Preset[];
  /** A preset chosen via `--preset`, skipping the interactive picker. */
  presetId?: string;
  /** Pre-supplied project name, skipping that question. */
  name?: string;
  /** What the name question starts from — derived from `--out` when given. */
  defaultName?: string;
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
  const byId = new Map(options.modules.map((module) => [module.manifest.id, module]));
  const choices: Record<string, string | string[]> = {};
  const chosen = new Set<string>();

  const projectName =
    options.name ?? (await askProjectName(options.defaultName, options.acceptDefaults));

  const preset = await resolvePreset(options, byId);
  if (preset) {
    for (const [categoryId, value] of Object.entries(preset.choices)) {
      choices[categoryId] = value;
      for (const id of Array.isArray(value) ? value : [value]) {
        if (id && id !== NONE) addWithPrerequisites(id, chosen, byId);
      }
    }
  }

  // Questions ruled out by an earlier answer. A web-only project never sees the
  // mobile question, so anything needing a mobile platform is off the table too.
  const excluded = new Set<string>();

  for (const category of options.categories) {
    // Already answered by the preset — reviewed via its summary above, not
    // asked again, so "one click" stays one click for the parts it covers.
    if (category.id in choices) continue;

    if (!shouldAsk(category, choices)) {
      excluded.add(category.id);
      continue;
    }

    // A gating question shapes the rest of the wizard rather than selecting a
    // technology, so its options come from config and its answer is recorded
    // without ever reaching the resolver.
    if (isGatingQuestion(category)) {
      const answer = await askGating(category, options.acceptDefaults);
      if (answer !== undefined) choices[category.id] = answer;
      continue;
    }

    // Only offer what is still compatible with the answers so far. Presenting
    // an option and then rejecting the whole selection at the end — after every
    // remaining question has been answered — is not a real choice.
    const available = (grouped.get(category.id) ?? []).filter((module) =>
      isCompatible(module.manifest.id, chosen, byId, choices, excluded),
    );
    if (available.length === 0) continue;

    const answer = await askCategory(category, available, options.acceptDefaults);
    if (answer === undefined) continue;

    // "None" is an affordance, not a module — drop it before it is persisted.
    const cleaned = Array.isArray(answer) ? answer.filter((id) => id !== NONE) : answer;

    choices[category.id] = cleaned;
    for (const id of Array.isArray(cleaned) ? cleaned : [cleaned]) {
      if (id && id !== NONE) addWithPrerequisites(id, chosen, byId);
    }
  }

  return { projectName, choices };
}

/**
 * True when a module can still be added to what has been chosen so far.
 *
 * Conflicts are checked in both directions: declaring `conflicts: ["x"]` on
 * either side means the two cannot coexist, and only one of them needs to say so.
 */
function isCompatible(
  id: string,
  chosen: Set<string>,
  byId: Map<string, LoadedModule>,
  choices: Record<string, string | string[]>,
  excluded: ReadonlySet<string>,
): boolean {
  const candidate = byId.get(id);
  if (!candidate) return false;

  // Everything this module would pull in must also be compatible.
  const incoming = new Set<string>();
  addWithPrerequisites(id, incoming, byId);

  for (const incomingId of incoming) {
    const manifest = byId.get(incomingId)?.manifest;
    if (!manifest) continue;

    for (const conflictId of manifest.conflicts) {
      if (chosen.has(conflictId)) return false;
    }
    for (const chosenId of chosen) {
      if (byId.get(chosenId)?.manifest.conflicts.includes(incomingId)) return false;
    }

    // Would this drag in something from a question already answered otherwise?
    // Offering Detox to a web-only project would silently add React Native,
    // contradicting an answer the user already gave.
    if (
      !chosen.has(incomingId) &&
      (excluded.has(manifest.category) || contradictsAnswer(manifest.category, incomingId, choices))
    ) {
      return false;
    }
  }

  return true;
}

/** True when `category` was already answered and `moduleId` was not the answer. */
function contradictsAnswer(
  category: string,
  moduleId: string,
  choices: Record<string, string | string[]>,
): boolean {
  if (!(category in choices)) return false;

  const answer = choices[category];
  const given = Array.isArray(answer) ? answer : [answer];
  return !given.includes(moduleId);
}

/** Adds a module and everything it transitively requires. */
function addWithPrerequisites(
  id: string,
  target: Set<string>,
  byId: Map<string, LoadedModule>,
): void {
  if (target.has(id)) return;
  const module = byId.get(id);
  if (!module) return;

  target.add(id);
  for (const requiredId of module.manifest.requires) {
    addWithPrerequisites(requiredId, target, byId);
  }
}

/**
 * Whether a question applies, given the answers so far.
 *
 * `showWhen` lists the answers that reveal it. "Both" reveals the mobile and
 * web questions by appearing in each of their conditions — the wizard knows
 * nothing about what "both" means.
 */
function shouldAsk(
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

async function askGating(
  category: CategoryQuestion,
  acceptDefaults?: boolean,
): Promise<string | string[] | undefined> {
  const options = (category.choices ?? []).map((choice) => ({
    value: choice.value,
    label: choice.label,
    ...(choice.hint ? { hint: choice.hint } : {}),
  }));
  if (options.length === 0) return undefined;

  // A multi-select gating question (e.g. "which AI tools do you use?") picks
  // from several fixed branches at once rather than choosing exactly one.
  if (category.type === 'multi') {
    const defaults = (category.defaultChoices ?? []).filter((value) =>
      options.some((option) => option.value === value),
    );
    if (acceptDefaults) return defaults;

    const answer = await prompts.multiselect({
      message: category.label,
      options,
      required: category.required,
      initialValues: defaults,
    });
    if (prompts.isCancel(answer)) throw new WizardCancelled();
    return answer as string[];
  }

  if (acceptDefaults) return options[0]?.value;

  const answer = await prompts.select({ message: category.label, options });
  if (prompts.isCancel(answer)) throw new WizardCancelled();
  return answer as string;
}

/**
 * Asks for the project name, which doubles as its location.
 *
 * Answering with a path (`./apps/my-proj`) generates the project there under
 * that name, so the folder you get and the project inside it always match.
 */
async function askProjectName(defaultName?: string, acceptDefaults?: boolean): Promise<string> {
  const fallback = defaultName ?? 'my-ai-project';
  if (acceptDefaults) return fallback;

  const answer = await prompts.text({
    message: 'Project name or path',
    placeholder: `${fallback} — or ./apps/${fallback} to create it there`,
    defaultValue: fallback,
    validate: (value) =>
      value.trim().length === 0 ? 'Please enter a project name.' : validateProjectInput(value),
  });

  if (prompts.isCancel(answer)) throw new WizardCancelled();
  return answer.trim();
}

const CUSTOM = '__custom__';

/**
 * Works out which preset, if any, seeds the selection — and makes sure
 * choosing one is never a silent shortcut: everything it fills is printed,
 * and (outside `--yes`) the user gets one explicit chance to back out to a
 * fully custom run before any of it is applied.
 */
async function resolvePreset(
  options: WizardOptions,
  byId: Map<string, LoadedModule>,
): Promise<Preset | undefined> {
  const presets = options.presets ?? [];
  if (presets.length === 0) return undefined;

  let preset: Preset | undefined;

  if (options.presetId) {
    // Already validated against the registry by the caller — this is a
    // defensive lookup, not the source of truth for "does it exist".
    preset = presets.find((entry) => entry.id === options.presetId);
  } else if (!options.acceptDefaults) {
    const choice = await prompts.select({
      message: 'Start from a preset?',
      options: [
        { value: CUSTOM, label: 'Custom', hint: 'Answer every question yourself' },
        ...presets.map((entry) => ({
          value: entry.id,
          label: entry.name,
          hint: entry.description,
        })),
      ],
    });
    if (prompts.isCancel(choice)) throw new WizardCancelled();
    if (choice === CUSTOM) return undefined;
    preset = presets.find((entry) => entry.id === choice);
  }

  if (!preset) return undefined;
  // `--preset x --yes`: fully non-interactive, so there is nothing to confirm.
  if (options.acceptDefaults) return preset;

  prompts.note(describePreset(preset, byId), preset.name);
  const proceed = await prompts.confirm({
    message: `Use ${preset.name}, and only ask about what's left?`,
  });
  if (prompts.isCancel(proceed)) throw new WizardCancelled();
  return proceed ? preset : undefined;
}

/** Human-readable summary of what a preset pre-fills, module names not ids. */
function describePreset(preset: Preset, byId: Map<string, LoadedModule>): string {
  return Object.entries(preset.choices)
    .map(([categoryId, value]) => {
      const ids = Array.isArray(value) ? value : [value];
      const names = ids.map((id) => byId.get(id)?.manifest.name ?? id).join(', ');
      return `${categoryId}: ${names}`;
    })
    .join('\n');
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
    // "Accept defaults" should produce a working project, so single-select
    // questions take their first (lowest-priority) option. Multi-select
    // questions take nothing — adding every analytics tool is not a default.
    if (category.type === 'multi') return category.required ? [options[0]?.value as string] : [];
    return options[0]?.value as string;
  }

  // Every question offers a way out. Not needing a layer is a normal answer,
  // and a wizard that forces a choice produces projects wired to things nobody
  // asked for.
  const none = { value: NONE, label: 'None', hint: 'Skip this — nothing will be generated for it' };

  if (category.type === 'multi') {
    const answer = await prompts.multiselect({
      message: category.label,
      options: category.required ? options : [...options, none],
      required: category.required,
    });
    if (prompts.isCancel(answer)) throw new WizardCancelled();
    return answer as string[];
  }

  const answer = await prompts.select({
    message: category.label,
    options: category.allowNone ? [...options, none] : options,
  });
  if (prompts.isCancel(answer)) throw new WizardCancelled();
  return answer as string;
}
