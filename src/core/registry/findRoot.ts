import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GeneratorError } from '../resolve/errors.js';

/**
 * Walks up from `startUrl` to the generator's own package root, so
 * `technologies/`, `assets/` and `config/` resolve whether the caller is
 * running from `dist/`, from source, or from inside node_modules. Shared by
 * the CLI and the server, each passing its own `import.meta.url`.
 */
export function findGeneratorRoot(startUrl: string): string {
  let dir = path.dirname(fileURLToPath(startUrl));

  for (let depth = 0; depth < 6; depth += 1) {
    if (fs.existsSync(path.join(dir, 'config', 'categories.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  throw new GeneratorError(
    'INVALID_CONFIG',
    'Could not locate the generator root (config/categories.json).',
    'Reinstall the package — its config/ and technologies/ directories must ship alongside dist/.',
  );
}
