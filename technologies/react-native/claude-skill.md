# React Native

How to write UI in {{projectName}}.

## Before you write a screen

Open an existing screen and match its structure. Screens in this project follow
the same shape: hooks at the top, early returns for loading and error, the happy
path last, `StyleSheet.create` at the bottom.

## Structure of a screen

```tsx
export function SubscriptionScreen() {
  const { status, data, error, retry } = useSubscription();

  if (status === 'loading') return <ScreenSkeleton />;
  if (status === 'error') return <ErrorState error={error} onRetry={retry} />;

  return (
    <SafeAreaView style={styles.container}>
      {/* happy path */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
```

Handle loading, empty and error as real states. A screen that only renders the
happy path is unfinished, and it is the most common thing to have to send back.

## Things that bite

- **Text must be wrapped in `<Text>`.** A bare string in a `<View>` is a runtime
  crash, not a lint error.
- **`flexDirection` defaults to `column`.** Web habits produce mysteriously
  stacked layouts.
- **Inline style objects break memoisation.** `style={{ flex: 1 }}` allocates a
  new object every render; put it in a `StyleSheet`.
- **`.map()` over a fetched array** mounts every row at once. Use `FlatList`.
- **Index keys** break as soon as the list reorders or filters.
- **Native modules need a rebuild.** If you add a package with native code, say
  so explicitly — a fast refresh will not pick it up, and the resulting error
  looks like a bug in the code.

## Lists

```tsx
<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={renderItem}   // defined outside render, or memoised
/>
```

## Platform code

Small differences use `Platform.select`. Whole-component differences use
`Component.ios.tsx` / `Component.android.tsx`. Do not scatter `Platform.OS`
checks through a component — it becomes impossible to read either path.

## Native access

Camera, notifications, biometrics and storage go behind a service in
`src/services/`. Components call the service. This is what lets tests run
without a device.

## When you finish

Say which platforms you verified on. "Should work on Android" is not
verification — if you could not test it, say that plainly instead.
