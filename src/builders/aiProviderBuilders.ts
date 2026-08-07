import type { Builder, BuildContext } from '../core/types.js';
import { render } from '../core/template/render.js';
import { templateData } from '../core/pipeline/buildContext.js';
import { BASE_MODULE_ID } from '../core/registry/loadModules.js';
import {
  type AiTool,
  type RuleSource,
  collectRuleSources,
  enabledAiTools,
  yamlString,
} from './ruleSources.js';

/**
 * Builders for the AI tools that reuse `collectRuleSources` instead of a
 * dedicated per-module source file — see `ruleSources.ts` for where the
 * content actually comes from. `cursorBuilder` and `claudeBuilder` predate
 * this and stay independent in `assetBuilders.ts`.
 */

function ensureTrailingNewline(content: string): string {
  return content.endsWith('\n') ? content : `${content}\n`;
}

function buildRuleFiles(
  ctx: BuildContext,
  tool: AiTool,
  toPath: (source: RuleSource) => string,
  render_: (source: RuleSource, renderedBody: string) => string,
): Array<{ path: string; content: string }> {
  if (!enabledAiTools(ctx).has(tool)) return [];
  const data = templateData(ctx);
  return collectRuleSources(ctx).map((source) => ({
    path: toPath(source),
    content: ensureTrailingNewline(render_(source, render(source.body, data))),
  }));
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
    for (const file of buildRuleFiles(
      ctx,
      'copilot',
      (source) =>
        source.id === BASE_MODULE_ID
          ? '.github/copilot-instructions.md'
          : `.github/instructions/${source.id}.instructions.md`,
      (source, body) => {
        if (source.id === BASE_MODULE_ID) return body;
        const applyTo = source.globs && source.globs.length > 0 ? source.globs.join(',') : '**';
        return `---\napplyTo: ${yamlString(applyTo)}\n---\n\n${body}`;
      },
    )) {
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
    for (const file of buildRuleFiles(
      ctx,
      'continue',
      (source) => `.continue/rules/${source.id}.md`,
      (source, body) => {
        const lines = [
          '---',
          `name: ${yamlString(source.name)}`,
          `description: ${yamlString(source.description)}`,
        ];
        if (source.globs && source.globs.length > 0) {
          lines.push(`globs: ${JSON.stringify(source.globs)}`);
        }
        lines.push(`alwaysApply: ${source.alwaysApply}`, '---');
        return `${lines.join('\n')}\n\n${body}`;
      },
    )) {
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
    for (const file of buildRuleFiles(
      ctx,
      'cline',
      (source) => `.clinerules/${source.id}.md`,
      (_source, body) => body,
    )) {
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
    for (const file of buildRuleFiles(
      ctx,
      'roo',
      (source) => `.roo/rules/${source.id}.md`,
      (_source, body) => body,
    )) {
      vfs.write(file.path, file.content);
    }
  },
};
