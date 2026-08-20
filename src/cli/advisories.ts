import { resolveApiUrl, resolveLicenseKey } from './idea.js';

/**
 * Advisories in `check`.
 *
 * This is the only network call the command makes, and it is optional in every
 * sense: `--no-advisories` skips it, no network skips it, a slow service skips
 * it, and any non-200 skips it. `check` is the command that has to work in
 * every repository before anything else in the product matters — offline, MIT,
 * no account — and that stays true. What advisories add is a sentence when the
 * service is reachable, never a reason for the report not to arrive.
 */

/** The severity words are the CLI's own, deliberately — see `check.ts`. */
export type AdvisorySeverity = 'info' | 'warning' | 'critical';

/** What an entitled caller gets. `summary`/`body`/`url` are absent otherwise. */
export interface Advisory {
  id: string;
  severity: AdvisorySeverity;
  publishedAt: string;
  summary?: string;
  body?: string;
  url?: string;
  verifiedAt?: string;
}

export interface AdvisoryResult {
  advisories: Advisory[];
  total: number;
  bySeverity: Record<AdvisorySeverity, number>;
  /** Whether the caller may read the text. False for free and anonymous. */
  entitled: boolean;
  /**
   * Why there is nothing here, when there is nothing here. Present only when
   * the answer is incomplete — a successful empty result has no note, because
   * "no advisories apply to your stack" needs no excuse.
   */
  note?: string;
}

/**
 * How long `check` waits before deciding the answer is not coming.
 *
 * Shorter than the service's own 2s budget would be pointless, and much longer
 * would defeat the purpose: this runs inside a CI step whose whole value is
 * being quick. Five seconds covers a cold serverless start and still keeps a
 * dead service from adding a visible pause to every run.
 */
export const ADVISORY_TIMEOUT_MS = 5_000;

/** A result that carries a reason instead of advisories. Never throws upward. */
function skipped(note: string): AdvisoryResult {
  return {
    advisories: [],
    total: 0,
    bySeverity: { critical: 0, warning: 0, info: 0 },
    entitled: false,
    note,
  };
}

/**
 * Every module id in a selection, which is what the service matches on.
 *
 * Versions are deliberately not sent: `ai-project.config.json` records what was
 * chosen, not what npm resolved, and inventing a version here would be worse
 * than sending none — the service treats an unknown version as "does not
 * match a ranged advisory", which is the honest answer rather than a guess.
 */
export function moduleIdsFrom(choices: Record<string, string | string[]>): string[] {
  const ids = new Set<string>();
  for (const value of Object.values(choices)) {
    for (const id of Array.isArray(value) ? value : [value]) {
      if (typeof id === 'string' && id.trim()) ids.add(id.trim());
    }
  }
  return [...ids].sort();
}

interface MatchResponseBody {
  advisories?: Advisory[];
  total?: number;
  bySeverity?: Record<AdvisorySeverity, number>;
  entitled?: boolean;
  degraded?: boolean;
  note?: string;
}

/**
 * Asks the service which advisories apply to `moduleIds`.
 *
 * **Never throws and never rejects.** Every failure — no network, DNS, a
 * timeout, a 500, a body that is not the shape we expect — resolves to a result
 * with a one-line note and no advisories. A repository running this in CI when
 * the service is down gets its drift report, which is the whole point.
 *
 * A licence key is sent when there is one, from the same two places every other
 * command looks (the environment first, then `login`). Without one the service
 * answers with counts and severities but no text, which is a real answer rather
 * than a refusal.
 */
export async function fetchAdvisories(moduleIds: string[]): Promise<AdvisoryResult> {
  if (moduleIds.length === 0) {
    return skipped('No technologies recorded, so there was nothing to check advisories for.');
  }

  const apiUrl = resolveApiUrl();
  const key = resolveLicenseKey()?.key;

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/v1/advisories/match`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(key ? { authorization: `Bearer ${key}` } : {}),
      },
      body: JSON.stringify({ modules: moduleIds }),
      signal: AbortSignal.timeout(ADVISORY_TIMEOUT_MS),
    });
  } catch {
    // Offline, DNS, a proxy, a timeout — all the same to the reader, and none
    // of them their problem. The reason is deliberately not detailed: a stack
    // trace about `ECONNREFUSED` in a drift report helps nobody.
    return skipped(`Advisories were skipped — could not reach ${apiUrl}.`);
  }

  if (!response.ok) {
    return skipped(`Advisories were skipped — ${apiUrl} answered ${response.status}.`);
  }

  const body = (await response.json().catch(() => undefined)) as MatchResponseBody | undefined;
  if (!body || !Array.isArray(body.advisories)) {
    return skipped(`Advisories were skipped — ${apiUrl} returned an unexpected response.`);
  }

  // The service can report its own degradation, which is not our failure but
  // is the reader's business all the same.
  if (body.degraded) {
    return skipped(body.note ?? 'Advisories were skipped — the service reported a problem.');
  }

  return {
    advisories: body.advisories,
    total: body.total ?? body.advisories.length,
    bySeverity: body.bySeverity ?? { critical: 0, warning: 0, info: 0 },
    entitled: body.entitled ?? false,
    ...(body.note ? { note: body.note } : {}),
  };
}
