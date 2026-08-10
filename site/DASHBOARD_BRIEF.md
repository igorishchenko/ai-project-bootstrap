# Design brief — ai-project-bootstrap Pro dashboard

**You are designing the signed-in dashboard for ai-project-bootstrap.**

Read this whole brief before designing anything. Every technical claim in it
was checked against the actual source of both repositories, not recalled from
memory. §12 asks you to come back with questions before designing — please
take that seriously; it is not a formality.

---

## 1. What the product is

`ai-project-bootstrap` is an npm CLI that scaffolds the *AI-assistant-facing*
layer of a software project. You tell it your stack; it writes the rules,
docs, prompts and checklists that Cursor / Claude Code / Copilot / Cline /
Roo / Continue / Gemini CLI / Codex read, so your assistant understands your
repo instead of guessing at it.

Verified counts (checked against `config/`, `technologies/`, `features/`,
`archetypes/`):

| Thing | Count | Examples |
|---|---|---|
| Technology modules | 35 | supabase, nextjs, expo, stripe, clerk, sentry, posthog |
| Technology-selection categories | 16 | backend, auth, database, payments, analytics, testing… |
| Presets (curated stacks) | 3 | `startup-mvp`, `web-saas`, `enterprise` |
| Archetypes (full app starters) | 1 | `habit-tracker` |
| Implementable features | 3 | `authentication`, `payments`, `push-notifications` |
| AI tools receiving rules | 8 | see below |
| Modules with a flat price estimate | 9 | |
| Modules that are usage-based priced | 7 | |

**The eight AI tools** — seven are selectable in the wizard (`cursor`,
`claude`, `copilot`, `gemini-cli`, `continue`, `cline`, `roo`); the eighth,
**OpenAI Codex**, needs no toggle because it reads `AGENTS.md`, which is
written unconditionally. Each tool gets rules in its own native location
(`.cursor/rules/*.mdc`, `.claude/skills/*/SKILL.md`,
`.github/copilot-instructions.md`, `.clinerules/`, `.roo/rules/`,
`.continue/rules/`, `AGENTS.md`, `GEMINI.md`) rendered from **one** source
file per technology, so no two tools can quietly disagree.

**CLI commands** (all free, all local, all MIT): the wizard (default), `add`,
`upgrade`, `implement`, `review`, `analyze`, `doctor`.

### The free/paid line — the product's spine, never blur it

Everything that runs on the user's machine is free, MIT-licensed,
offline-capable, and keeps working forever whether or not they ever pay.

**Pro ($15/month, or $149/year) buys exactly one thing: hosted AI that runs
on the maintainer's own API budget.** Today that means `--idea` (propose a
stack from one sentence), plus the new chat and MCP assistant. There is no
free tier of the paid feature and no trial, deliberately — every call spends
real money, and the pricing page defends this position explicitly.

---

## 2. Who is signed in, and why they bothered

A developer who pays $15/month. They already have the CLI working locally
**without an account**. The only reason they signed in is the hosted AI and
the things only a server can hold: the conversation, the key, the
subscription.

Design for that. **This is not a place they will hang out.** It is a place
they come to think through a stack, grab a command, and leave — then come
back three weeks later when the next project starts.

Do not design a "welcome to your dashboard" landing page with vanity metrics
and activity feeds. There is no activity to feed. The highest-value screen is
the chat; the second is the one that gets the assistant into their editor.

---

## 3. Build-status legend — mark every screen you design

Most of this dashboard does not exist yet. Marking status stops a screen that
needs months of backend from looking one commit away from shipping.

| Marker | Meaning |
|---|---|
| `[LIVE]` | API exists today, tested and callable right now |
| `[NEEDS API]` | Design it, but a specific new endpoint must be built first |
| `[DESIGN-AHEAD]` | Direction agreed, backend not designed at all yet |

---

## 4. Registration & account model `[NEEDS API]`

### 4.1 The model: email + magic link

**No passwords. No OAuth.**

