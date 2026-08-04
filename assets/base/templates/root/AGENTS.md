# AGENTS.md

Conventions for any coding agent working in {{projectName}}.

This file is the tool-agnostic entry point. The full instructions live in
[CLAUDE.md](CLAUDE.md) — read that as well; everything in it applies here.

## Project shape

{{#each stack}}- **{{label}}**: {{#each modules}}{{name}}{{#unless @last}}, {{/unless}}{{/each}}
{{/each}}

## Ground rules

- Documentation in `docs/` is the source of truth. If code and docs disagree,
  say so rather than silently picking one.
- Conventions per technology are in `.claude/skills/` and `.cursor/rules/`.
  Both directories describe the same rules in the format each tool expects.
- Configuration comes from environment variables documented in `.env.example`.
- Run the project's lint, typecheck and test commands before reporting a task
  as finished. They are defined in `package.json`.

## Verifying your work

```bash
npm run lint
npm run typecheck
npm test
```

If a command does not exist yet, say so instead of inventing one.

## Scope

Make the change that was asked for. If you spot something else worth fixing,
mention it rather than folding it into an unrelated change.
