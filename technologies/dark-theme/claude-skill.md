# Dark Theme

How theming works in {{projectName}}.

## The rule

Every color a component renders comes from `useTheme()` and
`themeTokens[theme]` (`src/theme/tokens.ts`) — never a hardcoded hex value.
A hardcoded color is the single most common way a dark theme implementation
half-works: it looks fine in the mode whoever wrote it was testing in, and
wrong in the other one, and nothing catches it until someone actually
switches.

## Three states

`light`, `dark`, `system` — not a boolean. `system` is the default; a user
switching to light or dark is an explicit override that should persist
(it does, via storage), not something the app resets on the next launch.

## Adding a new color

Add the key to **both** `themeTokens.light` and `themeTokens.dark` in
`src/theme/tokens.ts` at the same time. A key present in only one of the two
objects fails to compile in `dark` mode (or `light` mode) — the type is
`typeof themeTokens.light`, so the two objects are required to match shape.

## Where the flash-prevention logic lives

- **Mobile**: `ThemeProvider` renders `null` until the persisted preference
  loads from storage. Removing that early return brings back a one-frame
  flash of the system theme on every cold start, even when the user chose
  an override.
- **Web**: the theme is applied via a `data-theme` attribute on
  `document.documentElement`, set in an effect. If dark-mode flicker on page
  load becomes a real problem, the fix is an inline script in the document
  head that reads `localStorage` and sets `data-theme` before React
  hydrates — not a change to this provider.
