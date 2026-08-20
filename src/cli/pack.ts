import path from 'node:path';
import { GeneratorError } from '../core/resolve/errors.js';
import {
  formatPackRef,
  parsePack,
  parsePackRef,
  type PackRef,
  type RulePack,
} from '../core/packs/packTypes.js';
import { listCachedPacks, packCachePath, writeCachedPack } from '../core/packs/packCache.js';
import { CONFIG_FILENAME } from '../builders/configBuilder.js';
import { readPinnedPacks } from './configFile.js';
import { resolveApiUrl, requireLicenseKey } from './idea.js';

/**
 * `pack add|update|list` — an organisation's own rules, alongside the built-in
 * ones.
 *
 * The network is only ever touched by `add` and `update`. Generation, `check`
 * and `upgrade` read the cache and nothing else, so a packed project builds on
 * a plane, in a locked-down CI runner, and in five years when this service is
 * gone. That is the same promise the rest of the CLI makes, and a pack is not
 * a good enough reason to break it.
 */

/** Long enough for a cold serverless start; short enough not to hang a script. */
export const PACK_TIMEOUT_MS = 10_000;

interface PackResponseBody {
  pack?: unknown;
  error?: { code?: string; message?: string; hint?: string };
}

/**
 * Fetches one pack. `version` omitted asks the service for the newest.
 *
 * The service resolves "newest" **once**, here, and what gets pinned is the
 * exact version it named. There is no floating reference anywhere downstream —
 * see `parsePackRef` for why that matters more than the convenience costs.
 */
export async function fetchPack(slug: string, version?: string): Promise<RulePack> {
  const apiUrl = resolveApiUrl();
  const key = requireLicenseKey('pack add', 'ask an admin in your organisation for one');

  const url = `${apiUrl}/v1/packs/${encodeURIComponent(slug)}${
    version ? `/${encodeURIComponent(version)}` : ''
  }`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(PACK_TIMEOUT_MS),
    });
  } catch {
    throw new GeneratorError(
      'INVALID_CONFIG',
      `Could not reach ${apiUrl}.`,
      'A pack already in the cache works offline; fetching a new one does not.',
    );
  }

  if (!response.ok) {
    let body: PackResponseBody = {};
    try {
      body = (await response.json()) as PackResponseBody;
    } catch {
      // An error body that is not JSON tells us nothing the status has not.
    }
    throw new GeneratorError(
      'INVALID_CONFIG',
      body.error?.message ?? `${apiUrl} answered ${response.status} for pack "${slug}".`,
      body.error?.hint,
    );
  }

  const body = (await response.json()) as PackResponseBody;
  return parsePack(body.pack ?? body, `The pack served for "${slug}"`);
}

export interface PackCommandResult {
  /** Lines to print. The caller owns the stream. */
  lines: string[];
  /** The pinned set after this command, when it changed one. */
  packs?: string[];
}

/** `pack list` — what this project pins, and what is cached locally. */
export function runPackList(targetDir: string): PackCommandResult {
  const configPath = path.join(targetDir, CONFIG_FILENAME);
  const pinned = readPinnedPacks(configPath);
  const cached = listCachedPacks();
  const lines: string[] = [];

  if (pinned.length === 0) {
    lines.push('This project pins no rule packs.');
  } else {
    lines.push('Pinned by this project:');
    for (const ref of pinned) {
      const isCached = cached.some(
        (entry) => entry.slug === ref.slug && entry.version === ref.version,
      );
      // Saying "not cached" out loud matters: it is the one state in which the
      // next `check` or `upgrade` refuses, and the fix is one command.
      lines.push(`  ${formatPackRef(ref)}${isCached ? '' : '  (not cached — run `pack add`)'}`);
    }
  }

  const others = cached.filter(
    (entry) => !pinned.some((ref) => ref.slug === entry.slug && ref.version === entry.version),
  );
  if (others.length > 0) {
    lines.push('', 'Also cached on this machine:');
    for (const ref of others) lines.push(`  ${formatPackRef(ref)}`);
  }

  return { lines };
}

/**
 * Merges a newly-pinned pack into the list, replacing any other version of the
 * same slug.
 *
 * Two versions of one pack is not a state worth supporting: the rules would
 * both apply, each replacing or extending the same built-ins, and which won
 * would come down to array order. `add` on an already-pinned slug is how you
 * change versions, and it says so.
 */
export function pinPack(existing: readonly PackRef[], added: PackRef): string[] {
  const kept = existing.filter((ref) => ref.slug !== added.slug);
  return [...kept, added].map(formatPackRef).sort();
}

/** `pack add <slug>[@version]` — fetch, cache, and return the new pinned set. */
export async function runPackAdd(
  targetDir: string,
  slugOrRef: string,
): Promise<PackCommandResult> {
  const at = slugOrRef.lastIndexOf('@');
  const slug = at > 0 ? slugOrRef.slice(0, at) : slugOrRef;
  const requested = at > 0 ? parsePackRef(slugOrRef).version : undefined;

  const pack = await fetchPack(slug, requested);
  const file = writeCachedPack(pack);

  const configPath = path.join(targetDir, CONFIG_FILENAME);
  const existing = readPinnedPacks(configPath);
  const previous = existing.find((ref) => ref.slug === pack.id);
  const packs = pinPack(existing, { slug: pack.id, version: pack.version });

  const lines = [
    previous && previous.version !== pack.version
      ? `Moved ${pack.name} from ${previous.version} to ${pack.version}.`
      : `Added ${pack.name} ${pack.version}.`,
    `Cached at ${file}.`,
  ];

  return { lines, packs };
}

/**
 * `pack update [slug]` — move every pin (or one) to the newest version.
 *
 * Separate from `add` because moving a pin is a deliberate act. A pack that
 * moved on its own between two runs of the same command would break the
 * promise that generation is deterministic, in the one direction nobody
 * checks: the output would still look plausible.
 */
export async function runPackUpdate(targetDir: string, slug?: string): Promise<PackCommandResult> {
  const configPath = path.join(targetDir, CONFIG_FILENAME);
  const pinned = readPinnedPacks(configPath);

  if (pinned.length === 0) {
    return { lines: ['This project pins no rule packs, so there is nothing to update.'] };
  }

  const targets = slug ? pinned.filter((ref) => ref.slug === slug) : pinned;
  if (targets.length === 0) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      `This project does not pin a pack called "${slug}".`,
      `Pinned: ${pinned.map(formatPackRef).join(', ')}.`,
    );
  }

  const lines: string[] = [];
  let packs = pinned.map(formatPackRef).sort();

  for (const ref of targets) {
    const pack = await fetchPack(ref.slug);
    writeCachedPack(pack);
    if (pack.version === ref.version) {
      lines.push(`${pack.name} is already at ${pack.version}.`);
      continue;
    }
    lines.push(`${pack.name}: ${ref.version} → ${pack.version}.`);
    packs = pinPack(packs.map(parsePackRef), { slug: pack.id, version: pack.version });
  }

  return { lines, packs };
}

/** Where a given pack would be cached — surfaced in errors and `pack list`. */
export function describeCacheLocation(ref: PackRef): string {
  return packCachePath(ref);
}