> ⚠️ The existing `/login` and `/register` pages
> (`site/components/auth/AuthForm.tsx`) show "Continue with GitHub", "Continue
> with Google" and a password field. They are **entirely non-functional** —
> the submit handler is a `setTimeout`. These are being **replaced, not
> implemented.** Do not carry them forward.

The rationale, worth preserving in the copy: the license key already arrives
by email, so email is already the proven, trusted channel. Adding a password
would invent a second, weaker secret to protect the same thing.

### 4.2 The flows

**Signing up has an unresolved ordering problem — see question 1 in §11.**
Today, paying creates a license; there is no account at all. Two orderings
are possible:

- **(A) Pay first.** Checkout → key emailed → user later claims an account
  with the same email. Closest to today's backend, but the dashboard has no
  signed-out-but-interested state.
- **(B) Account first.** Sign up → land in an unsubscribed dashboard →
  subscribe from inside it. Better funnel and a much more natural place to
  put a "Subscribe" CTA, but more backend and it needs a designed
  *unsubscribed* dashboard state.

**Signing in:** one email field → "check your email" → click link → signed in.
Design all four states: the form, the check-your-inbox interstitial, the
success landing, and the expired-or-already-used link error.

**Session:** long-lived (30 days is a reasonable default — confirm). Sign out
available everywhere. Active sessions/devices list is `[DESIGN-AHEAD]`.

### 4.3 Exactly what to collect — and nothing more

| Field | When | Required | Why |
|---|---|---|---|
| Email | Signup | Yes | The only identifier, and the delivery channel |
| Display name | Post-signup | No | Greeting only. Must be skippable. |
| Billing country / postcode | Checkout | Yes | Collected **by Paddle** for tax — never by us |

**Deliberately not collected:** company, job title, team size, phone number,
"how did you hear about us". The product's entire voice is anti-dark-pattern
— the pricing page leads with "No account, no key, no telemetry." A signup
form that interrogates the user actively contradicts the thing being sold. If
a field is wanted for analytics, it must be optional and visibly skippable.

One optional post-signup question is worth it, on its own skippable screen:
**"What are you building?"** — genuinely useful, because it can seed the
first chat message rather than facing the user with an empty box.

### 4.4 License key lifecycle `[NEEDS API]`

Today the key is shown exactly once, in an email, and is **unrecoverable if
lost** (`sendLicenseEmail.ts` says so in as many words). With accounts, the
dashboard becomes where it lives. Design:

- **Reveal** — masked by default (`apb_live_••••••••4f2a`), click to reveal,
  one-click copy
- **Rotate** — issue a new key and invalidate the old one, with an unambiguous
  warning that **every machine using the old key breaks immediately**
- **What it unlocks**, in plain language: `--idea`, web chat, MCP. Nothing
  local. Nothing that already works stops working.
- Once the dashboard can show the key, stop emailing the full key

---

## 5. Information architecture

```
/app                          Dashboard shell (signed in)
├── /app                      Chat              ← default landing screen
├── /app/connect              Connect your editor (MCP + CLI key)
├── /app/stacks               Saved stack configs
│   └── /app/stacks/:id       One saved stack
└── /app/settings
    ├── /app/settings             Account (email, name, delete)
    ├── /app/settings/key         License key
    ├── /app/settings/billing     Subscription & invoices (Paddle)
    ├── /app/settings/usage       Usage against limits
    └── /app/settings/preferences Theme, email preferences
```

**Chat is the index route, not a tab.** Signing in should drop the user
straight into the conversation they left. Anything else is a detour on the
way to the only thing they are paying for.

Marketing pages (`/`, `/docs`, `/catalogue`, `/commands`, `/pricing`) stay
outside this shell. One related cleanup: the docs sidebar currently has a
**fake** signed-in toggle (`site/components/docs/SectionSidebar.tsx` — it
literally renders "Signed in — Ada Lovelace" from local state). Once real auth
exists, that becomes genuine, and the `signedInOnly` "Your licence key" docs
page appears for real.

