#!/usr/bin/env node
/**
 * One-command local setup for {{projectName}}.
 *
 * The order matters and is easy to get wrong by hand: the commit hooks are
 * installed by a post-install step that silently does nothing when there is no
 * .git directory yet. Running this script is the supported path — the docs
 * point here rather than repeating the steps.
 *
 * Safe to run more than once.
 */
import { existsSync, copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Resolve the Windows executable directly rather than using shell: true —
// passing an args array with a shell is deprecated and unescaped.
const binary = (command) =>
  process.platform === 'win32' && command === 'npm' ? 'npm.cmd' : command;

const run = (command, args) => {
  process.stdout.write(`\n> ${command} ${args.join(' ')}\n`);
  const result = spawnSync(binary(command), args, { stdio: 'inherit' });
  if (result.status !== 0) {
    process.stderr.write(`\n✖ ${command} ${args.join(' ')} failed.\n`);
    process.exit(result.status ?? 1);
  }
};

const step = (message) => process.stdout.write(`\n── ${message}\n`);

// 1. Git first: husky installs no hooks without a repository, and reports success.
if (existsSync('.git')) {
  step('Git repository already initialised');
} else {
  step('Initialising the git repository');
  run('git', ['init']);
}

// 2. Environment file, never overwriting real values.
if (existsSync('.env')) {
  step('.env already exists — leaving it alone');
} else {
  step('Creating .env from .env.example');
  copyFileSync('.env.example', '.env');
}

// 3. Dependencies. This is what installs the commit hooks.
step('Installing dependencies');
run('npm', ['install']);

// 4. Normalise formatting, so the first real commit is not a whitespace diff.
step('Formatting');
run('npm', ['run', 'format']);

process.stdout.write(
  [
    '',
    '✔ Local setup complete.',
    '',
    'Next: fill in .env, then check what is still outstanding:',
    '',
    '    npm run doctor',
    '',
    'Every value is documented in docs/setup.md.',
    '',
  ].join('\n'),
);
