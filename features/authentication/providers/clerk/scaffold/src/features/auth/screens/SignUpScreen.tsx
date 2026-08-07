// Scaffolded by `ai-project-bootstrap implement authentication` (Clerk).
// See implementation/authentication/plan.md, step 2.

import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useSignUp } from '@clerk/clerk-expo';

export function SignUpScreen(): React.JSX.Element {
  const { signUp, setActive, isLoaded } = useSignUp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (): Promise<void> => {
    if (!isLoaded) return;
    setSubmitting(true);
    setError(null);
    try {
      const attempt = await signUp.create({ emailAddress: email, password });
      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
      } else {
        // TODO (plan.md, step 2): most sign-ups land here first — Clerk
        // requires email verification by default. Prepare/attempt the
        // verification step (signUp.prepareEmailAddressVerification()) and
        // collect the code from the user.
        setError('Check your email to verify your account.');
      }
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
