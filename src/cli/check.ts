import fs from 'node:fs';
import path from 'node:path';
import { builders } from '../builders/index.js';
import { CONFIG_FILENAME } from '../builders/configBuilder.js';
import { AI_TOOLS, AI_TOOLS_CATEGORY, DEFAULT_AI_TOOLS } from '../builders/ruleSources.js';
import { generate } from '../core/pipeline/generate.js';
import { loadRegistry } from '../core/registry/loadModules.js';
import { readGeneratorPackageInfo } from '../core/registry/packageInfo.js';
import { GeneratorError } from '../core/resolve/errors.js';
import { UNTRACKED } from '../core/vfs/fingerprint.js';
import { fetchAdvisories, moduleIdsFrom, type Advisory } from './advisories.js';
import { preservedPaths, readFingerprints, type Fingerprints } from '../core/vfs/preserve.js';
import { loadSelectionFile, readPinnedPacks, readRecordedGeneratorVersion } from './configFile.js';
import { loadPinnedPacks } from '../core/packs/packCache.js';
import type { Reporter } from './reporter.js';

/**
 * `check` answers one question: is what this repo tells an AI assistant still
 * what we would write today?
 *
 * A generated project carries a version stamp and a per-file fingerprint of
 * everything the generator produced, so the answer is computable offline with
 * no service and no account. That is deliberate — this is the command that has
 * to be in every repo before anything else in the product matters, so it costs
 * nothing and asks for nothing.
 *
 * It is `upgrade --dry-run`'s diff, reframed as a report with exit codes: no
 * new comparison logic, so the two can never disagree about what has drifted.
 */

/** How serious the most serious thing found is. */
export type DriftSeverity = 'none' | 'info' | 'warning' | 'critical';

const SEVERITY_RANK: Record<DriftSeverity, number> = {
  none: 0,
  info: 1,
  warning: 2,
  critical: 3,
};

/** `--fail-on` accepts these; `none` (the default) never fails. */
export const FAIL_ON_LEVELS: DriftSeverity[] = ['none', 'info', 'warning', 'critical'];

export interface CheckFlags {
  dir?: string;
  json: boolean;
  failOn: DriftSeverity;
  /** False skips the one network call this command can make. */
  advisories: boolean;
  help: boolean;
}

/**
 * Every generator-owned path, sorted into what a human should do about it.
 *
 * `edited` is not a problem and never counts toward severity — a file you
 * changed is the preservation guarantee working, and reporting it as drift
 * would train people to ignore the report.
 */
export interface CheckReport {
  projectName: string;
  targetDir: string;
  recordedVersion: string | undefined;
  installedVersion: string;
  /** Identical to what we would write today. */
  current: string[];
  /** Untouched since generation, but our templates have moved on. */
  behind: string[];
  /** Changed by hand since generation — `upgrade` will not touch these. */
  edited: string[];
  /** Recorded at generation, no longer on disk. */
  missing: string[];
  /** This version produces them; the version that generated this project did not. */
  added: string[];
  /**
   * Still on disk, but this version does not produce them at all — a dropped
   * module's leftover rule file. `upgrade` will not remove these; only
   * `add --replace` does.
   */
  orphaned: string[];
  /** Supported AI tools this project never opted into. */
  newAiTools: string[];
  /**
   * Advisories for this stack, when they were asked for and the service
   * answered. Absent means they were skipped — `--no-advisories`, no network,
   * a timeout, or any non-200 — and `advisoryNote` says which.
   */
  advisories?: Advisory[];
  advisoriesEntitled?: boolean;
  /** One line about why advisories are missing or incomplete. */
  advisoryNote?: string;
  severity: DriftSeverity;
}

const BOOLEANS = new Set(['--json', '--no-advisories', '-h', '--help']);
const VALUED = new Set(['--dir', '--fail-on']);

