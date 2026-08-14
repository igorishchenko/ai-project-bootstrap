import type { BuildContext, LoadedModule, ModuleAsset } from '../core/types.js';
import { BASE_MODULE_ID } from '../core/registry/loadModules.js';
import { packAdditions, resolveRuleBody } from '../core/packs/resolve.js';

/**
 * Every AI coding tool this generator can emit rules for. `cursor` and
 * `claude` predate this list; the rest reuse the same source content through
 * `collectRuleSources` below rather than each module author writing N files.
 */
export const AI_TOOLS = [
  'cursor',
  'claude',
  'copilot',
  'gemini-cli',
  'continue',
  'cline',
  'roo',
] as const;

export type AiTool = (typeof AI_TOOLS)[number];

/** The wizard question gating which of `AI_TOOLS` actually get output. */
export const AI_TOOLS_CATEGORY = 'aiTools';

/** Today's implicit behavior, kept as the default for configs predating the question. */
export const DEFAULT_AI_TOOLS: readonly AiTool[] = ['cursor', 'claude'];

/**
 * Which AI tools should get generated rules for this build.
 *
 * A config saved before this question existed has no `aiTools` key at all —
 * that is treated as "the old default", not "nothing selected". An explicit
 * empty selection (the user deliberately unchecked everything) is respected.
 */
export function enabledAiTools(ctx: BuildContext): ReadonlySet<AiTool> {
  const answer = ctx.selection.choices[AI_TOOLS_CATEGORY];
  if (answer === undefined) return new Set(DEFAULT_AI_TOOLS);
  return new Set((Array.isArray(answer) ? answer : [answer]) as AiTool[]);
}

/** One rule's content, independent of which tool it will be rendered for. */
export interface RuleSource {
  /** Stable id: a module id, or the base topic's filename (`architecture`, ...). */
  id: string;
  name: string;
  description: string;
  /** Glob patterns the rule applies to, or undefined for "always applies". */
  globs: string[] | undefined;
  alwaysApply: boolean;
  /** Unrendered markdown, frontmatter stripped — still has `{{var}}` etc. */
  body: string;
  /** True for the project-wide base rule and its extra stack-agnostic topics. */
  isBase: boolean;
}

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

function splitFrontmatter(raw: string): { frontmatter: string; body: string } {
  const match = raw.match(FRONTMATTER);
  if (!match) return { frontmatter: '', body: raw };
  return { frontmatter: match[1] ?? '', body: (match[2] ?? '').replace(/^\n+/, '') };
}

function extractField(frontmatter: string, field: string): string | undefined {
  const match = frontmatter.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
  if (!match) return undefined;
  const value = match[1]?.trim() ?? '';
  return value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;
}

/** Extracts the `globs` array from a cursor-rule.mdc-style frontmatter block. */
export function extractGlobs(frontmatter: string | undefined): string[] | undefined {
  const match = frontmatter?.match(/^globs:\s*(\[.*\])\s*$/m);
  if (!match) return undefined;
  try {
    const parsed = JSON.parse(match[1] ?? '[]');
    return Array.isArray(parsed) && parsed.every((entry) => typeof entry === 'string')
      ? parsed
      : undefined;
  } catch {
    return undefined;
  }
}

function toRuleSource(
  id: string,
  name: string,
  raw: string,
  isBase: boolean,
  fallbackDescription: string,
): RuleSource {
  const { frontmatter, body } = splitFrontmatter(raw);
  return {
    id,
    name,
    description: extractField(frontmatter, 'description') ?? fallbackDescription,
    globs: extractGlobs(frontmatter),
    alwaysApply: extractField(frontmatter, 'alwaysApply') === 'true',
    body: body.trim(),
    isBase,
  };
}

/** A minimal YAML string: double-quoted, with embedded quotes escaped. */
export function yamlString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * Product names whose casing cannot be derived from a slug — `typescript`
 * title-cases to "Typescript", not "TypeScript". Only the base module's topic
 * filenames reach `titleCase`; every other rule takes its name straight from a
 * module manifest, which spells it correctly already.
 */
