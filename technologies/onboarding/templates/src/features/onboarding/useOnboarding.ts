{{#if has.react-native}}import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'onboarding-completed';

export interface UseOnboardingResult {
  /** `undefined` while the stored flag is still loading — not the same as `false`. */
  completed: boolean | undefined;
  complete: () => void;
  reset: () => void;
}

export function useOnboarding(): UseOnboardingResult {
  const [completed, setCompleted] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => setCompleted(value === 'true'));
  }, []);

  const complete = useCallback(() => {
    setCompleted(true);
    void AsyncStorage.setItem(STORAGE_KEY, 'true');
  }, []);

  const reset = useCallback(() => {
    setCompleted(false);
    void AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  return { completed, complete, reset };
}
{{else}}'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'onboarding-completed';

export interface UseOnboardingResult {
  /** `undefined` while the stored flag is still loading — not the same as `false`. */
  completed: boolean | undefined;
  complete: () => void;
  reset: () => void;
}

export function useOnboarding(): UseOnboardingResult {
  const [completed, setCompleted] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    setCompleted(localStorage.getItem(STORAGE_KEY) === 'true');
  }, []);

  const complete = useCallback(() => {
    setCompleted(true);
    localStorage.setItem(STORAGE_KEY, 'true');
  }, []);

  const reset = useCallback(() => {
    setCompleted(false);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { completed, complete, reset };
}
{{/if}}