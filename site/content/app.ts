/**
 * Copy and fixture data for the signed-in dashboard.
 *
 * None of this comes from a server yet. Every screen in `components/app` is
 * marked with what it needs before it is real — see `DASHBOARD_STATES.md`.
 * When the account API exists, the fixtures below are the shapes to fetch.
 */

import type { Proposal } from "@/lib/api";
import type { CostBucket } from "@/lib/proposalCosts";

export type Marker = "live" | "needs-api" | "design-ahead";

export const markerLabel: Record<Marker, string> = {
  live: "Live",
  "needs-api": "Needs API",
  "design-ahead": "Design-ahead",
};

/* -------------------------------------------------------------------------- */
/* Shell                                                                      */
/* -------------------------------------------------------------------------- */

export type NavItem = { href: string; label: string; d: string };

/** Icon paths are drawn at 24×24 with a 1.7 stroke, matching the rail. */
export const dashboardNav: NavItem[] = [
  {
    href: "/chat",
    label: "Chat",
    d: "M21 12a8 8 0 0 1-8 8H7l-4 3v-5.5A8 8 0 0 1 11 4h2a8 8 0 0 1 8 8Z",
  },
  {
    href: "/connect",
    label: "Connect your editor",
    d: "M4 17V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Zm4-7 2.5 2L8 14m5 0h4",
  },
  {
    href: "/stacks",
    label: "Saved stacks",
    d: "M12 3 4 7l8 4 8-4-8-4ZM4 12l8 4 8-4M4 17l8 4 8-4",
  },
  {
    href: "/settings",
    label: "Settings",
    d: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-3a8 8 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a8 8 0 0 0-2.1-1.2L15 3H9l-.5 2.7a8 8 0 0 0-2.1 1.2l-2.3-1-2 3.4 2 1.5a8 8 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a8 8 0 0 0 2.1 1.2L9 21h6l.5-2.7a8 8 0 0 0 2.1-1.2l2.3 1 2-3.4-2-1.5c.07-.4.1-.8.1-1.2Z",
  },
];

export const accountEmail = "ada@lovelace.dev";
export const accountInitials = "an";

/* -------------------------------------------------------------------------- */
/* Credentials                                                                */
/* -------------------------------------------------------------------------- */

export const licenseKey = "apb_live_EXAMPLEONLYnotarealkey0000000000";
export const licenseKeyMasked = "apb_live_EXAM••••••••0000";
export function mcpCommand(key: string, host: string) {
  const scheme = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return [
    "claude mcp add --transport http ai-project-bootstrap \\",
    `  ${scheme}://${host}/mcp \\`,
    `  --header "Authorization: Bearer ${key}"`,
  ].join("\n");
}

export function shellProfileSnippet(key: string) {
  return `# ~/.zshrc\nexport AI_PROJECT_BOOTSTRAP_LICENSE_KEY="${key}"`;
}

export function dotenvSnippet(key: string) {
  return `# .env — keep it out of git\nAI_PROJECT_BOOTSTRAP_LICENSE_KEY=${key}`;
}

/* -------------------------------------------------------------------------- */
/* Chat                                                                       */
/* -------------------------------------------------------------------------- */

export const assistantReply = `Store billing changes exactly one category, not the stack.

## What moves

- \`payments\` — Stripe out, **RevenueCat** in. App Store and Play subscriptions have to be validated server-side against Apple's and Google's receipts; RevenueCat is the module in the catalogue that does that.
- Everything else in \`web-saas\` stands. Auth, database and hosting don't care where the money came from.

One thing to know before you commit: a store-billed product usually wants a mobile client, so \`expo\` is worth adding now rather than retrofitting.

\`\`\`json
{
  "projectName": "invoice-radar",
  "choices": {
    "framework": "nextjs",
    "mobile": "expo",
    "database": "supabase",
    "auth": "clerk",
    "payments": "revenuecat",
    "analytics": "posthog",
    "monitoring": "sentry",
    "testing": "vitest"
  }
}
\`\`\`

Save that as \`ai-project.config.json\` and run:

\`\`\`bash
npx ai-project-bootstrap --config ai-project.config.json
\`\`\``;

/**
 * The same shape `GET /v1/chat` returns, so `?state=` review mode drives the
 * exact render path live data does rather than a parallel one.
 */
