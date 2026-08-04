import type { EnvVar } from '../types.js';
import { GeneratorError } from '../resolve/errors.js';

const REQUIRED_HEADERS = ['key', 'required', 'description', 'example'];

function splitRow(line: string): string[] {
  // Drop the leading/trailing pipes, then split. Escaped pipes (\|) survive.
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replace(/\\\|/g, '|'));
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

/**
 * Extracts environment variables from a module's `env.md`.
 *
 * The spec names the file `env.md`, so it stays prose — but the machine-read
 * part is a single markdown table with Key / Required / Description / Example
 * columns. Any prose around the table is ignored, and a file with no table
 * simply declares no variables.
 */
export function parseEnvTable(markdown: string, sourcePath: string): EnvVar[] {
  const lines = markdown.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => {
    if (!line.trim().startsWith('|')) return false;
    const cells = splitRow(line).map((cell) => cell.toLowerCase());
    return REQUIRED_HEADERS.every((header) => cells.includes(header));
  });

  if (headerIndex === -1) {
    if (/^\s*\|/m.test(markdown)) {
      throw new GeneratorError(
        'INVALID_ENV_TABLE',
        `${sourcePath} contains a table but no header with the required columns.`,
        `Use columns: | ${REQUIRED_HEADERS.join(' | ')} |`,
      );
    }
    return [];
  }

  const header = splitRow(lines[headerIndex] ?? '').map((cell) => cell.toLowerCase());
  const columnOf = (name: string): number => header.indexOf(name);
  const keyCol = columnOf('key');
  const requiredCol = columnOf('required');
  const descriptionCol = columnOf('description');
  const exampleCol = columnOf('example');

  const vars: EnvVar[] = [];
  const seen = new Set<string>();

  for (let i = headerIndex + 1; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    if (!line.trim().startsWith('|')) break; // table ended
    const cells = splitRow(line);
    if (isSeparatorRow(cells)) continue;

    const key = (cells[keyCol] ?? '').replace(/`/g, '').trim();
    if (!key) continue;
    if (seen.has(key)) {
      throw new GeneratorError(
        'INVALID_ENV_TABLE',
        `${sourcePath} declares ${key} twice.`,
        'Each variable may appear only once per module.',
      );
    }
    seen.add(key);

    const requiredCell = (cells[requiredCol] ?? '').toLowerCase();
    vars.push({
      key,
      required: /yes|true|required|✅|✔/.test(requiredCell),
      description: (cells[descriptionCol] ?? '').trim(),
      example: (cells[exampleCol] ?? '').replace(/`/g, '').trim(),
    });
  }

  return vars;
}
