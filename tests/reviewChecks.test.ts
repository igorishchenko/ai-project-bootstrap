import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  checkEnvGitignored,
  checkHardcodedSecrets,
  checkLintSuppressions,
  checkMissingFolders,
  checkStaleFiles,
  checklistReminders,
  meetsThreshold,
  performancePointers,
} from '../src/cli/reviewChecks.js';
import type { LoadedModule, Manifest } from '../src/core/types.js';

const dirs: string[] = [];

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'review-checks-test-'));
  dirs.push(dir);
  return dir;
}

function write(dir: string, file: string, content: string): void {
  const full = path.join(dir, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
}

afterEach(() => {
  while (dirs.length > 0) fs.rmSync(dirs.pop() as string, { recursive: true, force: true });
});

function fakeModule(
  overrides: Partial<Omit<LoadedModule, 'manifest'>> & { manifest: Partial<Manifest> },
): LoadedModule {
  const { manifest, ...rest } = overrides;
  return {
    root: '/fake',
    isBase: false,
    env: [],
    folders: [],
    prompts: [],
    checklists: [],
    templates: [],
    ...rest,
    manifest: {
      id: 'fake',
      name: 'Fake',
      category: 'fake',
      description: '',
      requires: [],
      conflicts: [],
      dependencies: [],
      priority: 0,
      ...manifest,
    },
  };
}

describe('meetsThreshold', () => {
  it('orders info < warning < critical', () => {
    expect(meetsThreshold('critical', 'warning')).toBe(true);
    expect(meetsThreshold('warning', 'critical')).toBe(false);
    expect(meetsThreshold('info', 'info')).toBe(true);
  });
});

describe('checkMissingFolders', () => {
  it('flags a folder a module declares but that is missing on disk', () => {
    const dir = tempDir();
    const modules = [fakeModule({ folders: ['src/features/auth'], manifest: { name: 'Auth' } })];

    const findings = checkMissingFolders(dir, modules);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ category: 'architecture', severity: 'warning' });
    expect(findings[0]?.location).toBe('src/features/auth');
  });

  it('does not flag a folder that exists', () => {
    const dir = tempDir();
    fs.mkdirSync(path.join(dir, 'src', 'features', 'auth'), { recursive: true });
    const modules = [fakeModule({ folders: ['src/features/auth'], manifest: { name: 'Auth' } })];

    expect(checkMissingFolders(dir, modules)).toEqual([]);
  });

  it('does not double-report a folder declared by two modules', () => {
    const dir = tempDir();
    const modules = [
      fakeModule({ folders: ['shared'], manifest: { id: 'a', name: 'A' } }),
      fakeModule({ folders: ['shared'], manifest: { id: 'b', name: 'B' } }),
    ];

    expect(checkMissingFolders(dir, modules)).toHaveLength(1);
  });
});

describe('checkEnvGitignored', () => {
  it('is silent when there is no .env at all', () => {
    const dir = tempDir();
    expect(checkEnvGitignored(dir)).toEqual([]);
  });

  it('is silent when .env is listed in .gitignore', () => {
    const dir = tempDir();
    write(dir, '.env', 'SECRET=1');
    write(dir, '.gitignore', 'node_modules/\n.env\ndist/\n');

    expect(checkEnvGitignored(dir)).toEqual([]);
  });

  it('flags critical when .env exists but is not gitignored', () => {
    const dir = tempDir();
    write(dir, '.env', 'SECRET=1');
    write(dir, '.gitignore', 'node_modules/\ndist/\n');

    const findings = checkEnvGitignored(dir);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ category: 'security', severity: 'critical' });
  });

  it('flags critical when .env exists and there is no .gitignore at all', () => {
    const dir = tempDir();
    write(dir, '.env', 'SECRET=1');

    expect(checkEnvGitignored(dir)).toHaveLength(1);
  });
});

