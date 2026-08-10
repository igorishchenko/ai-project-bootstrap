// Ported verbatim from the Docs Site.dc.html prototype's PAGES/EXTRA/GROUPS
// object via a one-off Node `vm` extraction (see project notes) — the copy
// is the actual page content, not a paraphrase.
import raw from "./pages-raw.json";

export type Block =
  | { t: "h2"; text: string }
  | { t: "p"; text: string }
  | { t: "code"; text: string }
  | { t: "list"; items: string[] }
  | { t: "table"; cols: string[]; rows: string[][] }
  | { t: "note"; title: string; text: string; tone: "accent" | "signal" }
  | { t: "cards"; items: { title: string; body: string; go: string }[] };

export interface DocPage {
  group: string;
  title: string;
  src: string;
  lead: string;
  blocks: Block[];
  signedInOnly?: boolean;
}

export interface DocGroup {
  group: string;
  items: string[];
}

interface RawShape {
  PAGES: Record<string, DocPage>;
  EXTRA: Record<string, { signedIn: Block[]; signedOut: Block[] }>;
  GROUPS: DocGroup[];
  ORDER: string[];
}

const data = raw as unknown as RawShape;

export const PAGES = data.PAGES;
export const EXTRA = data.EXTRA;
export const GROUPS = data.GROUPS;
export const ORDER = data.ORDER;

export function getPage(id: string): DocPage | undefined {
  return PAGES[id];
}

export function pageBlocks(id: string, signedIn: boolean): Block[] {
  const page = PAGES[id];
  if (!page) return [];
  const extra = EXTRA[id];
  if (!extra) return page.blocks;
  return [...page.blocks, ...(signedIn ? extra.signedIn : extra.signedOut)];
}

export function neighbors(id: string): { prev: string | null; next: string | null } {
  const pos = ORDER.indexOf(id);
  return {
    prev: pos > 0 ? ORDER[pos - 1] : null,
    next: pos >= 0 && pos < ORDER.length - 1 ? ORDER[pos + 1] : null,
  };
}
