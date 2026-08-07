{{#if has.react-native}}import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useOnboarding } from './useOnboarding';

export interface OnboardingStep {
  title: string;
  description: string;
}

export interface OnboardingFlowProps {
  steps: OnboardingStep[];
  /** Called once, after the last step or a skip — navigate away from here. */
  onDone: () => void;
}

export function OnboardingFlow({ steps, onDone }: OnboardingFlowProps): React.JSX.Element | null {
  const { complete } = useOnboarding();
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const isLast = index === steps.length - 1;

  const advance = (): void => {
    if (isLast) {
      complete();
      onDone();
      return;
    }
    setIndex((current) => current + 1);
  };

  const skip = (): void => {
    complete();
    onDone();
  };

  if (!step) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{step.title}</Text>
      <Text style={styles.description}>{step.description}</Text>
      <View style={styles.dots}>
        {steps.map((_, dotIndex) => (
          <View key={dotIndex} style={[styles.dot, dotIndex === index && styles.dotActive]} />
        ))}
      </View>
      <Pressable onPress={advance} style={styles.button}>
        <Text style={styles.buttonText}>{isLast ? 'Get started' : 'Next'}</Text>
      </Pressable>
      {!isLast && (
        <Pressable onPress={skip}>
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  description: { fontSize: 16, textAlign: 'center', marginBottom: 24 },
  dots: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#d4d4d8' },
  dotActive: { backgroundColor: '#2563eb' },
  button: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, backgroundColor: '#2563eb' },
  buttonText: { color: '#ffffff', fontWeight: '600' },
  skip: { marginTop: 16, color: '#6b7280' },
});
{{else}}'use client';

import { useState } from 'react';
import { useOnboarding } from './useOnboarding';

export interface OnboardingStep {
  title: string;
  description: string;
}

export interface OnboardingFlowProps {
  steps: OnboardingStep[];
  /** Called once, after the last step or a skip — navigate away from here. */
  onDone: () => void;
}

export function OnboardingFlow({ steps, onDone }: OnboardingFlowProps): React.JSX.Element | null {
  const { complete } = useOnboarding();
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const isLast = index === steps.length - 1;

  const advance = (): void => {
    if (isLast) {
      complete();
      onDone();
      return;
    }
    setIndex((current) => current + 1);
  };

  const skip = (): void => {
    complete();
    onDone();
  };

  if (!step) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 24 }}>
      <h2>{step.title}</h2>
      <p>{step.description}</p>
      <div style={{ display: 'flex', gap: 8, margin: '24px 0' }}>
        {steps.map((_, dotIndex) => (
          <span
            key={dotIndex}
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              background: dotIndex === index ? '#2563eb' : '#d4d4d8',
            }}
          />
        ))}
      </div>
      <button onClick={advance}>{isLast ? 'Get started' : 'Next'}</button>
      {!isLast && (
        <button
          onClick={skip}
          style={{ marginTop: 16, background: 'none', border: 'none', color: '#6b7280' }}
        >
          Skip
        </button>
      )}
    </div>
  );
}
{{/if}}