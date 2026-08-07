// Scaffolded by `ai-project-bootstrap implement authentication` (Supabase Auth).
// See implementation/authentication/plan.md, step 5.

import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useAuth } from '../../../hooks/auth/useAuth';

export function SignUpScreen(): React.JSX.Element {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (): Promise<void> => {
    setSubmitting(true);
    setError(null);
    try {
      await signUp(email, password);
      // TODO (plan.md, step 3): a null session here means email confirmation
      // is required — tell the user to check their inbox rather than treating
      // it as success.
    } catch {
      setError('Sign-up failed. Check your details and try again.');
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
      <Text onPress={submitting ? undefined : handleSubmit}>
        {submitting ? 'Creating account…' : 'Sign up'}
      </Text>
    </View>
  );
}
