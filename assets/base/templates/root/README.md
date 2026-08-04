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
npm run setup     # git init, .env, install, format — safe to re-run
npm run doctor    # what is still missing, and where it is documented
```

`doctor` lists every required environment value you have not set yet and links
each one to the section of [docs/setup.md](docs/setup.md) that explains it.
Re-run it as you work through the guide; it turns a long setup document into a
punch list.

## Start here

Read in this order. Each step assumes the one before it.

| # | Read | Why |
| --- | --- | --- |
| 1 | [docs/setup.md](docs/setup.md) | Get the project running. One section per technology: install, configure, credentials, troubleshooting |
| 2 | [docs/architecture.md](docs/architecture.md) | How the pieces fit together and how data moves between them |
| 3 | [docs/coding-standards.md](docs/coding-standards.md) | How code in this project is expected to read |
| 4 | [docs/testing.md](docs/testing.md) | What kind of test a given change needs |
| 5 | [CLAUDE.md](CLAUDE.md) | Point your AI assistant at this before it writes anything |

Then, when the time comes: [docs/deployment.md](docs/deployment.md),
[docs/release.md](docs/release.md), and the `checklists/`.

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

Point it at [CLAUDE.md](CLAUDE.md) first — or [AGENTS.md](AGENTS.md) for tools
that look for that name. It says where the rules live, what to read before which
kind of change, and what it must never do.

For a specific task, start from the matching file in `prompts/` rather than a
blank message:

| Task | Prompt |
| --- | --- |
| Add a feature | `prompts/create-feature.md` |
| Add a screen | `prompts/create-screen.md` |
| Add an endpoint | `prompts/create-api.md` |
| Add a reusable hook | `prompts/create-hook.md` |
| Fix a bug | `prompts/fix-bug.md` |
| Write tests | `prompts/write-tests.md` |
| Review a change | `prompts/review-code.md` |
| Investigate slowness | `prompts/performance.md` |
| Prepare a release | `prompts/release.md` |

`.cursor/rules/` and `.claude/skills/` are not documents you read — Cursor and
Claude load them automatically and they shape how code gets written.

## Regenerating

The generator can rebuild the scaffolding from the saved answers:

```bash
npx create-ai-project --config ai-project.config.json --out .
```

This overwrites generated files, so commit your work first.
