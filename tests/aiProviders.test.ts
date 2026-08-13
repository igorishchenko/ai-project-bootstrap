import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { generate } from '../src/core/pipeline/generate.js';
import { loadRegistry } from '../src/core/registry/loadModules.js';
import { builders } from '../src/builders/index.js';
import { AI_TOOLS, collectRuleSources, enabledAiTools } from '../src/builders/ruleSources.js';
import type { BuildContext, Selection } from '../src/core/types.js';
import { makeModule } from './helpers/modules.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registry = loadRegistry(ROOT);

const base: Selection = {
  projectName: 'Demo App',
  choices: { target: 'web', web: 'nextjs', payments: 'stripe' },
};

function run(selection: Selection) {
  return generate({ rootDir: ROOT, targetDir: '/virtual/out', selection, builders, registry });
}

function withAiTools(tools: string[] | undefined): Selection {
  if (tools === undefined) return base;
  return { ...base, choices: { ...base.choices, aiTools: tools } };
}

describe('AI provider builders', () => {
  it('defaults to cursor + claude only when aiTools is absent, matching pre-existing behavior', () => {
    const files = run(withAiTools(undefined)).vfs.snapshot().files;

    expect(files).toContain('.cursor/rules/stripe.mdc');
    expect(files).toContain('.claude/skills/stripe/SKILL.md');
    expect(files).not.toContain('.github/copilot-instructions.md');
    expect(files).not.toContain('.github/instructions/stripe.instructions.md');
    expect(files.some((f) => f.startsWith('.continue/'))).toBe(false);
    expect(files.some((f) => f.startsWith('.clinerules/'))).toBe(false);
    expect(files.some((f) => f.startsWith('.roo/'))).toBe(false);
  });

  it('an explicit empty selection produces no provider-specific rule files at all', () => {
    const files = run(withAiTools([])).vfs.snapshot().files;

    for (const prefix of [
      '.cursor/rules/',
      '.claude/skills/',
      '.github/instructions/',
      '.continue/rules/',
      '.clinerules/',
      '.roo/rules/',
    ]) {
      expect(
        files.some((f) => f.startsWith(prefix)),
        `expected nothing under ${prefix}`,
      ).toBe(false);
    }
    expect(files).not.toContain('.github/copilot-instructions.md');
    // Root docs stay unconditional, same as README/CLAUDE.md/AGENTS.md.
    expect(files).toContain('GEMINI.md');
  });

  it('selecting only copilot produces no cursor or claude rules, including the stack-agnostic base ones', () => {
    const files = run(withAiTools(['copilot'])).vfs.snapshot().files;

    // .cursor/settings.json is editor hygiene config, not a rule file, and
    // stays unconditional — only .cursor/rules/* is gated by aiTools.
    expect(files.some((f) => f.startsWith('.cursor/rules/'))).toBe(false);
    expect(files.some((f) => f.startsWith('.claude/skills/'))).toBe(false);
    expect(files).toContain('.github/copilot-instructions.md');
    expect(files).toContain('.github/instructions/stripe.instructions.md');
    // The base module's extra topics must reach every enabled provider, not
    // just Cursor/Claude, since a module only ever authors one cursor-rule.mdc.
    expect(files).toContain('.github/instructions/typescript.instructions.md');
  });

  it('splits Copilot output the way GitHub recommends: repo-wide vs. path-specific', () => {
    const result = run(withAiTools(['copilot']));
    const read = (file: string): string => result.vfs.read(file) as string;

    const repoWide = read('.github/copilot-instructions.md');
    expect(repoWide).not.toMatch(/^---/);
    expect(repoWide).toContain('Demo App');

    const scoped = read('.github/instructions/stripe.instructions.md');
    expect(scoped).toMatch(/^---\napplyTo: "[^"]+"\n---\n\n# Stripe/);
  });

  it('gives every Continue rule its own frontmatter, matching the cursor-rule.mdc globs', () => {
    const result = run(withAiTools(['continue']));
    const content = result.vfs.read('.continue/rules/stripe.md') as string;

    expect(content).toMatch(/^---\nname: "Stripe"\n/);
    expect(content).toContain(
      'globs: ["server/**","api/**","app/api/**","src/services/payments/**"]',
    );
    expect(content).toContain('alwaysApply: false');
    expect(content).toContain('# Stripe');
  });

  it('renders the frontmatter Continue writes, not just the rule body', () => {
    // Regression: `description` is lifted verbatim out of the source
    // frontmatter by `toRuleSource`, so only the body went through `render` —
    // shipping a literal `{{projectName}}` to anyone who picked Continue.
    const result = run(withAiTools(['continue']));

    expect(result.vfs.read('.continue/rules/base.md')).toContain(
      'description: "Project-wide conventions for Demo App"',
    );
    expect(result.vfs.read('.continue/rules/architecture.md')).toContain(
      'description: "Architectural constraints for Demo App"',
    );
  });

  it('spells product names the way the product does, not the way the slug does', () => {
    const result = run(withAiTools(['continue']));

    expect(result.vfs.read('.continue/rules/typescript.md')).toContain('name: "TypeScript"');
  });

  it('writes plain-Markdown rules for Cline and Roo Code, with no frontmatter', () => {
    const result = run(withAiTools(['cline', 'roo']));

    for (const dir of ['.clinerules', '.roo/rules']) {
      const content = result.vfs.read(`${dir}/stripe.md`) as string;
      expect(content.startsWith('---')).toBe(false);
      expect(content).toContain('# Stripe');
    }
  });

  it('every enabled provider gets the same set of technologies, base rule and extra base topics', () => {
    const result = run(withAiTools(['cursor', 'claude', 'copilot', 'continue', 'cline', 'roo']));
    const files = result.vfs.snapshot().files;

    const perProviderIds = {
      cursor: files
        .filter((f) => f.startsWith('.cursor/rules/'))
        .map((f) => f.replace('.cursor/rules/', '').replace('.mdc', '')),
      claude: files
        .filter((f) => f.startsWith('.claude/skills/'))
        .map((f) => f.replace('.claude/skills/', '').replace('/SKILL.md', '')),
      continue: files
        .filter((f) => f.startsWith('.continue/rules/'))
        .map((f) => f.replace('.continue/rules/', '').replace('.md', '')),
      cline: files
        .filter((f) => f.startsWith('.clinerules/'))
        .map((f) => f.replace('.clinerules/', '').replace('.md', '')),
      roo: files
        .filter((f) => f.startsWith('.roo/rules/'))
        .map((f) => f.replace('.roo/rules/', '').replace('.md', '')),
    };

    const expected = [
      'base',
      'architecture',
      'performance',
      'testing',
      'typescript',
      'stripe',
      'nextjs',
    ].sort();
    for (const [tool, ids] of Object.entries(perProviderIds)) {
      expect([...ids].sort(), `${tool} rule set`).toEqual(expected);
    }

    // Copilot's rule set is the same content, just the base one is filed under
    // copilot-instructions.md instead of .github/instructions/base.instructions.md.
    const copilotScoped = files
      .filter((f) => f.startsWith('.github/instructions/'))
      .map((f) => f.replace('.github/instructions/', '').replace('.instructions.md', ''));
    expect([...copilotScoped, 'base'].sort()).toEqual(expected);
    expect(files).toContain('.github/copilot-instructions.md');
  });

  it('renders every template with all providers enabled — no placeholder survives', () => {
    // generate.test.ts makes the same assertion, but over a selection with no
    // `aiTools` key — which defaults to cursor + claude, so the four newer
    // providers' output was never looked at. That is how a literal
    // `{{projectName}}` reached `.continue/rules/*.md` unnoticed.
    const result = run({
      ...base,
      choices: { ...base.choices, 'ci-cd': 'github-actions', aiTools: [...AI_TOOLS] },
    });

    for (const [file, content] of result.vfs.entries()) {
      // `${{ … }}` belongs to the CI runner; `{{ flex: 1 }}` in prose is JSX.
      const tags = content.replace(/\$\{\{[^{}]*\}\}/g, '').match(/\{\{[^{}:]*\}\}/g) ?? [];
      expect(tags, `${file} has unrendered tags`).toEqual([]);
    }
  });
});

