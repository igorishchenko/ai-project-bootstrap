import { describe, expect, it } from 'vitest';
import {
  type CommandResult,
  type DoctorEnv,
  backendChecks,
  checkAndroidSdk,
  checkBun,
  checkDocker,
  checkGit,
  checkJava,
  checkNode,
  checkNpm,
  checkWatchman,
  checkXcode,
  mobileChecks,
  universalChecks,
} from '../src/cli/doctorChecks.js';

function fakeEnv(overrides: Partial<DoctorEnv> = {}): DoctorEnv {
  return {
    run: () => ({ ok: false, output: '' }),
    platform: 'linux',
    env: {},
    nodeVersion: '20.10.0',
    ...overrides,
  };
}

function found(output: string) {
  return (): CommandResult => ({ ok: true, output });
}

describe('checkNode', () => {
  it('passes when the current version satisfies the wanted range', () => {
    const result = checkNode(fakeEnv({ nodeVersion: '20.10.0' }), '>=18');
    expect(result.ok).toBe(true);
    expect(result.severity).toBe('required');
    expect(result.detail).toBe('v20.10.0');
    expect(result.hint).toBeUndefined();
  });

  it('fails when the current version is below the wanted range, with a hint', () => {
    const result = checkNode(fakeEnv({ nodeVersion: '16.20.0' }), '>=18');
    expect(result.ok).toBe(false);
    expect(result.detail).toContain('need >=18');
    expect(result.hint).toBeDefined();
  });

  it('passes when no range is declared at all', () => {
    expect(checkNode(fakeEnv(), undefined).ok).toBe(true);
  });
});

describe('command-backed checks', () => {
  it('reports found, with the first line of output as the detail', () => {
    const env = fakeEnv({ run: found('git version 2.43.0\nsome extra noise') });
    const result = checkGit(env);

    expect(result.ok).toBe(true);
    expect(result.severity).toBe('required');
    expect(result.detail).toBe('git version 2.43.0');
    expect(result.hint).toBeUndefined();
  });

  it('reports not found, with a hint, when the command errors', () => {
    const result = checkGit(fakeEnv());

    expect(result.ok).toBe(false);
    expect(result.detail).toBe('not found');
    expect(result.hint).toBeDefined();
  });

  it('npm and Bun follow the same shape — npm required, Bun optional', () => {
    expect(checkNpm(fakeEnv({ run: found('10.2.0') })).severity).toBe('required');
    expect(checkBun(fakeEnv({ run: found('1.0.0') })).severity).toBe('optional');
  });

  it('Docker, Watchman and Java are all optional', () => {
    for (const check of [checkDocker, checkWatchman, checkJava]) {
      expect(check(fakeEnv()).severity).toBe('optional');
      expect(check(fakeEnv()).ok).toBe(false); // fakeEnv's default runner never finds anything
    }
  });
});

describe('checkXcode', () => {
  it('is not applicable outside macOS — undefined, not a failure', () => {
    expect(checkXcode(fakeEnv({ platform: 'linux' }))).toBeUndefined();
    expect(checkXcode(fakeEnv({ platform: 'win32' }))).toBeUndefined();
  });

  it('checks xcodebuild on macOS', () => {
    const missing = checkXcode(fakeEnv({ platform: 'darwin' }));
    expect(missing?.ok).toBe(false);
    expect(missing?.severity).toBe('optional');

    const present = checkXcode(fakeEnv({ platform: 'darwin', run: found('Xcode 15.2') }));
    expect(present?.ok).toBe(true);
  });
});

describe('checkAndroidSdk', () => {
  it('trusts ANDROID_HOME without shelling out', () => {
    let ran = false;
    const env = fakeEnv({
      env: { ANDROID_HOME: '/Users/me/Library/Android/sdk' },
      run: () => {
        ran = true;
        return { ok: false, output: '' };
      },
    });

    const result = checkAndroidSdk(env);
    expect(result.ok).toBe(true);
    expect(result.detail).toBe('/Users/me/Library/Android/sdk');
    expect(ran).toBe(false);
  });

  it('falls back to ANDROID_SDK_ROOT', () => {
    const result = checkAndroidSdk(fakeEnv({ env: { ANDROID_SDK_ROOT: '/opt/android-sdk' } }));
    expect(result.ok).toBe(true);
    expect(result.detail).toBe('/opt/android-sdk');
  });

  it('falls back to checking adb on PATH when no env var is set', () => {
    const withAdb = checkAndroidSdk(fakeEnv({ run: found('1.0.41') }));
    expect(withAdb.ok).toBe(true);
    expect(withAdb.detail).toBe('adb on PATH');

    const withoutAdb = checkAndroidSdk(fakeEnv());
    expect(withoutAdb.ok).toBe(false);
    expect(withoutAdb.hint).toBeDefined();
  });
});

describe('check groups', () => {
  it('universalChecks always includes Node, Git, npm and Bun', () => {
    const ids = universalChecks(fakeEnv(), '>=18').map((result) => result.id);
    expect(ids).toEqual(['node', 'git', 'npm', 'bun']);
  });

  it('mobileChecks includes Xcode only on macOS', () => {
    const onLinux = mobileChecks(fakeEnv({ platform: 'linux' })).map((result) => result.id);
    expect(onLinux).not.toContain('xcode');
    expect(onLinux).toEqual(['android-sdk', 'watchman', 'java']);

    const onMac = mobileChecks(fakeEnv({ platform: 'darwin' })).map((result) => result.id);
    expect(onMac).toEqual(['xcode', 'android-sdk', 'watchman', 'java']);
  });

  it('backendChecks is just Docker, for now', () => {
    expect(backendChecks(fakeEnv()).map((result) => result.id)).toEqual(['docker']);
  });

  it('no check is severity "required" outside the universal set', () => {
    const optional = [
      ...mobileChecks(fakeEnv({ platform: 'darwin' })),
      ...backendChecks(fakeEnv()),
    ];
    expect(optional.every((result) => result.severity === 'optional')).toBe(true);
  });
});
