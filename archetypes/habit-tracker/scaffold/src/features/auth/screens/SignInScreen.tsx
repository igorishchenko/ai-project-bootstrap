// Scaffolded by `ai-project-bootstrap --archetype habit-tracker`.
// See docs/starter-template.md.
import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { sendMagicLink } from '../authClient';
import { useTheme } from '../../../theme/ThemeProvider';
import { themeTokens } from '../../../theme/tokens';

export function SignInScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const colors = themeTokens[theme];
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleSubmit = async (): Promise<void> => {
    setSubmitting(true);
    setError(undefined);
    try {
      await sendMagicLink(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Check your email</Text>
        <Text style={{ color: colors.textMuted }}>We sent a sign-in link to {email}.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>{{projectName}}</Text>
      <Text style={{ color: colors.textMuted, marginBottom: 16 }}>
        Enter your email — we'll send you a link to sign in, no password needed.
      </Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
        placeholder="you@example.com"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        style={[styles.button, { backgroundColor: colors.accent, opacity: submitting || !email ? 0.6 : 1 }]}
        onPress={handleSubmit}
        disabled={submitting || !email}
      >
        <Text style={styles.buttonText}>{submitting ? 'Sending…' : 'Send magic link'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12 },
  button: { paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#ffffff', fontWeight: '600' },
  error: { color: '#dc2626', marginBottom: 12 },
});
