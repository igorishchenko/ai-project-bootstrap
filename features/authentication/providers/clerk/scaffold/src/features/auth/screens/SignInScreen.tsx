// Scaffolded by `ai-project-bootstrap implement authentication` (Clerk).
// See implementation/authentication/plan.md, step 2.

import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useSignIn } from '@clerk/clerk-expo';

export function SignInScreen(): React.JSX.Element {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (): Promise<void> => {
    if (!isLoaded) return;
    setSubmitting(true);
    setError(null);
    try {
      const attempt = await signIn.create({ identifier: email, password });
      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
      } else {
        // TODO (plan.md, step 2): handle multi-factor / additional steps —
        // attempt.status covers cases beyond a single password check.
        setError('Additional verification required.');
      }
    } catch {
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
