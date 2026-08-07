/**
 * Starter color tokens for {{projectName}}. Replace the values, not the
 * shape — every consumer reads `themeTokens[theme].<name>`, so renaming a
 * key here means updating every place that reads it.
 */
export const themeTokens = {
  light: {
    background: '#ffffff',
    surface: '#f4f4f5',
    text: '#111111',
    textMuted: '#6b7280',
    border: '#e4e4e7',
    accent: '#2563eb',
  },
  dark: {
    background: '#0b0b0c',
    surface: '#18181b',
    text: '#f4f4f5',
    textMuted: '#a1a1aa',
    border: '#27272a',
    accent: '#3b82f6',
  },
} as const;

export type ThemeTokens = typeof themeTokens.light;
