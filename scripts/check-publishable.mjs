#!/usr/bin/env node
/**
 * Refuses to publish a package that would not run once installed.
 *
 * v1.1.0 went to npm with no `dist/` at all: `dist` is gitignored, `files`
 * lists it, and nothing built it before `npm publish`. The tarball carried the
 * whole catalogue and none of the code, so `npx ai-project-bootstrap` failed
 * for everyone and `ai-project-bootstrap/core` could not resolve.
 *
 * `prepublishOnly` now builds first, and this asserts the build actually
 * produced what `bin`, `main` and `exports` promise — a build can fail
 * silently enough that a green publish still ships nothing.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

/**
 * Every path the manifest claims will exist in the tarball. Normalised because
 * `exports` writes `./dist/core.js` while `bin` writes `dist/index.js`, and
 * the same file listed twice reads like two problems.
 */
const required = new Set();
const add = (value) => {
  if (typeof value === 'string') required.add(path.normalize(value));
};

add(pkg.main);
for (const target of Object.values(pkg.bin ?? {})) add(target);
for (const entry of Object.values(pkg.exports ?? {})) {
  if (typeof entry === 'string') add(entry);
  else for (const value of Object.values(entry)) add(value);
}

const missing = [...required].filter((relative) => !existsSync(path.join(root, relative)));

if (missing.length > 0) {
  console.error(
    `Refusing to publish ${pkg.name}@${pkg.version} — package.json promises files the build did not produce:\n` +
      missing.map((file) => `  ${file}`).join('\n') +
      '\n\nRun `pnpm build` and try again.',
  );
  process.exit(1);
}

console.log(`${pkg.name}@${pkg.version}: ${required.size} declared entry point(s) present.`);
