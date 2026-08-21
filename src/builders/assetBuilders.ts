import path from 'node:path';
import type { Builder, BuildContext, LoadedModule, VirtualFsLike } from '../core/types.js';
import { render } from '../core/template/render.js';
import { templateData } from '../core/pipeline/buildContext.js';
import { BASE_MODULE_ID } from '../core/registry/loadModules.js';
import type { AiTool } from './ruleSources.js';
import { extractGlobs, enabledAiTools, packRuleSources, yamlString } from './ruleSources.js';
import { resolveRuleBody } from '../core/packs/resolve.js';
import {
  RESERVED_TEMPLATE_PREFIXES,
  outputPath,
  templatesUnder,
  unreservedTemplates,
} from './reserved.js';

/**
 * The builders that copy per-module assets into the project, rendering each
 * through the template engine so module content can adapt to the full stack.
 *
 * None of them branch on a module id — they read a well-known field or
 * directory, and a module that omits it contributes nothing.
 */

/**
 * Mirrors a template subtree into the project, warning when two modules claim
 * the same output path.
 *
 * The VFS only catches collisions *between* builders; within one builder a
 * later module would silently overwrite an earlier one. As the catalogue grows
 * that is exactly the kind of bug nobody notices, so it is surfaced here.
 */
function mirror(
  ctx: BuildContext,
  vfs: VirtualFsLike,
  pick: (module: LoadedModule) => Array<{ relativePath: string; content: string }>,
  toPath: (relativePath: string) => string,
): void {
  const data = templateData(ctx);
  const claimedBy = new Map<string, string>();

  for (const module of ctx.modules) {
    for (const asset of pick(module)) {
      const target = toPath(asset.relativePath);
      const owner = claimedBy.get(target);

      if (owner !== undefined) {
        ctx.warnings.push(
          `${module.manifest.name} overwrote ${target}, already provided by ${owner}.`,
        );
      }
      claimedBy.set(target, module.manifest.name);
      vfs.write(target, render(asset.content, data));
    }
  }
}

/**
 * Emits `.cursor/rules/<id>.mdc` for every module that ships a rule, plus the
 * base module's extra stack-agnostic rules (architecture, performance,
 * testing, typescript) — those ship as pre-written `.mdc` files rather than
 * through the single `cursorRule` field, since one module can only hold one.
 * Both are gated on the same `aiTools` answer, so disabling Cursor stops
 * every `.cursor/rules/*` file, not just the per-technology ones.
 */
export const cursorBuilder: Builder = {
  id: 'cursor',
  label: 'Generated Cursor Rules',
  order: 60,
  build(ctx, vfs) {
    if (!enabledAiTools(ctx).has('cursor')) return;
    const data = templateData(ctx);
    for (const module of ctx.modules) {
      if (!module.cursorRule) continue;
      vfs.write(
        `.cursor/rules/${module.manifest.id}.mdc`,
        ensureTrailingNewline(withPackOverlay(ctx, module.manifest.id, render(module.cursorRule, data))),
      );
    }

    const base = ctx.modules.find((module) => module.manifest.id === BASE_MODULE_ID);
    if (base) {
      for (const asset of templatesUnder(base, RESERVED_TEMPLATE_PREFIXES.cursorRules)) {
        const topic = asset.relativePath.replace(/\.mdc$/, '');
        vfs.write(
          `.cursor/rules/${asset.relativePath}`,
          ensureTrailingNewline(withPackOverlay(ctx, topic, render(asset.content, data))),
        );
      }
    }

    // The organisation's own added rules, in the same directory and the same
    // format. Nothing downstream can tell them apart from ours, which is what
    // makes a pack render into every tool without per-tool code.
    for (const source of packRuleSources(ctx)) {
      const frontmatter = [
        '---',
        `description: ${yamlString(render(source.description, data))}`,
        ...(source.globs ? [`globs: ${JSON.stringify(source.globs)}`] : []),
        `alwaysApply: ${source.alwaysApply}`,
        '---',
      ].join('\n');
      vfs.write(
        `.cursor/rules/${source.id}.mdc`,
        ensureTrailingNewline(`${frontmatter}\n\n${render(source.body, data)}`),
      );
    }
  },
};

