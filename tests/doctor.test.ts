import { describe, expect, it } from 'vitest';
import { DOCTOR_HELP_TEXT, parseDoctorFlags, runDoctor } from '../src/cli/doctor.js';
import { GeneratorError } from '../src/core/resolve/errors.js';
import { Reporter } from '../src/cli/reporter.js';

describe('parseDoctorFlags', () => {
  it('defaults every flag to false/undefined', () => {
    const flags = parseDoctorFlags([]);
    expect(flags).toEqual({ mobile: false, backend: false, all: false, help: false });
  });

  it('parses --mobile, --backend and --all independently', () => {
    expect(parseDoctorFlags(['--mobile']).mobile).toBe(true);
    expect(parseDoctorFlags(['--backend']).backend).toBe(true);
    expect(parseDoctorFlags(['--all']).all).toBe(true);
  });

  it('parses --for <id>', () => {
    expect(parseDoctorFlags(['--for', 'startup-mvp']).for).toBe('startup-mvp');
  });

  it('parses -h and --help', () => {
    expect(parseDoctorFlags(['-h']).help).toBe(true);
    expect(parseDoctorFlags(['--help']).help).toBe(true);
  });

  it('rejects an unknown flag', () => {
    expect(() => parseDoctorFlags(['--nonsense'])).toThrow(GeneratorError);
  });

  it('rejects a positional argument — doctor takes none', () => {
    expect(() => parseDoctorFlags(['startup-mvp'])).toThrow(GeneratorError);
  });

  it('rejects --for with no value', () => {
    expect(() => parseDoctorFlags(['--for'])).toThrow(GeneratorError);
  });
});

describe('runDoctor', () => {
  const rootDir = process.cwd();
  const silentReporter = new Reporter({ write: () => true } as unknown as NodeJS.WriteStream);

  it('--help prints the help text and exits 0 without running any checks', async () => {
    const code = await runDoctor(['--help'], rootDir, silentReporter);
    expect(code).toBe(0);
  });

  it('help text mentions every flag', async () => {
    for (const flag of ['--mobile', '--backend', '--all', '--for']) {
      expect(DOCTOR_HELP_TEXT).toContain(flag);
    }
  });

  it('rejects --for combined with --mobile', async () => {
    await expect(
      runDoctor(['--for', 'startup-mvp', '--mobile'], rootDir, silentReporter),
    ).rejects.toThrow(GeneratorError);
  });

  it('rejects an unknown preset id passed to --for, listing the real ones', async () => {
    await expect(
      runDoctor(['--for', 'not-a-real-preset'], rootDir, silentReporter),
    ).rejects.toThrow(/Unknown preset "not-a-real-preset"/);
  });

  it('--for a real preset runs without prompting or throwing', async () => {
    const code = await runDoctor(['--for', 'startup-mvp'], rootDir, silentReporter);
    expect([0, 1]).toContain(code); // depends on this machine's tooling, not on doctor's logic
  });

  it('running with explicit --mobile --backend never prompts (non-TTY-safe either way)', async () => {
    const code = await runDoctor(['--mobile', '--backend'], rootDir, silentReporter);
    expect([0, 1]).toContain(code);
  });

  it('no flags in a non-interactive environment runs only the universal checks, without hanging on a prompt', async () => {
    // vitest's stdout is not a TTY, so this exercises the same path CI takes.
    expect(process.stdout.isTTY).toBeFalsy();
    const code = await runDoctor([], rootDir, silentReporter);
    expect([0, 1]).toContain(code);
  });
});
