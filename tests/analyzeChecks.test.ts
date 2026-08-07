import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import {
  detectStack,
  scoreArchitecture,
  scoreDocumentation,
  scorePerformance,
  scoreSecurity,
} from '../src/cli/analyzeChecks.js';
import { loadRegistry } from '../src/core/registry/loadModules.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registry = loadRegistry(ROOT);

const MINIMAL_FIXTURE = path.join(ROOT, 'tests/fixtures/analyze/minimal');
const WELL_DOCUMENTED_FIXTURE = path.join(ROOT, 'tests/fixtures/analyze/well-documented');

const dirs: string[] = [];

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'analyze-checks-test-'));
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

describe('detectStack', () => {
  it('detects a package.json dependency with high confidence', () => {
    const detected = detectStack(WELL_DOCUMENTED_FIXTURE, registry);

    const nextjs = detected.find((entry) => entry.id === 'nextjs');
    expect(nextjs).toMatchObject({ confidence: 'high' });
    expect(nextjs?.signal).toContain('"next"');

    const jest = detected.find((entry) => entry.id === 'jest');
    expect(jest).toMatchObject({ confidence: 'high' });
  });

  it('detects nothing in a repo with no matching dependencies or config files', () => {
    expect(detectStack(MINIMAL_FIXTURE, registry)).toEqual([]);
  });

  it('detects a config-file-only technology with medium confidence', () => {
    const dir = tempDir();
    write(dir, 'eas.json', '{}');

    const detected = detectStack(dir, registry);
    const easSubmit = detected.find((entry) => entry.id === 'eas-submit');
    expect(easSubmit).toMatchObject({ confidence: 'medium' });
    expect(easSubmit?.signal).toContain('eas.json');
  });

  it('is silent when there is no package.json at all', () => {
    const dir = tempDir();
    expect(detectStack(dir, registry)).toEqual([]);
  });

  it('does not guess a specific framework from a package name shared by several modules', () => {
    // "react" alone is declared by nextjs, react-native and the Vite react
    // module — matching it can't tell you which one this repo actually uses.
    const dir = tempDir();
    write(dir, 'package.json', JSON.stringify({ dependencies: { react: '^19.0.0' } }));

    const detected = detectStack(dir, registry);
    expect(detected.map((entry) => entry.id)).not.toContain('nextjs');
    expect(detected.map((entry) => entry.id)).not.toContain('react-native');
  });
});

describe('scoreDocumentation', () => {
  it('scores a fully-documented repo at 100 with no findings', () => {
    const result = scoreDocumentation(WELL_DOCUMENTED_FIXTURE);
    expect(result.score).toBe(100);
    expect(result.findings).toEqual([]);
  });

  it('scores a repo with none of the signals at 0, flagging every gap', () => {
    const result = scoreDocumentation(MINIMAL_FIXTURE);
    expect(result.score).toBe(0);
    expect(result.findings).toHaveLength(5);
    expect(result.findings.every((finding) => finding.category === 'documentation')).toBe(true);
  });

  it('gives partial credit for a README with nothing else', () => {
    const dir = tempDir();
    write(dir, 'README.md', '# Just a readme');

    expect(scoreDocumentation(dir).score).toBe(40);
  });
});

describe('scoreArchitecture', () => {
  it('scores a well-organized repo at 100 with no findings', () => {
    const result = scoreArchitecture(WELL_DOCUMENTED_FIXTURE);
    expect(result.score).toBe(100);
    expect(result.findings).toEqual([]);
  });

  it('scores a repo with none of the signals at 0, flagging every gap', () => {
    const result = scoreArchitecture(MINIMAL_FIXTURE);
    expect(result.score).toBe(0);
    expect(result.findings).toHaveLength(4);
  });

  it('recognizes a test file by name even without a dedicated tests directory', () => {
    const dir = tempDir();
    write(dir, 'src/thing.ts', 'export {};');
    write(dir, 'src/thing.test.ts', 'export {};');

    const result = scoreArchitecture(dir);
    expect(result.score).toBe(60);
    expect(result.findings.some((finding) => finding.summary.includes('No tests found'))).toBe(
      false,
    );
  });
});

describe('scoreSecurity', () => {
  it('scores a clean repo at 100', () => {
    const dir = tempDir();
    write(dir, 'src/index.ts', 'export const x = 1;');
    write(dir, '.gitignore', 'node_modules/\n');

    expect(scoreSecurity(dir).score).toBe(100);
  });

  it('deducts 25 for a hardcoded secret, and names it', () => {
    const dir = tempDir();
    write(dir, 'src/config.ts', `export const apiKey = "sk_live_abcdefghijklmnop";\n`);
    write(dir, '.gitignore', 'node_modules/\n');

    const result = scoreSecurity(dir);
    expect(result.score).toBe(75);
    expect(
      result.findings.some((finding) => finding.summary.includes('hardcoded credential')),
    ).toBe(true);
  });

  it('deducts 30 for an ungitignored .env', () => {
    const dir = tempDir();
    write(dir, '.env', 'SECRET=1');
    write(dir, '.gitignore', 'node_modules/\n');

    expect(scoreSecurity(dir).score).toBe(70);
  });

  it('deducts 10 for having no .gitignore at all', () => {
    const dir = tempDir();
    write(dir, 'src/index.ts', 'export const x = 1;');

    expect(scoreSecurity(dir).score).toBe(90);
  });

  it('caps the lint-suppression deduction at 20 points regardless of count', () => {
    const dir = tempDir();
    write(dir, '.gitignore', 'node_modules/\n');
    for (let i = 0; i < 10; i += 1) {
      write(dir, `src/file${i}.ts`, `// eslint-disable-next-line no-console\nconsole.log(${i});\n`);
    }

    expect(scoreSecurity(dir).score).toBe(80);
  });
});

describe('scorePerformance', () => {
  it('scores a repo with every signal at 100', () => {
    const dir = tempDir();
    write(dir, '.gitignore', 'node_modules/\n');
    write(dir, 'next.config.js', 'module.exports = {};\n');

    expect(scorePerformance(dir).score).toBe(100);
  });

  it('deducts 30 when .gitignore does not exclude node_modules', () => {
    const dir = tempDir();
    write(dir, 'next.config.js', 'module.exports = {};\n');

    const result = scorePerformance(dir);
    expect(result.score).toBe(70);
    expect(result.findings.some((finding) => finding.summary.includes('node_modules'))).toBe(true);
  });

  it('deducts 40 when no bundler config is found', () => {
    const dir = tempDir();
    write(dir, '.gitignore', 'node_modules/\n');

    expect(scorePerformance(dir).score).toBe(60);
  });

  it('deducts 30 and names a committed image over 1MB', () => {
    const dir = tempDir();
    write(dir, '.gitignore', 'node_modules/\n');
    write(dir, 'next.config.js', 'module.exports = {};\n');
    fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'assets', 'hero.png'), Buffer.alloc(1_000_001));

    const result = scorePerformance(dir);
    expect(result.score).toBe(70);
    expect(result.findings[0]?.location).toContain('hero.png');
  });
});
