// Hand-authored prototype copy with no repo source, ported verbatim from
// `Landing Page.dc.html` in the Claude Design project — do not paraphrase.
import type { CastLine } from "@/components/shared/Terminal";

export const heroPill = "v1.0.0 — 35 modules across 16 categories";
export const heroTitle = "Give the AI a repo worth reading";
export const heroSubhead =
  "One command writes the docs, rules, prompts and checklists your AI assistant needs — for your stack, in every tool you use.";
export const heroFootnote = "Node ≥18 · MIT · free forever · ";

export const ideaFacts = [
  {
    title: "No key of your own",
    body: "The model call runs on our budget, not an OpenAI account you set up. That is exactly why it is the one paid flag — there is no free allowance to give away.",
  },
  {
    title: "Reviewed before anything is written",
    body: "The proposed stack lands in the same confirmation screen a --preset does. Decline it and no file is touched.",
  },
  {
    title: "It can say no",
    body: "A proposal naming a module the catalogue doesn't have, or two that conflict, is rejected rather than half-built. You fall back to the wizard, free as ever.",
  },
  {
    title: "The rest stays free",
    body: "Cancel and the CLI does not degrade. Every local command keeps working on the projects you already generated — only --idea stops.",
  },
];

export const ideaCast: CastLine[] = [
  { text: '$ npx ai-project-bootstrap --idea "a habit tracker with paid reminders"', color: "var(--term-ink)" },
  { text: "" },
  { text: "◆ reading your idea against 35 modules…", color: "var(--term-dim)" },
  { text: "" },
  { text: "Proposed stack", color: "var(--term-blue)" },
  { text: "  mobile      Expo", color: "var(--term-ink)" },
  { text: "  backend     Supabase", color: "var(--term-ink)" },
  { text: "  auth        Supabase Auth", color: "var(--term-ink)" },
  { text: "  payments    RevenueCat", color: "var(--term-ink)" },
  { text: "  analytics   PostHog", color: "var(--term-ink)" },
  { text: "" },
  { text: "  Est. $25/mo · 2 usage-based", color: "var(--term-orange)" },
  { text: "" },
];

export const howItWorksSteps = [
  {
    n: "01",
    title: "Answer",
    body: "Which AI tools you use, then mobile or web, then whatever your stack actually needs. Categories with nothing installed are skipped.",
    hint: ["or skip it — ", "--preset web-saas"],
  },
  {
    n: "02",
    title: "Review",
    body: "Every preset shows what it filled before anything is written, and you can back out to a fully custom run. --dry-run prints the file list and stops.",
    hint: ["est. cost is shown here, before you commit"],
  },
  {
    n: "03",
    title: "Generate",
    body: "Deterministic — no timestamps, no absolute paths, stable ordering. The same answers always produce byte-identical output.",
    hint: ["re-run later; hand-edits are preserved"],
  },
];

export const howItWorksCastLines: CastLine[] = [
  { text: "◆ Which AI coding tools do you use?", color: "var(--term-blue)", marginTop: 10 },
  {
    text: "  ■ Cursor   ■ Claude Code   □ GitHub Copilot   □ Continue.dev   □ Cline   □ Roo Code",
    color: "var(--term-dim)",
  },
  { text: "◆ What are you building?", color: "var(--term-blue)", marginTop: 8 },
  { text: "  ● Mobile app    ○ Web app    ○ Both", color: "var(--term-dim)" },
  { text: "◆ Backend", color: "var(--term-blue)", marginTop: 8 },
  { text: "  ● Supabase    ○ Firebase    ○ FastAPI    ○ NestJS    ○ None", color: "var(--term-dim)" },
  { text: "✔ 43 files written to ./my-app", color: "var(--term-green)", marginTop: 14 },
  {
    text: "  Est. cost $51/mo (Supabase, Sentry) — 1 usage-based service not counted",
    color: "var(--term-orange)",
  },
];

export const presetLabels = ["startup-mvp", "web-saas", "enterprise"];

