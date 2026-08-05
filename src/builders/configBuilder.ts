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

    vfs.writeJson(CONFIG_FILENAME, {
      projectName: ctx.selection.projectName,
      choices,
      generated,
    });
  },
};
