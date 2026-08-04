#!/usr/bin/env node
/**
 * Checks what is still outstanding in {{projectName}}.
 *
 * The list of required variables is generated from each technology's own
 * documentation, so it cannot drift from .env.example or docs/setup.md.
 *
 * Exits non-zero when something required is missing, so CI can run it too.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const required = [
{{#each requiredEnvVars}}  { key: '{{key}}', owner: '{{moduleName}}', anchor: '{{anchor}}' },
{{/each}}];

const optional = [
{{#each envVars}}{{#unless required}}  { key: '{{key}}', owner: '{{moduleName}}', anchor: '{{anchor}}' },
{{/unless}}{{/each}}];

const problems = [];
const warnings = [];
const ok = [];

// ── Node version ────────────────────────────────────────────────────────────
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const wanted = pkg.engines?.node;
const [major, minor = 0, patch = 0] = process.versions.node.split('.').map(Number);

if (wanted) {
  const floor = wanted.replace(/[^0-9.]/g, '').split('.').map(Number);
  const current = [major, minor, patch];
  const tooOld = current.some((part, i) => part < (floor[i] ?? 0) && current.slice(0, i).every((p, j) => p === floor[j]));
  if (tooOld) problems.push(`Node ${process.versions.node} is below the required ${wanted}.`);
  else ok.push(`Node ${process.versions.node}`);
}

// ── Git hooks ───────────────────────────────────────────────────────────────
if (!existsSync('.git')) {
  problems.push('No git repository. Run `npm run setup` — hooks cannot install without one.');
} else if (!existsSync(join('.husky', '_'))) {
  problems.push('Commit hooks are not installed. Run `npm run setup`.');
} else {
  ok.push('Commit hooks installed');
}

// ── Environment ─────────────────────────────────────────────────────────────
const parseEnvFile = (file) => {
  const values = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (match) values[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
  }
  return values;
};

if (!existsSync('.env')) {
  problems.push('No .env file. Run `npm run setup`, then fill it in.');
} else {
  const env = parseEnvFile('.env');
  // .env starts life as a copy of .env.example, so a value still identical to
  // the example has not been filled in. This is exact — guessing at what a
  // placeholder looks like reports a fresh project as fully configured.
  const examples = existsSync('.env.example') ? parseEnvFile('.env.example') : {};

  const looksUnset = (key) => {
    const value = env[key] ?? '';
    if (value === '') return true;
    return key in examples && value === examples[key];
  };

  const isEmpty = (key) => (env[key] ?? '') === '';
  const empty = required.filter((entry) => isEmpty(entry.key));
  // Distinguished on purpose: an untouched example may still be the right
  // value (a region host, an environment name), so it asks you to confirm
  // rather than accusing you of forgetting.
  const untouched = required.filter((entry) => !isEmpty(entry.key) && looksUnset(entry.key));
  const unsetOptional = optional.filter((entry) => looksUnset(entry.key));

  const describe = (entry) =>
    `    ${entry.key.padEnd(38)} → docs/setup.md#${entry.anchor} (${entry.owner})`;

  if (empty.length > 0) {
    problems.push(`.env is missing ${empty.length} required value${empty.length > 1 ? 's' : ''}:`);
    for (const entry of empty) problems.push(describe(entry));
  }

  if (untouched.length > 0) {
    problems.push(
      `${untouched.length} required value${untouched.length > 1 ? 's are' : ' is'} still the example — replace or confirm:`,
    );
    for (const entry of untouched) problems.push(describe(entry));
  }

  if (empty.length === 0 && untouched.length === 0 && required.length > 0) {
    ok.push(`All ${required.length} required environment values set`);
  }

  if (unsetOptional.length > 0) {
    const names = unsetOptional.map((entry) => entry.key);
    const shown = names.slice(0, 4).join(', ');
    const rest = names.length > 4 ? ` and ${names.length - 4} more` : '';
    warnings.push(`${names.length} optional value${names.length > 1 ? 's' : ''} unset: ${shown}${rest}`);
  }
}

// ── Placeholders left in config ─────────────────────────────────────────────
const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', 'ios', 'android']);
const placeholders = [];

const scan = (dir, depth = 0) => {
  if (depth > 3) return;
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      scan(full, depth + 1);
    } else if (/\.(json|ya?ml|mdc?|js|mjs|ts|tsx)$/.test(name) && name !== 'doctor.mjs') {
      const text = readFileSync(full, 'utf8');
      if (text.includes('REPLACE_WITH_')) placeholders.push(full);
    }
  }
};
scan('.');

if (placeholders.length > 0) {
  warnings.push(`Placeholder values still present in: ${placeholders.join(', ')}`);
}

// ── Report ──────────────────────────────────────────────────────────────────
const green = (s) => `[32m${s}[0m`;
const red = (s) => `[31m${s}[0m`;
const yellow = (s) => `[33m${s}[0m`;
const dim = (s) => `[2m${s}[0m`;

process.stdout.write('\n');
for (const line of ok) process.stdout.write(`${green('✔')} ${line}\n`);
for (const line of warnings) process.stdout.write(`${yellow('!')} ${line}\n`);
for (const line of problems) {
  process.stdout.write(line.startsWith('    ') ? `${dim(line)}\n` : `${red('✖')} ${line}\n`);
}
process.stdout.write('\n');

if (problems.length > 0) {
  process.stdout.write(`${red('Setup is incomplete.')} Each item above links to the section that explains it.\n\n`);
  process.exit(1);
}

process.stdout.write(`${green('Ready.')} Everything this project needs is configured.\n\n`);
