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

function run(selection: Selection) {
  const result = generate({
    rootDir: ROOT,
    targetDir: '/virtual/out',
    selection,
    builders,
    registry,
  });
  const content = result.vfs.read('docs/costs.md');
  expect(content, 'docs/costs.md should exist').toBeDefined();
  return { result, doc: content as string };
}

describe('costsBuilder', () => {
  it('sums flat/freemium modules and lists usage-based ones separately, with the total in the CLI-facing costSummary too', () => {
    const { result, doc } = run(
      select({ target: 'web', web: 'nextjs', backend: 'supabase', payments: 'stripe' }),
    );

    // Supabase is freemium ($25/mo); Stripe is usage-based (no flat number).
    expect(result.costSummary.totalUsd).toBe(25);
    expect(result.costSummary.estimated.map((item) => item.moduleId)).toEqual(['supabase']);
    expect(result.costSummary.usageBased.map((item) => item.moduleId)).toEqual(['stripe']);

    expect(doc).toContain('Estimated monthly total: $25/mo');
    expect(doc).toContain('Supabase');
    expect(doc).toContain('## Usage-based (not included in the total above)');
    expect(doc).toContain('Stripe');
    expect(doc).toContain('supabase.com/pricing');
  });

  it('states plainly there is no cost data when nothing selected has pricing information', () => {
    // nextjs, react-native, jest etc. all intentionally have no `pricing`
    // field — this must read as "no data", not silently show $0 as if verified.
    const { result, doc } = run(select({ target: 'web', web: 'nextjs', testing: ['jest'] }));

    expect(result.costSummary.estimated).toEqual([]);
    expect(result.costSummary.usageBased).toEqual([]);
    expect(doc).toContain('$0/mo');
    expect(doc).toContain('No cost data available');
    expect(doc).not.toContain('Estimated monthly total: $NaN');
  });

  it('never presents the estimate as a guaranteed figure', () => {
    const { doc } = run(select({ target: 'web', web: 'nextjs', backend: 'supabase' }));
    expect(doc.toLowerCase()).toMatch(/not a quote|verify current pricing/);
  });

  it('reports "nothing to estimate" for a bare project with zero technology modules selected', () => {
    const { doc } = run(select({ target: 'web' }));
    expect(doc).toContain('No third-party services selected');
  });
});
