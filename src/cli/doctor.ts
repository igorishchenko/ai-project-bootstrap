import * as prompts from '@clack/prompts';
import type { Preset } from '../core/types.js';
import { loadRegistry } from '../core/registry/loadModules.js';
import { readGeneratorPackageInfo } from '../core/registry/packageInfo.js';
import { GeneratorError } from '../core/resolve/errors.js';
import {
  type CheckResult,
  backendChecks,
  mobileChecks,
  realDoctorEnv,
  universalChecks,
} from './doctorChecks.js';
import type { Reporter } from './reporter.js';
import { WizardCancelled } from './wizard.js';

export interface DoctorFlags {
  mobile: boolean;
  backend: boolean;
  all: boolean;
  for?: string;
  help: boolean;
}

const BOOLEANS = new Set(['--mobile', '--backend', '--all', '-h', '--help']);
const VALUED = new Set(['--for']);

/** Parses `doctor`'s own small flag set — deliberately separate from the main parser. */
export function parseDoctorFlags(argv: string[]): DoctorFlags {
  const flags: DoctorFlags = { mobile: false, backend: false, all: false, help: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] as string;

    if (BOOLEANS.has(arg)) {
      if (arg === '--mobile') flags.mobile = true;
      if (arg === '--backend') flags.backend = true;
      if (arg === '--all') flags.all = true;
      if (arg === '-h' || arg === '--help') flags.help = true;
      continue;
    }

    if (VALUED.has(arg)) {
      const value = argv[++i];
      if (value === undefined) {
        throw new GeneratorError(
          'INVALID_CONFIG',
          `${arg} needs a value.`,
          `Example: ${arg} startup-mvp`,
        );
      }
      flags.for = value;
      continue;
    }

    if (arg.startsWith('-')) {
      throw new GeneratorError(
        'INVALID_CONFIG',
        `Unknown flag ${arg}.`,
        'Run `ai-project-bootstrap doctor --help` to see every flag.',
      );
    }

    throw new GeneratorError(
      'INVALID_CONFIG',
      `doctor does not take a positional argument ("${arg}").`,
      'Use --for <preset-id> to scope checks to a stack instead.',
    );
  }

  return flags;
}

export const DOCTOR_HELP_TEXT = `
ai-project-bootstrap doctor — check whether this machine can build the stack you want.

Usage
  npx ai-project-bootstrap doctor [options]

Always checks Node, Git, npm and Bun. Mobile tooling (Xcode, Android SDK,
Watchman, Java) and backend tooling (Docker) are checked on top of that only
when asked — with no flags, an interactive terminal is asked which to add;
a non-interactive one (CI, a pipe) runs the universal checks only.

Options
      --mobile       Also check mobile tooling
      --backend      Also check backend tooling
      --all          Both of the above
      --for <id>     Scope checks to exactly what a preset needs
                      (see --list-modules or README for preset ids);
                      cannot be combined with --mobile/--backend/--all
  -h, --help          Show this help

Exit code is non-zero only when something required (Node, Git, npm) is
missing — missing mobile or backend tooling is reported, not enforced, since
this machine may simply not be the one you use for that platform.
`.trim();

/** Whether a preset's own answers touch mobile and/or backend/database categories. */
function presetNeeds(preset: Preset): { mobile: boolean; backend: boolean } {
  const target = preset.choices.target;
  const targetValues = Array.isArray(target) ? target : [target];
  const mobile =
    targetValues.includes('mobile') ||
    targetValues.includes('hybrid') ||
    'mobile' in preset.choices;
  const backend = 'backend' in preset.choices || 'database' in preset.choices;
  return { mobile, backend };
}

async function confirmCheck(message: string): Promise<boolean> {
  const answer = await prompts.confirm({ message });
  if (prompts.isCancel(answer)) throw new WizardCancelled();
  return answer;
}

export async function runDoctor(
  argv: string[],
  rootDir: string,
  reporter: Reporter,
): Promise<number> {
  const flags = parseDoctorFlags(argv);

  if (flags.help) {
    reporter.plain(DOCTOR_HELP_TEXT);
    return 0;
  }

  if (flags.for && (flags.mobile || flags.backend || flags.all)) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      '--for cannot be combined with --mobile, --backend or --all.',
      '--for already scopes checks to exactly what that preset needs.',
    );
  }

  const pkg = readGeneratorPackageInfo(rootDir);
  reporter.intro(pkg.version);

  let checkMobile = flags.mobile || flags.all;
  let checkBackend = flags.backend || flags.all;

  if (flags.for) {
    const registry = loadRegistry(rootDir);
    const preset = registry.presets.find((entry) => entry.id === flags.for);
    if (!preset) {
      throw new GeneratorError(
        'INVALID_CONFIG',
        `Unknown preset "${flags.for}".`,
        registry.presets.length > 0
          ? `Available presets: ${registry.presets.map((entry) => entry.id).join(', ')}.`
          : 'No presets are installed.',
      );
    }
    const needs = presetNeeds(preset);
    checkMobile = needs.mobile;
    checkBackend = needs.backend;
  } else if (!flags.mobile && !flags.backend && !flags.all && process.stdout.isTTY) {
    checkMobile = await confirmCheck(
      'Also check mobile tooling (Xcode, Android SDK, Watchman, Java)?',
    );
    checkBackend = await confirmCheck('Also check backend tooling (Docker)?');
  }

  const doctorEnv = realDoctorEnv();

  const results: CheckResult[] = [...universalChecks(doctorEnv, pkg.engines?.node)];
  if (checkMobile) results.push(...mobileChecks(doctorEnv));
  if (checkBackend) results.push(...backendChecks(doctorEnv));

  reporter.checks(results);

  const ready = results.every((result) => result.ok || result.severity !== 'required');
  reporter.doctorSummary(ready);

  return ready ? 0 : 1;
}
