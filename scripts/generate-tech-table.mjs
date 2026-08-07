#!/usr/bin/env node
// Regenerates the "Available technologies" table in README.md from
// config/categories.json + technologies/*/manifest.json, so the table can
// never drift from the actual module catalogue on disk.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import prettier from 'prettier';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const TECH_TABLE_START = '<!-- TECH_TABLE:START -->';
export const TECH_TABLE_END = '<!-- TECH_TABLE:END -->';

// Short display labels for the table header column — config/categories.json's
// own `label` field is phrased as a wizard question ("Mobile platform"), not
// a table heading, so this stays separate on purpose.
const CATEGORY_LABELS = {
  mobile: 'Mobile',
  web: 'Web',
  backend: 'Backend',
  auth: 'Auth',
  database: 'Database',
  features: 'Features',
  payments: 'Payments',
  analytics: 'Analytics',
  'crash-reporting': 'Crash reporting',
  notifications: 'Notifications',
  storage: 'Storage',
  email: 'Email',
  monitoring: 'Monitoring',
  'ci-cd': 'CI/CD',
  testing: 'Testing',
  deployment: 'Deployment',
};

export function loadCategories() {
  const raw = JSON.parse(readFileSync(path.join(rootDir, 'config/categories.json'), 'utf8'));
  // Gating questions (e.g. "target") declare fixed `choices` and aren't
  // backed by technology modules — they don't belong in this table.
  return raw.filter((category) => !category.choices).sort((a, b) => a.order - b.order);
}

export function loadModulesByCategory() {
  const technologiesDir = path.join(rootDir, 'technologies');
  const modulesByCategory = new Map();

  for (const id of readdirSync(technologiesDir)) {
    const manifest = JSON.parse(
      readFileSync(path.join(technologiesDir, id, 'manifest.json'), 'utf8'),
    );
    const list = modulesByCategory.get(manifest.category) ?? [];
    list.push(manifest);
    modulesByCategory.set(manifest.category, list);
  }

  for (const list of modulesByCategory.values()) {
    list.sort((a, b) => a.priority - b.priority);
  }

  return modulesByCategory;
}

export function buildTechTable() {
  const categories = loadCategories();
  const modulesByCategory = loadModulesByCategory();

  const rows = categories
    .filter((category) => modulesByCategory.has(category.id))
    .map((category) => {
      const names = modulesByCategory.get(category.id).map((m) => m.name);
      const label = CATEGORY_LABELS[category.id] ?? category.id;
      return `| ${label} | ${names.join(', ')} |`;
    });

  return ['| Category | Modules |', '| --- | --- |', ...rows].join('\n');
}

export function renderReadme(readme, table) {
  const startIdx = readme.indexOf(TECH_TABLE_START);
  const endIdx = readme.indexOf(TECH_TABLE_END);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`README.md is missing the ${TECH_TABLE_START} / ${TECH_TABLE_END} markers`);
  }
  const before = readme.slice(0, startIdx + TECH_TABLE_START.length);
  const after = readme.slice(endIdx);
  return `${before}\n${table}\n${after}`;
}

// Runs the freshly-rendered table through Prettier so `docs:tech-table` and
// `format` never fight over column padding — this is the single source of
// truth both a manual run and the sync test below format against.
export async function generateReadme(readme, readmePath) {
  const rendered = renderReadme(readme, buildTechTable());
  const config = (await prettier.resolveConfig(readmePath)) ?? {};
  return prettier.format(rendered, { ...config, filepath: readmePath });
}

async function main() {
  const readmePath = path.join(rootDir, 'README.md');
  const readme = readFileSync(readmePath, 'utf8');
  const updated = await generateReadme(readme, readmePath);

  if (updated === readme) {
    console.log('README.md tech table is already up to date.');
    return;
  }

  writeFileSync(readmePath, updated);
  console.log('README.md tech table updated.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
