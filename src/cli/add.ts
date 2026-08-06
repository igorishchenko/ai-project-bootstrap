import type { CategoryQuestion, LoadedModule, Selection } from '../core/types.js';
import { NONE } from '../core/resolve/validate.js';
import { GeneratorError } from '../core/resolve/errors.js';

export interface AddFlags {
  moduleId?: string;
  dir?: string;
  dryRun: boolean;
  help: boolean;
}

const BOOLEANS = new Set(['--dry-run', '-h', '--help']);
const VALUED = new Set(['--dir']);

/** Parses `add`'s own small flag set — deliberately separate from the main parser. */
export function parseAddFlags(argv: string[]): AddFlags {
  const flags: AddFlags = { dryRun: false, help: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] as string;

    if (BOOLEANS.has(arg)) {
      if (arg === '--dry-run') flags.dryRun = true;
      if (arg === '-h' || arg === '--help') flags.help = true;
      continue;
    }

    if (VALUED.has(arg)) {
      const value = argv[++i];
      if (value === undefined) {
        throw new GeneratorError('INVALID_CONFIG', `${arg} needs a value.`, `Example: ${arg} ./my-app`);
      }
      flags.dir = value;
      continue;
    }

    if (arg.startsWith('-')) {
      throw new GeneratorError(
        'INVALID_CONFIG',
        `Unknown flag ${arg}.`,
        'Run `ai-project-bootstrap add --help` to see every flag.',
      );
    }

    // First bare argument is the technology id — matches the main command
    // treating a bare argument as the project directory.
    flags.moduleId ??= arg;
  }

  return flags;
}

export const ADD_HELP_TEXT = `
ai-project-bootstrap add — add one technology to an already-generated project.

Usage
  npx ai-project-bootstrap add <technology-id> [options]

Loads the project's ai-project.config.json, adds the technology to the saved
selection, and regenerates. Regeneration only ever adds or leaves a file
alone — anything you have hand-edited since it was generated is detected by
fingerprint and left untouched, the same as a normal --config regeneration.

Options
      --dir <path>   Project to modify (default: the current directory)
      --dry-run      Print what would change without touching disk
  -h, --help          Show this help

Run \`ai-project-bootstrap --list-modules\` to see every available technology id.

Limits
  A category that only allows one choice (payments, database, backend, ...)
  can be filled in when empty, but not swapped once answered — replacing an
  already-selected technology would leave its old files behind, since
  regeneration never deletes. Multi-select categories (analytics, testing,
  crash-reporting) just grow.
`.trim();

/**
 * Adds one module to an existing selection, in place.
 *
 * Multi-select categories grow. Single-select categories fill in only when
 * empty — swapping an already-answered single-select is refused rather than
 * silently done half-right, since regeneration has no way to remove the
 * previous module's files.
 */
export function mergeChoice(
  selection: Selection,
  module: LoadedModule,
  category: CategoryQuestion,
): void {
  const current = selection.choices[category.id];
  const id = module.manifest.id;

  if (category.type === 'multi') {
    const list = Array.isArray(current) ? current : current && current !== NONE ? [current] : [];
    if (list.includes(id)) {
      throw new GeneratorError(
        'ALREADY_SELECTED',
        `"${module.manifest.name}" is already part of this project.`,
      );
    }
    selection.choices[category.id] = [...list, id];
    return;
  }

  if (current === undefined || current === NONE) {
    selection.choices[category.id] = id;
    return;
  }

  if (current === id) {
    throw new GeneratorError(
      'ALREADY_SELECTED',
      `"${module.manifest.name}" is already part of this project.`,
    );
  }

  throw new GeneratorError(
    'CATEGORY_ALREADY_ANSWERED',
    `This project already uses "${current}" for ${category.label.toLowerCase()}, and it can only have one.`,
    `"add" fills in an empty slot; it does not swap "${current}" for "${id}" — that would leave ${current}'s ` +
      `generated files behind, since regeneration never deletes. Remove those by hand, change "${category.id}" ` +
      `to "${id}" in ai-project.config.json, then regenerate with --config.`,
  );
}
