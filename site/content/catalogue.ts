// Hand-authored prototype copy ported verbatim from `Catalogue.dc.html`.
export const toolRows = [
  { tool: "Cursor", path: ".cursor/rules/supabase.mdc" },
  { tool: "Claude Code", path: ".claude/skills/supabase/SKILL.md" },
  { tool: "GitHub Copilot", path: ".github/instructions/supabase.instructions.md" },
  { tool: "Continue.dev", path: ".continue/rules/supabase.md" },
  { tool: "Cline", path: ".clinerules/supabase.md" },
  { tool: "Roo Code", path: ".roo/rules/supabase.md" },
  { tool: "OpenAI Codex", path: "AGENTS.md — read directly, no per-tech directory" },
  { tool: "Gemini CLI", path: "GEMINI.md — read directly, no per-tech directory" },
];

export const contractCards = [
  {
    dir: "docs/",
    count: "8 files",
    items: [
      "setup.md",
      "architecture.md",
      "roadmap.md",
      "costs.md",
      "deployment.md",
      "testing.md",
      "coding-standards.md",
      "release.md",
    ],
  },
  {
    dir: "prompts/",
    count: "9 files",
    items: [
      "create-feature.md",
      "create-screen.md",
      "create-api.md",
      "create-hook.md",
      "fix-bug.md",
      "write-tests.md",
      "review-code.md",
      "performance.md",
      "release.md",
    ],
  },
  {
    dir: "root",
    count: "merged",
    items: [
      ".env.example — deduplicated",
      "package.json — semver-resolved",
      "README.md",
      "CLAUDE.md",
      "AGENTS.md",
      "GEMINI.md",
      "ai-project.config.json",
    ],
  },
  {
    dir: "hygiene + CI",
    count: "generated",
    items: [
      "eslint · prettier",
      "husky · lint-staged",
      "commitlint",
      ".editorconfig",
      ".github/ CI workflow",
      "checklists/release.md",
    ],
  },
];

export const architectureFacts = [
  {
    title: "Component diagram",
    body: "A node per resolved module, edges from every declared requires, plus a frontend → backend → database backbone.",
  },
  {
    title: "Sequence diagram",
    body: "Every auth provider ships a real sign-in flow naming that provider — not a placeholder with the name swapped in.",
  },
  {
    title: "Starter ERD",
    body: "If you picked a database. Explicitly a starting point — nothing here scaffolds real tables, and it says so.",
  },
];

export const archetypeCard = {
  command: "--archetype habit-tracker",
  stack: "Expo · Supabase · Supabase Auth · Dark Theme · Jest",
  badge: "1 of 1 today — the contract for adding more is documented",
  dataModel: ["habits", "habit_checkins", "+ Row Level Security", "+ a migration to apply"],
  screens: ["habit list, with streaks", "add habit", "email magic-link sign-in"],
  absent: ["no router — ever, for any project", "no payments, analytics, push", "add them with add when you need them"],
};
