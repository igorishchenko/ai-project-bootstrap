# Localization (i18n)

How translated text works in {{projectName}}.

## Every user-facing string goes through `t()`

```tsx
import { useTranslation } from 'react-i18next';

function Welcome({ name }: { name: string }) {
  const { t } = useTranslation();
  return <Text>{t('common.welcome', { name })}</Text>;
}
```

A hardcoded string never appears in any locale but the one whoever wrote it
was looking at — there is no lint rule catching this today, so it is a
review-time check, not an automated one.

## Interpolation uses single braces, deliberately

i18next's normal default interpolation delimiter is the double-brace
syntax this project's own generator already claims for its own templates
at generation time. To avoid the two colliding, `src/i18n/index.ts`
configures a single-brace `prefix`/`suffix` instead, and every locale file
follows suit — `{name}`, `{count}`. This is a real, supported i18next
option, not a workaround bolted on afterward — but it means an example
copied from i18next's own docs needs its interpolation braces reduced from
two to one before it will interpolate anything.

## Adding a language

1. Add `src/i18n/locales/<code>.json`, copying `en.json`'s exact key shape.
2. Register it in the `resources` object in `src/i18n/index.ts`.
3. Translate every key — a missing one silently falls back to English for
   that locale, which is correct behavior but easy to mistake for "done."

## Plurals

```tsx
t('items', { count: itemCount });
```

picks `items_one` or `items_other` automatically based on `count`. Do not
write `count === 1 ? t('item') : t('items')` — that hardcodes English
pluralization rules, which do not hold for most other languages.
