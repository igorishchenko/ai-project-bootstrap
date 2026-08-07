import type { Builder, Selection } from '../types.js';
import { loadRegistry, type Registry } from '../registry/loadModules.js';
import { readGeneratorPackageInfo } from '../registry/packageInfo.js';
import { gatingCategoryIds, validateSelection } from '../resolve/validate.js';
import { resolveSelection } from '../resolve/resolveSelection.js';
import { createBuildContext } from './buildContext.js';
import { runPipeline, type BuilderRun, type RunOptions } from './runPipeline.js';
import type { VirtualFs } from '../vfs/virtualFs.js';
import { summarizeCosts, type CostSummary } from '../pricing.js';

export interface GenerateInput {
  /** Generator root — the directory holding technologies/, assets/, config/. */
  rootDir: string;
  targetDir: string;
  selection: Selection;
  builders: Builder[];
  registry?: Registry;
  skip?: string[];
  onBuilder?: RunOptions['onBuilder'];
  /** Overrides the version recorded in the output — tests only; defaults to `rootDir`'s own package.json. */
  generatorVersion?: string;
}

export interface GenerateResult {
  vfs: VirtualFs;
  runs: BuilderRun[];
  warnings: string[];
  moduleNames: string[];
  autoIncluded: string[];
  costSummary: CostSummary;
}

/**
 * The whole pipeline, minus the wizard and disk write.
 *
 * Kept free of I/O beyond reading modules so tests can drive it directly with
 * a fixture selection and assert on the virtual tree.
 */
export function generate(input: GenerateInput): GenerateResult {
  const registry = input.registry ?? loadRegistry(input.rootDir);

  const availableCategories = new Set(registry.modules.map((module) => module.manifest.category));
  validateSelection(input.selection, registry.categories, registry.byId, availableCategories);

  const gating = gatingCategoryIds(registry.categories);
  const { modules, autoIncluded } = resolveSelection(input.selection, registry.byId, gating);

  const ctx = createBuildContext({
    rootDir: input.rootDir,
    projectName: input.selection.projectName,
    targetDir: input.targetDir,
    selection: input.selection,
    modules,
    categories: registry.categories,
    base: registry.base,
    generatorVersion: input.generatorVersion ?? readGeneratorPackageInfo(input.rootDir).version,
  });

  const { vfs, runs, warnings } = runPipeline(ctx, input.builders, {
    skip: input.skip,
    onBuilder: input.onBuilder,
  });

  return {
    vfs,
    runs,
    warnings,
    moduleNames: modules.map((module) => module.manifest.name),
    autoIncluded,
    costSummary: summarizeCosts(modules),
  };
}