/** Parses `check`'s own small flag set — deliberately separate from the main parser. */
export function parseCheckFlags(argv: string[]): CheckFlags {
  const flags: CheckFlags = { json: false, failOn: 'none', advisories: true, help: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] as string;

    if (BOOLEANS.has(arg)) {
      if (arg === '--json') flags.json = true;
      if (arg === '--no-advisories') flags.advisories = false;
      if (arg === '-h' || arg === '--help') flags.help = true;
      continue;
    }

    if (VALUED.has(arg)) {
      const value = argv[++i];
      if (value === undefined) {
        throw new GeneratorError(
          'INVALID_CONFIG',
          `${arg} needs a value.`,
          `Example: ${arg} ${arg === '--fail-on' ? 'warning' : './my-app'}`,
        );
      }
      if (arg === '--fail-on') {
        if (!FAIL_ON_LEVELS.includes(value as DriftSeverity)) {
          throw new GeneratorError(
            'INVALID_CONFIG',
            `--fail-on must be one of ${FAIL_ON_LEVELS.join(', ')} (got "${value}").`,
          );
        }
        flags.failOn = value as DriftSeverity;
      } else {
        flags.dir = value;
      }
      continue;
    }

    throw new GeneratorError(
      'INVALID_CONFIG',
      `Unknown flag ${arg}.`,
      'Run `ai-project-bootstrap check --help` to see every flag.',
    );
  }

  return flags;
}

export const CHECK_HELP_TEXT = `
ai-project-bootstrap check — report what has drifted, without changing anything.

Usage
  npx ai-project-bootstrap check [options]

Compares a generated project against the templates this installed version
would write today, and reports the difference. Nothing is written — this is
the read-only half of \`upgrade\`, safe to run anywhere, including CI.

Files you have edited since generation are reported separately and never
counted as drift: \`upgrade\` will not touch them, which is the point.

Options
      --dir <path>     Project to check (default: the current directory)
      --json           Machine-readable output, for CI
      --fail-on <lvl>  Exit 1 at or above this level (default: none)
      --no-advisories  Skip the advisory lookup — the only network call this
                         command makes. It is also skipped automatically when
                         there is no network, the service is slow, or it
                         answers anything but 200: you still get the full
                         drift report and one line saying why.
                        none     never fail — report only
                        info     a newer version, new files, new AI tools
                        warning  rules behind the installed templates
                        critical reserved; nothing emits it yet
  -h, --help           Show this help

Exit codes
  0  nothing at or above --fail-on
  1  something at or above --fail-on
  2  not a generated project (no ${CONFIG_FILENAME})

Run \`upgrade\` to apply what this reports.
`.trim();

/** Every AI tool not in the project's own recorded (or default) selection. */
function newlySupportedAiTools(choices: Record<string, string | string[]>): string[] {
  const recorded = choices[AI_TOOLS_CATEGORY];
  const known = new Set(
    recorded === undefined ? DEFAULT_AI_TOOLS : Array.isArray(recorded) ? recorded : [recorded],
  );
  return AI_TOOLS.filter((tool) => !known.has(tool));
}

/**
 * The most serious thing in a report.
 *
 * **An advisory can raise this, and therefore fail a build through
 * `--fail-on`.** That is a real decision with a real cost: a vendor publishing
 * a change can turn somebody's CI red with no commit on their side. It is the
 * right trade for three reasons.
 *
 * An advisory is a *stronger* signal than a stale file, not a weaker one — a
 * rule being out of date is our problem, while a vendor breaking something is
 * the user's, and reporting the first as more serious than the second would be
 * backwards. `--fail-on` defaults to `none`, so nothing turns red unless
 * somebody asked for it. And `critical` has been accepted-but-unreachable since
 * 1.3.0, explicitly reserved for this; advisories are what finally make it mean
 * something.
 *
 * The severity of an advisory is used directly rather than being damped: a
 * `critical` advisory makes a `critical` report. Anything else would mean
 * quietly disagreeing with the person who wrote the advisory about how bad it
 * is.
 */
export function severityOf(
  report: Pick<CheckReport, 'behind' | 'missing' | 'added' | 'orphaned' | 'newAiTools'>,
  versionBehind: boolean,
  advisories: readonly { severity: DriftSeverity | 'info' | 'warning' | 'critical' }[] = [],
): DriftSeverity {
  const worstAdvisory = advisories.reduce<DriftSeverity>(
    (worst, advisory) =>
      SEVERITY_RANK[advisory.severity as DriftSeverity] > SEVERITY_RANK[worst]
        ? (advisory.severity as DriftSeverity)
        : worst,
    'none',
  );
  const fromDrift = driftSeverityOf(report, versionBehind);
  return SEVERITY_RANK[worstAdvisory] > SEVERITY_RANK[fromDrift] ? worstAdvisory : fromDrift;
}

