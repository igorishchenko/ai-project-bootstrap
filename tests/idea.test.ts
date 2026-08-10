import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GeneratorError } from '../src/core/resolve/errors.js';

const notes: Array<{ message: string; title?: string }> = [];

vi.mock('@clack/prompts', () => ({
  spinner: () => ({ start: () => {}, stop: () => {}, message: () => {} }),
  note: (message: string, title?: string) => {
    notes.push({ message, title });
  },
}));

const { resolveApiUrl, requireLicenseKey, requestStackProposal } =
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
  const original = process.env.AI_PROJECT_BOOTSTRAP_LICENSE_KEY;

  afterEach(() => {
    if (original) process.env.AI_PROJECT_BOOTSTRAP_LICENSE_KEY = original;
    else delete process.env.AI_PROJECT_BOOTSTRAP_LICENSE_KEY;
  });

  it('throws INVALID_CONFIG when AI_PROJECT_BOOTSTRAP_LICENSE_KEY is unset', () => {
    delete process.env.AI_PROJECT_BOOTSTRAP_LICENSE_KEY;
    expect(() => requireLicenseKey()).toThrow(GeneratorError);
    expect(() => requireLicenseKey()).toThrow(/AI_PROJECT_BOOTSTRAP_LICENSE_KEY is not set/);
  });

  it('returns the key when set', () => {
    process.env.AI_PROJECT_BOOTSTRAP_LICENSE_KEY = 'apb_live_test';
    expect(requireLicenseKey()).toBe('apb_live_test');
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
