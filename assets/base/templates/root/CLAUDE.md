# {{projectName}} — instructions for AI assistants

Read this before changing anything.

## What this project is

{{projectName}} is built on:

{{#each stack}}- **{{label}}**: {{#each modules}}{{name}}{{#unless @last}}, {{/unless}}{{/each}}
{{/each}}

## Read these first

| When you're about to… | Read |
| --- | --- |
| Set anything up, or touch configuration | `docs/setup.md` |
| Add a feature, or wire two layers together | `docs/architecture.md` |
| Write any code | `docs/coding-standards.md` |
| Write or change tests | `docs/testing.md` |
| Ship | `docs/release.md` and `checklists/` |

Technology-specific conventions live in `.claude/skills/`. There is one skill
per technology in the stack — read the matching one before touching that layer.

## How to work here

1. **Follow the existing patterns.** Look at a sibling file before inventing a
   structure. Consistency matters more here than your preferred style.
2. **Read the skill before using a library.** Each one documents the wrapper or
   client this project expects you to go through, rather than calling the SDK
   directly from a component.
3. **Environment variables come from `.env`.** Every key is documented in
   `.env.example`. Never hardcode a key, a URL, or a secret — and never add a
   new variable without documenting it in `.env.example` too.
4. **Tests belong with the change.** See `docs/testing.md` for what level of
   test a given change needs.
5. **Ask before restructuring.** Moving folders, renaming modules, or changing
   the build affects everyone. Propose it rather than doing it.

## Never do these

- Never commit `.env`, credentials, API keys, or tokens.
- Never disable a lint rule or a type check to make an error go away — fix the
  cause, or raise it if the rule is genuinely wrong.
- Never use `any` to escape a type problem; model the type properly.
- Never leave secrets, tokens, or personal data in logs or error reports.
- Never edit generated files by hand where a generator owns them.

## Prompts

`prompts/` holds a starting point for common tasks — creating a screen, adding
an API route, fixing a bug, preparing a release. Start there rather than from a
blank message.
