# {{projectName}}

> Scaffolded with `create-ai-project`. The documentation, rules and prompts in
> this repository are the project's shared context — for people and for AI
> assistants alike.

## Stack

| Layer | Technology |
| --- | --- |
{{#each stack}}| {{label}} | {{#each modules}}{{name}}{{#unless @last}}, {{/unless}}{{/each}} |
{{/each}}

## Quick start

```bash
cp .env.example .env   # fill in the values documented in docs/setup.md
npm install
```

Then work through [docs/setup.md](docs/setup.md) top to bottom.

## Where things live

| Path | What it is |
| --- | --- |
| `docs/` | Setup, architecture, testing, deployment, release and coding standards |
| `.cursor/rules/` | Rules Cursor applies automatically while you edit |
| `.claude/skills/` | Skills that teach Claude this project's conventions |
| `prompts/` | Reusable prompts for common tasks |
| `checklists/` | Things to verify before you ship |
| `ai-project.config.json` | The answers this project was generated from |

## Working with an AI assistant

Point it at `CLAUDE.md` (or `AGENTS.md`) first — that file tells it where the
rules live and what it must not do. For a specific task, start from the matching
file in `prompts/`.

## Regenerating

The generator can rebuild the scaffolding from the saved answers:

```bash
npx create-ai-project --config ai-project.config.json --out .
```

This overwrites generated files, so commit your work first.
