import fs from 'node:fs';
import path from 'node:path';
import type { CategoryQuestion, LoadedModule, Manifest, Preset } from '../types.js';
import { parseManifest } from './manifestSchema.js';
import { loadModuleAssets } from './moduleAssets.js';
import { loadPresets } from './loadPresets.js';
import { GeneratorError } from '../resolve/errors.js';

/** The always-on pseudo-module holding stack-agnostic content. */
export const BASE_MODULE_ID = 'base';

export interface Registry {
  /** Every discovered technology module, excluding base. */
  modules: LoadedModule[];
  /** The always-on base module, if `assets/base` exists. */
  base?: LoadedModule;
  categories: CategoryQuestion[];
  byId: Map<string, LoadedModule>;
  /** Curated stack bundles from `config/presets.json`, already validated. */
  presets: Preset[];
}

function readJson<T>(file: string): T {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch (error) {
    throw new GeneratorError(
      'INVALID_MANIFEST',
      `Could not read ${file}: ${(error as Error).message}`,
    );
  }
}

/**
 * Discovers every module by scanning the filesystem. This is the only place
 * that knows technologies exist at all — and it learns their names from
 * directory listings, never from source code.
 */
export function loadRegistry(rootDir: string): Registry {
  const technologiesDir = path.join(rootDir, 'technologies');
  const baseDir = path.join(rootDir, 'assets', 'base');
  const categoriesFile = path.join(rootDir, 'config', 'categories.json');

  const categories = loadCategories(categoriesFile);
  const byId = new Map<string, LoadedModule>();
  const modules: LoadedModule[] = [];

  if (fs.existsSync(technologiesDir)) {
    const entries = fs
      .readdirSync(technologiesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const moduleRoot = path.join(technologiesDir, entry.name);
      const manifestFile = path.join(moduleRoot, 'manifest.json');
      if (!fs.existsSync(manifestFile)) {
        throw new GeneratorError(
          'INVALID_MANIFEST',
          `technologies/${entry.name} has no manifest.json.`,
          'Every technology folder must declare a manifest.json. Remove the folder or add one.',
        );
      }

      const manifest = parseManifest(readJson<unknown>(manifestFile), manifestFile);
      if (manifest.id !== entry.name) {
        throw new GeneratorError(
          'INVALID_MANIFEST',
          `technologies/${entry.name}/manifest.json declares id "${manifest.id}".`,
          'The manifest id must match its folder name so ids stay unambiguous.',
        );
      }
      if (byId.has(manifest.id)) {
        throw new GeneratorError(
          'DUPLICATE_MODULE',
          `Module "${manifest.id}" is declared more than once.`,
          'Module ids must be unique across technologies/.',
        );
      }

      const loaded = loadModuleAssets(manifest, moduleRoot, false);
      byId.set(manifest.id, loaded);
      modules.push(loaded);
    }
  }

  let base: LoadedModule | undefined;
  if (fs.existsSync(baseDir)) {
    const baseManifest: Manifest = {
      id: BASE_MODULE_ID,
      name: 'Project Baseline',
      category: 'base',
      description: 'Stack-agnostic rules, skills, prompts and documentation.',
      requires: [],
      conflicts: [],
      dependencies: [],
      priority: 0,
    };
    base = loadModuleAssets(baseManifest, baseDir, true);
  }

  const presets = loadPresets(rootDir, categories, byId);

  return { modules, base, categories, byId, presets };
}

function loadCategories(file: string): CategoryQuestion[] {
  if (!fs.existsSync(file)) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      `Missing ${file}.`,
      'config/categories.json declares the wizard questions and must ship with the generator.',
    );
  }
  const parsed = readJson<CategoryQuestion[]>(file);
  if (!Array.isArray(parsed)) {
    throw new GeneratorError('INVALID_CONFIG', `${file} must contain an array of questions.`);
  }
  return [...parsed].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

/** Groups modules by manifest category — the wizard's option lists. */
export function groupByCategory(modules: LoadedModule[]): Map<string, LoadedModule[]> {
  const grouped = new Map<string, LoadedModule[]>();
  for (const module of modules) {
    const list = grouped.get(module.manifest.category) ?? [];
    list.push(module);
    grouped.set(module.manifest.category, list);
  }
  for (const list of grouped.values()) {
    list.sort(
      (a, b) =>
        a.manifest.priority - b.manifest.priority || a.manifest.id.localeCompare(b.manifest.id),
    );
  }
  return grouped;
}