describe('collectRuleSources / enabledAiTools (unit)', () => {
  it('includes a module that ships only cursor-rule.mdc, with no claude-skill.md required', () => {
    const module = makeModule(
      { id: 'widget', name: 'Widget' },
      { cursorRule: '---\ndescription: Widget rules\n---\n\n# Widget\n\nBody.' },
    );

    const sources = collectRuleSources(fakeContext([module]));
    expect(sources.map((s) => s.id)).toEqual(['widget']);
    expect(sources[0]?.description).toBe('Widget rules');
    expect(sources[0]?.body).toBe('# Widget\n\nBody.');
  });

  it('skips a module that ships no cursor-rule.mdc at all', () => {
    const ctx = fakeContext([makeModule({ id: 'no-rule', name: 'No Rule' })]);

    expect(collectRuleSources(ctx)).toEqual([]);
  });

  it('falls back to the old default (cursor + claude) when aiTools was never asked', () => {
    expect([...enabledAiTools(fakeContext([]))].sort()).toEqual(['claude', 'cursor']);
  });

  it('respects an explicit selection, including an empty one', () => {
    expect([...enabledAiTools(fakeContext([], { aiTools: ['roo'] }))]).toEqual(['roo']);
    expect([...enabledAiTools(fakeContext([], { aiTools: [] }))]).toEqual([]);
  });
});

function fakeContext(
  modules: BuildContext['modules'],
  choices: Record<string, string | string[]> = {},
): BuildContext {
  return {
    rootDir: '/virtual/root',
    projectName: 'Fake',
    targetDir: '/virtual/out',
    selection: { projectName: 'Fake', choices },
    modules,
    categories: [],
    warnings: [],
    generatorVersion: '0.0.0-test',
  };
}
