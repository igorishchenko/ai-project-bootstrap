/**
 * Core domain types.
 *
 * Nothing in this file — or anywhere under `src/` — may name a specific
 * technology. Technologies are data discovered at runtime from `technologies/`.
 */

import type { RulePack } from './packs/packTypes.js';

// Re-exported so a consumer of `ai-project-bootstrap/core` gets the pack types
// alongside everything else, rather than reaching into a subpath.
export type { PackFile, PackRef, PackRule, RulePack } from './packs/packTypes.js';

/**
 * Published pricing for a module's underlying service, as of whenever a
 * maintainer last checked — never inferred, always manually verified against
 * the vendor's own pricing page. `estimateUsd` only applies to `flat` and
 * `freemium`; `usage-based` and `free` modules leave it unset rather than
 * guess at a number that depends on the built app's own traffic.
 */
export interface Pricing {
  model: 'free' | 'flat' | 'usage-based' | 'freemium';
  estimateUsd?: number;
  notes?: string;
  url?: string;
}

/** Metadata every module exposes via `manifest.json`. */
export interface Manifest {
  id: string;
  name: string;
  category: string;
  description: string;
  /** Hard prerequisites. Pulled into the selection transitively. */
  requires: string[];
  /** Modules that cannot coexist with this one. */
  conflicts: string[];
  /** Soft edges: siblings this module integrates with when both are present. */
  dependencies: string[];
  /** Lower runs first. Used for deterministic ordering of merged output. */
  priority: number;
  /** Unset when the module has no cost of its own, or none worth stating. */
  pricing?: Pricing;
}

/** A single environment variable declared by a module's `env.md` table. */
export interface EnvVar {
  key: string;
  required: boolean;
  description: string;
  example: string;
}

/** A dependency declared by a module's `dependencies.json`. */
export interface DependencySpec {
  name: string;
  version: string;
  dev?: boolean;
  peer?: boolean;
  /** Marks a native module, surfaced in docs as needing a rebuild. */
  native?: boolean;
  notes?: string;
}

export interface DependenciesFile {
  packages?: DependencySpec[];
  /** Shell commands a human runs to install/configure (shown in docs). */
  install?: string[];
}

/** A file contributed by a module, already read from disk. */
export interface ModuleAsset {
  /** Path relative to the module root, e.g. `prompts/create-screen.md`. */
  relativePath: string;
  content: string;
}

/** A module after discovery: manifest plus every asset it declares. */
export interface LoadedModule {
  manifest: Manifest;
  /** Absolute path to the module directory. */
  root: string;
  /** True for the always-on `assets/base` pseudo-module. */
  isBase: boolean;
  setup?: string;
  ios?: string;
  android?: string;
  architecture?: string;
  cursorRule?: string;
  claudeSkill?: string;
  env: EnvVar[];
  folders: string[];
  packageFragment?: Record<string, unknown>;
  dependencies?: DependenciesFile;
  /**
   * Unrendered `dependencies.json` and `package.fragment.json`. Re-parsed per
   * build so a module can vary by what else was selected — a test runner needs
   * different tooling for a native app than a web one, and a web framework
   * must namespace its `start` script when a mobile platform also defines one.
   */
  dependenciesRaw?: string;
  packageFragmentRaw?: string;
  prompts: ModuleAsset[];
  checklists: ModuleAsset[];
  templates: ModuleAsset[];
}

/** A fixed option on a gating question, declared in config rather than by a module. */
export interface StaticChoice {
  value: string;
  label: string;
  hint?: string;
}

/** One wizard question, declared in `config/categories.json`. */
export interface CategoryQuestion {
  id: string;
  label: string;
  type: 'single' | 'multi';
  required: boolean;
  /** Offer an explicit "None" choice for single-select questions. */
  allowNone: boolean;
  order: number;
  /**
   * Fixed options, for a question that shapes the wizard rather than selecting
   * a technology — "are you building mobile, web, or both?". A category with
   * `choices` has no modules behind it, and its answer never reaches the
   * resolver.
   */
  choices?: StaticChoice[];
  /**
   * Only ask this question when an earlier answer matches. Keyed by category
   * id; the question is shown when *any* listed value was chosen.
   */
  showWhen?: Record<string, string[]>;
  /**
   * Pre-checked options for a multi-select gating question: used as the
   * initial selection shown interactively, and as the answer `--yes` accepts.
   * Ignored for single-select questions, which take their first choice.
   */
  defaultChoices?: string[];
}

/** True for a question whose answer is a wizard branch, not a module id. */
export function isGatingQuestion(category: CategoryQuestion): boolean {
  return Array.isArray(category.choices) && category.choices.length > 0;
}

/** The wizard's output — also what gets persisted for regeneration. */
export interface Selection {
  projectName: string;
  /** category id -> module id (single) or module ids (multi). */
  choices: Record<string, string | string[]>;
}

/**
 * A curated, named bundle of category answers — `config/presets.json`.
 * `choices` has the exact same shape as `Selection.choices`, so a preset is
 * validated and resolved through the same pipeline as a hand-written config.
 */
export interface Preset {
  id: string;
  name: string;
  description: string;
  choices: Record<string, string | string[]>;
}

/** Everything a builder is given. Builders must not read from disk. */
export interface BuildContext {
  /** Generator root — the directory holding technologies/, assets/, features/, config/. */
  rootDir: string;
  projectName: string;
  targetDir: string;
  selection: Selection;
  /** Resolved modules in deterministic order; `assets/base` first. */
  modules: LoadedModule[];
  categories: CategoryQuestion[];
  /** Non-fatal notes surfaced in the final report. */
  warnings: string[];
  /** The generator's own version at build time — recorded so `upgrade` can compare. */
  generatorVersion: string;
  /**
   * The organisation's own rule packs, already resolved and pinned.
   *
   * Empty for every project that has none, which is every project by default.
   * Builders never read this directly — `ruleSources.ts` folds packs into the
   * `RuleSource[]` they already consume, so no builder learns what a pack is.
   */
  packs: RulePack[];
}

export interface Builder {
  id: string;
  /** Human-readable label used in the CLI report line. */
  label: string;
  order: number;
  build(ctx: BuildContext, vfs: VirtualFsLike): void;
}

/** The subset of VirtualFs builders are allowed to touch. */
export interface VirtualFsLike {
  write(path: string, content: string): void;
  writeJson(path: string, value: unknown): void;
  mergeJson(path: string, value: Record<string, unknown>): void;
  mkdir(path: string): void;
  has(path: string): boolean;
  read(path: string): string | undefined;
  /** Sorted lists of everything written so far. */
  snapshot(): { files: string[]; directories: string[] };
}
