// Scaffolded by `ai-project-bootstrap --archetype habit-tracker`.
// See docs/starter-template.md.

/**
 * Consecutive days checked in, counting back from today (or from yesterday
 * if today hasn't happened yet — a streak isn't broken until the day it was
 * due actually ends).
 */
export function computeStreak(checkedInDates: readonly string[]): number {
  if (checkedInDates.length === 0) return 0;

  const days = new Set(checkedInDates);
  const cursor = new Date();
  if (!days.has(isoDate(cursor))) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  while (days.has(isoDate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
