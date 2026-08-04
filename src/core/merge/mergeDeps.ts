import semver from 'semver';
import type { DependencySpec } from '../types.js';

export interface DependencyContribution extends DependencySpec {
  /** Which module asked for it — used in conflict warnings. */
  moduleId: string;
}

export interface MergedDependencies {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  /** Native modules, surfaced in docs as needing a native rebuild. */
  native: string[];
  warnings: string[];
}

type Bucket = 'dependencies' | 'devDependencies' | 'peerDependencies';

function bucketOf(spec: DependencySpec): Bucket {
  if (spec.peer) return 'peerDependencies';
  if (spec.dev) return 'devDependencies';
  return 'dependencies';
}

/**
 * Merges every module's dependency declarations into one set.
 *
 * Duplicates collapse. When two modules ask for incompatible ranges of the same
 * package the higher floor wins — the newer library is far more likely to work
 * with the older consumer than the reverse — and a warning names both modules
 * so the user can pin it themselves if that guess is wrong.
 */
export function mergeDependencies(contributions: DependencyContribution[]): MergedDependencies {
  const chosen = new Map<string, { bucket: Bucket; spec: DependencyContribution }>();
  const native = new Set<string>();
  const warnings: string[] = [];

  for (const spec of contributions) {
    if (spec.native) native.add(spec.name);

    const existing = chosen.get(spec.name);
    if (!existing) {
      chosen.set(spec.name, { bucket: bucketOf(spec), spec });
      continue;
    }

    // A package needed at runtime by any module outranks a dev-only request.
    const bucket = strongerBucket(existing.bucket, bucketOf(spec));

    if (existing.spec.version === spec.version) {
      chosen.set(spec.name, { bucket, spec: existing.spec });
      continue;
    }

    const winner = higherRange(existing.spec, spec);
    const loser = winner === existing.spec ? spec : existing.spec;
    warnings.push(
      `${spec.name}: ${existing.spec.moduleId} wants ${existing.spec.version}, ` +
        `${spec.moduleId} wants ${spec.version} — using ${winner.version} ` +
        `(from ${winner.moduleId}); verify ${loser.moduleId} still works.`,
    );
    chosen.set(spec.name, { bucket, spec: winner });
  }

  const merged: MergedDependencies = {
    dependencies: {},
    devDependencies: {},
    peerDependencies: {},
    native: [...native].sort(),
    warnings,
  };

  for (const name of [...chosen.keys()].sort()) {
    const { bucket, spec } = chosen.get(name) as { bucket: Bucket; spec: DependencyContribution };
    merged[bucket][name] = spec.version;
  }

  return merged;
}

function strongerBucket(a: Bucket, b: Bucket): Bucket {
  if (a === 'dependencies' || b === 'dependencies') return 'dependencies';
  if (a === 'devDependencies' || b === 'devDependencies') return 'devDependencies';
  return 'peerDependencies';
}

/** Compares two ranges by their minimum satisfying version. */
function higherRange(a: DependencyContribution, b: DependencyContribution): DependencyContribution {
  const aMin = safeMinVersion(a.version);
  const bMin = safeMinVersion(b.version);

  // Unparseable ranges (git urls, `workspace:*`, `latest`) lose to real ranges,
  // and if neither parses we keep the first for determinism.
  if (!aMin) return bMin ? b : a;
  if (!bMin) return a;
  return semver.gt(bMin, aMin) ? b : a;
}

function safeMinVersion(range: string): string | null {
  try {
    return semver.minVersion(range)?.version ?? null;
  } catch {
    return null;
  }
}
