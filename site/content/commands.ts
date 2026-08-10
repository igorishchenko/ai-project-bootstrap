// Hand-authored prototype copy ported verbatim from `Commands.dc.html`.
export const beforeFiles = ["src/", "package.json", "tsconfig.json", "README.md"];

export const afterRows = [
  { path: ".cursor/rules/", note: "9 rules" },
  { path: ".claude/skills/", note: "9 skills" },
  { path: "docs/", note: "setup · architecture · roadmap · costs …" },
  { path: "prompts/", note: "reusable, stack-aware" },
  { path: "checklists/", note: "release, plus per-module" },
  { path: ".env.example", note: "every var, documented" },
  { path: "AGENTS.md", note: "GEMINI.md   CLAUDE.md" },
  { path: "ai-project.config.json", note: "replayable" },
];
export const afterUnchanged = "src/  package.json  tsconfig.json  README.md";

export const implementComparison = {
  supabase: {
    label: "A project on Supabase Auth",
    lines: [
      { text: "plan.md", ink: true },
      { text: "→ session persistence via AsyncStorage" },
      { text: "→ the RLS policies that gate access" },
      { text: "src/features/auth/authClient.ts", ink: true, marginTop: true },
      { text: "src/hooks/auth/useAuth.ts", ink: true },
    ],
  },
  clerk: {
    label: "The same command, on Clerk",
    lines: [
      { text: "plan.md", ink: true },
      { text: "→ ClerkProvider and a secure token cache" },
      { text: "→ no authClient — Clerk's hooks are the client" },
      { text: "src/hooks/auth/useAuthedFetch.ts", ink: true, marginTop: true },
      { text: "(bearer token to your backend)" },
    ],
  },
};

export const commandCards = [
  {
    cmd: "add stripe --replace",
    desc: "Slot in one more technology, or swap a single-select category. Infers what it's replacing from the project itself.",
    out: "✔ replaced revenuecat → stripe\n  12 files updated, 3 removed",
  },
  {
    cmd: "upgrade",
    desc: "Refresh rules, prompts and docs to the current version using the selection the project already has.",
    out: "✔ 4 updated · 31 already current\n  ℹ 2 newer AI tools available",
  },
  {
    cmd: "review",
    desc: "Static, AI-oriented pass over a generated project across architecture, security, performance and DX.",
    out: "✖ .env exists but is not gitignored\n! eslint-disable at src/lib/analytics.ts:12",
  },
  {
    cmd: "analyze",
    desc: "Works on any repo, generated or not — infers the stack from dependencies, and names its evidence.",
    out: "◆ Next.js — high confidence\n  Architecture 70/100",
  },
  {
    cmd: "doctor --for startup-mvp",
    desc: "Checks this machine before you spend a wizard run finding out the hard way.",
    out: "✔ Node 20.11  ✔ Git  ✔ npm\n! Xcode not found (informational)",
  },
];

export const audienceCards = [
  {
    job: "Ship it this weekend",
    body: "One preset, one command, and the assistant already knows your stack. No afternoon spent writing rules files by hand.",
  },
  {
    job: "Standardise a team",
    body: "Everyone's assistant reads the same rules whether they're on Cursor, Cline or Copilot. Check the config into git and it stays that way.",
  },
  {
    job: "Spin up client repos",
    body: "Same scaffolding every time, deterministic output, and a cost estimate you can paste into a proposal.",
  },
  {
    job: "Stop hand-writing rules",
    body: "You already wrote a .cursorrules once. This generates the equivalent for eight tools, per technology, and upgrades them in place.",
  },
];
