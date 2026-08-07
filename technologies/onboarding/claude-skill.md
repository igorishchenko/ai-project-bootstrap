# Onboarding Flow

How the first-run walkthrough works in {{projectName}}.

## The loading state is not optional

`useOnboarding()` returns `completed: boolean | undefined`. `undefined` means
the stored flag hasn't loaded yet — it is not the same as `false`. The most
common bug in a hand-rolled version of this is routing on
`completed === false` before the async read finishes, which sends a
returning user through onboarding again on every cold start. Always branch
on `undefined` first:

```tsx
const { completed } = useOnboarding();
if (completed === undefined) return <Splash />;
return completed ? <MainApp /> : <OnboardingFlow steps={steps} onDone={() => router.replace('/')} />;
```

## Skip is not "later"

`skip()` (wired to `complete()` inside `OnboardingFlow`) marks onboarding
finished, permanently, the same as reaching the last step. If the product
wants a "remind me later" instead of a real skip, that is a different
feature — do not repurpose `complete()` for it, since anything reading
`completed` elsewhere assumes it means "never show this again."

## Steps are data, not markup

`OnboardingStep[]` is a prop:

```tsx
const steps = [
  { title: 'Welcome', description: '...' },
  { title: 'Set up your profile', description: '...' },
];

<OnboardingFlow steps={steps} onDone={handleDone} />
```

Adding a step means adding an entry to this array wherever the flow is
rendered — not editing `OnboardingFlow.tsx` itself, which only owns
navigation (index, dots, next/skip), never step content.
