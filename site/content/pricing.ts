// Hand-authored prototype copy ported verbatim from `Pricing.dc.html`.
import type { TierRow } from "@/components/shared/TierCard";

export const tiers: {
  name: string;
  tag: string;
  tagTone: "muted" | "signal";
  price: string;
  sub: string;
  border: string;
  cta: string;
  ctaStyle: "solid" | "outline";
  href: string;
  note: string;
  rows: TierRow[];
}[] = [
  {
    name: "Free",
    tag: "MIT · forever",
    tagTone: "muted",
    price: "$0",
    sub: "No account, no key, no telemetry. Not a trial.",
    border: "var(--line)",
    cta: "npx ai-project-bootstrap",
    ctaStyle: "outline",
    href: "/",
    note: "Nothing to sign up for",
    rows: [
      { mark: "✔", tone: "accent", text: "The wizard — 16 categories, 35 modules" },
      { mark: "✔", tone: "accent", text: "startup-mvp, web-saas and enterprise presets" },
      { mark: "✔", tone: "accent", text: "The habit-tracker archetype — real screens and a data model" },
      { mark: "✔", tone: "accent", text: "add · upgrade · implement · review · analyze · doctor" },
      { mark: "✔", tone: "accent", text: "Rules for eight AI tools, from one source file each" },
      { mark: "✔", tone: "accent", text: "Cost estimation across your selected services" },
      { mark: "✔", tone: "accent", text: "Runs offline. Keeps working if you never pay." },
    ],
  },
  {
    name: "Pro",
    tag: "subscription only",
    tagTone: "signal",
    price: "$15",
    sub: "per month, or $149/year. No free tier, no trial.",
    border: "var(--accent)",
    cta: "Subscribe →",
    ctaStyle: "solid",
    href: "#paddle",
    note: "Checkout is handled by Paddle",
    rows: [
      { mark: "✔", tone: "signal", text: "Everything in Free, unchanged and still MIT" },
      { mark: "✔", tone: "signal", text: "--idea — a stack proposed from one sentence" },
      { mark: "✔", tone: "signal", text: "Runs on our API budget — you bring no OpenAI key" },
      { mark: "✔", tone: "signal", text: "Proposals are validated against the catalogue, then shown for review" },
      { mark: "→", tone: "faint", text: "Chat on this site, when it ships" },
      { mark: "→", tone: "faint", text: "The Claude Code assistant over MCP, when it ships" },
      { mark: "✔", tone: "signal", text: "Cancel any time — the free CLI is unaffected" },
    ],
  },
];

export const compare = [
  { what: "The wizard and every local command", free: "Included", pro: "Included", proTone: "ink" as const },
  { what: "Presets and the archetype", free: "Included", pro: "Included", proTone: "ink" as const },
  { what: "AI rules for eight tools", free: "Included", pro: "Included", proTone: "ink" as const },
  { what: "Cost estimation", free: "Included", pro: "Included", proTone: "ink" as const },
  { what: "Works with no network", free: "Yes", pro: "Yes, apart from --idea", proTone: "muted" as const },
  { what: "--idea — a stack from one sentence", free: "—", pro: "Included", proTone: "signal" as const, freeTone: "faint" as const },
  { what: "Chat, on the site and over MCP", free: "—", pro: "When it ships", proTone: "muted" as const, freeTone: "faint" as const },
  { what: "Account required", free: "No", pro: "Yes — licence key", proTone: "muted" as const },
  { what: "Free trial", free: "n/a", pro: "None", proTone: "signal" as const, freeTone: "faint" as const },
];

export const faq = [
  {
    q: "Does the CLI stop working if I cancel?",
    a: "No. Everything local is MIT-licensed and already on your machine. Cancelling turns off --idea and nothing else — projects you generated are untouched.",
  },
  {
    q: "Why is there no trial?",
    a: "Every --idea call spends real API budget. A trial is a stranger spending it. One honest price is the alternative to a quota nobody can predict.",
  },
  {
    q: "Can I use my own OpenAI key instead?",
    a: "That is what self-hosting the backend would allow — but whether the server is published is still an open decision. Until it is settled, assume the hosted service is the only route.",
  },
  {
    q: "Is the whole project open source?",
    a: "The CLI is MIT and public. Whether the server that answers --idea is published — MIT, source-available, or closed — has not been decided. We would rather say that than imply either.",
  },
  {
    q: "Is there a team or seat plan?",
    a: "Not yet. One tier, one person. If teams need it, that is a later conversation and not a hidden upsell in this one.",
  },
  {
    q: "How do I pay?",
    a: "Paddle handles checkout, and is the merchant of record — they are the seller, they remit VAT where it applies, and \"Paddle\" is what shows on your card statement. A licence key is emailed once the subscription activates. There is no card form on this site."
  },
];

export const locks = [
  {
    title: "--idea needs a Pro key",
    body: "Every proposal spends real OpenAI budget, so this one flag is subscription-only — there is no free allowance to draw down. The wizard, all 16 categories, the presets, the archetype and every other command stay free and keyless.",
    code: "AI_PROJECT_BOOTSTRAP_LICENSE_KEY not set",
  },
  {
    title: "Your subscription lapsed",
    body: "The key is valid but the subscription behind it ended, so the service declined the call. Nothing local changed — the CLI you already have keeps working exactly as it did.",
    code: "402 subscription_inactive · key ends … 4f2a",
  },
];
