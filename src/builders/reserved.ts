import type { LoadedModule, ModuleAsset } from '../core/types.js';

/**
 * Reserved subtrees inside a module's `templates/` directory.
 *
 * Each maps to the builder that owns it, so the spec's named builders stay real
 * without any of them knowing a technology name — they own an output *prefix*,
 * never a module id. Anything outside these prefixes is mirrored verbatim by
 * the generic template builder.
 */
export const RESERVED_TEMPLATE_PREFIXES = {
  /** Rendered to the project root: README.md, CLAUDE.md, AGENTS.md. */
  root: 'root/',
  /** Rendered into `.github/`. */
  github: 'github/',
  /** Repo hygiene dotfiles, rendered to the project root. */
  hygiene: 'hygiene/',
} as const;

const ALL_PREFIXES = Object.values(RESERVED_TEMPLATE_PREFIXES);

/** Template assets under a given reserved prefix, with the prefix stripped. */
export function templatesUnder(module: LoadedModule, prefix: string): ModuleAsset[] {
  return module.templates
    .filter((asset) => asset.relativePath.startsWith(prefix))
    .map((asset) => ({
      relativePath: asset.relativePath.slice(prefix.length),
      content: asset.content,
    }));
}

/** Template assets that belong to no reserved prefix. */
export function unreservedTemplates(module: LoadedModule): ModuleAsset[] {
  return module.templates.filter(
    (asset) => !ALL_PREFIXES.some((prefix) => asset.relativePath.startsWith(prefix)),
  );
}

/**
 * Converts the `_name` template convention into a real dotfile.
 *
 * npm rewrites a packaged `.gitignore` to `.npmignore` on publish, and some
 * tooling ignores dot-directories when copying, so template sources store
 * `_gitignore` and `_husky/pre-commit` and get their dots back here.
 */
export function outputPath(relativePath: string): string {
  return relativePath
    .split('/')
    .map((segment) => (segment.startsWith('_') ? `.${segment.slice(1)}` : segment))
    .join('/');
}
