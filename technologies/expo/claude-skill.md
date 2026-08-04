# Expo

What to do differently in {{projectName}} because it is an Expo project.

## Adding a package

Always:

```bash
npx expo install <package>
```

Never `npm install` for an Expo package. `expo install` pins the version that
matches the installed SDK; npm will install a newer one that fails at build time
with an error pointing at something unrelated.

Then check whether the package needs a config plugin. If it does, add it to
`app.json` under `plugins` and say clearly in your summary that a rebuild is
required — this is the single most common reason "it works for me" fails for
someone else.

## Native configuration

Everything native is declared in `app.json`:

- Permissions and their usage strings
- Bundle identifier and package name
- Icons, splash screen
- Config plugins

Never edit `ios/` or `android/`. `npx expo prebuild --clean` regenerates both
from `app.json`, and any manual change is lost without warning. If something
seems to need a native edit, the answer is a config plugin — say so rather than
patching the generated project.

## Environment variables

```ts
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
```

Only the `EXPO_PUBLIC_` prefix is exposed, and those values are **compiled into
the bundle**. Anyone can extract them from a downloaded app.

If a task asks you to put an API secret, a service-role key, or a private token
into the client, stop and say it belongs on a server. This is not a style
preference — it is a credential leak that ships to every user.

## Updates versus builds

| Change | Ships via |
| --- | --- |
| JavaScript, styles, copy, assets already bundled | `eas update` |
| New native dependency, permission, icon, SDK upgrade | New build |

Getting this wrong crashes the app on launch for every user who receives the
update. When you are unsure which category a change falls into, say so.

## Verifying

`npx expo start --clear` after dependency changes. If you could not run a
build, say that explicitly rather than implying it was verified.
