# Cover prompt — paste this into Claude together with `DASHBOARD_BRIEF.md`

---

You are a senior product designer. I need the signed-in **Pro dashboard** for
`ai-project-bootstrap` designed end to end — production-quality work, not
rough wireframes.

**`DASHBOARD_BRIEF.md` is attached and is the authoritative spec.** It
contains the product context, the account model, screen-by-screen
requirements, the real API contract, every state that needs designing, and the
existing design system with its exact tokens and reusable components. Read all
of it before doing anything. Where the brief and your instincts disagree, say
so — don't silently pick one.

## Work in two phases. Do not skip phase 1.

**Phase 1 — Clarify.** Read the brief, then reply with your questions in a
**single batched message**. §11 of the brief seeds eight I already know are
open; add every one of yours. I would far rather answer twenty questions now
than rebuild a designed dashboard later, so ask about anything ambiguous,
underspecified, or contradictory — including decisions in the brief you think
are wrong. **Do not begin designing until I have answered.**

**Phase 2 — Design.** Once I've answered, produce the screens below.

## Deliverables, in priority order

1. **Chat** — the centrepiece and the reason anyone pays. Message list with
   markdown and per-code-block copy buttons, the structured "proposed stack"
   panel, thinking indicator, composer, empty state with suggested prompts,
   and the reset flow.
2. **Connect your editor** — the MCP setup screen. This is where the
   "same conversation on the site and inside Claude Code" promise is kept;
   make that continuity legible, not a footnote.
3. **Auth** — magic-link sign-in/sign-up and every interstitial (check your
   inbox, expired link, already-used link).
4. **Settings** — account, license key, billing, usage, preferences.
5. **Saved stacks** — list and detail.
6. **The dashboard shell** — nav, account menu, and how it relates to the
   existing marketing-site nav.

## Output format

- An **interactive artifact I can click through** — either one navigable
  prototype or a set of screens, your call, whichever communicates better.
- **Use the real design tokens** from brief §9 (`--paper`, `--ink`,
  `--accent`, the terminal palette, etc.). Never hardcode a hex value.
- **Light and dark mode, both.** The site already supports both and the
  toggle lives in the nav.
- **Desktop and mobile** layouts for every screen.
- **Show the important states, not just the happy path** — brief §8 lists
  them. Empty, loading, error, rate-limited, and lapsed-subscription states
  are where this design will actually be judged.
- **Label every screen** with its `[LIVE]` / `[NEEDS API]` / `[DESIGN-AHEAD]`
  marker from brief §3, so it's obvious what can ship now versus what needs
  backend work first.

## Non-negotiables

- **Extend the existing design system; do not invent a new one.** This
  dashboard must look like the same product as the marketing site. Reuse the
  listed components rather than redrawing them.
- **Don't design anything the API can't support.** The brief marks what
  exists. Most notably: the chat API does not stream, so no "stop generating"
  button. If you want something that needs a new endpoint, mark it clearly
  rather than implying it works.
- **Respect the three cost buckets.** Flat, usage-based, and no-data are kept
  separate on purpose — never merge them into one total.
- **Match the product's voice: plain, technical, no overclaiming.** No
  growth-hack patterns, no fake urgency, no metrics theatre. The audience is
  developers who chose this tool specifically because it doesn't do that.

## Quality bar

Treat this as a real product surface a paying developer will use weekly, not
a portfolio piece. Density and clarity over decoration; every element should
earn its place. The chat screen in particular should feel as considered as the
best AI chat interfaces you know — that comparison is the bar, and it's
explicitly what I'm after.

**Start with your questions.**
