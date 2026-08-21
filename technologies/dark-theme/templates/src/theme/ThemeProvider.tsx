{{#if has.react-native}}import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark';
export type ThemePreference = ThemeMode | 'system';

const STORAGE_KEY = 'theme-preference';

interface ThemeContextValue {
  theme: ThemeMode;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: PropsWithChildren): React.JSX.Element | null {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') setPreferenceState(stored);
      setLoaded(true);
    });
  }, []);

  const setPreference = (next: ThemePreference): void => {
    setPreferenceState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  };

  // react-native's ColorSchemeName also includes "unspecified" (no system
  // preference set) — anything short of an explicit "dark" falls back to
  // light, the same as the null/undefined case.
  const theme: ThemeMode = preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;
  const value = useMemo(() => ({ theme, preference, setPreference }), [theme, preference]);

  // Nothing renders until the stored preference loads — otherwise every cold
  // start flashes the system theme for one frame before the saved override
  // applies, which reads as a bug even though it self-corrects instantly.
  if (!loaded) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>.');
  return ctx;
}
{{else}}'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

export type ThemeMode = 'light' | 'dark';
export type ThemePreference = ThemeMode | 'system';

const STORAGE_KEY = 'theme-preference';

interface ThemeContextValue {
  theme: ThemeMode;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function systemTheme(): ThemeMode {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: PropsWithChildren): React.JSX.Element {
  // Both start at their neutral value and are filled in from an effect. A
  // `'use client'` component still renders once on the server during
  // prerendering, where `localStorage` and `matchMedia` do not exist — reading
  // either during render fails the build outright, and reading it lazily on the
  // client instead would hydrate against different markup.
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [system, setSystem] = useState<ThemeMode>('light');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') setPreferenceState(stored);
  }, []);

  useEffect(() => {
    setSystem(systemTheme());
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (): void => setSystem(media.matches ? 'dark' : 'light');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const setPreference = (next: ThemePreference): void => {
    setPreferenceState(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  const theme: ThemeMode = preference === 'system' ? system : preference;

  // A `data-theme` attribute (not a class) so CSS only needs
  // `[data-theme="dark"] { ... }` — see docs/setup.md for the two lines that
  // avoid a flash of the wrong theme before hydration.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const value = useMemo(() => ({ theme, preference, setPreference }), [theme, preference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>.');
  return ctx;
}
{{/if}}