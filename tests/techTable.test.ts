import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  TECH_TABLE_END,
  TECH_TABLE_START,
  generateReadme,
  loadModulesByCategory,
} from '../scripts/generate-tech-table.mjs';

const readmeUrl = new URL('../README.md', import.meta.url);

describe('README technology table', () => {
  it('lists every module in technologies/, grouped and ordered by category', async () => {
    const readme = readFileSync(readmeUrl, 'utf8');
    expect(readme, 'README.md must contain the TECH_TABLE markers').toContain(TECH_TABLE_START);
    expect(readme).toContain(TECH_TABLE_END);

    // Regenerating from technologies/*/manifest.json + formatting must be a
    // no-op against the checked-in file — if this fails, someone added or
    // renamed a module without running `pnpm docs:tech-table`.
    const regenerated = await generateReadme(readme, fileURLToPath(readmeUrl));

    expect(regenerated).toBe(readme);
  });

  it('never silently drops a module — every technology appears in some category', () => {
    const modulesByCategory = loadModulesByCategory();
    const total = [...modulesByCategory.values()].reduce((sum, list) => sum + list.length, 0);
    const onDisk = readdirSync(new URL('../technologies/', import.meta.url)).length;

    expect(total).toBe(onDisk);
  });
});
