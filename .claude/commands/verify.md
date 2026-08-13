---
description: Run the full pre-PR gate, including generating a real project and running its checks
---

Run the checks this repo actually gates on. Report results; do not fix
anything silently, and do not open a PR unless asked.

## 1. Always

```bash
pnpm lint
pnpm typecheck
pnpm test
```

Run all three even if the first fails — one report beats three round trips.

## 2. If the change can reach generated output

Skip this only when the diff is confined to `src/` internals with no template,
manifest, dependency or script involved. When in doubt, run it.

```bash
pnpm build
rm -rf /tmp/apb-verify
node dist/index.js --out /tmp/apb-verify --config tests/fixtures/ci-full-stack.json
cd /tmp/apb-verify
npm run setup
npm run lint && npm run typecheck && npm test && npm run format:check
```

Then, in that same generated project:

```bash
npm run doctor    # MUST fail — it is an unconfigured project
```

A passing `doctor` there is the bug, not the fix.

If the change targets a specific stack rather than the full-stack fixture, use
the fixture that exercises it (`tests/fixtures/`), and say which one you used.

## 3. If a module manifest or category changed

```bash
pnpm docs:tech-table
git diff --stat README.md   # must be empty; a diff means the table was stale
```

## 4. Report

A short table: check, pass/fail, and for each failure the actual error — not a
paraphrase. If step 2 was skipped, say so and why.