export const fixtureProposal: Proposal = {
  preset: {
    id: "web-saas",
    name: "web-saas, store-billed",
    description:
      "Next.js web app with an Expo client, Supabase behind it, subscriptions validated through RevenueCat.",
    choices: {
      framework: "nextjs",
      mobile: "expo",
      database: "supabase",
      auth: "clerk",
      payments: "revenuecat",
      analytics: "posthog",
      monitoring: "sentry",
      testing: "vitest",
    },
  },
  suggestedName: "invoice-radar",
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  proposal?: Proposal;
};

export const chatHistory: ChatMessage[] = [
  {
    role: "user",
    content:
      "I've got the web-saas preset but we bill through the app stores, not cards. What changes?",
  },
  { role: "assistant", content: assistantReply, proposal: fixtureProposal },
];

export const chatStarters = [
  "I'm building a habit tracker with sign-in and paid reminders",
  "What changes if I bill through the App Store instead of cards?",
  "Cheapest stack that still has auth and payments",
];

export const archivedThreads = [
  { title: "Habit tracker with paid reminders", meta: "archived 12 Jul · 18 messages" },
  { title: "Cheapest stack with auth + payments", meta: "archived 3 Jun · 7 messages" },
];

/* -------------------------------------------------------------------------- */
/* Stacks — shared by the chat panel and the saved-stacks screen               */
/* -------------------------------------------------------------------------- */

export type SelectionRow = { cat: string; mod: string; bucket?: "usage" | "no data" };

export const proposalSelection: SelectionRow[] = [
  { cat: "framework", mod: "nextjs", bucket: "no data" },
  { cat: "mobile", mod: "expo", bucket: "no data" },
  { cat: "database", mod: "supabase", bucket: "usage" },
  { cat: "auth", mod: "clerk", bucket: "usage" },
  { cat: "payments", mod: "revenuecat", bucket: "no data" },
  { cat: "analytics", mod: "posthog", bucket: "usage" },
  { cat: "monitoring", mod: "sentry", bucket: "usage" },
  { cat: "testing", mod: "vitest", bucket: "no data" },
];

export const stackConfigJson = `{
  "projectName": "invoice-radar",
  "choices": {
    "framework": "nextjs",
    "mobile": "expo",
    "database": "supabase",
    "auth": "clerk",
    "payments": "revenuecat",
    "analytics": "posthog",
    "monitoring": "sentry",
    "testing": "vitest"
  }
}`;

export const stackRunCommand = "npx ai-project-bootstrap --config ai-project.config.json";

/**
 * Fixture buckets for the saved-stacks screen and `?state=` review mode. Live
 * chat proposals compute theirs from the catalogue — see `costBucketsFor`.
 */
export const costBuckets: CostBucket[] = [
  {
    label: "Flat monthly",
    value: "no data",
    tone: "faint",
    note: "None of these modules publish a flat price we've recorded yet.",
  },
  {
    label: "Usage-based",
    value: "4 modules",
    tone: "ink",
    note: "supabase, clerk, posthog, sentry — priced on what you actually use. No honest flat figure exists.",
  },
  {
    label: "No pricing data",
    value: "4 modules",
    tone: "signal",
    note: "nextjs, expo, revenuecat, vitest — not recorded in the catalogue. Missing is not free.",
  },
];

export const proposal = {
  name: "web-saas, store-billed",
  description:
    "Next.js web app with an Expo client, Supabase behind it, subscriptions validated through RevenueCat.",
  suggested: "suggested name: invoice-radar",
  meta: "8 categories · validated · costs split three ways",
};

export type SavedStack = {
  slug: string;
  name: string;
  source: string;
  summary: string;
  date: string;
  cost: string;
};

export const savedStacks: SavedStack[] = [
  {
    slug: "invoice-radar",
    name: "invoice-radar",
    source: "from chat",
    summary: "nextjs · expo · supabase · clerk · revenuecat",
    date: "Saved 8 Aug 2026",
    cost: "4 usage-based · 4 unpriced",
  },
  {
    slug: "ledger-lite",
    name: "ledger-lite",
    source: "built by hand",
    summary: "nextjs · postgres · lucia · stripe · vitest",
    date: "Saved 21 Jul 2026",
    cost: "5 unpriced",
  },
  {
    slug: "habit-tracker",
    name: "habit-tracker",
    source: "archetype",
    summary: "expo · supabase · revenuecat · sentry",
    date: "Saved 3 Jun 2026",
    cost: "2 usage-based · 2 unpriced",
  },
  {
    slug: "internal-audit-tool",
    name: "internal-audit-tool",
    source: "from chat",
    summary: "nextjs · postgres · self-hosted · vitest",
    date: "Saved 14 May 2026",
    cost: "4 unpriced",
  },
];

