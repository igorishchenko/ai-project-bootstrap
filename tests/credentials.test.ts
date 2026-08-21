import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  credentialsPath,
  maskKey,
  readStoredKey,
  removeStoredKey,
  resolveConfigDir,
  storeKey,
} from '../src/cli/credentials.js';

describe('resolveConfigDir', () => {
  const home = '/home/ada';

  it('uses Application Support on macOS', () => {
    expect(resolveConfigDir({ HOME: home }, 'darwin')).toBe(
      '/home/ada/Library/Application Support/ai-project-bootstrap',
    );
  });

  it('uses APPDATA on Windows', () => {
    expect(resolveConfigDir({ HOME: home, APPDATA: 'C:\\Users\\Ada\\AppData\\Roaming' }, 'win32')).toBe(
      path.join('C:\\Users\\Ada\\AppData\\Roaming', 'ai-project-bootstrap'),
    );
  });

  it('falls back to a conventional AppData path when APPDATA is unset', () => {
    expect(resolveConfigDir({ HOME: home }, 'win32')).toBe(
      path.join(home, 'AppData', 'Roaming', 'ai-project-bootstrap'),
    );
  });

  it('follows XDG_CONFIG_HOME on Linux', () => {
    expect(resolveConfigDir({ HOME: home, XDG_CONFIG_HOME: '/xdg' }, 'linux')).toBe(
      '/xdg/ai-project-bootstrap',
    );
  });

  it('falls back to ~/.config on Linux', () => {
    expect(resolveConfigDir({ HOME: home }, 'linux')).toBe('/home/ada/.config/ai-project-bootstrap');
  });

  /** The spec says a relative XDG_CONFIG_HOME must be ignored, not resolved. */
  it('ignores a relative XDG_CONFIG_HOME', () => {
    expect(resolveConfigDir({ HOME: home, XDG_CONFIG_HOME: 'relative/path' }, 'linux')).toBe(
      '/home/ada/.config/ai-project-bootstrap',
    );
  });

  it('lets AI_PROJECT_BOOTSTRAP_CONFIG_DIR override every platform', () => {
    for (const platform of ['darwin', 'linux', 'win32'] as const) {
      expect(resolveConfigDir({ AI_PROJECT_BOOTSTRAP_CONFIG_DIR: '/tmp/x', HOME: home }, platform)).toBe(
        '/tmp/x',
      );
    }
  });

  /**
   * Not the project directory, on any platform. A credential written next to a
   * generated project is one `git add -A` away from a public repository.
   */
  it('never lands inside the current working directory', () => {
    for (const platform of ['darwin', 'linux', 'win32'] as const) {
      expect(resolveConfigDir({ HOME: home }, platform).startsWith(process.cwd())).toBe(false);
    }
  });
});

describe('maskKey', () => {
  /** Character-for-character the backend's rule — see credentials.ts. */
  it('keeps the prefix and both ends recognisable', () => {
    expect(maskKey('apb_live_70t89pI3b-ZWI_zSryTavXd2rU-LA2L5')).toBe('apb_live_70t8••••••••A2L5');
  });

  it('does not leak a short body', () => {
    expect(maskKey('apb_live_abc')).toBe('apb_live_•••');
  });
});

describe('stored credentials', () => {
  let dir: string;
  let env: { AI_PROJECT_BOOTSTRAP_CONFIG_DIR: string };

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'apb-cred-'));
    env = { AI_PROJECT_BOOTSTRAP_CONFIG_DIR: path.join(dir, 'nested') };
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('round-trips a key', () => {
    storeKey('apb_live_abc123', undefined, env);
    expect(readStoredKey(env)).toBe('apb_live_abc123');
  });

  it('creates the directory it needs', () => {
    storeKey('apb_live_abc123', undefined, env);
    expect(fs.existsSync(credentialsPath(env))).toBe(true);
  });

  /**
   * The whole reason this file exists rather than a shell profile: nobody else
   * on the machine gets to read the key.
   */
  it.skipIf(process.platform === 'win32')('writes the file owner-only', () => {
    storeKey('apb_live_abc123', undefined, env);
    const mode = fs.statSync(credentialsPath(env)).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it.skipIf(process.platform === 'win32')('creates the directory owner-only', () => {
    storeKey('apb_live_abc123', undefined, env);
    const mode = fs.statSync(resolveConfigDir(env)).mode & 0o777;
    expect(mode).toBe(0o700);
  });

  /**
   * `writeFileSync`'s mode only applies when it creates the file, so a key
   * written by an earlier, laxer version would otherwise keep its permissions
   * forever. `storeKey` chmods explicitly; this is what proves it.
   */
  it.skipIf(process.platform === 'win32')('tightens an existing file that was too permissive', () => {
    storeKey('apb_live_first', undefined, env);
    fs.chmodSync(credentialsPath(env), 0o644);

    storeKey('apb_live_second', undefined, env);

    expect(fs.statSync(credentialsPath(env)).mode & 0o777).toBe(0o600);
  });

  it('returns undefined when nothing is stored', () => {
    expect(readStoredKey(env)).toBeUndefined();
  });

  /** A hand-edited file should mean "not logged in", not a stack trace. */
  it('returns undefined for a damaged file instead of throwing', () => {
    fs.mkdirSync(resolveConfigDir(env), { recursive: true });
    fs.writeFileSync(credentialsPath(env), '{not json');
    expect(readStoredKey(env)).toBeUndefined();
  });

  it('treats an empty stored key as no key', () => {
    fs.mkdirSync(resolveConfigDir(env), { recursive: true });
    fs.writeFileSync(credentialsPath(env), JSON.stringify({ licenseKey: '  ' }));
    expect(readStoredKey(env)).toBeUndefined();
  });

  it('removes the key', () => {
    storeKey('apb_live_abc123', undefined, env);
    expect(removeStoredKey(env)).toBe(true);
    expect(readStoredKey(env)).toBeUndefined();
  });

  it('reports nothing removed when there was nothing there', () => {
    expect(removeStoredKey(env)).toBe(false);
  });
});
