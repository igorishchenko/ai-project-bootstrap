// Scaffolded by `ai-project-bootstrap implement authentication` (Supabase Auth).
// See implementation/authentication/plan.md, step 5.

import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useAuth } from '../../../hooks/auth/useAuth';

export function SignInScreen(): React.JSX.Element {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (): Promise<void> => {
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch {
      // TODO (plan.md, step 5): distinguish invalid credentials from a
      // network failure and show the right message for each.
      setError('Sign-in failed. Check your details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {error ? <Text>{error}</Text> : null}
      {/* TODO: wire up a real button component and disable it while submitting. */}
      <Text onPress={submitting ? undefined : handleSubmit}>
        {submitting ? 'Signing in…' : 'Sign in'}
      </Text>
    </View>
  );
}
