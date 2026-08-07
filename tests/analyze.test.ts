import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { parseAnalyzeFlags, runAnalyze } from '../src/cli/analyze.js';
import { GeneratorError } from '../src/core/resolve/errors.js';
import { generate } from '../src/core/pipeline/generate.js';
import { loadRegistry } from '../src/core/registry/loadModules.js';
import { builders } from '../src/builders/index.js';
import { Reporter } from '../src/cli/reporter.js';
import type { Selection } from '../src/core/types.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MINIMAL_FIXTURE = path.join(ROOT, 'tests/fixtures/analyze/minimal');
const WELL_DOCUMENTED_FIXTURE = path.join(ROOT, 'tests/fixtures/analyze/well-documented');

function capturingReporter(): { reporter: Reporter; output: () => string } {
  let buffer = '';
  const stream = {
    write: (chunk: string) => {
      buffer += chunk;
      return true;
    },
  } as unknown as NodeJS.WriteStream;
  return { reporter: new Reporter(stream), output: () => buffer };
}

describe('parseAnalyzeFlags', () => {
  it('reads --dir and --report', () => {
    expect(parseAnalyzeFlags(['--dir', './some-repo', '--report'])).toEqual({
      dir: './some-repo',
      report: true,
      help: false,
    });
  });

  it('defaults report and help to false', () => {
    expect(parseAnalyzeFlags([])).toEqual({ report: false, help: false });
  });

  it('reads -h and --help', () => {
    expect(parseAnalyzeFlags(['-h']).help).toBe(true);
    expect(parseAnalyzeFlags(['--help']).help).toBe(true);
  });

  it('rejects a --dir with no value', () => {
    expect(() => parseAnalyzeFlags(['--dir'])).toThrow(GeneratorError);
  });

  it('rejects an unknown flag', () => {
    expect(() => parseAnalyzeFlags(['--nope'])).toThrow(GeneratorError);
  });
});

describe('analyze, end to end', () => {
  const dirs: string[] = [];

  afterEach(() => {
    while (dirs.length > 0) fs.rmSync(dirs.pop() as string, { recursive: true, force: true });
  });

  it('errors when --dir does not point at a directory', async () => {
    const { reporter } = capturingReporter();
    const missing = path.join(os.tmpdir(), 'analyze-test-does-not-exist');

    await expect(runAnalyze(['--dir', missing], ROOT, reporter)).rejects.toThrow(GeneratorError);
  });

  it('reports high scores and a high-confidence detection for a well-documented repo', async () => {
    const { reporter, output } = capturingReporter();
    const code = await runAnalyze(['--dir', WELL_DOCUMENTED_FIXTURE], ROOT, reporter);

    expect(code).toBe(0);
    expect(output()).toContain('Overall');
    expect(output()).toContain('100/100');
    expect(output()).toContain('Next.js');
    expect(output()).toContain('high confidence');
  });

  it('reports low scores and concrete findings for a minimal repo', async () => {
    const { reporter, output } = capturingReporter();
    const code = await runAnalyze(['--dir', MINIMAL_FIXTURE], ROOT, reporter);

    expect(code).toBe(0);
    expect(output()).toContain('No README.md found');
    expect(output()).toContain('No conventional source directory');
    expect(output()).toContain('Nothing recognized');
  });

  it('never fails the exit code — analyze is informational, not a gate', async () => {
    const { reporter } = capturingReporter();
    const code = await runAnalyze(['--dir', MINIMAL_FIXTURE], ROOT, reporter);
    expect(code).toBe(0);
  });

  it('notices, but still fully analyzes, a project this tool generated itself', async () => {
    const registry = loadRegistry(ROOT);
    const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'analyze-test-'));
    dirs.push(targetDir);
    const selection: Selection = { projectName: 'Test', choices: { target: 'web', web: 'nextjs' } };
    const result = generate({ rootDir: ROOT, targetDir, selection, builders, registry });
    result.vfs.flush(targetDir, { force: true });

    const { reporter, output } = capturingReporter();
    const code = await runAnalyze(['--dir', targetDir], ROOT, reporter);

    expect(code).toBe(0);
    expect(output()).toContain('ai-project-bootstrap generated');
    expect(output()).toContain('Overall');
  });

  it('--report writes analyze-report.md into the target', async () => {
    const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'analyze-test-'));
    dirs.push(targetDir);
    fs.cpSync(WELL_DOCUMENTED_FIXTURE, targetDir, { recursive: true });

    const { reporter } = capturingReporter();
    await runAnalyze(['--dir', targetDir, '--report'], ROOT, reporter);

    const reportPath = path.join(targetDir, 'analyze-report.md');
    expect(fs.existsSync(reportPath)).toBe(true);
    expect(fs.readFileSync(reportPath, 'utf8')).toContain('# Analysis report —');
  });

  it('does not write a report file unless --report is passed', async () => {
    const { reporter } = capturingReporter();
    await runAnalyze(['--dir', WELL_DOCUMENTED_FIXTURE], ROOT, reporter);

    expect(fs.existsSync(path.join(WELL_DOCUMENTED_FIXTURE, 'analyze-report.md'))).toBe(false);
  });
});