/** Drift alone, with no advisories in the picture. */
function driftSeverityOf(
  report: Pick<CheckReport, 'behind' | 'missing' | 'added' | 'orphaned' | 'newAiTools'>,
  versionBehind: boolean,
): DriftSeverity {
  // An orphan is as wrong as a stale rule — arguably more so, since it
  // describes a technology the project no longer uses at all.
  if (report.behind.length > 0 || report.orphaned.length > 0) return 'warning';
  if (
    report.missing.length > 0 ||
    report.added.length > 0 ||
    report.newAiTools.length > 0 ||
    versionBehind
  ) {
    return 'info';
  }
  return 'none';
}

/** Whether `severity` should fail the run under `failOn`. */
export function failsThreshold(severity: DriftSeverity, failOn: DriftSeverity): boolean {
  if (failOn === 'none') return false;
  return SEVERITY_RANK[severity] >= SEVERITY_RANK[failOn];
}

/**
 * Classifies one project's generated files.
 *
 * Split out from `runCheck` so the classification can be tested without a
 * reporter or a process exit code, and so a future caller (the CI action,
 * `review`'s dx category) can reuse the same answer.
 */
export function classifyDrift(input: {
  targetDir: string;
  /** What a fresh generation produces, from `vfs.snapshot().files`. */
  produced: readonly string[];
  /** Contents of each produced path, for comparing against disk. */
  read: (relativePath: string) => string | undefined;
  /** The `generated` map from the project's config. */
  recorded: Fingerprints | undefined;
}): Pick<CheckReport, 'current' | 'behind' | 'edited' | 'missing' | 'added' | 'orphaned'> {
  const { targetDir, produced, read, recorded } = input;

  /*
   * `ai-project.config.json` is excluded throughout. It records the version
   * and every other file's fingerprint, so it changes on any run that changes
   * anything — reporting it as "behind" would mean every check that found one
   * stale rule also reported a second, meaningless one. It is the only member
   * of UNTRACKED, and it is excluded from `recorded` for the same reason.
   */
  const tracked = produced.filter((file) => !UNTRACKED.has(file));

  // Anything whose disk contents no longer match the fingerprint recorded at
  // generation is the user's. Same call `upgrade` makes before writing.
  const edited = new Set(preservedPaths(targetDir, tracked, recorded));

  const current: string[] = [];
  const behind: string[] = [];
  const missing: string[] = [];
  const added: string[] = [];

  for (const file of tracked) {
    if (edited.has(file)) continue;

    const full = path.join(targetDir, ...file.split('/'));
    const onDisk = fs.existsSync(full) ? readFileOrUndefined(full) : undefined;

    if (onDisk === undefined) {
      // Never written by the version that generated this project (a new file
      // in a later release) versus written and since deleted — the recorded
      // fingerprint map is the only thing that can tell those apart.
      if (recorded && recorded[file] !== undefined) missing.push(file);
      else added.push(file);
      continue;
    }

    if (onDisk === read(file)) current.push(file);
    else behind.push(file);
  }

  /*
   * A path recorded at generation that this version no longer produces at all,
   * and which is still sitting on disk — a module dropped from the catalogue,
   * or output that was renamed.
   *
   * Its own bucket rather than folded into `missing`, which means the exact
   * opposite: this file is present, and that is the problem. A rule file for a
   * technology no longer in the stack is the clearest possible case of a repo
   * telling an assistant something untrue, so it is worth reporting even
   * though `upgrade` will not remove it — only `add --replace` does.
   */
  const producedSet = new Set(tracked);
  const orphaned = Object.keys(recorded ?? {}).filter(
    (file) => !producedSet.has(file) && fs.existsSync(path.join(targetDir, ...file.split('/'))),
  );

  return {
    current: current.sort(),
    behind: behind.sort(),
    edited: [...edited].sort(),
    missing: missing.sort(),
    added: added.sort(),
    orphaned: orphaned.sort(),
  };
}

function readFileOrUndefined(fullPath: string): string | undefined {
  try {
    return fs.readFileSync(fullPath, 'utf8');
  } catch {
    return undefined; // unreadable or binary — treated as absent, same as the flush path
  }
}

