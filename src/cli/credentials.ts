import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { GeneratorError } from '../core/resolve/errors.js';

/**
 * Where `login` keeps a license key.
 *
 * Deliberately not the project directory. A credential written next to the
 * generated project is one `git add -A` away from a public repository, and the
 * whole point of this file is that people stop pasting the key into shell
 * profiles and CI configs by hand.
 */
const DIR_NAME = 'ai-project-bootstrap';
const FILE_NAME = 'credentials.json';

/** Owner-only, both. A credential no other account on the machine can read. */
const DIR_MODE = 0o700;
const FILE_MODE = 0o600;

export interface CredentialEnv {
  AI_PROJECT_BOOTSTRAP_CONFIG_DIR?: string;
  XDG_CONFIG_HOME?: string;
  APPDATA?: string;
  HOME?: string;
}

/**
 * The OS-appropriate config directory.
 *
 * Takes its environment and platform as arguments rather than reading
 * `process` directly, which is what lets the tests assert the real path logic
 * on every platform from one machine — the same shape `doctorChecks.ts` uses
 * for the same reason.
 *
 * `AI_PROJECT_BOOTSTRAP_CONFIG_DIR` overrides everything. It exists for the
 * tests and for anyone running several accounts against one machine; it is not
 * documented as a general-purpose setting, because the answer to "where should
 * my credentials live" should almost always be "wherever this puts them".
 */
export function resolveConfigDir(
  env: CredentialEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): string {
  const override = env.AI_PROJECT_BOOTSTRAP_CONFIG_DIR?.trim();
  if (override) return override;

  const home = env.HOME?.trim() || os.homedir();

  if (platform === 'win32') {
    const appData = env.APPDATA?.trim();
    return path.join(appData || path.join(home, 'AppData', 'Roaming'), DIR_NAME);
  }

  if (platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', DIR_NAME);
  }

  // Linux and everything else: the XDG basedir spec, which says to fall back
  // to ~/.config when the variable is unset or not absolute.
  const xdg = env.XDG_CONFIG_HOME?.trim();
  const base = xdg && path.isAbsolute(xdg) ? xdg : path.join(home, '.config');
  return path.join(base, DIR_NAME);
}

export function credentialsPath(
  env: CredentialEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): string {
  return path.join(resolveConfigDir(env, platform), FILE_NAME);
}

interface CredentialsFile {
  licenseKey?: string;
  /**
   * The backend this key belongs to, when it is not the hosted one.
   *
   * A key is only meaningful against the server that issued it, so storing the
   * two apart is what makes "that key was not accepted" the most confusing
   * failure this CLI has: a local key checked against production and a
   * production key checked against localhost both look exactly like a typo.
   * Recording it at `login` means you point the CLI somewhere once, rather than
   * exporting a variable before every command and discovering which ones you
   * forgot.
   *
   * Only written when it differs from the default, so a normal install keeps a
   * file with nothing in it but a key, and a value here always means somebody
   * deliberately pointed this machine elsewhere.
   */
  apiUrl?: string;
}

/**
 * The stored key, or undefined when there is none.
 *
 * Never throws on a damaged file. Someone who hand-edited it into invalid JSON
 * should get "you are not logged in" and a working `login`, not a stack trace
 * from a command that was only trying to check whether a key existed.
 */
export function readStoredKey(
  env: CredentialEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): string | undefined {
  try {
    const raw = fs.readFileSync(credentialsPath(env, platform), 'utf8');
    const parsed = JSON.parse(raw) as CredentialsFile;
    const key = parsed.licenseKey?.trim();
    return key || undefined;
  } catch {
    return undefined;
  }
}

/** The stored backend URL, or undefined when this machine uses the default. */
export function readStoredApiUrl(
  env: CredentialEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): string | undefined {
  try {
    const raw = fs.readFileSync(credentialsPath(env, platform), 'utf8');
    const parsed = JSON.parse(raw) as CredentialsFile;
    const url = parsed.apiUrl?.trim();
    return url || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Writes the key with owner-only permissions on both the file and its
 * directory.
 *
 * The mode is passed to `writeFileSync` *and* re-applied with `chmodSync`,
 * because the mode argument is only honoured when the file is created — an
 * existing file from an earlier, laxer version would otherwise keep whatever
 * permissions it already had, silently, forever.
 */
export function storeKey(
  key: string,
  apiUrl?: string,
  env: CredentialEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): string {
  const dir = resolveConfigDir(env, platform);
  const file = path.join(dir, FILE_NAME);
  const contents: CredentialsFile = apiUrl ? { licenseKey: key, apiUrl } : { licenseKey: key };

  try {
    fs.mkdirSync(dir, { recursive: true, mode: DIR_MODE });
    fs.writeFileSync(file, `${JSON.stringify(contents, null, 2)}\n`, {
      mode: FILE_MODE,
    });
    // Windows has no POSIX mode bits and chmod is close to a no-op there; the
    // call is harmless and the guarantee is documented as best-effort.
    fs.chmodSync(file, FILE_MODE);
  } catch (error) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      `Could not write ${file}: ${error instanceof Error ? error.message : String(error)}`,
      'Check that the directory is writable, or set AI_PROJECT_BOOTSTRAP_LICENSE_KEY instead.',
    );
  }

  return file;
}

/** Removes the stored key. Returns false when there was nothing to remove. */
export function removeStoredKey(
  env: CredentialEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): boolean {
  const file = credentialsPath(env, platform);
  try {
    fs.rmSync(file);
    return true;
  } catch {
    return false;
  }
}

/**
 * `apb_live_9f3c••••••••4f2a` — enough to recognise your own key at a glance
 * without putting the whole secret on screen.
 *
 * Character-for-character the same rule as the backend's `maskKey`
 * (`src/routes/license.ts` in the cloud repo), so `login --status` and the
 * dashboard show the same person the same string for the same key. Duplicated
 * rather than shared because this package is public, MIT and standalone: it
 * cannot depend on the private backend, and a nine-line masking rule is a
 * cheaper thing to keep in step than a shared package would be.
 */
export function maskKey(key: string): string {
  const prefix = key.slice(0, 9);
  const body = key.slice(9);
  if (body.length <= 8) return `${prefix}${'•'.repeat(body.length)}`;
  return `${prefix}${body.slice(0, 4)}${'•'.repeat(8)}${body.slice(-4)}`;
}
