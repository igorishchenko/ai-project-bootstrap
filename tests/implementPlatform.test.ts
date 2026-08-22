import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { runImplement } from '../src/cli/implement.js';
import { generate } from '../src/core/pipeline/generate.js';
import { loadRegistry } from '../src/core/registry/loadModules.js';
import { builders } from '../src/builders/index.js';
import { Reporter } from '../src/cli/reporter.js';
import type { Selection } from '../src/core/types.js';

/**
 * `implement` writes real `.ts`/`.tsx` into the project's own source tree, and
 * for three releases nothing checked that what it wrote could compile there.
 *
 * Two failures hid behind that. A scaffold imported
 * `src/services/supabase/client` — a path its own plan.md claimed the Supabase
 * module scaffolds, which it never did — so `tsc --noEmit` failed on a project
 * nobody had touched. And every auth screen was written with react-native
 * primitives regardless of target, so a Next.js project got `import { View }
 * from 'react-native'`. The platform split of 1.5.0 covered `technologies/`
 * and stopped there; `features/` was never revisited.
 *
 * Both are the same shape of mistake, and both are cheap to assert: the
 * scaffold must not name the other platform, and every relative import it
 * writes must land on a file that exists.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registry = loadRegistry(ROOT);

const NATIVE_IMPORT =
  /from '(react-native|expo[a-z-]*|@react-native[\w/-]*|@[\w-]+\/[\w-]*expo[\w-]*)'/;

function silentReporter(): Reporter {
  const stream = { write: () => true } as unknown as NodeJS.WriteStream;
  return new Reporter(stream);
}

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function projectWith(choices: Selection['choices']): string {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'implement-platform-'));
  dirs.push(targetDir);
  const selection: Selection = { projectName: 'Test', choices };
  generate({ rootDir: ROOT, targetDir, selection, builders, registry }).vfs.flush(targetDir, {
    force: true,
  });
  return targetDir;
}

/** Every `.ts`/`.tsx` under the project's own source layout, excluding docs. */
function sourceFiles(targetDir: string): string[] {
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules') walk(full);
      } else if (/\.tsx?$/.test(entry.name)) {
        found.push(full);
      }
    }
  };
  for (const root of ['src', 'app', 'server']) {
    const full = path.join(targetDir, root);
    if (fs.existsSync(full)) walk(full);
  }
  return found;
}

/** Relative specifiers only — a bare package name is resolved by npm, not us. */
function relativeImports(content: string): string[] {
  return [...content.matchAll(/from '(\.[^']*)'/g)].map((match) => match[1] as string);
}

const CASES = [
  {
    label: 'supabase-auth on native',
    choices: { target: 'mobile', mobile: 'expo', backend: 'supabase', auth: 'supabase-auth' },
    native: true,
  },
  {
    label: 'supabase-auth on web',
    choices: { target: 'web', web: 'nextjs', backend: 'supabase', auth: 'supabase-auth' },
    native: false,
  },
  {
    label: 'clerk on native',
    choices: { target: 'mobile', mobile: 'expo', auth: 'clerk' },
    native: true,
  },
  {
    label: 'clerk on web',
    choices: { target: 'web', web: 'nextjs', auth: 'clerk' },
    native: false,
  },
  {
    label: 'auth0 on native',
    choices: { target: 'mobile', mobile: 'expo', auth: 'auth0' },
    native: true,
  },
  {
    label: 'auth0 on web',
    choices: { target: 'web', web: 'nextjs', auth: 'auth0' },
    native: false,
  },
] as const;

describe('implement writes scaffolds the project can actually compile', () => {
  it.each(CASES)('$label: every relative import resolves to a real file', async ({ choices }) => {
    const targetDir = projectWith(choices);
    await runImplement(['authentication', '--dir', targetDir], ROOT, silentReporter());

    for (const file of sourceFiles(targetDir)) {
      for (const specifier of relativeImports(fs.readFileSync(file, 'utf8'))) {
        const resolved = path.resolve(path.dirname(file), specifier);
        const exists = ['.ts', '.tsx', '/index.ts', '/index.tsx', ''].some((suffix) =>
          fs.existsSync(`${resolved}${suffix}`),
        );
        expect(
          exists,
          `${path.relative(targetDir, file)} imports "${specifier}", which nothing writes`,
        ).toBe(true);
      }
    }
  });

  it.each(CASES)('$label: imports match the platform', async ({ choices, native }) => {
    const targetDir = projectWith(choices);
    await runImplement(['authentication', '--dir', targetDir], ROOT, silentReporter());

    const scaffolds = sourceFiles(targetDir).filter((file) =>
      fs.readFileSync(file, 'utf8').includes('implement authentication'),
    );
    expect(scaffolds.length, 'implement wrote no scaffold at all').toBeGreaterThan(0);

    for (const file of scaffolds) {
      const content = fs.readFileSync(file, 'utf8');
      const where = path.relative(targetDir, file);
      if (native) {
        expect(content, `${where} uses a DOM element on a native target`).not.toMatch(
          /<(div|form|input|button|p)[\s>]/,
        );
      } else {
        expect(content, `${where} imports a native module on a web target`).not.toMatch(
          NATIVE_IMPORT,
        );
      }
    }
  });

  it('leaves no unrendered template syntax in a scaffold', async () => {
    const targetDir = projectWith(CASES[1].choices);
    await runImplement(['authentication', '--dir', targetDir], ROOT, silentReporter());

    for (const file of sourceFiles(targetDir)) {
      const content = fs.readFileSync(file, 'utf8');
      expect(content, `${path.relative(targetDir, file)} has an unrendered tag`).not.toMatch(
        /\{\{[#/]?(if|unless|each|envPrefix|projectName|projectSlug|has)\b/,
      );
    }
  });
});
