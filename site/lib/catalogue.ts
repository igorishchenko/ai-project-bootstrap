import catalogueJson from "@/data/catalogue.json";

export type PricingModel = "free" | "flat" | "freemium" | "usage-based";

export interface Pricing {
  model: PricingModel;
  estimateUsd?: number;
  notes?: string;
  url?: string;
}

export interface Module {
  id: string;
  name: string;
  description?: string;
  requires: string[];
  conflicts: string[];
  pricing: Pricing | null;
}

export interface GatingChoice {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  label: string;
  shortLabel?: string;
  kind: "one" | "any";
  gating?: boolean;
  choices?: GatingChoice[];
  showWhen?: Record<string, string[]> | null;
  modules?: Module[];
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  choices: Selection;
}

export interface Archetype {
  id: string;
  name: string;
  description: string;
  choices: Selection;
}

export interface Feature {
  id: string;
  name: string;
  description: string;
  category: string;
  providers: string[];
}

export interface Counts {
  categories: number;
  modules: number;
  prompts: number;
  pricedFlat: number;
  pricedUsage: number;
  featureCount: number;
  providerCount: number;
}

export interface Catalogue {
  categories: Category[];
  presets: Preset[];
  archetypes: Archetype[];
  features: Feature[];
  counts: Counts;
}

export type Selection = Record<string, string | string[]>;

export const catalogue = catalogueJson as unknown as Catalogue;

/** Every category's options normalised to the same {id,name,requires,conflicts,pricing} shape. */
export function categoryModules(cat: Category): Module[] {
  if (cat.modules) return cat.modules;
  if (cat.choices) {
    return cat.choices.map((c) => ({
      id: c.id,
      name: c.name,
      requires: [],
      conflicts: [],
      pricing: null,
    }));
  }
  return [];
}

export function modById(id: string): { m: Module; catId: string } | null {
  for (const cat of catalogue.categories) {
    for (const m of categoryModules(cat)) {
      if (m.id === id) return { m, catId: cat.id };
    }
  }
  return null;
}

/** Selected module ids across every category except the `target` gating question. */
export function selectedIds(sel: Selection): string[] {
  const out: string[] = [];
  for (const cat of catalogue.categories) {
    if (cat.gating) continue;
    const v = sel[cat.id];
    if (Array.isArray(v)) out.push(...v);
    else if (v) out.push(v);
  }
  return out;
}

export function requiredBy(sel: Selection, id: string): string | null {
  for (const other of selectedIds(sel)) {
    const e = modById(other);
    if (e && e.m.requires.includes(id)) return e.m.name;
  }
  return null;
}

export function conflictBlockers(sel: Selection): Map<string, string> {
  const blocked = new Map<string, string>();
  for (const id of selectedIds(sel)) {
    const e = modById(id);
    if (!e) continue;
    for (const c of e.m.conflicts) blocked.set(c, e.m.name);
  }
  return blocked;
}

/** Whether a category should currently be shown, per its `showWhen`. */
export function categoryVisible(cat: Category, sel: Selection): boolean {
  if (!cat.showWhen) return true;
  return Object.entries(cat.showWhen).every(([key, allowed]) => {
    const v = sel[key];
    if (Array.isArray(v)) return v.some((x) => allowed.includes(x));
    return typeof v === "string" && allowed.includes(v);
  });
}

/** Pure: returns the next selection after toggling one module on/off. */
export function toggle(sel: Selection, categoryId: string, moduleId: string): Selection {
  const cat = catalogue.categories.find((c) => c.id === categoryId);
  if (!cat) return sel;
  const next: Selection = { ...sel };

  if (cat.kind === "any") {
    const cur = (next[categoryId] as string[] | undefined) ?? [];
    next[categoryId] = cur.includes(moduleId) ? cur.filter((x) => x !== moduleId) : [...cur, moduleId];
    if ((next[categoryId] as string[]).length === 0) delete next[categoryId];
  } else {
    if (next[categoryId] === moduleId) delete next[categoryId];
    else next[categoryId] = moduleId;
  }

  const mod = modById(moduleId)?.m;
  if (next[categoryId] === moduleId && mod?.requires.length) {
    for (const req of mod.requires) {
      const e = modById(req);
      if (e && next[e.catId] !== req) next[e.catId] = req;
    }
  }
  return next;
}

export interface PickerModule {
  id: string;
  name: string;
  on: boolean;
  requiredByName: string | null;
  blockedByName: string | null;
  disabled: boolean;
  title: string;
}

export interface PickerCategory {
  id: string;
  label: string;
  kindLabel: "pick one" | "pick any";
  modules: PickerModule[];
}

