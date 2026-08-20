import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ADVISORY_TIMEOUT_MS,
  fetchAdvisories,
  moduleIdsFrom,
  type Advisory,
} from '../src/cli/advisories.js';
import { parseCheckFlags, severityOf, toJson, type CheckReport } from '../src/cli/check.js';

const fixtureDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

function report(overrides: Partial<CheckReport> = {}): CheckReport {
  return {
    projectName: 'demo',
    targetDir: '/tmp/demo',
    recordedVersion: '1.3.2',
    installedVersion: '1.3.2',
    current: [],
    behind: [],
    edited: [],
    missing: [],
    added: [],
    orphaned: [],
    newAiTools: [],
    severity: 'none',
    ...overrides,
  };
}

function advisory(overrides: Partial<Advisory> = {}): Advisory {
  return { id: 'a-note', severity: 'warning', publishedAt: '2026-01-01', ...overrides };
}

describe('parseCheckFlags', () => {
  it('has advisories on by default', () => {
    expect(parseCheckFlags([]).advisories).toBe(true);
  });

  it('--no-advisories turns them off', () => {
    expect(parseCheckFlags(['--no-advisories']).advisories).toBe(false);
  });

  it('still parses the flags that existed before', () => {
    const flags = parseCheckFlags(['--json', '--fail-on', 'warning', '--dir', './x']);
    expect(flags).toMatchObject({ json: true, failOn: 'warning', dir: './x', advisories: true });
  });
});

describe('moduleIdsFrom', () => {
  it('flattens single and multi answers, deduped and sorted', () => {
    expect(
      moduleIdsFrom({ target: 'web', web: 'nextjs', testing: ['jest', 'detox'], backend: 'nextjs' }),
    ).toEqual(['detox', 'jest', 'nextjs', 'web']);
  });

  it('ignores empty values', () => {
    expect(moduleIdsFrom({ a: '', b: '   ', c: 'real' })).toEqual(['real']);
  });
});

/**
 * The decision requirement 3 asks to make explicitly: an advisory can raise the
 * report's severity, and therefore fail a build through `--fail-on`.
 */
describe('severityOf with advisories', () => {
  it('is unchanged when there are none', () => {
    expect(severityOf(report(), false)).toBe('none');
    expect(severityOf(report({ behind: ['a'] }), false)).toBe('warning');
  });

  it('lets a critical advisory raise a clean report to critical', () => {
    expect(severityOf(report(), false, [advisory({ severity: 'critical' })])).toBe('critical');
  });

  /** `critical` was accepted-but-unreachable since 1.3.0. This is what reaches it. */
  it('outranks drift when the advisory is worse', () => {
    expect(severityOf(report({ behind: ['a'] }), false, [advisory({ severity: 'critical' })])).toBe(
      'critical',
    );
  });

  it('leaves drift alone when the advisory is milder', () => {
    expect(severityOf(report({ behind: ['a'] }), false, [advisory({ severity: 'info' })])).toBe(
      'warning',
    );
  });

  it('takes the worst of several', () => {
    expect(
      severityOf(report(), false, [
        advisory({ severity: 'info' }),
        advisory({ severity: 'critical' }),
        advisory({ severity: 'warning' }),
      ]),
    ).toBe('critical');
  });
});

describe('toJson', () => {
  /**
   * The shape-stability check the acceptance criteria ask for. The action is
   * pinned by a moving `v1` tag, so a removed or renamed field breaks every
   * consumer at once.
   */
  it('still has every key the v1 contract promised, with the same meanings', () => {
    const contract = JSON.parse(
      fs.readFileSync(path.join(fixtureDir, 'check-json-v1.json'), 'utf8'),
    ) as {
      keys: string[];
      generatorVersionKeys: string[];
      countsKeys: string[];
      schemaValue: number;
    };

    const json = toJson(report(), 'none') as Record<string, unknown>;

    for (const key of contract.keys) expect(Object.keys(json)).toContain(key);
    expect(json.schema).toBe(contract.schemaValue);
    for (const key of contract.generatorVersionKeys) {
      expect(Object.keys(json.generatorVersion as object)).toContain(key);
    }
    for (const key of contract.countsKeys) {
      expect(Object.keys(json.counts as object)).toContain(key);
    }
  });

  it('adds advisories without moving the schema number', () => {
    const json = toJson(report({ advisories: [advisory()], advisoriesEntitled: true }), 'none') as
      Record<string, unknown>;

    expect(json.schema).toBe(1);
    expect(json.advisories).toEqual({ entitled: true, total: 1, items: [advisory()] });
  });

  /**
   * Null and empty mean different things, and a consumer has to be able to tell
   * them apart: "we did not look" versus "we looked and found none".
   */
  it('reports null when advisories were skipped and [] when none matched', () => {
    expect((toJson(report(), 'none') as Record<string, unknown>).advisories).toBeNull();
    expect(
      (toJson(report({ advisories: [], advisoriesEntitled: false }), 'none') as Record<string, unknown>)
        .advisories,
    ).toEqual({ entitled: false, total: 0, items: [] });
  });

  it('carries the note when there is one', () => {
    const json = toJson(report({ advisoryNote: 'Advisories were skipped — offline.' }), 'none') as
      Record<string, unknown>;
    expect(json.advisoryNote).toBe('Advisories were skipped — offline.');
  });
});

