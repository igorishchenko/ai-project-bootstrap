### Overview

A first-run walkthrough: a small set of steps, a progress indicator, a real
skip path, and a persisted flag so it only ever shows once — until `reset()`
is called explicitly (useful for a "replay onboarding" debug menu item, or
QA).

### Define your steps

Steps are plain data, not hardcoded in the component:

```tsx
import { OnboardingFlow, type OnboardingStep } from '{{#if has.react-native}}./features/onboarding/OnboardingFlow{{/if}}{{#unless has.react-native}}@/features/onboarding/OnboardingFlow{{/unless}}';

const steps: OnboardingStep[] = [
  { title: 'Welcome to {{projectName}}', description: 'Here is what you can do.' },
  { title: 'Stay in the loop', description: 'Turn on notifications to never miss an update.' },
];
```

### Gate the app on it

```tsx
import { useOnboarding } from '{{#if has.react-native}}./features/onboarding/useOnboarding{{/if}}{{#unless has.react-native}}@/features/onboarding/useOnboarding{{/unless}}';

function Root() {
  const { completed } = useOnboarding();

  // `undefined` while the flag is loading — not the same as `false`. Route
  // on this first, or a returning user sees onboarding flash before the
  // real app does.
  if (completed === undefined) return <Splash />;
  if (!completed) return <OnboardingFlow steps={steps} onDone={() => setCompletedLocally(true)} />;
  return <MainApp />;
}
```

### Common mistakes

- **Routing before the stored flag loads.** `completed === false` is true
  both before the async read finishes *and* for a genuinely new user —
  check `completed === undefined` first.
- **Making skip reversible.** `skip()` calls the same `complete()` as
  finishing the last step; a user who skips does not see onboarding again
  on the next launch, by design.
- **Hardcoding step content inside `OnboardingFlow`.** Steps are a prop —
  the component only owns navigation.

### Production checklist

- [ ] The app renders a splash/loading state, not onboarding, while
      `completed` is `undefined`.
- [ ] Skipping and finishing both land the user in the same place.
- [ ] Step copy has been proofread — this is the very first thing a new
      user reads.
