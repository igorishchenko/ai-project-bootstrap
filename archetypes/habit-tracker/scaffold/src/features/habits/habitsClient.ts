// Scaffolded by `ai-project-bootstrap --archetype habit-tracker`.
// See docs/starter-template.md and supabase/migrations/ for the schema this
// queries. Nothing outside this file touches the `habits`/`habit_checkins`
// tables directly — see technologies/supabase's setup.md for why.
import { supabase } from '../../services/supabase/client';

export interface Habit {
  id: string;
  name: string;
  createdAt: string;
}

export async function listHabits(): Promise<Habit[]> {
  const { data, error } = await supabase
    .from('habits')
    .select('id, name, created_at')
    .order('created_at', { ascending: true });
  if (error) throw error;

  return (data ?? []).map((row) => ({ id: row.id, name: row.name, createdAt: row.created_at }));
}

export async function createHabit(name: string): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error('Not signed in.');

  const { error } = await supabase.from('habits').insert({ name, user_id: userData.user.id });
  if (error) throw error;
}

/** Every date (`YYYY-MM-DD`) this habit has a check-in for, newest first. */
export async function listCheckins(habitId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('habit_checkins')
    .select('checked_in_on')
    .eq('habit_id', habitId)
    .order('checked_in_on', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => row.checked_in_on as string);
}

export async function checkInToday(habitId: string): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error('Not signed in.');

  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from('habit_checkins')
    .insert({ habit_id: habitId, user_id: userData.user.id, checked_in_on: today });

  // The (habit_id, checked_in_on) unique constraint rejects a second
  // check-in for today with Postgres error code 23505 — expected, not a
  // failure, so it's swallowed here rather than surfaced to the user.
  if (error && error.code !== '23505') throw error;
}