export async function runCheck(
  argv: string[],
  rootDir: string,
  reporter: Reporter,
): Promise<number> {
  const flags = parseCheckFlags(argv);

  if (flags.help) {
    reporter.plain(CHECK_HELP_TEXT);
    return 0;
  }

  const targetDir = path.resolve(flags.dir ?? process.cwd());
  const configFile = path.join(targetDir, CONFIG_FILENAME);

  if (!fs.existsSync(configFile)) {
    /*
     * Exit 2 rather than the usual thrown GeneratorError, because this is the
     * one command whose failure a CI job has to be able to tell apart: "this
     * repo has drifted" (1) and "this repo was never generated by us" (2) call
     * for completely different responses, and collapsing both into 1 would
     * make the action's failure meaningless.
     */
    reporter.failure(
      new GeneratorError(
        'INVALID_CONFIG',
        `No ${CONFIG_FILENAME} found in ${targetDir}.`,
        'This must be a project ai-project-bootstrap already generated. Pass --dir to point at one.',
      ),
    );
    return 2;
  }

  const selection = loadSelectionFile(configFile);
  const recordedVersion = readRecordedGeneratorVersion(configFile);
  const installedVersion = readGeneratorPackageInfo(rootDir).version;
  const registry = loadRegistry(rootDir);

  const result = generate({
    rootDir,
    targetDir,
    selection,
    builders,
    registry,
    packs: loadPinnedPacks(readPinnedPacks(configFile)),
    generatorVersion: installedVersion,
    // No `onBuilder` — a read-only report should not print a build log, and
    // --json must emit nothing but JSON.
  });

  const produced = result.vfs.snapshot().files;
  const classified = classifyDrift({
    targetDir,
    produced,
    read: (file) => result.vfs.read(file),
    recorded: readFingerprints(configFile),
  });

  const newAiTools = newlySupportedAiTools(selection.choices);
  const versionBehind = recordedVersion !== undefined && recordedVersion !== installedVersion;

  // The one network call in this command, and it cannot fail the run: see
  // `fetchAdvisories`, which resolves a note rather than rejecting.
  const advisoryResult = flags.advisories
    ? await fetchAdvisories(moduleIdsFrom(selection.choices))
    : undefined;

  const report: CheckReport = {
    projectName: selection.projectName,
    targetDir,
    recordedVersion,
    installedVersion,
    ...classified,
    newAiTools,
    ...(advisoryResult
      ? {
          advisories: advisoryResult.advisories,
          advisoriesEntitled: advisoryResult.entitled,
          ...(advisoryResult.note ? { advisoryNote: advisoryResult.note } : {}),
        }
      : {}),
    severity: severityOf(
      { ...classified, newAiTools },
      versionBehind,
      // Only advisories whose text this caller may read raise severity. An
      // unentitled caller is told the count and the severity, but failing
      // somebody's build over something the same response refuses to explain
      // would be indefensible.
      advisoryResult?.entitled ? advisoryResult.advisories : [],
    ),
  };

  if (flags.json) {
    reporter.plain(JSON.stringify(toJson(report, flags.failOn), null, 2));
  } else {
    reporter.checkSummary(report);
  }

  return failsThreshold(report.severity, flags.failOn) ? 1 : 0;
}

/**
 * The CI contract.
 *
 * Versioned from the start: the GitHub action parses this, and an action
 * pinned to @v1 has to keep working against a CLI the user upgrades
 * independently. Counts are alongside the arrays rather than derived by every
 * consumer, so a shell one-liner with `jq` is as easy as a real parser.
 */
export function toJson(report: CheckReport, failOn: DriftSeverity) {
  return {
    schema: 1,
    project: report.projectName,
    generatorVersion: {
      recorded: report.recordedVersion ?? null,
      installed: report.installedVersion,
    },
    counts: {
      current: report.current.length,
      behind: report.behind.length,
      edited: report.edited.length,
      missing: report.missing.length,
      added: report.added.length,
      orphaned: report.orphaned.length,
    },
    behind: report.behind,
    edited: report.edited,
    missing: report.missing,
    added: report.added,
    orphaned: report.orphaned,
    newAiTools: report.newAiTools,
    /*
     * Additive, and only ever additive. The GitHub action parses this payload
     * and is pinned by a moving `v1` tag, so a changed field breaks every
     * consumer at once — while a new one is invisible to anything that does
     * not look for it. `schema` stays 1 for the same reason: nothing above
     * this line moved.
     *
     * `advisories` is null rather than absent when they were skipped, so a
     * consumer can tell "we did not look" from "we looked and found none" —
     * an empty array means the latter.
     */
    advisories: report.advisories
      ? {
          entitled: report.advisoriesEntitled ?? false,
          total: report.advisories.length,
          items: report.advisories,
        }
      : null,
    advisoryNote: report.advisoryNote ?? null,
    severity: report.severity,
    failOn,
    ok: !failsThreshold(report.severity, failOn),
  };
}
