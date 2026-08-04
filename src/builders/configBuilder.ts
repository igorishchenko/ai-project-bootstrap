import type { Builder } from '../core/types.js';

/** The filename a generated project stores its answers in. */
export const CONFIG_FILENAME = 'ai-project.config.json';

/**
 * Persists the wizard answers so the project can be regenerated later with
 * `create-ai-project --config ai-project.config.json`.
 */
export const configBuilder: Builder = {
  id: 'config',
  label: `Saved ${CONFIG_FILENAME}`,
  order: 130,
  build(ctx, vfs) {
    // Keys sorted so a re-run produces an identical file.
    const choices: Record<string, string | string[]> = {};
    for (const key of Object.keys(ctx.selection.choices).sort()) {
      choices[key] = ctx.selection.choices[key] as string | string[];
    }

    vfs.writeJson(CONFIG_FILENAME, {
      projectName: ctx.selection.projectName,
      choices,
    });
  },
};
