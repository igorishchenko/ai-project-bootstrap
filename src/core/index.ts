/**
 * Public API surface for `ai-project-bootstrap/core` — the pieces a
 * consumer outside this repo (e.g. a hosted service built on the same
 * catalog) needs: types, registry loading, and selection
 * validation/resolution. None of this contains secrets; it's the same
 * domain logic the CLI itself runs on.
 */
export type {
  Manifest,
  Pricing,
  EnvVar,
  DependencySpec,
  DependenciesFile,
  ModuleAsset,
  LoadedModule,
  StaticChoice,
  CategoryQuestion,
  Selection,
  Preset,
} from './types.js';
export { isGatingQuestion } from './types.js';

/**
 * Rule packs. Exported so the hosted service validates a pack against the
 * *same* schema the CLI enforces, rather than a second copy that can disagree
 * — a pack that fails validation must fail at publish time, in the browser,
 * not at `pack add` time on a stranger's machine.
 */
export type { PackFile, PackRef, PackRule, RulePack } from './packs/packTypes.js';
export {
  formatPackRef,
  packRuleSchema,
  parsePack,
  parsePackRef,
  rulePackSchema,
} from './packs/packTypes.js';

export type { Registry } from './registry/loadModules.js';
export { loadRegistry, groupByCategory, BASE_MODULE_ID } from './registry/loadModules.js';
export { findGeneratorRoot } from './registry/findRoot.js';

export {
  NONE,
  selectedModuleIds,
  gatingCategoryIds,
  validateSelection,
} from './resolve/validate.js';
export type { ResolveResult } from './resolve/resolveSelection.js';
export { resolveSelection } from './resolve/resolveSelection.js';
export type { GeneratorErrorCode } from './resolve/errors.js';
export { GeneratorError, isGeneratorError } from './resolve/errors.js';