export const stackDetailMeta = "Saved from chat, 8 August 2026 · 8 of 16 categories set";

/* -------------------------------------------------------------------------- */
/* Connect                                                                    */
/* -------------------------------------------------------------------------- */

export const mcpTools = [
  {
    tag: "chat",
    tone: "accent" as const,
    text: "Ask about stacks and get a validated proposal back, in the same thread as this site.",
  },
  {
    tag: "—",
    tone: "faint" as const,
    text: "No file access, no repo reads, nothing from your machine. It only sees what you type.",
  },
  {
    tag: "—",
    tone: "faint" as const,
    text: "Counts against the same 200 messages a day as web chat. One budget, not two.",
  },
];

export const mcpFaults = [
  {
    code: "402",
    tone: "danger" as const,
    title: "Server says the key isn't usable",
    body: "The API answers the same way whether a key is unknown or the subscription behind it has lapsed — deliberately, since it can't verify who's asking. Check Billing here in the dashboard; that page can tell you which it actually is.",
  },
  {
    code: "429",
    tone: "signal" as const,
    title: "Rate limited",
    body: "200 messages a day per key across web and MCP together, plus 20 requests an hour per IP. The message says how long to wait. Nothing is lost.",
  },
  {
    code: "—",
    tone: "faint" as const,
    title: "Claude Code doesn't list the server",
    body: "Run claude mcp list. If it's missing, the add command probably ran in a different project scope — re-run it from the repo you're working in.",
  },
];

/* -------------------------------------------------------------------------- */
/* Settings                                                                   */
/* -------------------------------------------------------------------------- */

export const settingsTabs = [
  { id: "account", label: "Account", marker: "live" as Marker },
  { id: "key", label: "License key", marker: "live" as Marker },
  // Status is live off the Paddle webhook; invoices and the portal are not.
  { id: "billing", label: "Billing", marker: "live" as Marker },
  { id: "usage", label: "Usage", marker: "needs-api" as Marker },
  { id: "prefs", label: "Preferences", marker: "design-ahead" as Marker },
];

export type SettingsTabId = (typeof settingsTabs)[number]["id"];

export const keyUnlocks = [
  { on: true, text: "--idea in the CLI, on our API budget" },
  { on: true, text: "The MCP server, so Claude Code shares your thread" },
  { on: true, text: "Web chat, if you'd rather paste a key than sign in" },
  {
    on: false,
    text: "Nothing local. The wizard, add, upgrade, review and the rest never ask for it.",
  },
];

export const invoices = [
  { date: "4 Aug 2026", amount: "$18.15" },
  { date: "4 Jul 2026", amount: "$18.15" },
  { date: "4 Jun 2026", amount: "$18.15" },
];

export const emailPrefs = [
  {
    key: "product" as const,
    title: "Product updates",
    body: "New modules, new commands. A few times a year at most.",
    locked: false,
  },
  {
    key: "tips" as const,
    title: "Usage tips",
    body: "Occasional notes on getting more out of the CLI.",
    locked: false,
  },
  {
    key: "security" as const,
    title: "Security and billing",
    body: "Failed payments, key rotations, sign-in links. Always on.",
    locked: true,
  },
];

/* -------------------------------------------------------------------------- */
/* Auth                                                                       */
/* -------------------------------------------------------------------------- */

export const authCollectRows = [
  { tag: "email", tone: "ink" as const, text: "Your only identifier, and where the link goes." },
  {
    tag: "name",
    tone: "muted" as const,
    text: "Optional, after signup. Used to say hello, nothing else.",
  },
  {
    tag: "tax",
    tone: "faint" as const,
    text: "Country and postcode, collected by Paddle at checkout — never by us.",
  },
];

export const proFeatures = [
  "Chat — the full 35-module catalogue, arguing tradeoffs with you",
  "--idea in the CLI, running on our API budget, not your OpenAI key",
  "The same thread inside Claude Code over MCP",
];
