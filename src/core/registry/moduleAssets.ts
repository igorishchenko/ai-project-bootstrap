import fs from 'node:fs';
import path from 'node:path';
import type { DependenciesFile, LoadedModule, Manifest, ModuleAsset } from '../types.js';
import { parseEnvTable } from './envTable.js';
import { GeneratorError } from '../resolve/errors.js';

/**
 * The module file contract. Builders read these fields; they never touch disk
 * and never look for a file by technology name. Every entry is optional — a
 * module that omits a file simply contributes nothing to that builder.
 */
const FILES = {
  setup: 'setup.md',
  ios: 'ios.md',
  android: 'android.md',
  architecture: 'architecture.md',
  cursorRule: 'cursor-rule.mdc',
  claudeSkill: 'claude-skill.md',
  env: 'env.md',
  folders: 'folders.json',
  packageFragment: 'package.fragment.json',
  dependencies: 'dependencies.json',
} as const;

const DIRS = {
  prompts: 'prompts',
  checklists: 'checklists',
  templates: 'templates',
} as const;

function readIfPresent(root: string, relative: string): string | undefined {
  const full = path.join(root, relative);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : undefined;
}

function readJsonIfPresent<T>(root: string, relative: string): T | undefined {
  const raw = readIfPresent(root, relative);
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new GeneratorError(
      'INVALID_MANIFEST',
      `${path.join(root, relative)} is not valid JSON: ${(error as Error).message}`,
      'Fix the syntax — trailing commas and comments are not allowed in .json files.',
    );
  }
}

/** Recursively collects every file under `dir`, relative to it. */
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
          // Always POSIX separators — these become paths in the output tree.
          relativePath: path.relative(base, full).split(path.sep).join('/'),
          content: fs.readFileSync(full, 'utf8'),
        });
      }
    }
  };
  walk(base);
  return assets;
}

function byName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name);
}

/** Reads every declared asset for one module directory. */
export function loadModuleAssets(manifest: Manifest, root: string, isBase: boolean): LoadedModule {
  const envMarkdown = readIfPresent(root, FILES.env);
  const folders = readJsonIfPresent<string[]>(root, FILES.folders) ?? [];

  if (!Array.isArray(folders)) {
    throw new GeneratorError(
      'INVALID_MANIFEST',
      `${path.join(root, FILES.folders)} must be an array of folder paths.`,
      'Example: ["app/payments", "services/payments"]',
    );
  }

  return {
    manifest,
    root,
    isBase,
    setup: readIfPresent(root, FILES.setup),
    ios: readIfPresent(root, FILES.ios),
    android: readIfPresent(root, FILES.android),
    architecture: readIfPresent(root, FILES.architecture),
    cursorRule: readIfPresent(root, FILES.cursorRule),
    claudeSkill: readIfPresent(root, FILES.claudeSkill),
    env: envMarkdown ? parseEnvTable(envMarkdown, path.join(root, FILES.env)) : [],
    folders,
    packageFragment: readJsonIfPresent<Record<string, unknown>>(root, FILES.packageFragment),
    dependencies: readJsonIfPresent<DependenciesFile>(root, FILES.dependencies),
    prompts: readTree(root, DIRS.prompts),
    checklists: readTree(root, DIRS.checklists),
    templates: readTree(root, DIRS.templates),
  };
}

export const MODULE_FILE_CONTRACT = { ...FILES, ...DIRS };
