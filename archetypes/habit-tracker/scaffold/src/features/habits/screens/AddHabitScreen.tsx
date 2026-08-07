// Scaffolded by `ai-project-bootstrap --archetype habit-tracker`.
// See docs/starter-template.md.
import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useHabits } from '../useHabits';
import { useTheme } from '../../../theme/ThemeProvider';
import { themeTokens } from '../../../theme/tokens';

export interface AddHabitScreenProps {
  onDone: () => void;
}

export function AddHabitScreen({ onDone }: AddHabitScreenProps): React.JSX.Element {
  const { addHabit } = useHabits();
  const { theme } = useTheme();
  const colors = themeTokens[theme];
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleSubmit = async (): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(undefined);
    try {
      await addHabit(trimmed);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this habit.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>New habit</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
        placeholder="e.g. Drink water"
        placeholderTextColor={colors.textMuted}
        value={name}
        onChangeText={setName}
        autoFocus
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        style={[styles.button, { backgroundColor: colors.accent, opacity: submitting || !name.trim() ? 0.6 : 1 }]}
        onPress={handleSubmit}
        disabled={submitting || !name.trim()}
      >
        <Text style={styles.buttonText}>{submitting ? 'Saving…' : 'Save'}</Text>
      </Pressable>
      <Pressable onPress={onDone} style={styles.cancel}>
        <Text style={{ color: colors.textMuted }}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12 },
  button: { paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#ffffff', fontWeight: '600' },
  cancel: { marginTop: 16, alignItems: 'center' },
  error: { color: '#dc2626', marginBottom: 12 },
});
