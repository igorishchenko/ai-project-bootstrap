import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GeneratorError } from '../src/core/resolve/errors.js';
import type { Reporter } from '../src/cli/reporter.js';

vi.mock('@clack/prompts', () => ({
  spinner: () => ({ start: () => {}, stop: () => {}, message: () => {} }),
  password: vi.fn(),
  isCancel: (value: unknown) => typeof value === 'symbol',
}));

const { parseLoginFlags, runLogin, runLogout } = await import('../src/cli/login.js');
const { credentialsPath, readStoredApiUrl, readStoredKey, storeKey } = await import(
  '../src/cli/credentials.js',
);
const { resolveApiUrl } = await import('../src/cli/idea.js');

/** Captures what the command printed, so assertions read the real output. */
class FakeReporter {
  lines: string[] = [];
  plain(text: string): void {
    this.lines.push(text);
  }
  get output(): string {
    return this.lines.join('\n');
  }
}

const reporterFor = () => new FakeReporter() as unknown as Reporter;
const outputOf = (reporter: unknown) => (reporter as FakeReporter).output;

const KEY = 'apb_live_70t89pI3b-ZWI_zSryTavXd2rU-LA2L5';

describe('parseLoginFlags', () => {
  it('reads --key and --status', () => {
    expect(parseLoginFlags(['--key', KEY])).toEqual({ key: KEY, status: false, help: false });
    expect(parseLoginFlags(['--status'])).toEqual({ status: true, help: false });
  });

  it('rejects --key with no value', () => {
    expect(() => parseLoginFlags(['--key'])).toThrow(GeneratorError);
  });

  it('rejects an unknown flag', () => {
    expect(() => parseLoginFlags(['--nope'])).toThrow(/Unknown flag/);
  });
});

