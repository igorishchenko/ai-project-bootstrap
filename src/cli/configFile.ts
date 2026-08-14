import fs from 'node:fs';
import type { Selection } from '../core/types.js';
import { GeneratorError } from '../core/resolve/errors.js';
import { parsePackRef, type PackRef } from '../core/packs/packTypes.js';

/**
 * Loads and validates a saved selection — `ai-project.config.json`, or a
 * hand-written `--config` file with the same shape. Shared by the default
 * command's `--config` replay, `upgrade`, and anything else that needs to
 * read one back.
 */
export function loadSelectionFile(file: string): Selection {
  if (!fs.existsSync(file)) {
    throw new GeneratorError('INVALID_CONFIG', `No such config file: ${file}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      `${file} is not valid JSON: ${(error as Error).message}`,
    );
  }

  const selection = parsed as Partial<Selection>;
  if (typeof selection?.projectName !== 'string' || typeof selection?.choices !== 'object') {
    throw new GeneratorError(
      'INVALID_CONFIG',
      `${file} is not a valid selection.`,
      'It needs a "projectName" string and a "choices" object — see ai-project.config.json in a generated project.',
    );
  }
  return { projectName: selection.projectName, choices: selection.choices ?? {} };
}

/**
 * The rule packs a project was generated against, pinned.
 *
 * Absent on every project that has none, which is every project by default —
 * `[]`, not an error. Parsed strictly: an unpinned or malformed reference is a
 * refusal rather than a guess, since guessing here means generating rule files
 * that will not match their own fingerprints.
 */
export function readPinnedPacks(file: string): PackRef[] {
  if (!fs.existsSync(file)) return [];
  let parsed: { packs?: unknown };
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as { packs?: unknown };
  } catch {
    return [];
  }

  const raw = parsed.packs;
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.some((entry) => typeof entry !== 'string')) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      `${file} has a "packs" field that is not a list of strings.`,
      'It should look like ["acme-standards@2.1.0"].',
    );
  }

  return (raw as string[]).map(parsePackRef);
}

/**
 * The generator version recorded in a saved config, if any. Absent on a
 * project generated before this field existed — `undefined`, not an error.
 */
export function readRecordedGeneratorVersion(file: string): string | undefined {
  if (!fs.existsSync(file)) return undefined;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as { generatorVersion?: string };
    return parsed.generatorVersion;
  } catch {
    return undefined;
  }
}