const KNOWN_CASING: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
};

function titleCase(slug: string): string {
  const known = KNOWN_CASING[slug];
  if (known) return known;
  return slug.replace(/(^|-)([a-z])/g, (_, sep: string, letter: string) =>
    sep ? ` ${letter.toUpperCase()}` : letter.toUpperCase(),
  );
}

/** One rule per module that ships a `cursor-rule.mdc`, base included. */
function moduleRuleSources(modules: readonly LoadedModule[]): RuleSource[] {
  return modules
    .filter((module): module is LoadedModule & { cursorRule: string } => Boolean(module.cursorRule))
    .map((module) =>
      toRuleSource(
        module.manifest.id,
        module.manifest.name,
        module.cursorRule,
        module.isBase,
        module.manifest.description,
      ),
    );
}

const BASE_TOPIC_PATH = /^_cursor\/rules\/([a-z0-9-]+)\.mdc$/;

/**
 * The base module's *extra* stack-agnostic rules (architecture, performance,
 * testing, typescript). These ship as pre-rendered templates mirrored
 * straight into `.cursor/rules/` and `.claude/skills/`, not through the
 * single-file `cursorRule`/`claudeSkill` fields every other module uses — so
 * they need to be found here to reach the other providers at all.
 */
function extraBaseRuleSources(base: LoadedModule | undefined): RuleSource[] {
  if (!base) return [];

  const matches: Array<{ asset: ModuleAsset; topic: string }> = [];
  for (const asset of base.templates) {
    const match = asset.relativePath.match(BASE_TOPIC_PATH);
    if (match?.[1]) matches.push({ asset, topic: match[1] });
  }

  return matches.map(({ asset, topic }) =>
    toRuleSource(topic, titleCase(topic), asset.content, true, `${titleCase(topic)} conventions`),
  );
}

/** Every module id this project resolved to — what a pack's `appliesTo` matches. */
export function selectedModuleIds(ctx: BuildContext): Set<string> {
  return new Set(ctx.modules.map((module) => module.manifest.id));
}

/**
 * A pack's added rules, as ordinary `RuleSource`s.
 *
 * Nothing downstream can tell these apart from a built-in rule, which is the
 * whole point: a pack reaches every AI tool format the generator supports
 * without one line of per-provider code.
 */
export function packRuleSources(ctx: BuildContext): RuleSource[] {
  return packAdditions(ctx.packs, selectedModuleIds(ctx)).map((addition) => ({
    id: addition.id,
    name: addition.name,
    description: addition.description,
    globs: addition.globs,
    alwaysApply: addition.globs === undefined,
    body: addition.content.trim(),
    // Not `isBase`: these are the organisation's rules, not the generator's
    // stack-agnostic ones, and a provider that treats the base rule specially
    // (Copilot writes it to a different path) must not treat these that way.
    isBase: false,
  }));
}

/**
 * Every rule this project should offer an AI tool, from every source: the
 * base project-wide rule, the base module's extra topics, one per selected
 * technology — each already overlaid with whatever the organisation's packs
 * extend or replace — and the packs' own added rules.
 *
 * `cursorBuilder` and `claudeBuilder` predate this and read `ctx.modules`
 * directly for the module set; every other provider builder should read this
 * instead of re-deriving it.
 */
export function collectRuleSources(ctx: BuildContext): RuleSource[] {
  const base = ctx.modules.find((module) => module.manifest.id === BASE_MODULE_ID);
  const built = [...moduleRuleSources(ctx.modules), ...extraBaseRuleSources(base)];

  const overlaid = built.map((source) => ({
    ...source,
    body: resolveRuleBody(source.id, source.body, ctx.packs).body,
  }));

  return [...overlaid, ...packRuleSources(ctx)];
}
