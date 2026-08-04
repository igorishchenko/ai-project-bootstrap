# {{projectName}} — project baseline

How to work in this codebase. Read this before any other skill.

## Stack

{{#each stack}}- **{{label}}**: {{#each modules}}{{name}}{{#unless @last}}, {{/unless}}{{/each}}
{{/each}}

There is a skill in `.claude/skills/` for each of these. Read the one matching
the layer you are about to touch — it documents the wrapper this project
expects you to use and the mistakes that are easy to make with that SDK.

## Working method

1. **Read before writing.** Open a sibling implementation of whatever you are
   about to add. Match its structure, naming and error handling.
2. **Check the docs.** `docs/architecture.md` for how layers fit together,
   `docs/coding-standards.md` for how code should read, `docs/setup.md` for how
   anything is configured.
3. **Change one thing.** Make the requested change; mention anything else you
   noticed rather than bundling it in.
4. **Verify.** Run lint, typecheck and tests before you report a task done, and
   say plainly if something fails.

## Hard rules

- Configuration comes from environment variables, documented in `.env.example`.
  Adding one means documenting it in the same change.
- No `any`, no `@ts-ignore`, no disabled lint rules to get past an error.
- No secret, token, or key in source, in logs, or in an error report.
- Third-party SDKs are used through this project's wrapper, never imported
  directly into a component.
- Behaviour changes come with tests (`docs/testing.md`).

## When you are unsure

Say so, and state the options. A wrong guess that looks confident costs more
time than a question — particularly for anything touching payments, auth, data
migration, or a third-party dashboard you cannot see.