describe('login', () => {
  let dir: string;
  const originalKey = process.env.AI_PROJECT_BOOTSTRAP_LICENSE_KEY;
  const originalDir = process.env.AI_PROJECT_BOOTSTRAP_CONFIG_DIR;
  const originalUrl = process.env.AI_PROJECT_BOOTSTRAP_API_URL;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'apb-login-'));
    process.env.AI_PROJECT_BOOTSTRAP_CONFIG_DIR = dir;
    process.env.AI_PROJECT_BOOTSTRAP_API_URL = 'https://api.example.com';
    delete process.env.AI_PROJECT_BOOTSTRAP_LICENSE_KEY;
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    vi.unstubAllGlobals();
    for (const [name, value] of [
      ['AI_PROJECT_BOOTSTRAP_LICENSE_KEY', originalKey],
      ['AI_PROJECT_BOOTSTRAP_CONFIG_DIR', originalDir],
      ['AI_PROJECT_BOOTSTRAP_API_URL', originalUrl],
    ] as const) {
      if (value) process.env[name] = value;
      else delete process.env[name];
    }
  });

  const stubFetch = (response: { ok: boolean; status: number; body: unknown }) => {
    const fetchMock = vi.fn(async () => ({
      ok: response.ok,
      status: response.status,
      json: async () => response.body,
    }));
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  };

  it('verifies the key against the backend before storing it', async () => {
    const fetchMock = stubFetch({ ok: true, status: 200, body: { ok: true, status: 'active' } });
    const reporter = reporterFor();

    const code = await runLogin(['--key', KEY], reporter);

    expect(code).toBe(0);
    expect(readStoredKey()).toBe(KEY);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { headers: Record<string, string> }];
    expect(url).toBe('https://api.example.com/v1/license/verify');
    expect(init.headers.authorization).toBe(`Bearer ${KEY}`);
  });

  /**
   * The acceptance criterion this command exists for: a typo fails at `login`,
   * not hours later at first use.
   */
  it('rejects an invalid key and stores nothing', async () => {
    stubFetch({
      ok: false,
      status: 402,
      body: { error: { code: 'LICENSE_REQUIRED', message: 'No.', hint: 'Check the dashboard.' } },
    });

    await expect(runLogin(['--key', 'apb_live_wrong'], reporterFor())).rejects.toThrow(GeneratorError);
    expect(readStoredKey()).toBeUndefined();
    expect(fs.existsSync(credentialsPath())).toBe(false);
  });

  /**
   * The backend's hint tells any caller to set AI_PROJECT_BOOTSTRAP_LICENSE_KEY.
   * Relayed here it lands in front of somebody part-way through `login` — the
   * command whose whole purpose is that nobody has to do that — so a new
   * subscriber who mistyped their key was sent back to the environment variable
   * this release retired.
   */
  it('does not relay the backend hint about the environment variable', async () => {
    stubFetch({
      ok: false,
      status: 402,
      body: {
        error: {
          code: 'LICENSE_REQUIRED',
          message: 'A valid license key is required for this endpoint.',
          hint: 'Set AI_PROJECT_BOOTSTRAP_LICENSE_KEY to your license key, or subscribe to get one.',
        },
      },
    });

    const error = await runLogin(['--key', 'apb_live_wrong'], reporterFor()).catch((e) => e);
    expect(error).toBeInstanceOf(GeneratorError);
    expect(error.hint).not.toContain('AI_PROJECT_BOOTSTRAP_LICENSE_KEY');
    expect(error.hint).toContain('Nothing was stored');
    // The backend's *message* still comes through — it is what distinguishes a
    // lapsed subscription from a mistyped key.
    expect(error.message).toContain('A valid license key is required');
  });

  /**
   * Both directions look identical to a mistyped key until the URL is on
   * screen: a dashboard key against localhost, and a local development key
   * against the hosted backend.
   */
  it('names the backend it asked, overridden or not', async () => {
    stubFetch({ ok: false, status: 402, body: { error: { code: 'LICENSE_REQUIRED' } } });
    process.env.AI_PROJECT_BOOTSTRAP_API_URL = 'http://localhost:8787';
    const overridden = await runLogin(['--key', 'apb_live_wrong'], reporterFor()).catch((e) => e);
    expect(overridden.hint).toContain('http://localhost:8787');

    delete process.env.AI_PROJECT_BOOTSTRAP_API_URL;
    stubFetch({ ok: false, status: 402, body: { error: { code: 'LICENSE_REQUIRED' } } });
    const def = await runLogin(['--key', 'apb_live_wrong'], reporterFor()).catch((e) => e);
    expect(def.hint).toContain('https://api.ai-project-bootstrap.com');
  });

  /**
   * The point of recording it: a key is only valid against the server that
   * issued it, so `login` once against a backend and every later command finds
   * it — no variable exported before each one.
   */
  it('remembers a non-default backend, so later commands need no variable', async () => {
    process.env.AI_PROJECT_BOOTSTRAP_API_URL = 'http://localhost:8787';
    stubFetch({ ok: true, status: 200, body: { status: 'active' } });
    await runLogin(['--key', KEY], reporterFor());
    delete process.env.AI_PROJECT_BOOTSTRAP_API_URL;

    expect(readStoredApiUrl()).toBe('http://localhost:8787');
    // The whole point: resolved with nothing in the environment at all.
    expect(resolveApiUrl({})).toBe('http://localhost:8787');
  });

  /** A normal install should end up with a key and nothing else in the file. */
  it('records nothing when the backend is the default one', async () => {
    // The suite points every other test at a stand-in backend; the default
    // path is the one case that has to run with nothing set at all.
    delete process.env.AI_PROJECT_BOOTSTRAP_API_URL;
    stubFetch({ ok: true, status: 200, body: { status: 'active' } });
    await runLogin(['--key', KEY], reporterFor());

    expect(readStoredApiUrl()).toBeUndefined();
    expect(resolveApiUrl({})).toBe('https://api.ai-project-bootstrap.com');
  });

  /** The environment is the more deliberate of the two and must still win. */
  it('lets the environment override a remembered backend', async () => {
    process.env.AI_PROJECT_BOOTSTRAP_API_URL = 'http://localhost:8787';
    stubFetch({ ok: true, status: 200, body: { status: 'active' } });
    await runLogin(['--key', KEY], reporterFor());
    delete process.env.AI_PROJECT_BOOTSTRAP_API_URL;

    expect(resolveApiUrl({ AI_PROJECT_BOOTSTRAP_API_URL: 'https://elsewhere.test' })).toBe(
      'https://elsewhere.test',
    );
  });

  it('does not overwrite a good stored key with a rejected one', async () => {
    storeKey(KEY);
    stubFetch({ ok: false, status: 402, body: { error: { code: 'LICENSE_REQUIRED' } } });

    await expect(runLogin(['--key', 'apb_live_wrong'], reporterFor())).rejects.toThrow(GeneratorError);
    expect(readStoredKey()).toBe(KEY);
  });

  it('reports a network failure without storing anything', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('getaddrinfo ENOTFOUND');
      }),
    );

    await expect(runLogin(['--key', KEY], reporterFor())).rejects.toThrow(/Could not reach/);
    expect(readStoredKey()).toBeUndefined();
  });

  it('never prints the key in full', async () => {
    stubFetch({ ok: true, status: 200, body: { ok: true, status: 'active' } });
    const reporter = reporterFor();

    await runLogin(['--key', KEY], reporter);

    expect(outputOf(reporter)).not.toContain(KEY);
    expect(outputOf(reporter)).toContain('apb_live_70t8••••••••A2L5');
  });
});