describe('checkHardcodedSecrets', () => {
  it('flags a hardcoded secret assignment in scanned source', () => {
    const dir = tempDir();
    write(dir, 'src/config.ts', `export const apiKey = "sk_live_abcdefghijklmnop";\n`);

    const findings = checkHardcodedSecrets(dir);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ category: 'security', severity: 'critical' });
    expect(findings[0]?.location).toBe('src/config.ts:1');
  });

  it('does not flag an obvious placeholder value', () => {
    const dir = tempDir();
    write(dir, 'src/config.ts', `export const apiKey = "your-api-key-here";\n`);

    expect(checkHardcodedSecrets(dir)).toEqual([]);
  });

  it('does not flag a value read from a reference, not a literal', () => {
    const dir = tempDir();
    write(dir, 'src/config.ts', `export const apiKey = process.env.API_KEY;\n`);

    expect(checkHardcodedSecrets(dir)).toEqual([]);
  });

  it('skips test files', () => {
    const dir = tempDir();
    write(dir, 'src/config.test.ts', `const apiKey = "sk_live_abcdefghijklmnop";\n`);

    expect(checkHardcodedSecrets(dir)).toEqual([]);
  });

  it('skips directories outside the scanned roots', () => {
    const dir = tempDir();
    write(dir, 'scripts/seed.ts', `const password = "hunter2hunter2hunter2";\n`);

    expect(checkHardcodedSecrets(dir)).toEqual([]);
  });
});

describe('checkLintSuppressions', () => {
  it('flags an eslint-disable comment', () => {
    const dir = tempDir();
    write(dir, 'src/index.ts', `// eslint-disable-next-line no-console\nconsole.log('x');\n`);

    const findings = checkLintSuppressions(dir);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ category: 'security', severity: 'warning' });
  });

  it('flags @ts-ignore and @ts-nocheck', () => {
    const dir = tempDir();
    write(dir, 'src/a.ts', `// @ts-ignore\n`);
    write(dir, 'src/b.ts', `// @ts-nocheck\n`);

    expect(checkLintSuppressions(dir)).toHaveLength(2);
  });

  it('is silent when there are none', () => {
    const dir = tempDir();
    write(dir, 'src/index.ts', `console.log('x');\n`);

    expect(checkLintSuppressions(dir)).toEqual([]);
  });
});

describe('checkStaleFiles', () => {
  it('is silent when nothing is added or updated', () => {
    expect(checkStaleFiles([], [])).toEqual([]);
  });

  it('reports one info finding naming the count', () => {
    const findings = checkStaleFiles(['a.md'], ['b.md', 'c.md']);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ category: 'dx', severity: 'info' });
    expect(findings[0]?.summary).toContain('3 files');
  });
});

describe('checklistReminders', () => {
  it('is empty when there is no checklists directory', () => {
    const dir = tempDir();
    expect(checklistReminders(dir)).toEqual([]);
  });

  it('lists every markdown checklist, sorted', () => {
    const dir = tempDir();
    write(dir, 'checklists/payments.md', '# Payments');
    write(dir, 'checklists/auth.md', '# Auth');
    write(dir, 'checklists/notes.txt', 'not markdown');

    expect(checklistReminders(dir)).toEqual(['checklists/auth.md', 'checklists/payments.md']);
  });
});

describe('performancePointers', () => {
  it('points at a rule file that actually exists for a module with cursorRule content', () => {
    const dir = tempDir();
    write(dir, '.cursor/rules/nextjs.mdc', '# Next.js rules');
    const modules = [
      fakeModule({
        cursorRule: '# Next.js rules',
        manifest: { id: 'nextjs', name: 'Next.js' },
      }),
    ];

    const pointers = performancePointers(dir, modules);

    expect(pointers).toEqual(['.cursor/rules/nextjs.mdc (Next.js)']);
  });

  it('checks non-Cursor provider paths too, since aiTools is a choice', () => {
    const dir = tempDir();
    write(dir, '.claude/skills/nextjs/SKILL.md', '# Next.js skill');
    const modules = [
      fakeModule({
        cursorRule: '# Next.js rules',
        manifest: { id: 'nextjs', name: 'Next.js' },
      }),
    ];

    expect(performancePointers(dir, modules)).toEqual(['.claude/skills/nextjs/SKILL.md (Next.js)']);
  });

  it('is silent for a module with no cursorRule content, or when no rule file exists on disk', () => {
    const dir = tempDir();
    const modules = [fakeModule({ manifest: { id: 'nextjs', name: 'Next.js' } })];

    expect(performancePointers(dir, modules)).toEqual([]);
  });

  it('skips the base module', () => {
    const dir = tempDir();
    write(dir, '.cursor/rules/base.mdc', '# base');
    const modules = [
      fakeModule({ isBase: true, cursorRule: '# base', manifest: { id: 'base', name: 'Base' } }),
    ];

    expect(performancePointers(dir, modules)).toEqual([]);
  });
});
