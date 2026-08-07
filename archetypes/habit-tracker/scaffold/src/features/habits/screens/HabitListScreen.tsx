// Scaffolded by `ai-project-bootstrap --archetype habit-tracker`.
// See docs/starter-template.md.
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { useHabits, type HabitWithStatus } from '../useHabits';
import { useTheme } from '../../../theme/ThemeProvider';
import { themeTokens } from '../../../theme/tokens';

export interface HabitListScreenProps {
  onAddHabit: () => void;
}

export function HabitListScreen({ onAddHabit }: HabitListScreenProps): React.JSX.Element {
  const { habits, loading, error, refresh, checkIn } = useHabits();
  const { theme } = useTheme();
  const colors = themeTokens[theme];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Your habits</Text>
        <Pressable onPress={onAddHabit}>
          <Text style={[styles.add, { color: colors.accent }]}>+ Add</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={habits}
        keyExtractor={(habit) => habit.id}
        refreshing={loading}
        onRefresh={refresh}
        contentContainerStyle={habits.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          !loading ? (
            <Text style={{ color: colors.textMuted }}>No habits yet — add your first one.</Text>
          ) : null
        }
        renderItem={({ item }: { item: HabitWithStatus }) => (
          <View style={[styles.row, { borderColor: colors.border }]}>
            <View>
              <Text style={{ color: colors.text }}>{item.name}</Text>
              <Text style={{ color: colors.textMuted }}>
                {item.streak === 0 ? 'No streak yet' : `${item.streak}-day streak`}
              </Text>
            </View>
            <Pressable
              disabled={item.checkedInToday}
              onPress={() => checkIn(item.id)}
              style={[
                styles.checkButton,
                { backgroundColor: item.checkedInToday ? colors.border : colors.accent },
              ]}
            >
              <Text style={styles.checkButtonText}>{item.checkedInToday ? 'Done today' : 'Check in'}</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700' },
  add: { fontSize: 16, fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  checkButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  checkButtonText: { color: '#ffffff', fontWeight: '600' },
  error: { color: '#dc2626', marginBottom: 12 },
});
