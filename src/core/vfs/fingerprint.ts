import crypto from 'node:crypto';

/**
 * A short content hash, recorded at generation so a later regeneration can tell
 * "the generator wrote this and nobody touched it" from "somebody edited this".
 *
 * Truncated deliberately: this guards against accidental overwrites, not against
 * an adversary, and a full digest per file would dominate the config file.
 */
export function fingerprint(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex').slice(0, 16);
}

/** Files the generator owns but never re-hashes — it changes on every run. */
export const UNTRACKED = new Set(['ai-project.config.json']);