/**
 * Requirement 2 and 5: this is the only network in an otherwise offline, MIT
 * command, and every way it can fail resolves to a note rather than an error.
 */
describe('fetchAdvisories', () => {
  const originalUrl = process.env.AI_PROJECT_BOOTSTRAP_API_URL;
  const originalKey = process.env.AI_PROJECT_BOOTSTRAP_LICENSE_KEY;
  const originalDir = process.env.AI_PROJECT_BOOTSTRAP_CONFIG_DIR;
  let configDir: string;

  beforeEach(() => {
    process.env.AI_PROJECT_BOOTSTRAP_API_URL = 'https://api.example.com';
    delete process.env.AI_PROJECT_BOOTSTRAP_LICENSE_KEY;
    /*
     * Pointed at an empty temp directory, and not optional.
     *
     * `resolveLicenseKey` falls back to the key `login` stored, so without this
     * the "no key" test reads whatever real credential the machine running the
     * suite happens to have — and asserts on it, which puts a live licence key
     * in the failure output. That is exactly what happened while writing this.
     */
    configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apb-advisories-'));
    process.env.AI_PROJECT_BOOTSTRAP_CONFIG_DIR = configDir;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fs.rmSync(configDir, { recursive: true, force: true });
    for (const [name, value] of [
      ['AI_PROJECT_BOOTSTRAP_API_URL', originalUrl],
      ['AI_PROJECT_BOOTSTRAP_LICENSE_KEY', originalKey],
      ['AI_PROJECT_BOOTSTRAP_CONFIG_DIR', originalDir],
    ] as const) {
      if (value) process.env[name] = value;
      else delete process.env[name];
    }
  });

  const stub = (response: { ok: boolean; status: number; body: unknown }) => {
    const mock = vi.fn(async () => ({
      ok: response.ok,
      status: response.status,
      json: async () => response.body,
    }));
    vi.stubGlobal('fetch', mock);
    return mock;
  };

  it('returns what the service said', async () => {
    stub({
      ok: true,
      status: 200,
      body: {
        advisories: [advisory({ summary: 'A thing changed.' })],
        total: 1,
        bySeverity: { critical: 0, warning: 1, info: 0 },
        entitled: true,
      },
    });

    const result = await fetchAdvisories(['supabase']);

    expect(result.entitled).toBe(true);
    expect(result.advisories[0]?.summary).toBe('A thing changed.');
    expect(result.note).toBeUndefined();
  });

  it('sends the licence key when there is one', async () => {
    process.env.AI_PROJECT_BOOTSTRAP_LICENSE_KEY = 'apb_live_key';
    const mock = stub({ ok: true, status: 200, body: { advisories: [], total: 0, entitled: true } });

    await fetchAdvisories(['supabase']);

    const [, init] = mock.mock.calls[0] as unknown as [string, { headers: Record<string, string> }];
    expect(init.headers.authorization).toBe('Bearer apb_live_key');
  });

  it('sends no authorization header when there is no key', async () => {
    const mock = stub({ ok: true, status: 200, body: { advisories: [], total: 0, entitled: false } });

    await fetchAdvisories(['supabase']);

    const [, init] = mock.mock.calls[0] as unknown as [string, { headers: Record<string, string> }];
    expect(init.headers.authorization).toBeUndefined();
  });

  it('degrades to a note when the network fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('getaddrinfo ENOTFOUND');
      }),
    );

    const result = await fetchAdvisories(['supabase']);

    expect(result.advisories).toEqual([]);
    expect(result.note).toMatch(/could not reach/i);
  });

  it('degrades to a note on any non-200', async () => {
    stub({ ok: false, status: 503, body: {} });
    expect((await fetchAdvisories(['supabase'])).note).toMatch(/503/);
  });

  it('degrades to a note on a response it does not understand', async () => {
    stub({ ok: true, status: 200, body: { unexpected: true } });
    expect((await fetchAdvisories(['supabase'])).note).toMatch(/unexpected/i);
  });

  /** The service reporting its own degradation is not our failure, but is the reader's business. */
  it('passes the service‘s own degraded note through', async () => {
    stub({
      ok: true,
      status: 200,
      body: { advisories: [], degraded: true, note: 'Advisories were skipped — timed out.' },
    });

    expect((await fetchAdvisories(['supabase'])).note).toMatch(/timed out/);
  });

  it('does not call the service for an empty stack', async () => {
    const mock = stub({ ok: true, status: 200, body: { advisories: [] } });

    const result = await fetchAdvisories([]);

    expect(mock).not.toHaveBeenCalled();
    expect(result.note).toMatch(/nothing to check/i);
  });

  it('gives up rather than hanging', async () => {
    expect(ADVISORY_TIMEOUT_MS).toBeLessThanOrEqual(10_000);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        const error = new Error('The operation was aborted due to timeout');
        error.name = 'TimeoutError';
        throw error;
      }),
    );

    const result = await fetchAdvisories(['supabase']);

    expect(result.advisories).toEqual([]);
    expect(result.note).toBeTruthy();
  });
});
