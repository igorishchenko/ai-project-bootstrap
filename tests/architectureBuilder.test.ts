import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { generate } from '../src/core/pipeline/generate.js';
import { loadRegistry } from '../src/core/registry/loadModules.js';
import { builders } from '../src/builders/index.js';
import type { Selection } from '../src/core/types.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registry = loadRegistry(ROOT);

function select(choices: Selection['choices']): Selection {
  return { projectName: 'Demo App', choices };
}

function architectureDoc(selection: Selection): string {
  const result = generate({
    rootDir: ROOT,
    targetDir: '/virtual/out',
    selection,
    builders,
    registry,
  });
  const content = result.vfs.read('docs/architecture.md');
  expect(content, 'docs/architecture.md should exist').toBeDefined();
  return content as string;
}

/** Every fenced ```mermaid block in a markdown document, in order. */
function mermaidBlocks(markdown: string): string[] {
  const blocks: string[] = [];
  const re = /```mermaid\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(markdown)) !== null) {
    blocks.push(match[1] as string);
  }
  return blocks;
}

/** Not a real parser — just catches the obviously malformed: unbalanced fences/brackets. */
function assertWellFormed(block: string): void {
  const pairs: Array<[string, string]> = [
    ['(', ')'],
    ['[', ']'],
    ['{', '}'],
  ];
  for (const [open, close] of pairs) {
    const opens = block.split(open).length - 1;
    const closes = block.split(close).length - 1;
    expect(opens, `unbalanced "${open}${close}" in:\n${block}`).toBe(closes);
  }
  // A recognized diagram type, on its own first line.
  expect(block.trim().split('\n')[0]).toMatch(/^(flowchart|graph|sequenceDiagram|erDiagram)\b/);
}

describe('architectureBuilder', () => {
  it('produces only well-formed mermaid blocks across a full-stack fixture', () => {
    const fixture = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'tests/fixtures/ci-full-stack.json'), 'utf8'),
    ) as Selection;
    const doc = architectureDoc(fixture);

    const blocks = mermaidBlocks(doc);
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) assertWellFormed(block);
  });

  it('draws a requires edge the resolver already computed (supabase-auth requires supabase)', () => {
    const doc = architectureDoc(
      select({ target: 'mobile', mobile: 'expo', backend: 'supabase', auth: 'supabase-auth' }),
    );

    expect(doc).toContain('mod_supabase_auth -.->|requires| mod_supabase');
  });

  it('draws a frontend → backend → database backbone when all three layers are present', () => {
    const doc = architectureDoc(
      select({ target: 'web', web: 'nextjs', backend: 'nestjs', database: 'postgresql' }),
    );

    const [stackBlock] = mermaidBlocks(doc);
    expect(stackBlock).toContain('-->|calls|');
    expect(stackBlock).toContain('-->|reads/writes|');
  });

  it('connects frontend straight to the database when there is no backend layer', () => {
    const doc = architectureDoc(select({ target: 'web', web: 'nextjs', database: 'postgresql' }));

    const [stackBlock] = mermaidBlocks(doc);
    expect(stackBlock).toContain('-->|calls|');
    expect(stackBlock).not.toContain('-->|reads/writes|');
  });

  it('draws no backbone edges when only one of the three layers is selected', () => {
    const doc = architectureDoc(select({ target: 'web', web: 'nextjs' }));

    const [stackBlock] = mermaidBlocks(doc);
    expect(stackBlock).not.toContain('-->|calls|');
    expect(stackBlock).not.toContain('-->|reads/writes|');
  });

  it('renders a sequence diagram naming the actual selected auth provider, not a placeholder', () => {
    const supabase = architectureDoc(
      select({ target: 'mobile', mobile: 'expo', backend: 'supabase', auth: 'supabase-auth' }),
    );
    expect(supabase).toContain('sequenceDiagram');
    expect(supabase).toContain('Supabase Auth');

    const auth0 = architectureDoc(
      select({ target: 'web', web: 'nextjs', backend: 'nestjs', auth: 'auth0' }),
    );
    expect(auth0).toContain('sequenceDiagram');
    expect(auth0).toContain('Auth0');
    expect(auth0).not.toContain('Supabase');
  });

  // sqlite requires react-native, so it only exists on a mobile target — the
  // platform each of these is paired with is not incidental.
  it.each([
    ['postgresql', { target: 'web', web: 'nextjs' }],
    ['sqlite', { target: 'mobile', mobile: 'expo' }],
    ['firestore', { target: 'web', web: 'nextjs' }],
  ])(
    'renders a starter ERD for the %s database module, marked as a starting point',
    (databaseId, platform) => {
      const doc = architectureDoc(select({ ...platform, database: databaseId }));

      expect(doc).toContain('erDiagram');
      expect(doc.toLowerCase()).toContain('starting point');
    },
  );
});
