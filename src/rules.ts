/**
 * `ai-project-bootstrap/rules` — the browser-safe half of the public surface.
 *
 * Everything here is pure: a schema, a set of per-tool dialects, and the
 * functions that turn one into the other. **Nothing in this entry point
 * imports `node:fs`**, which is the whole reason it exists separately from
 * `/core` — the pack editor runs in a browser, and a validator that only works
 * on a server is a validator an author does not get to see.
 *
 * `/core` remains the Node surface: registry loading, catalogue discovery,
 * anything that reads a directory.
 *
 * Keeping both means the hosted editor validates against the same schema the
 * CLI enforces, and previews through the same dialects the builders write. Two
 * copies of either would start out identical and quietly stop being so — and
 * the failure lands either on a colleague's machine at `pack add` time, or as a
 * preview that is believed and wrong.
 */

export type { PackFile, PackRef, PackRule, RulePack } from './core/packs/packTypes.js';
export {
  formatPackRef,
  packRuleSchema,
  parsePack,
  parsePackRef,
  rulePackSchema,
} from './core/packs/packTypes.js';

export type { PackAddition, ResolvedRuleBody } from './core/packs/resolve.js';
export { packAdditions, replacedModuleIds, resolveRuleBody } from './core/packs/resolve.js';

export type { RuleDialect, RuleFileTool } from './builders/ruleDialects.js';
export { RULE_DIALECTS, RULE_FILE_TOOLS, previewRule } from './builders/ruleDialects.js';

export type { AiTool, RuleSource } from './builders/ruleSources.js';
export { AI_TOOLS } from './builders/ruleSources.js';

export { BASE_MODULE_ID } from './core/registry/baseModuleId.js';
export type { GeneratorErrorCode } from './core/resolve/errors.js';
export { GeneratorError, isGeneratorError } from './core/resolve/errors.js';