export const chatFacts = [
  {
    title: "One subscription",
    body: "Chat is not a second bill. When it ships it is included in Pro, alongside --idea, at the same $15/month.",
  },
  {
    title: "Two places, one service",
    body: "The same conversation on this site and inside Claude Code over MCP, so you can ask from the editor you're already in.",
  },
  {
    title: "It ends in a command",
    body: "Every thread resolves to a selection you can run or a config you can commit. Talking is not the deliverable.",
  },
];

export type ChatMessage = { role: "user" | "bot"; text: string };
export const chatMessages: ChatMessage[] = [
  { role: "user", text: "I've got the web-saas preset but we bill through the app stores, not cards." },
  {
    role: "bot",
    text: "Then Stripe is the wrong module here — store subscriptions go through RevenueCat. Swapping payments changes one category, so the rest of the preset stands.",
  },
  { role: "user", text: "What does that do to the estimate?" },
  {
    role: "bot",
    text: "It drops the flat total to $71/mo — RevenueCat is usage-based, so it moves out of the counted bucket and gets listed separately. Supabase, Sentry and Resend are unchanged.",
  },
  { role: "user", text: "Fine. Give me the command." },
  { role: "bot", text: "npx ai-project-bootstrap \\\n  --preset web-saas --replace payments=revenuecat" },
];

export const landingTiers = [
  {
    name: "Free",
    tag: "MIT · forever",
    tagTone: "muted" as const,
    price: "$0",
    sub: "No account. No key. Nothing phones home.",
    border: "var(--line)",
    cta: "npx ai-project-bootstrap",
    ctaStyle: "outline" as const,
    href: "#quickstart",
    rows: [
      { mark: "✔", tone: "accent" as const, text: "The wizard, 16 categories, 35 modules" },
      { mark: "✔", tone: "accent" as const, text: "All three presets and the habit-tracker archetype" },
      { mark: "✔", tone: "accent" as const, text: "add · upgrade · implement · review · analyze · doctor" },
      { mark: "✔", tone: "accent" as const, text: "Cost estimation, and rules for all eight AI tools" },
      { mark: "✔", tone: "accent" as const, text: "Works offline, and keeps working if you never pay" },
    ],
  },
  {
    name: "Pro",
    tag: "subscription only",
    tagTone: "signal" as const,
    price: "$15/mo",
    sub: "or $149/year. No free tier, no trial.",
    border: "var(--accent)",
    cta: "Subscribe →",
    ctaStyle: "solid" as const,
    href: "/pricing",
    rows: [
      { mark: "✔", tone: "signal" as const, text: "Everything in Free, unchanged" },
      { mark: "✔", tone: "signal" as const, text: "--idea — describe the project, get a stack proposed" },
      { mark: "✔", tone: "signal" as const, text: "Runs on our API budget, no OpenAI key of your own" },
      { mark: "→", tone: "faint" as const, text: "Chat and the Claude Code assistant when they ship" },
    ],
  },
];

export const exploreCards = [
  {
    kicker: "Reference",
    title: "The catalogue",
    body: "All 16 categories and 35 modules, the eight tools each rule is rendered into, and the exact files a run writes.",
    cta: "Browse the catalogue →",
    href: "/catalogue",
  },
  {
    kicker: "Reference",
    title: "Commands",
    body: "add, implement, review, analyze, upgrade and doctor — what each one does to a project you already generated.",
    cta: "See the commands →",
    href: "/commands",
  },
  {
    kicker: "Pro",
    title: "Pricing",
    body: "One tier, $15/month or $149/year, no trial. Everything the CLI does locally stays free and MIT-licensed.",
    cta: "See what's paid →",
    href: "/pricing",
  },
];

export const quickstart = [
  { cmd: "npx ai-project-bootstrap", label: "the full wizard" },
  { cmd: "npx ai-project-bootstrap --preset web-saas --yes", label: "a curated stack, non-interactively" },
  { cmd: "npx ai-project-bootstrap --archetype habit-tracker", label: "a running app, not just dependencies" },
];