/**
 * A rule's body after the organisation's packs have extended or replaced it.
 *
 * Applied to the *rendered* body so a pack's content sits below content the
 * template engine has already resolved — a pack is authored against the
 * finished rule somebody reads, not against its template source.
 */
function withPackOverlay(ctx: BuildContext, ruleId: string, rendered: string): string {
  if (ctx.packs.length === 0) return rendered;
  const { body } = resolveRuleBody(ruleId, rendered, ctx.packs);
  return body;
}

/**
 * Emits `.claude/skills/<id>/SKILL.md` for every module that ships a skill.
 *
 * Claude Code only discovers a skill in that exact shape — a directory named
 * for the skill, holding a `SKILL.md` whose frontmatter tells Claude when to
 * load it. A flat `<id>.md` file is invisible to that mechanism, so the
 * frontmatter is synthesised here rather than authored per module: every
 * module already has a one-line `description` in its manifest, and the same
 * `globs` its `cursor-rule.mdc` uses to scope Cursor's rule become the
 * skill's `paths`, so both tools activate on the same files without the
 * content being duplicated anywhere.
 */
export const claudeBuilder: Builder = {
  id: 'claude',
  label: 'Generated Claude Skills',
  order: 70,
  build(ctx, vfs) {
    if (!enabledAiTools(ctx).has('claude')) return;
    const data = templateData(ctx);
    for (const module of ctx.modules) {
      if (!module.claudeSkill) continue;
      const body = withPackOverlay(ctx, module.manifest.id, render(module.claudeSkill, data));
      vfs.write(
        `.claude/skills/${module.manifest.id}/SKILL.md`,
        ensureTrailingNewline(`${skillFrontmatter(module)}\n\n${body}`),
      );
    }

    // The base module's extra skills (architecture, performance, testing,
    // typescript) carry their own hand-written frontmatter, unlike the synthesized
    // frontmatter above — mirrored verbatim, just rendered and gated the same way.
    const base = ctx.modules.find((module) => module.manifest.id === BASE_MODULE_ID);
    if (base) {
      for (const asset of templatesUnder(base, RESERVED_TEMPLATE_PREFIXES.claudeSkills)) {
        // `<topic>/SKILL.md` — the topic is the directory, which is the same id
        // the Cursor side uses, so one pack rule reaches both.
        const topic = asset.relativePath.split('/')[0] ?? asset.relativePath;
        vfs.write(
          `.claude/skills/${asset.relativePath}`,
          ensureTrailingNewline(withPackOverlay(ctx, topic, render(asset.content, data))),
        );
      }
    }

    for (const source of packRuleSources(ctx)) {
      const frontmatter = [
        '---',
        `name: ${source.id}`,
        `description: ${yamlString(render(source.description, data))}`,
        ...(source.globs && source.globs.length > 0
          ? [`paths: ${JSON.stringify(source.globs)}`]
          : []),
        '---',
      ].join('\n');
      vfs.write(
        `.claude/skills/${source.id}/SKILL.md`,
        ensureTrailingNewline(`${frontmatter}\n\n${render(source.body, data)}`),
      );
    }
  },
};

function skillDescription(module: LoadedModule): string {
  return module.isBase
    ? `${module.manifest.description} Read this before any other skill.`
    : `${module.manifest.description} Read before writing code that touches ${module.manifest.name}.`;
}

function skillFrontmatter(module: LoadedModule): string {
  const lines = [
    '---',
    `name: ${module.manifest.id}`,
    `description: ${yamlString(skillDescription(module))}`,
  ];
  const globs = extractGlobs(module.cursorRule);
  if (globs && globs.length > 0) lines.push(`paths: ${JSON.stringify(globs)}`);
  lines.push('---');
  return lines.join('\n');
}

/** Copies every module's `prompts/` into the project's `prompts/`. */
export const promptBuilder: Builder = {
  id: 'prompts',
  label: 'Generated prompts',
  order: 80,
  build(ctx, vfs) {
    copyNamespaced(ctx, vfs, 'prompts', (module) => module.prompts);
  },
};

