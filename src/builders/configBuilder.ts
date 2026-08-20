import type { Builder } from '../core/types.js';
import { fingerprint, UNTRACKED } from '../core/vfs/fingerprint.js';

/** The filename a generated project stores its answers in. */
export const CONFIG_FILENAME = 'ai-project.config.json';

/**
 * Persists the wizard answers so the project can be regenerated later with
 * `ai-project-bootstrap --config ai-project.config.json`.
 *
 * Also records a fingerprint of every file produced. On a regeneration those
 * fingerprints are compared against what is on disk, so files you have edited
 * are left alone instead of being silently overwritten. Runs last, once every
 * other builder has written its output.
 *
 * `generatorVersion` records which release of this package produced the
 * output, so `upgrade` can report what it is upgrading from — and so a
 * project generated before this field existed just reads as `undefined`
 * rather than failing.
 */
export const configBuilder: Builder = {
  id: 'config',
  label: `Saved ${CONFIG_FILENAME}`,
  order: 150,
  build(ctx, vfs) {
    // Keys sorted so a re-run produces an identical file.
    const choices: Record<string, string | string[]> = {};
    for (const key of Object.keys(ctx.selection.choices).sort()) {
      choices[key] = ctx.selection.choices[key] as string | string[];
    }

    const generated: Record<string, string> = {};
    for (const path of vfs.snapshot().files) {
      if (UNTRACKED.has(path)) continue;
      const content = vfs.read(path);
      if (content !== undefined) generated[path] = fingerprint(content);
    }

    /*
     * Pinned to an exact version, and recorded even though the pack content is
     * not: this file says which inputs produced the fingerprints below it, and
     * a pack is an input. Without the pin, `check` in a fresh clone would
     * regenerate against whatever version happened to be cached and call every
     * rule file drifted.
     */
    const packs = ctx.packs.map((pack) => `${pack.id}@${pack.version}`).sort();

    vfs.writeJson(CONFIG_FILENAME, {
      projectName: ctx.selection.projectName,
      generatorVersion: ctx.generatorVersion,
      choices,
      ...(packs.length > 0 ? { packs } : {}),
      generated,
    });
  },
};
