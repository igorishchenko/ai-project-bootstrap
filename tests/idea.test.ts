import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GeneratorError } from '../src/core/resolve/errors.js';
import { storeKey } from '../src/cli/credentials.js';

const notes: Array<{ message: string; title?: string }> = [];

vi.mock('@clack/prompts', () => ({
  spinner: () => ({ start: () => {}, stop: () => {}, message: () => {} }),
  note: (message: string, title?: string) => {
    notes.push({ message, title });
  },
}));

const { resolveApiUrl, requireLicenseKey, resolveLicenseKey, requestStackProposal } =
  await import('../src/cli/idea.js');

const samplePreset = {
  id: 'idea',
  name: 'From your idea',
  description: 'a habit tracker for runners',
  choices: { target: 'web', web: 'nextjs' },
};

describe('resolveApiUrl', () => {
  const original = process.env.AI_PROJECT_BOOTSTRAP_API_URL;

  afterEach(() => {
    if (original) process.env.AI_PROJECT_BOOTSTRAP_API_URL = original;
    else delete process.env.AI_PROJECT_BOOTSTRAP_API_URL;
  });

  it('defaults to the deployed backend', () => {
    delete process.env.AI_PROJECT_BOOTSTRAP_API_URL;
    expect(resolveApiUrl()).toBe('https://api.ai-project-bootstrap.com');
  });

  it('reads AI_PROJECT_BOOTSTRAP_API_URL when set', () => {
    process.env.AI_PROJECT_BOOTSTRAP_API_URL = 'https://api.example.com';
    expect(resolveApiUrl()).toBe('https://api.example.com');
  });
});

describe('requireLicenseKey', () => {
  const originalKey = process.env.AI_PROJECT_BOOTSTRAP_LICENSE_KEY;
  const originalDir = process.env.AI_PROJECT_BOOTSTRAP_CONFIG_DIR;
  let dir: string;

  beforeEach(() => {
    // Pointed at a temp directory, or these tests would read whatever the
    // machine running them happens to have logged in.
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'apb-idea-'));
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

  it('throws INVALID_CONFIG when there is no key anywhere', () => {
    expect(() => requireLicenseKey()).toThrow(GeneratorError);
    expect(() => requireLicenseKey()).toThrow(/No license key found/);
  });

  /**
   * The message names a command, not a variable. Being told to set
   * AI_PROJECT_BOOTSTRAP_LICENSE_KEY was the first thing a paying customer met,
   * and it taught them the wrong thing to do with a credential.
   */
  it('tells you to run login rather than to set an environment variable', () => {
    try {
      requireLicenseKey();
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as GeneratorError).hint).toContain('ai-project-bootstrap login');
    }
  });

  it('returns the key from the environment', () => {
    process.env.AI_PROJECT_BOOTSTRAP_LICENSE_KEY = 'apb_live_test';
    expect(requireLicenseKey()).toBe('apb_live_test');
  });

  it('falls back to the stored key when the environment has none', () => {
    storeKey('apb_live_stored');
    expect(requireLicenseKey()).toBe('apb_live_stored');
    expect(resolveLicenseKey()).toEqual({ key: 'apb_live_stored', source: 'stored' });
  });

  /**
   * The environment wins, and that is what keeps every existing CI pipeline
   * working unchanged now that `login` exists: a key exported for this run is
   * the more deliberate of the two.
   */
  it('prefers the environment over the stored key when both are present', () => {
    storeKey('apb_live_stored');
    process.env.AI_PROJECT_BOOTSTRAP_LICENSE_KEY = 'apb_live_env';

    expect(requireLicenseKey()).toBe('apb_live_env');
    expect(resolveLicenseKey()).toEqual({ key: 'apb_live_env', source: 'env' });
  });

  it('ignores an empty environment variable rather than treating it as a key', () => {
    storeKey('apb_live_stored');
    process.env.AI_PROJECT_BOOTSTRAP_LICENSE_KEY = '   ';

    expect(requireLicenseKey()).toBe('apb_live_stored');
  });
});

describe('requestStackProposal', () => {
  beforeEach(() => {
    notes.length = 0;
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the preset and suggestedName, and prints the reasoning', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          preset: samplePreset,
          suggestedName: 'runner-habits',
          reasoning: 'A web app fits best.',
        }),
        { status: 200 },
      ),
    );

    const result = await requestStackProposal({
      idea: 'a habit tracker for runners',
      licenseKey: 'apb_live_test',
    });

    expect(result.preset).toEqual(samplePreset);
    expect(result.suggestedName).toBe('runner-habits');
    expect(notes).toEqual([{ message: 'A web app fits best.', title: 'Why this stack' }]);
  });

  it('posts to the resolved API URL with the idea and the license key as a bearer token', async () => {
    process.env.AI_PROJECT_BOOTSTRAP_API_URL = 'https://api.example.com';
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ preset: samplePreset }), { status: 200 }),
    );

    await requestStackProposal({ idea: 'a chat app', licenseKey: 'apb_live_abc' });

    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.com/v1/propose-stack',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ idea: 'a chat app' }),
        headers: expect.objectContaining({ authorization: 'Bearer apb_live_abc' }),
      }),
    );
    delete process.env.AI_PROJECT_BOOTSTRAP_API_URL;
  });

  it('throws a GeneratorError built from the response body on a non-2xx response (e.g. LICENSE_REQUIRED)', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: 'LICENSE_REQUIRED', message: 'bad license', hint: 'subscribe' },
        }),
        { status: 402 },
      ),
    );

    await expect(
      requestStackProposal({ idea: 'x', licenseKey: 'apb_live_bad' }),
    ).rejects.toMatchObject({
      code: 'LICENSE_REQUIRED',
      message: 'bad license',
      hint: 'subscribe',
    });
  });

  it('throws IDEA_REQUEST_FAILED when the response is missing a preset', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

    await expect(
      requestStackProposal({ idea: 'x', licenseKey: 'apb_live_test' }),
    ).rejects.toMatchObject({
      code: 'IDEA_REQUEST_FAILED',
    });
  });

  it('wraps a network failure as IDEA_REQUEST_FAILED', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('fetch failed'));

    await expect(
      requestStackProposal({ idea: 'x', licenseKey: 'apb_live_test' }),
    ).rejects.toMatchObject({
      code: 'IDEA_REQUEST_FAILED',
    });
  });
});