---

## 6. Screen specifications

### 6.1 Chat `[LIVE]` — the centrepiece

The backend is **built, tested and working**. This is the one screen you can
design against a real API today.

**What it is:** an open-ended conversation with a stack advisor that knows the
entire 35-module catalogue, argues about tradeoffs, answers cost questions,
and — when the conversation converges — emits a *validated* stack plus the
exact command to generate it. Any stack it proposes is run through the same
validation the CLI uses, so it cannot propose a combination that would fail
to build.

**One thread per user.** Not a multi-conversation inbox — no thread list, no
titles, no search. "Keep talking after the first proposal" is the mental
model. Starting a new chat **archives the old one, which then becomes
permanently unreachable** — there is no UI, and no API, to read it again.
Design the confirmation step to be honest about that rather than implying a
recoverable history.

**Message list**
- User and assistant turns visually distinct, oldest at top
- Assistant content is **markdown** — headings, lists, inline code, and fenced
  code blocks. It frequently contains a JSON config block and a shell command.
  **Every code block needs its own copy button.** Not optional: hand-selecting
  a command out of a chat bubble is precisely the failure this feature exists
  to remove.
- Preserve scroll position when loading history; jump to newest on send

**Thinking indicator.** Real LLM latency, several seconds. Claude-style
animated indicator, not a spinner.

> ⚠️ **The API does not stream.** `POST /v1/chat` returns the complete reply
> in a single response. Claude-style token-by-token streaming — and therefore
> any working "Stop generating" button — **requires a new SSE endpoint that
> does not exist** `[NEEDS API]`. Design the non-streaming version as the
> shippable one. You may show a streaming variant as a clearly-marked future
> state, but **do not design a Stop button that cannot function.**

**The proposal panel — the differentiating idea.** When the assistant proposes
a stack, the response carries a structured `proposal` object *alongside* the
prose. The prose already contains a readable rendering, but the structured
data lets you do far better than a wall of text:

- A distinct "Proposed stack" card, clearly separated from the conversation
- Category → module rows (`backend → Supabase`, `payments → RevenueCat`)
- **Cost summary — and this needs real care.** The CLI deliberately splits
  costs into three buckets — *flat estimate*, *usage-based*, and *no pricing
  data* — and **refuses to blend them into one number**, because a missing
  price is not $0 and a usage-based service has no honest flat figure. This is
  a documented, load-bearing product principle (`src/core/pricing.ts`).
  Honour it visually. **Never show a single total that silently swallows
  usage-based or unpriced services.**
- Two copy actions: the `ai-project.config.json` body, and
  `npx ai-project-bootstrap --config ai-project.config.json`
- "Save to my stacks" (§6.3)

On wide screens, consider a Claude-artifacts-style side panel with the
conversation narrowing beside it; inline and collapsible on mobile.

**Empty state.** A genuine first-run moment that deserves real design, not a
grey box. Offer 3–4 suggested opening prompts drawn from what the tool
actually does:
- *"I'm building a habit tracker with sign-in and paid reminders"*
- *"What changes if I bill through the App Store instead of cards?"*
- *"Cheapest stack that still has auth and payments"*

If the user answered "what are you building" at signup, seed it here.

**Composer.** Multiline. Enter sends, Shift+Enter newline. Disabled in flight.
(No message length limit is enforced today — see question 5 in §11.)

**Keyboard shortcuts**, Claude-Code-flavoured. Note `⌘K` is **already** the
docs search shortcut on this site — stay consistent with it rather than
reassigning it.

### 6.2 Connect your editor `[LIVE]`

The landing page promises *"the same conversation on this site and inside
Claude Code over MCP."* The backend genuinely delivers this — both surfaces
read and write the same Postgres thread, and there is a passing test that
proves a message sent over MCP appears in the web chat's history.

**This screen is where that promise is kept, and it is the second most
important screen in the product.**

