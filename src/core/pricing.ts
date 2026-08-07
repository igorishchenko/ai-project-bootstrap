import type { LoadedModule, Pricing } from './types.js';

export interface CostLineItem {
  moduleId: string;
  moduleName: string;
  /** Unset only in `unknown` — every other bucket always has real pricing data. */
  pricing?: Pricing;
}

export interface CostSummary {
  /** `flat`/`freemium` with a known `estimateUsd` — the only ones counted in `totalUsd`. */
  estimated: CostLineItem[];
  /** `free` — no cost, shown for completeness rather than silently omitted. */
  free: CostLineItem[];
  /** Genuinely usage-based — no single flat number would be honest. */
  usageBased: CostLineItem[];
  /** No `pricing` declared at all — not "free", just not evaluated. */
  unknown: CostLineItem[];
  /** Sum of every `estimated` line's `estimateUsd`. */
  totalUsd: number;
}

/**
 * Buckets the resolved selection by pricing model, so a caller can render
 * "here is a number" separately from "here is why there is no number" —
 * conflating a usage-based service with an unpriced one would either inflate
 * the total with a guess or silently drop a real, known-to-be-billed service.
 */
export function summarizeCosts(modules: readonly LoadedModule[]): CostSummary {
  const summary: CostSummary = {
    estimated: [],
    free: [],
    usageBased: [],
    unknown: [],
    totalUsd: 0,
  };

  for (const module of modules) {
    if (module.isBase) continue;

    const { pricing } = module.manifest;
    const item: CostLineItem = {
      moduleId: module.manifest.id,
      moduleName: module.manifest.name,
      pricing,
    };

    if (!pricing) {
      summary.unknown.push(item);
      continue;
    }

    if (pricing.model === 'free') {
      summary.free.push(item);
    } else if (pricing.model === 'usage-based') {
      summary.usageBased.push(item);
    } else if (pricing.estimateUsd === undefined) {
      // Declared flat/freemium but no number given — an honest gap, not a $0.
      summary.unknown.push(item);
    } else {
      summary.estimated.push(item);
      summary.totalUsd += pricing.estimateUsd;
    }
  }

  return summary;
}
