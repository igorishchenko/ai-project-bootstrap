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
  /*
   * `platform: 'neutral'` rather than `node`, and that is the point of this
   * entry: it must bundle into a browser. The pack editor validates and
   * previews client-side, so a build that quietly reached for `node:fs` would
   * fail in a bundler rather than here. Nothing under `src/rules.ts` may import
   * a Node builtin — if this entry starts failing to build, that is why.
   */
  {
    entry: { rules: 'src/rules.ts' },
    format: ['esm'],
    target: 'es2022',
    platform: 'neutral',
    clean: false,
    sourcemap: true,
    dts: true,
  },
]);
