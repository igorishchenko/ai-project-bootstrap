### Overview

One `useTheme()` hook, three states — `light`, `dark`, `system` — and a
persisted override that survives a restart. `system` is the default: an app
that ignores the OS setting on first launch is the more common complaint,
not the reverse.

{{#if has.react-native}}
### Install

```bash
npx expo install @react-native-async-storage/async-storage
```

### Wire it up

Wrap the app once, at the root — `App.tsx` or your root layout:

```tsx
import { ThemeProvider } from './theme/ThemeProvider';

export default function App() {
  return <ThemeProvider>{/* the rest of the app */}</ThemeProvider>;
}
```

### Use it

```tsx
import { useTheme } from './theme/ThemeProvider';
import { themeTokens } from './theme/tokens';

function Screen() {
  const { theme, preference, setPreference } = useTheme();
  const colors = themeTokens[theme];

  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.text }}>Current: {preference}</Text>
      <Button title="Dark" onPress={() => setPreference('dark')} />
      <Button title="Match system" onPress={() => setPreference('system')} />
    </View>
  );
}
```

`useColorScheme()` from React Native only reports the *system* setting — it
has no concept of a user override. `ThemeProvider` is what layers the saved
preference on top of it; reading `useColorScheme()` directly anywhere else
in the app bypasses that override.
{{/if}}
{{#unless has.react-native}}
### Wire it up

Wrap the app once, at the root — `app/layout.tsx` for the App Router, or
your top-level component elsewhere:

```tsx
import { ThemeProvider } from '@/theme/ThemeProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

`suppressHydrationWarning` on `<html>` matters: the theme is applied client-side
after mount, so the server-rendered markup and the first client render
legitimately differ for one attribute. Without it, React logs a hydration
mismatch warning that looks like a real bug and isn't one.

### Style against it

```css
:root[data-theme='dark'] {
  --color-background: #0b0b0c;
  --color-text: #f4f4f5;
}
:root[data-theme='light'] {
  --color-background: #ffffff;
  --color-text: #111111;
}
```

Or read `themeTokens[theme]` from `src/theme/tokens.ts` directly in
JS/CSS-in-JS — both are fine, pick one per project and stay consistent
rather than mixing CSS variables and inline token reads for the same value.

### Use it

```tsx
'use client';
import { useTheme } from '@/theme/ThemeProvider';

function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  return (
    <select value={preference} onChange={(e) => setPreference(e.target.value as never)}>
      <option value="system">System</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}
```

### Avoiding a flash on page load

The provider sets `data-theme` in an effect, which runs after the first
paint — on a slow connection this can show a one-frame flash of the wrong
theme. If that becomes a real problem, add a small inline script in
`<head>` that reads `localStorage.getItem('theme-preference')` and sets
`document.documentElement.dataset.theme` before React hydrates. Leave this
out until it's actually visible; it adds a render-blocking script for
every visitor to fix something most users never notice.
{{/unless}}

### Common mistakes

- **A hardcoded color anywhere.** It is invisible in one mode and wrong in
  the other — see `.cursor/rules/dark-theme.mdc` / the Claude skill for the
  full rule.
- **Reading the system setting directly**{{#if has.react-native}} (`useColorScheme()`
  outside `ThemeProvider`){{/if}}{{#unless has.react-native}} (`window.matchMedia`
  outside `ThemeProvider`){{/unless}}, which silently ignores the user's saved
  override.
- **Resetting to `system` on every launch.** The whole point of persisting a
  preference is that it survives a restart.

### Production checklist

- [ ] Every component reads colors from `themeTokens[theme]`, never a literal.
- [ ] A new token key was added to both `light` and `dark` at the same time.
- [ ] The app was actually opened once in each of the three preference states.
- [ ] {{#if has.react-native}}The provider's `null` render while loading was
  not removed.{{/if}}{{#unless has.react-native}}`suppressHydrationWarning` is
  present on `<html>`.{{/unless}}
