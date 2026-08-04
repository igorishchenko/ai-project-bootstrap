import type { Builder } from '../core/types.js';
import { mergeFolders } from '../core/merge/mergeFolders.js';

/** Creates every folder requested by every module. */
export const folderBuilder: Builder = {
  id: 'folders',
  label: 'Generated folder structure',
  order: 10,
  build(ctx, vfs) {
    for (const folder of mergeFolders(ctx.modules.flatMap((module) => module.folders))) {
      vfs.mkdir(folder);
    }
  },
};

/**
 * Keeps empty scaffolding folders alive in git.
 *
 * Runs last, once every other builder has written its files, so a folder that
 * received real content does not also get a pointless `.gitkeep`.
 */
export const gitkeepBuilder: Builder = {
  id: 'gitkeep',
  label: 'Preserved empty folders',
  order: 140,
  build(_ctx, vfs) {
    const { files, directories } = vfs.snapshot();

    for (const directory of directories) {
      const prefix = `${directory}/`;
      // Leaf directories only. A parent is kept alive by its children, and
      // marking it too would litter every level of the tree.
      const hasChildDirectory = directories.some((other) => other.startsWith(prefix));
      if (hasChildDirectory) continue;

      const hasFiles = files.some((file) => file.startsWith(prefix));
      if (!hasFiles) vfs.write(`${prefix}.gitkeep`, '');
    }
  },
};
