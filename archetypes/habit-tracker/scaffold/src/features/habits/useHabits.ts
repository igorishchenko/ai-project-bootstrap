// Scaffolded by `ai-project-bootstrap --archetype habit-tracker`.
// See docs/starter-template.md.
import { useCallback, useEffect, useState } from 'react';
import { checkInToday, createHabit, listCheckins, listHabits, type Habit } from './habitsClient';
import { computeStreak, isoDate } from './streak';

export interface HabitWithStatus extends Habit {
  streak: number;
  checkedInToday: boolean;
}

export interface UseHabitsResult {
  habits: HabitWithStatus[];
  loading: boolean;
  error: string | undefined;
  refresh: () => void;
  addHabit: (name: string) => Promise<void>;
  checkIn: (habitId: string) => Promise<void>;
}

export function useHabits(): UseHabitsResult {
  const [habits, setHabits] = useState<HabitWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const base = await listHabits();
      const today = isoDate(new Date());
      const withStatus = await Promise.all(
        base.map(async (habit) => {
          const checkins = await listCheckins(habit.id);
          return { ...habit, streak: computeStreak(checkins), checkedInToday: checkins.includes(today) };
        }),
      );
      setHabits(withStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load habits.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addHabit = useCallback(
    async (name: string) => {
      await createHabit(name);
      await load();
    },
    [load],
  );

  const checkIn = useCallback(
    async (habitId: string) => {
      await checkInToday(habitId);
      await load();
    },
    [load],
  );

  return { habits, loading, error, refresh: load, addHabit, checkIn };
}