export function pickerCategories(sel: Selection): PickerCategory[] {
  const blocked = conflictBlockers(sel);
  return catalogue.categories
    .filter((cat) => categoryVisible(cat, sel))
    .map((cat) => {
      const v = sel[cat.id];
      return {
        id: cat.id,
        label: cat.label,
        kindLabel: cat.kind === "any" ? "pick any" : "pick one",
        modules: categoryModules(cat).map((m) => {
          const on = Array.isArray(v) ? v.includes(m.id) : v === m.id;
          const requiredByName = on ? requiredBy(sel, m.id) : null;
          const blockedByName = !on ? (blocked.get(m.id) ?? null) : null;
          const disabled = Boolean(requiredByName) || Boolean(blockedByName);
          const title = requiredByName
            ? `Pulled in by ${requiredByName} — deselect that first`
            : blockedByName
              ? `${m.name} conflicts with ${blockedByName} — deselect it first`
              : m.pricing
                ? `${m.name} — ${m.pricing.notes ?? "usage-based pricing"}`
                : m.name;
          return { id: m.id, name: m.name, on, requiredByName, blockedByName, disabled, title };
        }),
      };
    });
}

export interface CostBucket {
  label: string;
  tone: "ink" | "signal" | "muted" | "faint";
  rows: { name: string; value: string }[];
  emptyText: string;
}

export interface CostSummary {
  total: number;
  buckets: CostBucket[];
}

export function computeCost(sel: Selection): CostSummary {
  const est: { name: string; value: string }[] = [];
  const usage: { name: string; value: string }[] = [];
  const free: { name: string; value: string }[] = [];
  let total = 0;
  let noData = 0;

  for (const id of selectedIds(sel)) {
    const e = modById(id);
    if (!e) continue;
    const p = e.m.pricing;
    if (!p) {
      noData++;
      continue;
    }
    if (p.model === "flat" || p.model === "freemium") {
      est.push({ name: e.m.name, value: `$${p.estimateUsd}/mo` });
      total += p.estimateUsd ?? 0;
    } else if (p.model === "usage-based") {
      usage.push({ name: e.m.name, value: "usage-based" });
    } else {
      free.push({ name: e.m.name, value: "free" });
    }
  }

  const empty = selectedIds(sel).length === 0;

  return {
    total,
    buckets: [
      {
        label: "Counted above — flat or freemium tiers",
        tone: "ink",
        rows: est,
        emptyText: empty ? "nothing paid selected yet" : "no flat-priced services selected",
      },
      { label: "Billed on your usage — not counted", tone: "signal", rows: usage, emptyText: "none selected" },
      { label: "Free at typical usage", tone: "muted", rows: free, emptyText: "none selected" },
      {
        label: "Nothing to bill — no vendor",
        tone: "faint",
        rows: noData ? [{ name: `${noData} modules selected`, value: "$0" }] : [],
        emptyText: "none selected",
      },
    ],
  };
}

function deepEqualSelection(a: Selection, b: Selection): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const av = a[k];
    const bv = b[k];
    if (Array.isArray(av) || Array.isArray(bv)) {
      const as = new Set(Array.isArray(av) ? av : av ? [av] : []);
      const bs = new Set(Array.isArray(bv) ? bv : bv ? [bv] : []);
      if (as.size !== bs.size || [...as].some((x) => !bs.has(x))) return false;
    } else if (av !== bv) {
      return false;
    }
  }
  return true;
}

export function matchedPreset(sel: Selection): Preset | null {
  return catalogue.presets.find((p) => deepEqualSelection(p.choices, sel)) ?? null;
}

export interface ResolvedCommand {
  command: string;
  note: string;
}

export function resolveCommand(sel: Selection): ResolvedCommand {
  const empty = selectedIds(sel).length === 0;
  const preset = matchedPreset(sel);
  if (preset) return { command: `npx ai-project-bootstrap --preset ${preset.id}`, note: "matches a shipped preset" };
  if (empty) return { command: "npx ai-project-bootstrap", note: "the interactive wizard" };
  return { command: "npx ai-project-bootstrap --config ai-project.config.json", note: "download the config →" };
}

const BASE_TREE_ROWS = [
  { path: "docs/", note: "8 files" },
  { path: "prompts/", note: "reusable" },
  { path: "checklists/release.md", note: "" },
  { path: ".github/workflows/ci.yml", note: "" },
  { path: ".env.example", note: "deduplicated" },
  { path: "package.json", note: "merged" },
  { path: "AGENTS.md", note: "Codex" },
  { path: "GEMINI.md", note: "Gemini CLI" },
  { path: "ai-project.config.json", note: "replayable" },
];

export interface TreeRow {
  path: string;
  note: string;
  base: boolean;
}

export function treeRows(sel: Selection): { rows: TreeRow[]; fileCount: string } {
  const chosen = selectedIds(sel);
  const modRows: TreeRow[] = [];
  for (const id of chosen) {
    const e = modById(id);
    if (!e) continue;
    modRows.push({ path: `.cursor/rules/${id}.mdc`, note: e.m.name, base: false });
    modRows.push({ path: `.claude/skills/${id}/SKILL.md`, note: "", base: false });
  }
  const rows = [...BASE_TREE_ROWS.map((r) => ({ ...r, base: true })), ...modRows];
  const fileCount = chosen.length === 0 ? "baseline only" : `${rows.length + 6} files`;
  return { rows, fileCount };
}
