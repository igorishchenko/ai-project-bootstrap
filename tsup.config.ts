import { defineConfig } from 'tsup';

// Two entries, one file: the CLI needs a shebang banner and no declaration
// file (it's a bin script, not a library import); `core` is the opposite —
// no banner, but real .d.ts output since it's the public API surface a
// separate service depends on. `clean: true` only on the CLI entry — tsup
// runs array entries in order, and a second `clean` would wipe the first
// entry's output.
export default defineConfig([
  {
    entry: { index: 'src/cli/index.ts' },
    format: ['esm'],
    target: 'node18',
    platform: 'node',
    clean: true,
    sourcemap: true,
    dts: false,
    banner: { js: '#!/usr/bin/env node' },
  },
  {
    entry: { core: 'src/core/index.ts' },
    format: ['esm'],
    target: 'node18',
    platform: 'node',
    clean: false,
    sourcemap: true,
    dts: true,
  },
]);
