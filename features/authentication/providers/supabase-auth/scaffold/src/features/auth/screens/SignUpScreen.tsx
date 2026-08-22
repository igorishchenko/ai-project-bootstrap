// Scaffolded by `ai-project-bootstrap implement authentication` (Supabase Auth).
// See implementation/authentication/plan.md, step 5.

{{#unless has.react-native}}// Session state lives in the browser, so this half of the tree is a client
// component. The directive has to precede the imports.
'use client';

{{/unless}}import { useState } from 'react';
{{#if has.react-native}}import { Text, TextInput, View } from 'react-native';
{{/if}}import { useAuth } from '../../../hooks/auth/useAuth';

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

{{#if has.react-native}}  return (
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
{{/if}}{{#unless has.react-native}}  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
    >
      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      {/* TODO (plan.md, step 5): announce this to assistive tech — role="alert". */}
      {error ? <p>{error}</p> : null}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Creating account…' : 'Sign up'}
      </button>
    </form>
  );
{{/unless}}}
