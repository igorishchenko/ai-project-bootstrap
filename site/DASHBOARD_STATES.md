# Dashboard: what's wired, and what isn't

The dashboard talks to `ai-project-bootstrap-cloud` directly from the browser.
That is what the backend is built for: its CORS allow-list is exactly
`APP_BASE_URL` with `credentials: true`, and the session cookie it sets is
same-site with this app (`localhost` in dev, one registrable domain in
production). A Next route-handler proxy would add a hop and buy nothing.

The consequence is deliberate: the session cookie belongs to the API's origin,
so the Next server cannot read it. Every dashboard screen loads its data
client-side and shows the loading and empty states the design specifies.

## Running it

```bash
cp .env.example .env.local
```

`NEXT_PUBLIC_API_URL` defaults to `http://localhost:8787`. The backend's
`APP_BASE_URL` must be this site's origin, or CORS rejects every call and
magic links point at the wrong host.

In local development the backend prints sign-in links to its own log instead of
emailing them — it keys off `APP_BASE_URL` starting with `http://`.

## Wired to the API

| Screen | Endpoints |
| --- | --- |
| Auth | `POST /v1/auth/request-link`, `POST /v1/auth/verify`, `POST /v1/auth/signout` |
| Shell | `GET /v1/me` — email, display name, plan and subscription status |
| Chat | `GET /v1/chat`, `POST /v1/chat`, `POST /v1/chat/reset` |
| Connect | `GET /v1/license` — key, mask, and the real last-used status line |
| Settings → Account | `PATCH /v1/me`, `POST /v1/me/email`, `POST /v1/me/email/confirm`, `DELETE /v1/me` |
| Settings → License key | `GET /v1/license`, `POST /v1/license/rotate` |
| Settings → Billing | subscription status only, from `GET /v1/me` |

Two routes exist purely to receive the backend's emails:

- `/auth/verify?token=…` — exchanges a magic-link token for a session, and
  renders the expired / already-used interstitials from `LINK_EXPIRED` and
  `LINK_CONSUMED`.
- `/settings/confirm-email?token=…` — confirms one half of an email change.
  Unauthenticated on purpose: the new address cannot sign in yet.

### Behaviour worth knowing

- **No streaming.** `POST /v1/chat` returns the whole reply, so there is a
  thinking indicator and no Stop button. The simulated stream in the earlier
  design pass is gone.
- **The 402 is ambiguous by design.** Chat endpoints will not tell an
  unauthenticated caller whether a key is unknown or a subscription lapsed. The
  dashboard picks its banner from `GET /v1/me` instead, which it is entitled to
  do because the session proves account ownership.
- **Cost buckets are computed locally.** The API returns module ids, not
  prices, so the three buckets come from `data/catalogue.json`. Modules are
  resolved by id rather than by category name — the model returns
  `framework: "nextjs"` where the catalogue files Next.js under `web`, and
  matching on category dropped it silently.
- **Deleting an account is refused while a subscription is active.** The server
  returns 409 `SUBSCRIPTION_ACTIVE` because deleting the row would not stop the
  billing. The copy says so up front.

## Not wired — no endpoint exists

| Area | What's missing |
| --- | --- |
| Saved stacks | No endpoint at all. `/stacks` is entirely fixtures. |
| Save to my stacks | The chat panel button is disabled and marked. |
| Past threads | `/v1/chat/reset` archives, but nothing lists or reopens archived threads. |
| Usage counts | Both limits are enforced; nothing reports the current count. |
| Invoices, billing portal | Only the Stripe webhook exists, which is what keeps the status current. |
| Email preferences | Toggles are local and store nothing. |
| Subscribe / checkout | No checkout endpoint; the CTA points at `/pricing`. |

## `?state=` review mode

Screens still fall back to fixtures when `?state=` is present, so states that
are hard to produce on demand stay reviewable. Without it, screens are live.

- `/chat?state=` — `thread`, `empty`, `loading`, `streaming`, `e422`, `e429`,
  `e402`, `unsub`, `offline`
- `/connect?state=` — `ok`, `stale`, `never`, `lapsed`
- `/stacks?state=` — `list`, `empty`, `lapsed` (always fixtures)
- `/settings?state=` — `active`, `pastdue`, `canceling`, `lapsed`, combined
  with `?tab=account|key|billing|usage|prefs`
- `/login?state=` / `/register?state=` — `sent`, `expired`, `used`, `session`,
  `onboard`, `nosub`

In review mode the write actions are disabled rather than firing at the API.
