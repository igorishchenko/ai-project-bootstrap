import fs from 'node:fs';
import path from 'node:path';
import type { CategoryQuestion, LoadedModule, ModuleAsset, Selection } from '../types.js';
import { GeneratorError } from '../resolve/errors.js';
import { gatingCategoryIds, validateSelection } from '../resolve/validate.js';
import { resolveSelection } from '../resolve/resolveSelection.js';

/**
 * A full app starter — a preset-shaped `choices` selection plus real starter
 * source (`scaffold/**`), mirrored into the project root the same way a
 * `technologies/*` module's `templates/**` is. Deliberately not part of
 * `Registry`/`loadRegistry()`: like `features/`, nothing pays for reading
 * `scaffold/**` content except `--archetype` itself.
 */
export interface ArchetypeManifest {
  id: string;
  name: string;
  description: string;
  choices: Selection['choices'];
}

export interface Archetype {
  manifest: ArchetypeManifest;
  scaffold: ModuleAsset[];
  /** Merged into `package.json` — same `package.fragment.json` convention `technologies/*` uses. */
  packageFragment?: Record<string, unknown>;
}

function readJson<T>(file: string): T {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch (error) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      `Could not read ${file}: ${(error as Error).message}`,
    );
  }
}

function byName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name);
}

/** Recursively collects every file under `dir`, relative to it — same shape as `loadFeatures.ts`'s. */
function readTree(root: string, relative: string): ModuleAsset[] {
  const base = path.join(root, relative);
  if (!fs.existsSync(base)) return [];

  const assets: ModuleAsset[] = [];
  const walk = (current: string): void => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort(byName)) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        assets.push({
          relativePath: path.relative(base, full).split(path.sep).join('/'),
          content: fs.readFileSync(full, 'utf8'),
        });
      }
    }
  };
  walk(base);
  return assets;
}

/** Every archetype id currently on disk — used only to name what's available in an error message. */
export function listArchetypeIds(rootDir: string): string[] {
  const archetypesDir = path.join(rootDir, 'archetypes');
  if (!fs.existsSync(archetypesDir)) return [];
  return fs
    .readdirSync(archetypesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort();
}

/**
 * Loads and validates one archetype by id — its `choices` through the exact
 * same pipeline a preset's `choices` goes through (`validateSelection` then
 * `resolveSelection`), so an archetype that references a dropped module id,
 * or bundles two conflicting ones, fails loudly rather than generating a
 * broken project.
 */
export function loadArchetype(
  rootDir: string,
  id: string,
  byId: Map<string, LoadedModule>,
  categories: CategoryQuestion[],
): Archetype {
  const archetypeRoot = path.join(rootDir, 'archetypes', id);
  if (!fs.existsSync(archetypeRoot)) {
    const known = listArchetypeIds(rootDir);
    throw new GeneratorError(
      'INVALID_CONFIG',
      `Unknown archetype "${id}".`,
      known.length > 0 ? `Available: ${known.join(', ')}.` : 'No archetypes are installed.',
    );
  }

  const manifestFile = path.join(archetypeRoot, 'manifest.json');
  if (!fs.existsSync(manifestFile)) {
    throw new GeneratorError('INVALID_CONFIG', `archetypes/${id} has no manifest.json.`);
  }

  const raw = readJson<Partial<ArchetypeManifest>>(manifestFile);
  if (
    typeof raw.id !== 'string' ||
    typeof raw.name !== 'string' ||
    typeof raw.description !== 'string' ||
    typeof raw.choices !== 'object' ||
    raw.choices === null
  ) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      `${manifestFile} must declare "id", "name", "description" (strings) and "choices" (object).`,
    );
  }
  if (raw.id !== id) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      `${manifestFile} declares id "${raw.id}", which must match its folder name ("${id}").`,
    );
  }

  const availableCategories = new Set([...byId.values()].map((module) => module.manifest.category));
  const gating = gatingCategoryIds(categories);
  const selection: Selection = { projectName: `archetype:${id}`, choices: raw.choices };
  try {
    validateSelection(selection, categories, byId, availableCategories);
    resolveSelection(selection, byId, gating);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new GeneratorError(
      'INVALID_CONFIG',
      `${manifestFile} has an invalid selection — ${reason}`,
      `Fix "choices" in ${manifestFile}, or drop the offending category.`,
    );
  }

  const manifest: ArchetypeManifest = {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    choices: raw.choices,
  };

  const packageFragmentFile = path.join(archetypeRoot, 'package.fragment.json');
  const packageFragment = fs.existsSync(packageFragmentFile)
    ? readJson<Record<string, unknown>>(packageFragmentFile)
    : undefined;

  return { manifest, scaffold: readTree(archetypeRoot, 'scaffold'), packageFragment };
}
