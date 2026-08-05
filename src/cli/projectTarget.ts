import os from 'node:os';
import path from 'node:path';
import { slugify } from '../core/pipeline/buildContext.js';
import { GeneratorError } from '../core/resolve/errors.js';

export interface ProjectTarget {
  /** The name templates and package.json see — always the final path segment. */
  projectName: string;
  /** Absolute directory the project is written to. */
  targetDir: string;
}

/**
 * True when an answer is meant as a location rather than a bare name.
 *
 * `./apps/my-app`, `apps/my-app`, `~/code/my-app` and `.` are locations;
 * `My App` is a name.
 */
export function looksLikePath(value: string): boolean {
  const trimmed = value.trim();
  return /[\\/]/.test(trimmed) || trimmed === '.' || trimmed === '..' || trimmed.startsWith('~');
}

/** Expands a leading `~` — shells do not when the value comes from a prompt. */
function expandHome(value: string): string {
  if (value === '~') return os.homedir();
  if (value.startsWith('~/') || value.startsWith('~\\')) {
    return path.join(os.homedir(), value.slice(2));
  }
  return value;
}

/**
 * Turns the project-name answer into a name and a destination.
 *
 * Typing a path creates it: `./apps/my-proj` writes to `<cwd>/apps/my-proj` and
 * names the project `my-proj`, so the folder and the project always agree. A
 * bare name keeps the old behaviour — the project lands in `./<slug>`.
 *
 * An explicit `--out` still wins over both; it is the only way to put a project
 * somewhere its name does not describe.
 */
export function resolveProjectTarget(input: {
  name: string;
  out?: string;
  cwd?: string;
}): ProjectTarget {
  const cwd = input.cwd ?? process.cwd();
  const raw = input.name.trim();

  if (raw.length === 0) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      'The project name is empty.',
      'Pass a name (my-app) or a path (./apps/my-app).',
    );
  }

  const asPath = looksLikePath(raw);
  // `.` names the project after the directory it is generated into, which is
  // what regenerating in place should do.
  const resolved = asPath ? path.resolve(cwd, expandHome(raw)) : undefined;
  const projectName = resolved ? path.basename(resolved) : raw;

  // A path whose last segment carries no letters or digits — `./apps/@@` or a
  // filesystem root — leaves nothing to name the project after.
  if (!/[a-z0-9]/i.test(projectName)) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      `Cannot derive a project name from "${raw}".`,
      'The last segment of the path becomes the project name — end it with one, like ./apps/my-app.',
    );
  }

  const targetDir = input.out
    ? path.resolve(cwd, expandHome(input.out))
    : (resolved ?? path.resolve(cwd, slugify(raw)));

  return { projectName, targetDir };
}

/** Prompt-time validation, so a bad answer is caught before the wizard runs. */
export function validateProjectInput(value: string): string | undefined {
  try {
    resolveProjectTarget({ name: value });
    return undefined;
  } catch (error) {
    return (error as Error).message;
  }
}
