import { spawnSync } from 'node:child_process';
import semver from 'semver';

export type CheckSeverity = 'required' | 'optional';

export interface CheckResult {
  id: string;
  name: string;
  severity: CheckSeverity;
  ok: boolean;
  /** Short status, e.g. a version string or "not found". */
  detail: string;
  /** What to do about it — only set when `ok` is false. */
  hint?: string;
}

export interface CommandResult {
  ok: boolean;
  /** Combined stdout+stderr — some tools (`java -version`) only write to stderr. */
  output: string;
}

export type CommandRunner = (command: string, args: string[]) => CommandResult;

/** Runs a real command. Swallowed entirely on `ENOENT` — that just means "not installed". */
export const realCommandRunner: CommandRunner = (command, args) => {
  try {
    const result = spawnSync(command, args, { encoding: 'utf8' });
    if (result.error) return { ok: false, output: '' };
    return {
      ok: result.status === 0,
      output: `${result.stdout ?? ''}${result.stderr ?? ''}`.trim(),
    };
  } catch {
    return { ok: false, output: '' };
  }
};

/**
 * Everything a check needs, injected rather than read from the real `process`
 * — so a test can assert "Xcode reports missing" without needing a machine
 * that actually lacks Xcode.
 */
export interface DoctorEnv {
  run: CommandRunner;
  platform: NodeJS.Platform;
  env: Record<string, string | undefined>;
  nodeVersion: string;
}

export function realDoctorEnv(): DoctorEnv {
  return {
    run: realCommandRunner,
    platform: process.platform,
    env: process.env,
    nodeVersion: process.versions.node,
  };
}

function firstLine(output: string): string {
  return output.split(/\r?\n/)[0]?.trim() ?? '';
}

interface CommandCheckOptions {
  id: string;
  name: string;
  severity: CheckSeverity;
  command: string;
  args?: string[];
  hint: string;
}

function checkCommand(doctorEnv: DoctorEnv, options: CommandCheckOptions): CheckResult {
  const result = doctorEnv.run(options.command, options.args ?? ['--version']);
  return {
    id: options.id,
    name: options.name,
    severity: options.severity,
    ok: result.ok,
    detail: result.ok ? firstLine(result.output) || 'installed' : 'not found',
    hint: result.ok ? undefined : options.hint,
  };
}

/** Node itself is always present — running Node is how this got invoked — so this checks its version. */
export function checkNode(doctorEnv: DoctorEnv, wantedRange: string | undefined): CheckResult {
  const ok = !wantedRange || semver.satisfies(doctorEnv.nodeVersion, wantedRange);
  return {
    id: 'node',
    name: 'Node.js',
    severity: 'required',
    ok,
    detail: ok ? `v${doctorEnv.nodeVersion}` : `v${doctorEnv.nodeVersion}, need ${wantedRange}`,
    hint: ok ? undefined : 'Install a newer Node — https://nodejs.org, or use nvm/fnm to switch.',
  };
}

export function checkGit(doctorEnv: DoctorEnv): CheckResult {
  return checkCommand(doctorEnv, {
    id: 'git',
    name: 'Git',
    severity: 'required',
    command: 'git',
    hint: 'Install Git — https://git-scm.com/downloads',
  });
}

/** Every generated project's scripts run through npm, even if you use another manager day to day. */
export function checkNpm(doctorEnv: DoctorEnv): CheckResult {
  return checkCommand(doctorEnv, {
    id: 'npm',
    name: 'npm',
    severity: 'required',
    command: 'npm',
    hint: 'npm ships with Node — reinstall Node from https://nodejs.org if it is missing.',
  });
}

export function checkBun(doctorEnv: DoctorEnv): CheckResult {
  return checkCommand(doctorEnv, {
    id: 'bun',
    name: 'Bun',
    severity: 'optional',
    command: 'bun',
    hint: 'Optional — a faster alternative to npm. Install from https://bun.sh',
  });
}

export function checkDocker(doctorEnv: DoctorEnv): CheckResult {
  return checkCommand(doctorEnv, {
    id: 'docker',
    name: 'Docker',
    severity: 'optional',
    command: 'docker',
    hint: 'Needed to run a self-managed database or backend locally. Install from https://docker.com',
  });
}

export function checkWatchman(doctorEnv: DoctorEnv): CheckResult {
  return checkCommand(doctorEnv, {
    id: 'watchman',
    name: 'Watchman',
    severity: 'optional',
    command: 'watchman',
    args: ['--version'],
    hint: 'Speeds up React Native/Metro file watching. Install from https://facebook.github.io/watchman',
  });
}

export function checkJava(doctorEnv: DoctorEnv): CheckResult {
  return checkCommand(doctorEnv, {
    id: 'java',
    name: 'Java',
    severity: 'optional',
    command: 'java',
    args: ['-version'],
    hint: 'Needed for Android build tooling. Install a JDK, e.g. via https://adoptium.net',
  });
}

/** Xcode is macOS-only — `undefined` on any other platform means "not applicable", not "missing". */
export function checkXcode(doctorEnv: DoctorEnv): CheckResult | undefined {
  if (doctorEnv.platform !== 'darwin') return undefined;
  return checkCommand(doctorEnv, {
    id: 'xcode',
    name: 'Xcode Command Line Tools',
    severity: 'optional',
    command: 'xcodebuild',
    args: ['-version'],
    hint: 'Run `xcode-select --install`, or install the full Xcode from the App Store for iOS builds.',
  });
}

export function checkAndroidSdk(doctorEnv: DoctorEnv): CheckResult {
  const home = doctorEnv.env.ANDROID_HOME ?? doctorEnv.env.ANDROID_SDK_ROOT;
  if (home) {
    return { id: 'android-sdk', name: 'Android SDK', severity: 'optional', ok: true, detail: home };
  }

  // No env var set — a real install still has `adb` on PATH, so try that
  // before reporting the SDK missing outright.
  const result = checkCommand(doctorEnv, {
    id: 'android-sdk',
    name: 'Android SDK',
    severity: 'optional',
    command: 'adb',
    args: ['--version'],
    hint: 'Install Android Studio, or set ANDROID_HOME to your existing SDK path.',
  });
  return { ...result, detail: result.ok ? 'adb on PATH' : result.detail };
}

/** Universal checks — always run, regardless of what the user is building. */
export function universalChecks(
  doctorEnv: DoctorEnv,
  wantedNodeRange: string | undefined,
): CheckResult[] {
  return [
    checkNode(doctorEnv, wantedNodeRange),
    checkGit(doctorEnv),
    checkNpm(doctorEnv),
    checkBun(doctorEnv),
  ];
}

/** Mobile tooling — relevant once a mobile platform is in play. */
export function mobileChecks(doctorEnv: DoctorEnv): CheckResult[] {
  const xcode = checkXcode(doctorEnv);
  return [
    ...(xcode ? [xcode] : []),
    checkAndroidSdk(doctorEnv),
    checkWatchman(doctorEnv),
    checkJava(doctorEnv),
  ];
}

/** Backend tooling — relevant once something is self-managed rather than fully hosted. */
export function backendChecks(doctorEnv: DoctorEnv): CheckResult[] {
  return [checkDocker(doctorEnv)];
}