describe('login --status', () => {
  let dir: string;
  const originalKey = process.env.AI_PROJECT_BOOTSTRAP_LICENSE_KEY;
  const originalDir = process.env.AI_PROJECT_BOOTSTRAP_CONFIG_DIR;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'apb-status-'));
    process.env.AI_PROJECT_BOOTSTRAP_CONFIG_DIR = dir;
    delete process.env.AI_PROJECT_BOOTSTRAP_LICENSE_KEY;
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    if (originalKey) process.env.AI_PROJECT_BOOTSTRAP_LICENSE_KEY = originalKey;
    else delete process.env.AI_PROJECT_BOOTSTRAP_LICENSE_KEY;
    if (originalDir) process.env.AI_PROJECT_BOOTSTRAP_CONFIG_DIR = originalDir;
    else delete process.env.AI_PROJECT_BOOTSTRAP_CONFIG_DIR;
  });

  it('says so when there is no key, and where one would go', async () => {
    const reporter = reporterFor();
    await runLogin(['--status'], reporter);

    expect(outputOf(reporter)).toContain('Not logged in');
    expect(outputOf(reporter)).toContain(dir);
  });

  it('masks the stored key rather than printing it', async () => {
    storeKey(KEY);
    const reporter = reporterFor();

    await runLogin(['--status'], reporter);

    expect(outputOf(reporter)).toContain('apb_live_70t8••••••••A2L5');
    expect(outputOf(reporter)).not.toContain(KEY);
  });

  /** Which key is actually in use matters more than which one is on disk. */
  it('says when the environment variable is the one being used', async () => {
    storeKey(KEY);
    process.env.AI_PROJECT_BOOTSTRAP_LICENSE_KEY = 'apb_live_from_the_environment';
    const reporter = reporterFor();

    await runLogin(['--status'], reporter);

    expect(outputOf(reporter)).toContain('AI_PROJECT_BOOTSTRAP_LICENSE_KEY');
    expect(outputOf(reporter)).toContain('takes precedence');
  });

  it('makes no network call', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    storeKey(KEY);

    await runLogin(['--status'], reporterFor());

    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe('logout', () => {
  let dir: string;
  const originalKey = process.env.AI_PROJECT_BOOTSTRAP_LICENSE_KEY;
  const originalDir = process.env.AI_PROJECT_BOOTSTRAP_CONFIG_DIR;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'apb-logout-'));
    process.env.AI_PROJECT_BOOTSTRAP_CONFIG_DIR = dir;
    delete process.env.AI_PROJECT_BOOTSTRAP_LICENSE_KEY;
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    if (originalKey) process.env.AI_PROJECT_BOOTSTRAP_LICENSE_KEY = originalKey;
    else delete process.env.AI_PROJECT_BOOTSTRAP_LICENSE_KEY;
    if (originalDir) process.env.AI_PROJECT_BOOTSTRAP_CONFIG_DIR = originalDir;
    else delete process.env.AI_PROJECT_BOOTSTRAP_CONFIG_DIR;
  });

  it('removes the stored key', () => {
    storeKey(KEY);
    expect(runLogout([], reporterFor())).toBe(0);
    expect(readStoredKey()).toBeUndefined();
  });

  it('is not an error when nothing was stored', () => {
    const reporter = reporterFor();
    expect(runLogout([], reporter)).toBe(0);
    expect(outputOf(reporter)).toContain('No stored key');
  });

  /**
   * Someone who runs `logout` and finds --idea still working has hit exactly
   * this. `logout` cannot unset a variable in the caller's shell, so the least
   * it can do is say so.
   */
  it('warns that the environment variable still wins', () => {
    storeKey(KEY);
    process.env.AI_PROJECT_BOOTSTRAP_LICENSE_KEY = 'apb_live_env';
    const reporter = reporterFor();

    runLogout([], reporter);

    expect(outputOf(reporter)).toContain('still set');
  });
});
