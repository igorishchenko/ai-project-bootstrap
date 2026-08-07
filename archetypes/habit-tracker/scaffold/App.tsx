// Scaffolded by `ai-project-bootstrap --archetype habit-tracker`.
// See docs/starter-template.md.
//
// No router is wired in — see that doc for why. This screen-switch is a
// starting point to replace with real navigation, not the intended
// long-term shape of the app.
import { useState } from 'react';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { useAuth } from './src/hooks/auth/useAuth';
import { SignInScreen } from './src/features/auth/screens/SignInScreen';
import { HabitListScreen } from './src/features/habits/screens/HabitListScreen';
import { AddHabitScreen } from './src/features/habits/screens/AddHabitScreen';

type HabitsView = 'list' | 'add';

function Habits(): React.JSX.Element {
  const [view, setView] = useState<HabitsView>('list');

  return view === 'list' ? (
    <HabitListScreen onAddHabit={() => setView('add')} />
  ) : (
    <AddHabitScreen onDone={() => setView('list')} />
  );
}

export default function App(): React.JSX.Element | null {
  const { session, signedIn } = useAuth();

  return (
    <ThemeProvider>
      {session === undefined ? null : signedIn ? <Habits /> : <SignInScreen />}
    </ThemeProvider>
  );
}
