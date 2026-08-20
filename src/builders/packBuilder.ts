import type { Builder } from '../core/types.js';
import { render } from '../core/template/render.js';
import { templateData } from '../core/pipeline/buildContext.js';

/**
 * A pack's docs and checklists.
 *
 * Its *rules* need no builder at all — `ruleSources.ts` folds them into the
 * `RuleSource[]` every provider already consumes. These two are the only pack
 * content with nowhere existing to go, since a doc is a file path rather than
 * a rule, and the paths come from the pack rather than from a module layout.
 *
 * Runs at 118, after `templates` (115) and before `readme` (120): late enough
 * that a pack's doc wins nothing by accident, early enough that the README
 * builder — which reads what is already in the tree — can see it.
 */
export const packBuilder: Builder = {
  id: 'packs',
  label: 'Generated rule pack content',
  order: 118,
  build(ctx, vfs) {
    if (ctx.packs.length === 0) return;
    const data = templateData(ctx);

    for (const pack of ctx.packs) {
      for (const file of [...pack.docs, ...pack.checklists]) {
        // A pack path is normalised rather than trusted: it arrives over the
        // network, and `../` in it would write outside the project.
        const target = normalizePackPath(file.path);
        if (!target) {
          ctx.warnings.push(`${pack.name} tried to write outside the project: ${file.path}.`);
          continue;
        }
        vfs.write(target, render(file.content, data));
      }
    }
  },
};

/** Rejects absolute paths and any traversal. Returns undefined if unsafe. */
export function normalizePackPath(raw: string): string | undefined {
  const trimmed = raw.trim().replace(/^\.\//, '');
  if (!trimmed || trimmed.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(trimmed)) return undefined;
  const segments = trimmed.split(/[\\/]+/);
  if (segments.some((segment) => segment === '..' || segment === '')) return undefined;
  return segments.join('/');
}