/** Copies every module's `checklists/` into the project's `checklists/`. */
export const checklistBuilder: Builder = {
  id: 'checklists',
  label: 'Generated checklists',
  order: 90,
  build(ctx, vfs) {
    copyNamespaced(ctx, vfs, 'checklists', (module) => module.checklists);
  },
};

/** Mirrors `templates/github/**` into `.github/`. */
export const githubBuilder: Builder = {
  id: 'github',
  label: 'Generated GitHub configuration',
  order: 100,
  build(ctx, vfs) {
    mirror(
      ctx,
      vfs,
      (module) => templatesUnder(module, RESERVED_TEMPLATE_PREFIXES.github),
      (relativePath) => `.github/${outputPath(relativePath)}`,
    );
  },
};

/** Mirrors `templates/hygiene/**` (lint, format, hooks) to the project root. */
export const hygieneBuilder: Builder = {
  id: 'hygiene',
  label: 'Generated lint, format and commit hooks',
  order: 110,
  build(ctx, vfs) {
    mirror(
      ctx,
      vfs,
      (module) => templatesUnder(module, RESERVED_TEMPLATE_PREFIXES.hygiene),
      outputPath,
    );
  },
};

/** Mirrors every unreserved `templates/**` path into the project root. */
export const templateBuilder: Builder = {
  id: 'templates',
  label: 'Generated project templates',
  order: 115,
  build(ctx, vfs) {
    mirror(ctx, vfs, unreservedTemplates, outputPath);
  },
};

/**
 * Root files a tool reads by name rather than through a rules directory.
 *
 * README.md, CLAUDE.md and AGENTS.md are deliberately absent: the first two
 * double as this project's own documentation and AGENTS.md is the tool-agnostic
 * convention, so all three ship whatever was chosen. GEMINI.md is only ever
 * read by one tool, which makes it the one root file that should follow the
 * `aiTools` answer — before this, selecting or deselecting Gemini CLI changed
 * nothing at all.
 */
const ROOT_FILES_BY_TOOL: ReadonlyMap<string, AiTool> = new Map([['GEMINI.md', 'gemini-cli']]);

/** Renders `templates/root/**` — README.md, CLAUDE.md, AGENTS.md, GEMINI.md — last. */
export const readmeBuilder: Builder = {
  id: 'readme',
  label: 'Generated README, CLAUDE.md, AGENTS.md and GEMINI.md',
  order: 120,
  build(ctx, vfs) {
    const enabled = enabledAiTools(ctx);
    mirror(
      ctx,
      vfs,
      (module) =>
        templatesUnder(module, RESERVED_TEMPLATE_PREFIXES.root).filter((asset) => {
          const tool = ROOT_FILES_BY_TOOL.get(outputPath(asset.relativePath));
          return tool === undefined || enabled.has(tool);
        }),
      outputPath,
    );
  },
};

/**
 * Copies a module directory into a shared output folder.
 *
 * Base content keeps its plain filename (`prompts/fix-bug.md`); a technology
 * that ships a file of the same name is namespaced (`prompts/expo.fix-bug.md`)
 * rather than silently overwriting it.
 */
function copyNamespaced(
  ctx: BuildContext,
  vfs: VirtualFsLike,
  outputDir: string,
  pick: (module: LoadedModule) => Array<{ relativePath: string; content: string }>,
): void {
  const data = templateData(ctx);
  const claimed = new Set<string>();

  for (const module of ctx.modules) {
    for (const asset of pick(module)) {
      const preferred = `${outputDir}/${asset.relativePath}`;
      const target = claimed.has(preferred)
        ? `${outputDir}/${prefixBasename(asset.relativePath, module.manifest.id)}`
        : preferred;

      if (target !== preferred) {
        ctx.warnings.push(
          `${module.manifest.name} also ships ${asset.relativePath}; wrote it as ${target}.`,
        );
      }
      claimed.add(target);
      vfs.write(target, ensureTrailingNewline(render(asset.content, data)));
    }
  }
}

function prefixBasename(relativePath: string, prefix: string): string {
  const dir = path.posix.dirname(relativePath);
  const base = path.posix.basename(relativePath);
  return dir === '.' ? `${prefix}.${base}` : `${dir}/${prefix}.${base}`;
}

function ensureTrailingNewline(content: string): string {
  return content.endsWith('\n') ? content : `${content}\n`;
}
