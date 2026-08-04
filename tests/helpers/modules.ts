import type { LoadedModule, Manifest } from '../../src/core/types.js';

/** Builds a manifest with sensible defaults, overriding only what a test cares about. */
export function makeManifest(overrides: Partial<Manifest> & { id: string }): Manifest {
  return {
    name: overrides.id,
    category: 'misc',
    description: `${overrides.id} description`,
    requires: [],
    conflicts: [],
    dependencies: [],
    priority: 50,
    ...overrides,
  };
}

export function makeModule(
  overrides: Partial<Manifest> & { id: string },
  assets: Partial<LoadedModule> = {},
): LoadedModule {
  return {
    manifest: makeManifest(overrides),
    root: `/virtual/${overrides.id}`,
    isBase: false,
    env: [],
    folders: [],
    prompts: [],
    checklists: [],
    templates: [],
    ...assets,
  };
}

/** A registry-style lookup map from a list of modules. */
export function makeRegistry(modules: LoadedModule[]): Map<string, LoadedModule> {
  return new Map(modules.map((module) => [module.manifest.id, module]));
}
