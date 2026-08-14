import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { GeneratorError } from '../resolve/errors.js';
import { formatPackRef, parsePack, type PackRef, type RulePack } from './packTypes.js';

/**
 * Where a fetched pack lives on disk.
 *
 * Outside any project directory, deliberately — the same reasoning as the
 * stored licence key. A pack is an organisation's private content; one copy
 * inside a repository is one `git add -A` from a public one, and it would also
 * make the same pack a tracked file in every project that uses it.
 *
 * Overridable so tests never touch a real home directory.
 */
export function packCacheDir(
  env: NodeJS.ProcessEnv = process.env,
  homedir: () => string = os.homedir,
): string {
  const override = env.AI_PROJECT_BOOTSTRAP_PACK_DIR?.trim();
  if (override) return override;
  return path.join(homedir(), '.ai-project-bootstrap', 'packs');
}

export function packCachePath(ref: PackRef, env?: NodeJS.ProcessEnv): string {
  return path.join(packCacheDir(env), `${ref.slug}@${ref.version}.json`);
}

export function readCachedPack(ref: PackRef, env?: NodeJS.ProcessEnv): RulePack | undefined {
  const file = packCachePath(ref, env);
  let raw: string;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // A corrupt cache entry is not a fatal condition: it is a file we wrote and
    // can write again. Treated as a miss so the caller re-fetches.
    return undefined;
  }

  return parsePack(parsed, file);
}

export function writeCachedPack(pack: RulePack, env?: NodeJS.ProcessEnv): string {
  const ref = { slug: pack.id, version: pack.version };
  const file = packCachePath(ref, env);
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, `${JSON.stringify(pack, null, 2)}\n`, { mode: 0o600 });
  return file;
}

export function listCachedPacks(env?: NodeJS.ProcessEnv): PackRef[] {
  let names: string[];
  try {
    names = fs.readdirSync(packCacheDir(env));
  } catch {
    return [];
  }

  const refs: PackRef[] = [];
  for (const name of names) {
    const match = name.match(/^([a-z0-9-]+)@(\d+\.\d+\.\d+)\.json$/);
    if (match?.[1] && match[2]) refs.push({ slug: match[1], version: match[2] });
  }
  return refs.sort((a, b) => formatPackRef(a).localeCompare(formatPackRef(b)));
}

/**
 * Loads every pinned pack, or refuses.
 *
 * **A missing pack is an error, never a quiet generation without it.** The
 * alternative — carrying on with the built-in rules only — produces a project
 * that silently lacks its organisation's standards *and* reports every
 * rule file as drifted on the next `check`, because the fingerprints recorded
 * at generation were computed with the pack's content in them. One of those
 * failures is invisible and the other is noise; refusing is the only honest
 * answer.
 */
export function loadPinnedPacks(refs: readonly PackRef[], env?: NodeJS.ProcessEnv): RulePack[] {
  const packs: RulePack[] = [];
  const missing: string[] = [];

  for (const ref of refs) {
    const pack = readCachedPack(ref, env);
    if (pack) packs.push(pack);
    else missing.push(formatPackRef(ref));
  }

  if (missing.length > 0) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      `Rule pack${missing.length === 1 ? '' : 's'} not available offline: ${missing.join(', ')}.`,
      `Run \`ai-project-bootstrap pack add ${missing[0]?.split('@')[0]}\` while online to cache ${missing.length === 1 ? 'it' : 'them'}.`,
    );
  }

  return packs;
}
