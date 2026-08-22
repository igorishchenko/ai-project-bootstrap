// Scaffolded by `ai-project-bootstrap implement authentication` (Clerk).
// See implementation/authentication/plan.md, step 2.

{{#if has.react-native}}import { useState } from 'react';
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
        // TODO (plan.md, step 2): the usual next step here is email
        // verification — prepareEmailAddressVerification, then a code screen.
        setError('Additional verification required.');
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
{{/if}}{{#unless has.react-native}}// Clerk's prebuilt component — see the note in SignInScreen.tsx for why this
// is not a hand-rolled form.
{{#if has.nextjs}}import { SignUp } from '@clerk/nextjs';
{{/if}}{{#unless has.nextjs}}import { SignUp } from '@clerk/clerk-react';
{{/unless}}
export function SignUpScreen(): React.JSX.Element {
  // TODO (plan.md, step 2): point these at the routes you actually mount.
  return <SignUp signInUrl="/sign-in" forceRedirectUrl="/" />;
}
{{/unless}}
