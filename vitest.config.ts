import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // picocolors treats `CI` (set by GitHub Actions) as reason enough to
    // colorize output; tests assert on plain substrings of that output, so
    // force it off the same way a real NO_COLOR-respecting terminal would.
    env: { NO_COLOR: '1' },
  },
});
