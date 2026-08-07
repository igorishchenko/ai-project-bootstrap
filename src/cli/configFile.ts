import fs from 'node:fs';
import type { Selection } from '../core/types.js';
import { GeneratorError } from '../core/resolve/errors.js';

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
