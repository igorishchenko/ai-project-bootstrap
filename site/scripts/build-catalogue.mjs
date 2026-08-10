#!/usr/bin/env node
// Regenerates site/data/catalogue.json from the repo's own source of truth —
// config/categories.json, config/presets.json, technologies/*/manifest.json,
// archetypes/*/manifest.json and features/*/manifest.json — so the stack
// builder can never drift from the real catalogue. Mirrors the pattern in
// ../../scripts/generate-tech-table.mjs.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootDir = path.resolve(siteDir, '..');

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

// Short display labels for table headings — categories.json's own `label` is
// phrased as a wizard question ("Mobile platform"), not a table heading.
// Mirrors CATEGORY_LABELS in ../../scripts/generate-tech-table.mjs.
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

function loadCategories() {
  return readJson(path.join(rootDir, 'config/categories.json'));
}

function loadModulesByCategory() {
  const technologiesDir = path.join(rootDir, 'technologies');
  const byCategory = new Map();
  for (const id of readdirSync(technologiesDir)) {
    const m = readJson(path.join(technologiesDir, id, 'manifest.json'));
    const list = byCategory.get(m.category) ?? [];
    list.push(m);
    byCategory.set(m.category, list);
  }
  for (const list of byCategory.values()) list.sort((a, b) => a.priority - b.priority);
  return byCategory;
}

function loadArchetypes() {
  const dir = path.join(rootDir, 'archetypes');
  return readdirSync(dir).map((id) => readJson(path.join(dir, id, 'manifest.json')));
}

function loadFeatures() {
  const dir = path.join(rootDir, 'features');
  return readdirSync(dir).map((id) => readJson(path.join(dir, id, 'manifest.json')));
}

function countPrompts() {
  return readdirSync(path.join(rootDir, 'assets/base/prompts')).filter((f) => f.endsWith('.md')).length;
}

export function buildCatalogue() {
  const rawCategories = loadCategories().sort((a, b) => a.order - b.order);
  const modulesByCategory = loadModulesByCategory();

  const categories = rawCategories
    // aiTools is a wizard-only question about which editors you use — it
    // doesn't gate file generation the way `target` does and isn't part of
    // the stack/cost picture, so it stays out of the builder entirely.
    .filter((cat) => cat.id !== 'aiTools')
    .map((cat) => {
      const kind = cat.type === 'multi' ? 'any' : 'one';
      if (cat.choices) {
        // Gating question (aiTools, target) — fixed choices, not technology-backed.
        return {
          id: cat.id,
          label: cat.label,
          kind,
          gating: true,
          choices: cat.choices.map((c) => ({ id: c.value, name: c.label })),
        };
      }
      const mods = modulesByCategory.get(cat.id);
      if (!mods) return null; // category declared but nothing built for it yet
      return {
        id: cat.id,
        label: cat.label,
        shortLabel: CATEGORY_LABELS[cat.id] ?? cat.label,
        kind,
        showWhen: cat.showWhen ?? null,
        modules: mods.map((m) => ({
          id: m.id,
          name: m.name,
          description: m.description,
          requires: m.requires ?? [],
          conflicts: m.conflicts ?? [],
          pricing: m.pricing ?? null,
        })),
      };
    })
    .filter(Boolean);

  const presets = loadPresets();
  const archetypes = loadArchetypes();
  const features = loadFeatures();

  const moduleCategories = categories.filter((c) => !c.gating);
  const totalModules = moduleCategories.reduce((n, c) => n + c.modules.length, 0);
  const allModules = moduleCategories.flatMap((c) => c.modules);
  const pricedFlat = allModules.filter(
    (m) => m.pricing && (m.pricing.model === 'flat' || m.pricing.model === 'freemium'),
  ).length;
  const pricedUsage = allModules.filter((m) => m.pricing && m.pricing.model === 'usage-based').length;
  const totalProviders = features.reduce((n, f) => n + f.providers.length, 0);

  return {
    categories,
    presets,
    archetypes,
    features,
    counts: {
      categories: moduleCategories.length,
      modules: totalModules,
      prompts: countPrompts(),
      pricedFlat,
      pricedUsage,
      featureCount: features.length,
      providerCount: totalProviders,
    },
  };
}

function loadPresets() {
  return readJson(path.join(rootDir, 'config/presets.json'));
}

function main() {
  const catalogue = buildCatalogue();
  mkdirSync(path.join(siteDir, 'data'), { recursive: true });
  const outPath = path.join(siteDir, 'data/catalogue.json');
  writeFileSync(outPath, JSON.stringify(catalogue, null, 2) + '\n');
  console.log(
    `data/catalogue.json — ${catalogue.counts.categories} categories, ${catalogue.counts.modules} modules`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