- The exact, copyable command with the user's real key substituted:
  ```
  claude mcp add --transport http ai-project-bootstrap \
    https://<host>/mcp --header "Authorization: Bearer <key>"
  ```
- What the assistant can do once connected (one `chat` tool today)
- **Sell the thread continuity visually.** Ask a question in Claude Code, see
  it here; continue it from either side. This is genuinely unusual — a small
  two-panel diagram would carry it better than a paragraph.
- Connection status: "Connected — last used 4 minutes ago" `[NEEDS API]`
  (requires recording an MCP last-seen timestamp; small, but not built)
- Also here: setting `AI_PROJECT_BOOTSTRAP_LICENSE_KEY` for the CLI's
  `--idea`, with both shell-profile and `.env` variants
- Troubleshooting: what a 402 means, what a 429 means

### 6.3 Saved stacks `[NEEDS API]`

Stores **stack configurations only** — a small JSON selection
(`{ projectName, choices }`). **Never source code, never anything read from
the user's machine.** The CLI stays fully local and offline; nothing phones
home. This constraint is load-bearing for the product's honesty (the pricing
page promises "no telemetry") and must survive into the design's copy.

- List: name, module summary, cost estimate, saved date
- Detail: full category → module breakdown, the three-bucket cost split, the
  `--config` command, copy/download the raw JSON
- Created from either a chat proposal ("Save to my stacks") or built by hand
- **Reuse the existing `StackBuilder` component**
  (`site/components/landing/StackBuilder.tsx`). It already does interactive
  category/module selection, live cost computation, command generation, and
  localStorage persistence — signed in, it should persist server-side instead.
  **Extend it; do not redesign it from scratch.**
- Empty state pointing at both routes into it

### 6.4 Settings

**Account** `[NEEDS API]` — email (with a change-email flow verifying both old
and new addresses), display name, delete account. The delete confirmation
should state plainly that **deleting the account does not touch locally
generated projects**, because it genuinely doesn't — they are ordinary files
on the user's disk under an MIT licence.

**License key** `[NEEDS API]` — as specified in §4.4.

**Billing — Paddle** `[NEEDS API]`

