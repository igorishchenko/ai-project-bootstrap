import { BASE_MODULE_ID } from '../core/registry/baseModuleId.js';
import { type AiTool, type RuleSource, yamlString } from './ruleSources.js';

/**
 * Where each AI tool wants a rule, and what shape it wants it in.
 *
 * Extracted so there is exactly **one** definition of each dialect. The
 * provider builders render through this table, and so does `previewRule` —
 * which is what lets the pack editor show an author what Cursor versus Claude
 * Code will actually receive, rather than a second implementation that starts
 * out identical and quietly stops being so.
 *
 * Nothing here names a technology. `BASE_MODULE_ID` is the generator's own
 * always-on pseudo-module, not a technology id.
 */
export interface RuleDialect {
  /** The file this rule becomes, relative to the project root. */
  path(source: RuleSource): string;
  /** The finished file content, given an already-rendered body. */
  render(source: RuleSource, body: string): string;
}

function frontmatter(lines: string[], body: string): string {
  return `---\n${lines.join('\n')}\n---\n\n${body}`;
}

/**
 * The tools that receive a **file per rule**.
 *
 * `gemini-cli` is deliberately absent. It is a real option in the `aiTools`
 * question, but what it gets is the unconditional `GEMINI.md` the base module
 * ships — there is no per-rule Gemini output to render, and inventing a path
 * here would describe files nothing writes.
 */
export const RULE_FILE_TOOLS = [
  'cursor',
  'claude',
  'copilot',
  'continue',
  'cline',
  'roo',
] as const satisfies readonly AiTool[];

export type RuleFileTool = (typeof RULE_FILE_TOOLS)[number];

export const RULE_DIALECTS: Record<RuleFileTool, RuleDialect> = {
  cursor: {
    path: (source) => `.cursor/rules/${source.id}.mdc`,
    render: (source, body) =>
      frontmatter(
        [
          `description: ${yamlString(source.description)}`,
          ...(source.globs ? [`globs: ${JSON.stringify(source.globs)}`] : []),
          `alwaysApply: ${source.alwaysApply}`,
        ],
        body,
      ),
  },

  /*
   * Claude Code only discovers a skill as `<name>/SKILL.md` — a flat file is
   * invisible to the mechanism entirely.
   */
  claude: {
    path: (source) => `.claude/skills/${source.id}/SKILL.md`,
    render: (source, body) =>
      frontmatter(
        [
          `name: ${source.id}`,
          `description: ${yamlString(source.description)}`,
          ...(source.globs && source.globs.length > 0
            ? [`paths: ${JSON.stringify(source.globs)}`]
            : []),
        ],
        body,
      ),
  },

  /*
   * Copilot's two tiers: the project-wide rule is the repo-wide instructions
   * file, and everything else is path-scoped with `applyTo`.
   */
  copilot: {
    path: (source) =>
      source.id === BASE_MODULE_ID
        ? '.github/copilot-instructions.md'
        : `.github/instructions/${source.id}.instructions.md`,
    render: (source, body) => {
      if (source.id === BASE_MODULE_ID) return body;
      const applyTo = source.globs && source.globs.length > 0 ? source.globs.join(',') : '**';
      return frontmatter([`applyTo: ${yamlString(applyTo)}`], body);
    },
  },

  continue: {
    path: (source) => `.continue/rules/${source.id}.md`,
    render: (source, body) =>
      frontmatter(
        [
          `name: ${yamlString(source.name)}`,
          `description: ${yamlString(source.description)}`,
          ...(source.globs && source.globs.length > 0
            ? [`globs: ${JSON.stringify(source.globs)}`]
            : []),
          `alwaysApply: ${source.alwaysApply}`,
        ],
        body,
      ),
  },

  /* Cline's documented baseline is plain Markdown — every body opens with its
     own heading already, so there is nothing to synthesise. */
  cline: {
    path: (source) => `.clinerules/${source.id}.md`,
    render: (_source, body) => body,
  },

  /* Roo concatenates everything under `.roo/rules/` in filename order, with no
     per-file frontmatter. Same treatment as Cline. */
  roo: {
    path: (source) => `.roo/rules/${source.id}.md`,
    render: (_source, body) => body,
  },
};

/**
 * One rule as a given tool would receive it.
 *
 * The pack editor's preview. An author cannot otherwise tell what Cursor gets
 * versus what Claude Code gets — the bodies are the same and everything around
 * them is not — and guessing wrong is only discovered once a colleague's
 * assistant behaves oddly.
 */
export function previewRule(
  source: RuleSource,
  tool: RuleFileTool,
): { path: string; content: string } {
  const dialect = RULE_DIALECTS[tool];
  const content = dialect.render(source, source.body.trim());
  return {
    path: dialect.path(source),
    content: content.endsWith('\n') ? content : `${content}\n`,
  };
}
