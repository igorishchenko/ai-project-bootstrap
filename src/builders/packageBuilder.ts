import type { Builder } from '../core/types.js';
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

    for (const module of ctx.modules) {
      if (module.packageFragment) pkg = mergeJson(pkg, module.packageFragment);
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
