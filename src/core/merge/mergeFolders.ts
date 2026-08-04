/**
 * Merges folder requests from every module into a deduplicated, sorted list.
 *
 * A folder implied by a deeper one is dropped — requesting `app/payments` and
 * `app/payments/checkout` yields only the deeper path, since creating it
 * creates the parent anyway.
 */
export function mergeFolders(requests: string[]): string[] {
  const normalized = new Set<string>();

  for (const request of requests) {
    const clean = request
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\.?\//, '')
      .replace(/\/+$/, '');
    if (!clean || clean.startsWith('..')) continue;
    normalized.add(clean);
  }

  const all = [...normalized];
  const leaves = all.filter(
    (folder) => !all.some((other) => other !== folder && other.startsWith(`${folder}/`)),
  );

  return leaves.sort();
}

/** Renders a folder list as an indented tree for documentation. */
export function renderFolderTree(folders: string[]): string {
  const lines: string[] = [];
  let previous: string[] = [];

  for (const folder of [...folders].sort()) {
    const segments = folder.split('/');
    for (let depth = 0; depth < segments.length; depth += 1) {
      if (previous[depth] === segments[depth] && segments.slice(0, depth).join('/') === previous.slice(0, depth).join('/')) {
        continue;
      }
      lines.push(`${'  '.repeat(depth)}${segments[depth]}/`);
    }
    previous = segments;
  }

  return lines.join('\n');
}
