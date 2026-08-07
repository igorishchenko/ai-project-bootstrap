import type { CategoryQuestion, LoadedModule, Selection } from '../core/types.js';
import { NONE } from '../core/resolve/validate.js';
import { GeneratorError } from '../core/resolve/errors.js';

export interface AddFlags {
  moduleId?: string;
  dir?: string;
  dryRun: boolean;
  replace: boolean;
  help: boolean;
}

const BOOLEANS = new Set(['--dry-run', '--replace', '-h', '--help']);
const VALUED = new Set(['--dir']);

/** Parses `add`'s own small flag set — deliberately separate from the main parser. */
export function parseAddFlags(argv: string[]): AddFlags {
  const flags: AddFlags = { dryRun: false, replace: false, help: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] as string;

    if (BOOLEANS.has(arg)) {
      if (arg === '--dry-run') flags.dryRun = true;
      if (arg === '--replace') flags.replace = true;
      if (arg === '-h' || arg === '--help') flags.help = true;
      continue;
    }

    if (VALUED.has(arg)) {
      const value = argv[++i];
      if (value === undefined) {
        throw new GeneratorError(
          'INVALID_CONFIG',
          `${arg} needs a value.`,
          `Example: ${arg} ./my-app`,
        );
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
      --replace      Swap out a category's existing single-select answer
                      instead of requiring it to be empty — see "Swapping" below
  -h, --help          Show this help

Run \`ai-project-bootstrap --list-modules\` to see every available technology id.

Limits
  A category that only allows one choice (payments, database, backend, ...)
  can be filled in when empty, but not swapped once answered unless you pass
  --replace. Multi-select categories (analytics, testing, crash-reporting)
  just grow — --replace does not apply to them.

Swapping
  \`add supabase --replace\` swaps out whatever the project's backend
  category currently answers, inferred from the project itself — no need to
  name the old technology. Its own files (.cursor/rules/<id>.mdc,
  .claude/skills/<id>/, ...) are deleted, and merged output (package.json,
  .env.example, ...) is regenerated from scratch so it reflects only what is
  still selected. If any of the old technology's files were hand-edited
  since generation, the whole replace is refused and nothing changes — move
  or remove them yourself, then run it again.
`.trim();

/**
 * Adds one module to an existing selection, in place.
 *
 * Multi-select categories grow. Single-select categories fill in only when
 * empty — swapping an already-answered single-select is refused here rather
 * than silently done half-right, since this function has no way to remove
 * the previous module's files. `replaceChoice` below does that deliberately,
 * with the file cleanup that requires.
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
    `Run "add ${id} --replace" to swap "${current}" out for "${id}", deleting ${current}'s own files ` +
      `(refused instead if any of them were hand-edited since generation).`,
  );
}

/**
 * Swaps a single-select category's existing answer for `module`, in place —
 * the counterpart to `mergeChoice`'s refusal of exactly this case.
 *
 * Only decides *what the new selection should be* and validates that the
 * swap makes sense; it does not touch disk. Deleting the old module's own
 * files, and regenerating merged output (package.json, .env.example, ...)
 * from scratch so it reflects only what is still selected, is the caller's
 * job — see `runAdd`'s `--replace` branch, which uses
 * `src/core/vfs/preserve.ts`'s `removablePaths` for the file-safety check
 * this function deliberately does not attempt (it has no target directory to
 * inspect).
 *
 * Returns the id being replaced, or `undefined` when the category was empty
 * — filling an empty slot needs no cleanup, so the caller can treat that
 * exactly like a normal `add`.
 */
export function replaceChoice(
  selection: Selection,
  module: LoadedModule,
  category: CategoryQuestion,
): string | undefined {
  const current = selection.choices[category.id];
  const id = module.manifest.id;

  if (category.type === 'multi') {
    throw new GeneratorError(
      'INVALID_CONFIG',
      `--replace only applies to a single-select category; "${category.label}" allows more than one.`,
      `Run "add ${id}" without --replace to add it alongside what is already selected.`,
    );
  }

  if (current === undefined || current === NONE) {
    selection.choices[category.id] = id;
    return undefined;
  }

  if (current === id) {
    throw new GeneratorError(
      'ALREADY_SELECTED',
      `"${module.manifest.name}" is already part of this project.`,
    );
  }

  selection.choices[category.id] = id;
  // Single-select categories never hold an array — `current` is a plain id.
  return current as string;
}
