### Overview

Two languages wired up end to end (English and Spanish, as a working
example to extend) — device-locale detection, single-brace interpolation
chosen specifically to avoid colliding with this generator's own
double-brace templating, and i18next's real plural handling instead of a
hand-rolled ternary.

{{#if has.react-native}}
### Install

```bash
npx expo install i18next react-i18next expo-localization
```

`src/i18n/index.ts` reads the device's first preferred language via
`expo-localization` and falls back to English if it isn't one of the
languages this project ships.
{{/if}}
{{#unless has.react-native}}
### Install

```bash
npm install i18next react-i18next i18next-browser-languagedetector
```

`src/i18n/index.ts` uses `i18next-browser-languagedetector`, which checks
`localStorage`, then the browser's `navigator.language`, then falls back to
English — in that order.
{{/unless}}

### Wire it up

Import `src/i18n/index.ts` once, before anything renders — its side effect
is calling `i18next.init()`:

```ts
import './i18n';
```

### Use it

```tsx
import { useTranslation } from 'react-i18next';

function Welcome({ name }: { name: string }) {
  const { t } = useTranslation();
  return <Text>{t('common.welcome', { name })}</Text>;
}
```

### Why the interpolation braces are single, not double

i18next's normal default interpolation delimiter is exactly the syntax this
generator itself uses for `docs/`, rule files, and every other template at
generation time. Shipping locale JSON files with the default delimiter
would mean this generator's own template renderer eats every interpolated
value before the file ever reaches the project — silently, since a missing
value just renders as nothing. `src/i18n/index.ts` reconfigures i18next to
use a single brace instead, and every locale file was written to match. An
interpolation example copied from i18next's own docs needs its braces
reduced from two to one before it will work here.

### Adding a language

1. Add `src/i18n/locales/<code>.json`, copying `en.json`'s key shape exactly.
2. Add it to the `resources` object in `src/i18n/index.ts`.
3. Translate every key — a key present only in `en.json` silently falls back
   to English, which is correct behavior but easy to mistake for "done."

### Plurals

```ts
t('items', { count: itemCount });
```

resolves to the `items_one` or `items_other` key automatically. A hand-rolled
`count === 1 ? t('item') : t('items')` hardcodes English's plural rules,
which most other languages don't share.

### Common mistakes

- **A hardcoded string anywhere user-facing.** It's invisible in every
  locale except the one whoever wrote it was looking at.
- **Restoring the default double-brace delimiter "to match i18next's docs."**
  It collides with this generator's own templating — see above.
- **Adding a key to only one locale file.** Not wrong, but worth doing on
  purpose rather than by accident.

### Production checklist

- [ ] Every user-facing string goes through `t()`.
- [ ] Every locale file has the same set of keys.
- [ ] The app was opened once in each shipped language, not just the
      default.
- [ ] A plural-sensitive string uses `t('key', { count })`, not a ternary.