> **Migration note.** The backend today implements **Stripe**
> (`src/routes/stripeWebhook.ts`, 8 passing tests, a `stripe` dependency, and
> required `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` env vars that fail
> the server's boot check when missing). Site copy names Stripe in
> `site/content/pricing.ts` (including the "How do I pay?" FAQ) and in the
> docs. Moving to Paddle replaces all of it. **Design impact is small; backend
> and copy impact is not.**

Paddle is a **Merchant of Record** — Paddle is legally the seller and remits
VAT/sales tax globally. User-visible consequences the design must reflect:

- Invoices and receipts come from **Paddle**, not from you
- **Paddle appears on the customer's card statement.** Say so before checkout
  or you will generate "what is this charge?" support email
- Tax may be added or included depending on the buyer's country — the flat
  "$15" on the pricing page may need "+ VAT where applicable", or localised
  pricing
- Paddle can render checkout as an **overlay on your own site** rather than a
  full redirect, which would be better than the current "sends you off-site to
  Stripe" copy. See question 4 in §11.

Screen contents: plan, price, renewal date, status (active / past due /
canceled), payment method summary, invoice list, and a **"Manage billing"
button deep-linking to Paddle's hosted customer portal** for card changes and
cancellation. **Do not design a custom card form.**

> Whoever builds this: verify exact Paddle event names and the portal-session
> API against Paddle's current documentation. Do not trust names quoted from
> memory — including any in this brief.

Design the **past-due** and **canceled** states too, not just the happy path —
see the 402 note in §7 for why the user genuinely cannot tell which state they
are in from the chat screen alone.

**Usage** `[NEEDS API]` — messages used against the **200/day per-key** limit
(this limit is real and enforced today), plus `--idea` proposals this period.
Frame it as transparency, **not** as a meter engineered to upsell — there is
no higher tier to upsell to, by design.

**Preferences** `[DESIGN-AHEAD]` — theme (a light/dark toggle already exists
site-wide and must be preserved), product and security email preferences.

---

## 7. The real API contract

Transcribed from the implementation in `ai-project-bootstrap-cloud/src/`.
Everything marked `[LIVE]` is tested and working today.

**Auth:** every endpoint below takes `Authorization: Bearer <license-key>`.
Keys are `apb_live_` followed by 32 URL-safe base64 characters (41 total),
e.g. `apb_live_EXAMPLEONLYnotarealkey0000000000`.

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/health` | — | `{ status: 'ok' }` — no auth |
| `GET` | `/v1/chat` | — | `{ conversationId: string \| null, messages: Message[] }` |
| `POST` | `/v1/chat` | `{ message: string }` | `{ conversationId, reply: string, proposal?: Proposal }` |
| `POST` | `/v1/chat/reset` | — | `{ reset: true }` |
| `POST` | `/v1/propose-stack` | `{ idea: string }` | `{ preset, suggestedName?, reasoning? }` |
| `ALL` | `/mcp` | JSON-RPC | MCP Streamable HTTP; one tool, `chat` |

```ts
Message  = { role: 'user' | 'assistant'
             content: string
             proposal?: Proposal
             createdAt: string }

Proposal = { preset: { id: string
                       name: string
                       description: string
                       choices: Record<string, string | string[]> }
             suggestedName?: string
             reasoning?: string }
```

**Errors** — shape `{ error: { code, message, hint? } }`:

| Status | Code | Means | Design as |
|---|---|---|---|
| 400 | `INVALID_CONFIG` | Blank or missing message | Prevent client-side |
| 402 | `LICENSE_REQUIRED` | Missing / unknown / inactive key | Re-auth or resubscribe |
| 422 | `IDEA_REQUEST_FAILED` | Model or network failure | **Retryable** — thread is intact |
| 429 | *(none)* | Rate limited | `{ statusCode, error: 'Too Many Requests', message: 'Rate limit exceeded, retry in <n>' }` |
| 500 | `INTERNAL_ERROR` | Unexpected | Generic apology |

**Rate limits, both real and enforced:** 20 requests/hour per IP globally;
**200 requests/day per license key** on chat and MCP.

> 🔐 **A deliberate security property — do not "fix" it in the design.**
> A 402 is returned **identically** whether the key is missing, unknown,
> canceled, or past-due. The API will not tell an unauthenticated caller
> which, on purpose: it does not distinguish "wrong key" from "expired
> subscription" to someone who has not proven they own the account.
>
> So chat-side error copy **cannot** say "your subscription expired" — it must
> cover both possibilities without guessing. Once the user is signed in to the
> *dashboard* (a separate, authenticated context), the billing page can and
> should state the real status plainly. That asymmetry is intentional and the
> design should respect it.

---

## 8. Every state to design

**Chat:** first-ever empty · loading history · populated · sending · replied ·
replied-with-proposal · 422 retryable error · 429 rate-limited · 402 auth lost
mid-session · reset confirmation · post-reset empty · offline.

**Auth:** signed out · email submitted / check inbox · link expired · link
already used · signed in · session expired mid-action.

**Subscription:** active · past due · canceled but still inside the paid
period · fully lapsed · never subscribed (only if flow (B) in §4.2 is chosen).
When lapsed, the dashboard should **degrade honestly** — chat off, but key and
billing still reachable so the user can actually fix it.

**Cross-cutting:** loading skeletons, empty states, network failure, mobile
layout for every screen, keyboard-only navigation, and screen-reader
behaviour for the chat log. Use `aria-live` judiciously — a transcript that
announces every update is worse than one that announces none.

---

## 9. Design system — reuse, don't reinvent

The dashboard is the same product as the marketing site and must look like it.
Everything needed already exists in `site/`:

- **Tokens** — `site/styles/tokens.css`: `--paper`, `--surface`, `--raised`,
  `--ink`, `--muted`, `--faint`, `--line`, `--accent`, `--accent-soft`,
  `--signal`, `--signal-soft`, plus a terminal palette (`--term`,
  `--term-ink`, `--term-blue`, `--term-green`, `--term-orange`,
  `--term-prompt`). **Light and dark are both fully defined. Use these; never
  hardcode a hex value.**
- **Type** — Space Grotesk (headings), IBM Plex Sans (body), IBM Plex Mono
  (code/terminal), already wired up in `app/layout.tsx`.
- **Components to reuse** — `Terminal`, `NavBar`, `Hatch`, `InstallButton`,
  `TierCard`, `PageShell`, `PageHeader`, `Reveal`, `StackBuilder`, `Logo`.
- **Motion** — `[data-reveal]` and `[data-lift]` conventions exist globally,
  and `prefers-reduced-motion` is already fully honoured in `globals.css`.
  Keep both.
- **Dark mode is not optional.** The whole site supports it; the toggle lives
  in the nav.

The established aesthetic is **paper-and-terminal**: warm off-white, hairline
rules, monospace for anything machine-shaped, restrained accent colour, prose
that never oversells. The dashboard should look like the same hand drew it.

In particular, `site/components/landing/ChatSection.tsx` — the scripted fake
chat on the landing page — already establishes the visual language for a chat
window in this design system. Study it, then make the real one better.

---

## 10. Out of scope

Multi-thread chat history · teams, seats, or multi-user anything (the pricing
page explicitly commits to one tier, one person) · in-browser code generation
(the CLI always generates locally) · CLI telemetry or project sync · a second
paid tier · admin tooling · native mobile apps.

---

## 11. Open questions I already know about

Seeded, not exhaustive. **Add to this list rather than guessing.**

1. **Signup ordering — pay-first or account-first?** (§4.2) Changes the whole
   funnel and determines whether an unsubscribed dashboard state needs
   designing at all.
2. **Does the dashboard replace the license key for web use?** If chat and MCP
   could authenticate by session instead of a pasted key, the key becomes
   CLI-only — cleaner, but is it wanted?
3. **Is streaming worth a new SSE endpoint** for the Claude-like feel, or is
   the non-streaming version acceptable for v1?
4. **Paddle overlay or redirect checkout?** Changes the pricing page's flow
   and its current "sends you off-site" copy.
5. **Should there be a message length limit?** None is enforced today.
6. **Should archived chat threads ever be readable?** Today, reset makes them
   permanently unreachable. Acceptable, or is history wanted later?
7. **Session length**, and whether to show and revoke active devices.
8. **What happens to saved stacks if the subscription lapses?** Read-only,
   hidden, or exportable-then-deleted?

---

## 12. Please ask questions — this is a real request, not boilerplate

**If anything here is unclear, ambiguous, underspecified, or seems to
contradict something else — stop and ask before designing it.**

The goal is to be **99.9% certain about requirements before design work
begins.** A question costs one message. A wrong assumption costs a redesign,
and worse, tends to survive into the shipped product, because by the time
anyone notices it looks deliberate.

Ask when:
- A screen's purpose or relative priority is unclear
- You cannot tell whether something is `[LIVE]`, `[NEEDS API]` or `[DESIGN-AHEAD]`
- A flow has an edge case this brief failed to name
- Something here contradicts the existing site, or the API contract in §7
- **You think a decision recorded here is wrong.** The choices in §4 were made
  deliberately, but they were made without a designer in the room. Push back.
- You need real content, real numbers, or real copy to design honestly

**Do not fill gaps with plausible-looking invented functionality.** This
product's entire voice is built on not overclaiming — the docs literally ship
a page stating which licensing decisions have *not* been made yet, rather than
guessing at them. A design that invents features the backend cannot support is
off-brand in a way that is genuinely hard to unwind later.

**Start by reading this brief and coming back with your questions. Design
after they are answered.**
