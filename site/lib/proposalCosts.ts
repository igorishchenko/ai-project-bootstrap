import { catalogue, categoryModules, modById, type Selection } from "./catalogue";

export type CostBucket = {
  label: string;
  value: string;
  /** `signal` flags the no-pricing-data bucket: missing is not free. */
  tone: "faint" | "ink" | "signal";
  note: string;
};

function list(names: string[]): string {
  return names.join(", ");
}

/**
 * Answers to the gating question ("web", "mobile", "hybrid") are not modules
 * and have no price, so they must not be counted as unpriced ones.
 */
const gatingIds = new Set(
  catalogue.categories.filter((c) => c.gating).flatMap((c) => categoryModules(c).map((m) => m.id)),
);

/**
 * Every module id in a proposal, resolved from the *values* rather than by
 * walking local category ids. The model names its categories independently —
 * it returns `framework: "nextjs"` where the catalogue files Next.js under
 * `web` — so matching on category id silently drops modules, which is exactly
 * the "missing is not free" failure this screen exists to prevent.
 */
function proposedModuleIds(choices: Selection): string[] {
  const out: string[] = [];
  for (const value of Object.values(choices)) {
    for (const id of Array.isArray(value) ? value : [value]) {
      if (id && !gatingIds.has(id)) out.push(id);
    }
  }
  return out;
}

/**
 * Splits a proposed selection into the product's three cost buckets, using the
 * pricing recorded in the local catalogue — the chat API returns module ids,
 * not prices.
 *
 * The buckets are never summed into one figure. `freemium` sits with
 * usage-based rather than flat because what you actually pay depends on
 * usage; `free` sits with flat because $0 is a recorded price, not a missing
 * one. A module with no pricing row lands in its own bucket and stays visible.
 */
export function costBucketsFor(choices: Selection): CostBucket[] {
  const flat: string[] = [];
  const usage: string[] = [];
  const unknown: string[] = [];
  let flatTotal = 0;
  let flatHasEstimate = false;

  for (const id of proposedModuleIds(choices)) {
    const entry = modById(id);
    const pricing = entry?.m.pricing ?? null;
    const name = entry?.m.name ?? id;

    if (!pricing) {
      unknown.push(name);
      continue;
    }
    if (pricing.model === "usage-based" || pricing.model === "freemium") {
      usage.push(name);
      continue;
    }
    flat.push(name);
    if (typeof pricing.estimateUsd === "number") {
      flatTotal += pricing.estimateUsd;
      flatHasEstimate = true;
    }
  }

  return [
    {
      label: "Flat monthly",
      value: flat.length === 0 ? "no data" : flatHasEstimate ? `$${flatTotal}/mo` : "$0",
      tone: flat.length === 0 ? "faint" : "ink",
      note:
        flat.length === 0
          ? "None of these modules have a flat price recorded in the catalogue."
          : `${list(flat)} — the only figures here that are a fixed monthly amount.`,
    },
    {
      label: "Usage-based",
      value: usage.length === 0 ? "none" : `${usage.length} module${usage.length === 1 ? "" : "s"}`,
      tone: usage.length === 0 ? "faint" : "ink",
      note:
        usage.length === 0
          ? "Nothing here bills on usage."
          : `${list(usage)} — billed on what you use, so no honest flat figure exists.`,
    },
    {
      label: "No pricing data",
      value:
        unknown.length === 0
          ? "none"
          : `${unknown.length} module${unknown.length === 1 ? "" : "s"}`,
      tone: unknown.length === 0 ? "faint" : "signal",
      note:
        unknown.length === 0
          ? "Every module here has a pricing row."
          : `${list(unknown)} — not recorded. Missing is not free.`,
    },
  ];
}

/** `{ framework: "nextjs", ... }` rendered as the CLI's config file. */
export function configJsonFor(projectName: string, choices: Selection): string {
  return JSON.stringify({ projectName, choices }, null, 2);
}

export const runCommand = "npx ai-project-bootstrap --config ai-project.config.json";
