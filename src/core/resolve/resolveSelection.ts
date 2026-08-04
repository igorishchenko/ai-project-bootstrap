import type { LoadedModule, Selection } from '../types.js';
import { GeneratorError } from './errors.js';
import { selectedModuleIds } from './validate.js';

export interface ResolveResult {
  /** Prerequisite-first, then priority, then id. Deterministic. */
  modules: LoadedModule[];
  /** Modules pulled in automatically to satisfy `requires`. */
  autoIncluded: string[];
}

/**
 * Expands the selection into the full module set and orders it.
 *
 * Two edge kinds feed the ordering graph:
 *  - `requires` — hard prerequisites, pulled in transitively.
 *  - `dependencies` — soft edges that only apply when both modules are present.
 *
 * Both mean "the target must come before me", so both constrain the sort.
 */
export function resolveSelection(
  selection: Selection,
  byId: Map<string, LoadedModule>,
): ResolveResult {
  const explicit = new Set(selectedModuleIds(selection));
  const included = new Set<string>();
  const autoIncluded: string[] = [];

  // Transitive `requires` closure.
  const queue = [...explicit].sort();
  while (queue.length > 0) {
    const id = queue.shift() as string;
    if (included.has(id)) continue;

    const module = byId.get(id);
    if (!module) {
      throw new GeneratorError(
        'UNKNOWN_MODULE',
        `Unknown module "${id}".`,
        'Run with --list-modules to see every available module id.',
      );
    }
    included.add(id);

    for (const requiredId of module.manifest.requires) {
      if (!byId.has(requiredId)) {
        throw new GeneratorError(
          'MISSING_REQUIRED_MODULE',
          `"${id}" requires "${requiredId}", which is not installed.`,
          `Add technologies/${requiredId}/, or drop "${id}" from your selection.`,
        );
      }
      if (!included.has(requiredId)) {
        if (!explicit.has(requiredId)) autoIncluded.push(requiredId);
        queue.push(requiredId);
      }
    }
  }

  assertNoConflicts(included, byId);

  return {
    modules: topologicalSort(included, byId),
    autoIncluded: [...new Set(autoIncluded)].sort(),
  };
}

function assertNoConflicts(included: Set<string>, byId: Map<string, LoadedModule>): void {
  // Sorted so the error message is stable regardless of selection order.
  const ids = [...included].sort();
  for (const id of ids) {
    const manifest = (byId.get(id) as LoadedModule).manifest;
    for (const otherId of manifest.conflicts) {
      if (!included.has(otherId)) continue;
      const other = byId.get(otherId);
      throw new GeneratorError(
        'INCOMPATIBLE_MODULES',
        `"${manifest.name}" and "${other?.manifest.name ?? otherId}" cannot be used together.`,
        `Pick one of them — they both cover "${manifest.category}"-adjacent responsibilities.`,
      );
    }
  }
}

/**
 * Kahn's algorithm over the requires + dependencies graph. The ready set is
 * kept sorted by (priority, id) so output ordering never depends on Map or Set
 * iteration order — the same selection always produces byte-identical files.
 */
function topologicalSort(included: Set<string>, byId: Map<string, LoadedModule>): LoadedModule[] {
  const edges = new Map<string, Set<string>>(); // node -> nodes that must precede it
  for (const id of included) edges.set(id, new Set());

  for (const id of included) {
    const manifest = (byId.get(id) as LoadedModule).manifest;
    const prerequisites = [...manifest.requires, ...manifest.dependencies];
    for (const prerequisiteId of prerequisites) {
      // Soft `dependencies` edges only apply when the sibling is present.
      if (included.has(prerequisiteId) && prerequisiteId !== id) {
        (edges.get(id) as Set<string>).add(prerequisiteId);
      }
    }
  }

  const compare = (a: string, b: string): number => {
    const left = (byId.get(a) as LoadedModule).manifest;
    const right = (byId.get(b) as LoadedModule).manifest;
    return left.priority - right.priority || left.id.localeCompare(right.id);
  };

  const sorted: LoadedModule[] = [];
  const remaining = new Map(edges);

  while (remaining.size > 0) {
    // One node at a time, not a whole wave: emitting a prerequisite immediately
    // unblocks its dependents, so a module ends up next to the thing it extends
    // rather than after every unrelated module of lower priority.
    const next = [...remaining.entries()]
      .filter(([, pending]) => pending.size === 0)
      .map(([id]) => id)
      .sort(compare)[0];

    if (next === undefined) {
      throw new GeneratorError(
        'CIRCULAR_DEPENDENCY',
        `Circular dependency between: ${describeCycle(remaining)}.`,
        'Break the loop by removing one of the requires/dependencies entries in those manifests.',
      );
    }

    sorted.push(byId.get(next) as LoadedModule);
    remaining.delete(next);
    for (const pending of remaining.values()) pending.delete(next);
  }

  return sorted;
}

/** Walks the leftover graph to name an actual cycle, not just the stuck set. */
function describeCycle(remaining: Map<string, Set<string>>): string {
  const path: string[] = [];
  const onPath = new Set<string>();
  const visited = new Set<string>();

  const visit = (id: string): string[] | undefined => {
    if (onPath.has(id)) return [...path.slice(path.indexOf(id)), id];
    if (visited.has(id)) return undefined;

    visited.add(id);
    onPath.add(id);
    path.push(id);

    for (const next of [...(remaining.get(id) ?? [])].sort()) {
      const cycle = visit(next);
      if (cycle) return cycle;
    }

    path.pop();
    onPath.delete(id);
    return undefined;
  };

  for (const id of [...remaining.keys()].sort()) {
    const cycle = visit(id);
    if (cycle) return cycle.join(' → ');
  }
  return [...remaining.keys()].sort().join(', ');
}
