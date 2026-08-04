import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/cli/index.ts' },
  format: ['esm'],
  target: 'node18',
  platform: 'node',
  clean: true,
  sourcemap: true,
  dts: false,
  banner: { js: '#!/usr/bin/env node' },
});
