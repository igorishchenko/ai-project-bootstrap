import type { BuildContext, Builder, LoadedModule } from '../core/types.js';
import { mergeDependencies, type DependencyContribution } from '../core/merge/mergeDeps.js';
import { mergeJson } from '../core/merge/mergeJson.js';
import { slugify } from '../core/pipeline/buildContext.js';

/**
 * Assembles `package.json` from every module's fragment and dependency list.
 *
 * Fragments are deep-merged in resolved order (base first, then by priority),
 * so a later module can extend scripts and config without clobbering earlier
 * ones. Dependency ranges are reconciled separately, where version conflicts
 * can be reported properly.
 */
export const packageBuilder: Builder = {
  id: 'package',
  label: 'Generated package.json',
  order: 20,
  build(ctx, vfs) {
    let pkg: Record<string, unknown> = {
      name: slugify(ctx.projectName),
      version: '0.1.0',
      private: true,
    };

    const scriptOwner = new Map<string, string>();

    for (const module of ctx.modules) {
      if (!module.packageFragment) continue;
      warnOnScriptTakeover(ctx, module, scriptOwner);
      pkg = mergeJson(pkg, module.packageFragment);
    }

    const contributions: DependencyContribution[] = ctx.modules.flatMap((module) =>
      (module.dependencies?.packages ?? []).map((spec) => ({
        ...spec,
        moduleId: module.manifest.id,
      })),
    );

    const merged = mergeDependencies(contributions);
    ctx.warnings.push(...merged.warnings);

    // Dependency maps come last so a fragment can never smuggle in an
    // unreconciled version behind the merger's back.
    if (Object.keys(merged.dependencies).length > 0) {
      pkg.dependencies = mergeJson(
        (pkg.dependencies as Record<string, unknown>) ?? {},
        merged.dependencies,
      );
    }
    if (Object.keys(merged.devDependencies).length > 0) {
      pkg.devDependencies = mergeJson(
        (pkg.devDependencies as Record<string, unknown>) ?? {},
        merged.devDependencies,
      );
    }
    if (Object.keys(merged.peerDependencies).length > 0) {
      pkg.peerDependencies = mergeJson(
        (pkg.peerDependencies as Record<string, unknown>) ?? {},
        merged.peerDependencies,
      );
    }

    vfs.writeJson('package.json', pkg);
  },
};

/**
 * Reports when one module quietly replaces another's npm script.
 *
 * A module may legitimately override something it `requires` — a wrapper
 * replacing the script of the thing it wraps is the point of the wrapper.
 * Anything else is an accidental name collision, and it is invisible in the
 * merged output: the losing script simply is not there.
 */
function warnOnScriptTakeover(
  ctx: BuildContext,
  module: LoadedModule,
  scriptOwner: Map<string, string>,
): void {
  const scripts = module.packageFragment?.scripts;
  if (typeof scripts !== 'object' || scripts === null) return;

  for (const [name, command] of Object.entries(scripts as Record<string, unknown>)) {
    const previous = scriptOwner.get(name);

    if (previous !== undefined && previous !== module.manifest.id) {
      const deliberate = requiresTransitively(ctx, module.manifest.id, previous);
      if (!deliberate) {
        ctx.warnings.push(
          `${module.manifest.name} overwrites the "${name}" script defined by ${previous}; ` +
            `the original is no longer reachable. Rename one of them.`,
        );
      }
    }

    scriptOwner.set(name, module.manifest.id);
    void command;
  }
}

/** True when `id` depends on `targetId` through the requires graph. */
function requiresTransitively(ctx: BuildContext, id: string, targetId: string): boolean {
  const byId = new Map(ctx.modules.map((module) => [module.manifest.id, module]));
  const seen = new Set<string>();

  const walk = (current: string): boolean => {
    if (current === targetId) return true;
    if (seen.has(current)) return false;
    seen.add(current);

    return (byId.get(current)?.manifest.requires ?? []).some(walk);
  };

  return (byId.get(id)?.manifest.requires ?? []).some(walk);
}
