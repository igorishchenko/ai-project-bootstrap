import { outputPath } from '../builders/reserved.js';
import { render } from '../core/template/render.js';
import type { Archetype } from '../core/registry/loadArchetypes.js';
import type { VirtualFs } from '../core/vfs/virtualFs.js';

/**
 * Layers an archetype's `scaffold/**` (and optional `package.fragment.json`)
 * onto an already-generated `VirtualFs`, in place — real starter source, on
 * top of the normal pipeline's output, written the same way `implement`
 * writes its own scaffold: rendered through the shared `render()` engine,
 * `_name` → `.name` dotfile convention included.
 *
 * Deliberately minimal template data (`{ projectName, projectSlug }`, the
 * same subset `implement` uses) rather than the full `templateData(ctx)` —
 * an archetype commits to one fixed stack by design, so it never needs
 * `{{#if has.X}}` branching the way a `technologies/*` template might.
 */
export function applyArchetype(
  vfs: VirtualFs,
  archetype: Archetype,
  data: { projectName: string; projectSlug: string },
): void {
  vfs.setOwner('archetype');

  for (const asset of archetype.scaffold) {
    vfs.write(outputPath(asset.relativePath), render(asset.content, data));
  }

  if (archetype.packageFragment) {
    vfs.mergeJson('package.json', archetype.packageFragment);
  }
}
