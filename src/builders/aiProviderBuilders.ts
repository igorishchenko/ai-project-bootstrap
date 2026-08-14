import type { Builder, BuildContext } from '../core/types.js';
import { type TemplateData, render } from '../core/template/render.js';
import { templateData } from '../core/pipeline/buildContext.js';
import { type RuleSource, collectRuleSources, enabledAiTools } from './ruleSources.js';
import { RULE_DIALECTS, type RuleFileTool } from './ruleDialects.js';

/**
 * Builders for the AI tools that reuse `collectRuleSources` instead of a
 * dedicated per-module source file — see `ruleSources.ts` for where the
 * content actually comes from. `cursorBuilder` and `claudeBuilder` predate
 * this and stay independent in `assetBuilders.ts`.
 */

function ensureTrailingNewline(content: string): string {
  return content.endsWith('\n') ? content : `${content}\n`;
}

/**
 * Renders every part of a rule that can reach the output, not just the body.
 *
 * `toRuleSource` lifts `name`, `description` and `globs` out of the raw source
 * frontmatter verbatim, so a `{{projectName}}` in a `description:` field (as in
 * `assets/base/cursor-rule.mdc`) survives unrendered into any provider that
 * writes those fields back out — Continue today. `id` is deliberately left
 * alone: it is a slug that only ever becomes a file path.
 */
function renderRuleSource(source: RuleSource, data: TemplateData): RuleSource {
  return {
    ...source,
    name: render(source.name, data),
    description: render(source.description, data),
    globs: source.globs?.map((glob) => render(glob, data)),
    body: render(source.body, data),
  };
}

/**
 * Every rule this tool should receive, in this tool's own dialect.
 *
 * The dialect comes from `RULE_DIALECTS` rather than being spelled out per
 * builder, so the pack editor's preview and the file actually written here are
 * the same function — a preview that drifts from the output is worse than no
 * preview, because it is believed.
 */
function buildRuleFiles(
  ctx: BuildContext,
  tool: RuleFileTool,
): Array<{ path: string; content: string }> {
  if (!enabledAiTools(ctx).has(tool)) return [];
  const data = templateData(ctx);
  const dialect = RULE_DIALECTS[tool];
  return collectRuleSources(ctx).map((source) => {
    const rendered = renderRuleSource(source, data);
    return {
      path: dialect.path(rendered),
      content: ensureTrailingNewline(dialect.render(rendered, rendered.body)),
    };
  });
}

/**
 * Emits GitHub Copilot's two-tier convention: the project-wide rule becomes
 * the repo-wide `.github/copilot-instructions.md`, and every other rule
 * (the base module's extra topics, plus one per technology) becomes a
 * path-specific `.github/instructions/<id>.instructions.md` scoped with
 * `applyTo`, matching what GitHub's own docs recommend moving language- and
 * technology-specific rules into.
 */
export const copilotBuilder: Builder = {
  id: 'copilot',
  label: 'Generated GitHub Copilot instructions',
  order: 62,
  build(ctx, vfs) {
    for (const file of buildRuleFiles(ctx, 'copilot')) {
      vfs.write(file.path, file.content);
    }
  },
};

/** Emits `.continue/rules/<id>.md`, one per rule, with Continue's own frontmatter fields. */
export const continueBuilder: Builder = {
  id: 'continue',
  label: 'Generated Continue.dev rules',
  order: 64,
  build(ctx, vfs) {
    for (const file of buildRuleFiles(ctx, 'continue')) {
      vfs.write(file.path, file.content);
    }
  },
};

/**
 * Emits `.clinerules/<id>.md`. Cline's documented baseline is plain Markdown
 * with no required frontmatter — every rule body already opens with its own
 * `# Heading` (the same content Cursor renders), so no synthesis is needed.
 */
export const clineBuilder: Builder = {
  id: 'cline',
  label: 'Generated Cline rules',
  order: 66,
  build(ctx, vfs) {
    for (const file of buildRuleFiles(ctx, 'cline')) {
      vfs.write(file.path, file.content);
    }
  },
};

/**
 * Emits `.roo/rules/<id>.md`. Roo Code concatenates every file under
 * `.roo/rules/` in filename order with no per-file frontmatter, so this is
 * the same plain-body treatment as Cline.
 */
export const rooBuilder: Builder = {
  id: 'roo',
  label: 'Generated Roo Code rules',
  order: 68,
  build(ctx, vfs) {
    for (const file of buildRuleFiles(ctx, 'roo')) {
      vfs.write(file.path, file.content);
    }
  },
};
