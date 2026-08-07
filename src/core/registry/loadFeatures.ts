import fs from 'node:fs';
import path from 'node:path';
import type { CategoryQuestion, LoadedModule, ModuleAsset } from '../types.js';
import { GeneratorError } from '../resolve/errors.js';

/**
 * A feature's own manifest.json — parallel to a technology's, but declaring
 * which technology ids (`providers`) it has tailored content for, rather
 * than being a technology itself.
 */
export interface FeatureManifest {
  id: string;
  name: string;
  description: string;
  /** Which wizard category's answer selects the provider — "auth", "payments", ... */
  category: string;
  providers: string[];
}

/** One provider's content for a feature — everything `implement` needs to write. */
export interface FeatureProviderContent {
  plan?: string;
  checklist?: string;
  prompts: ModuleAsset[];
  /** Mirrored into the project root, same convention as a technology's `templates/`. */
  scaffold: ModuleAsset[];
}

export interface LoadedFeature {
  manifest: FeatureManifest;
  root: string;
  providers: Map<string, FeatureProviderContent>;
}

function readIfPresent(root: string, relative: string): string | undefined {
  const full = path.join(root, relative);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : undefined;
}

/** Recursively collects every file under `dir`, relative to it — same shape as moduleAssets.ts's. */
function readTree(root: string, relative: string): ModuleAsset[] {
  const base = path.join(root, relative);
  if (!fs.existsSync(base)) return [];

  const assets: ModuleAsset[] = [];
  const walk = (current: string): void => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort(byName)) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        assets.push({
          relativePath: path.relative(base, full).split(path.sep).join('/'),
          content: fs.readFileSync(full, 'utf8'),
        });
      }
    }
  };
  walk(base);
  return assets;
}

function byName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name);
}

function readJson<T>(file: string): T {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch (error) {
    throw new GeneratorError(
      'INVALID_MANIFEST',
      `Could not read ${file}: ${(error as Error).message}`,
    );
  }
}

function parseFeatureManifest(raw: unknown, file: string): FeatureManifest {
  const manifest = raw as Partial<FeatureManifest>;
  if (
    typeof manifest.id !== 'string' ||
    typeof manifest.name !== 'string' ||
    typeof manifest.description !== 'string' ||
    typeof manifest.category !== 'string' ||
    !Array.isArray(manifest.providers) ||
    manifest.providers.length === 0 ||
    !manifest.providers.every((provider) => typeof provider === 'string')
  ) {
    throw new GeneratorError(
      'INVALID_MANIFEST',
      `${file} must declare "id", "name", "description", "category" (strings) and a non-empty "providers" array of strings.`,
    );
  }
  return manifest as FeatureManifest;
}

/**
 * Just the manifests — none of the plan/checklist/prompt content `implement`
 * needs, and none of the full-registry validation `loadFeatures` does (a
 * feature's `providers` legitimately includes technology ids this particular
 * project never selected). Cheap enough to call on every generation, which is
 * exactly what `roadmapBuilder` does to know which selected module has a
 * `ai-project-bootstrap implement <feature>` command behind it.
 */
export function loadFeatureIndex(rootDir: string): FeatureManifest[] {
  const featuresDir = path.join(rootDir, 'features');
  if (!fs.existsSync(featuresDir)) return [];

  return fs
    .readdirSync(featuresDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .sort(byName)
    .map((entry) => {
      const manifestFile = path.join(featuresDir, entry.name, 'manifest.json');
      return parseFeatureManifest(readJson<unknown>(manifestFile), manifestFile);
    });
}

/**
 * Discovers every feature under `features/` — the content `implement` draws
 * from. Each declares, in its own manifest.json, which technology ids it has
 * tailored content for; those are validated against the real module registry
 * here, so a feature can never point at a provider that doesn't exist, and
 * `implement` never needs to guard against that itself.
 *
 * Not part of `Registry`/`loadRegistry()` — unlike modules and presets,
 * features are never wizard-facing, so nothing pays for loading them except
 * `implement` itself.
 */
export function loadFeatures(
  rootDir: string,
  byId: Map<string, LoadedModule>,
  categories: readonly CategoryQuestion[],
): LoadedFeature[] {
  const featuresDir = path.join(rootDir, 'features');
  if (!fs.existsSync(featuresDir)) return [];

  const categoryIds = new Set(categories.map((category) => category.id));
  const features: LoadedFeature[] = [];

  const entries = fs
    .readdirSync(featuresDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .sort(byName);

  for (const entry of entries) {
    const featureRoot = path.join(featuresDir, entry.name);
    const manifestFile = path.join(featureRoot, 'manifest.json');
    if (!fs.existsSync(manifestFile)) {
      throw new GeneratorError(
        'INVALID_MANIFEST',
        `features/${entry.name} has no manifest.json.`,
        'Every feature folder must declare a manifest.json. Remove the folder or add one.',
      );
    }

    const manifest = parseFeatureManifest(readJson<unknown>(manifestFile), manifestFile);
    if (manifest.id !== entry.name) {
      throw new GeneratorError(
        'INVALID_MANIFEST',
        `features/${entry.name}/manifest.json declares id "${manifest.id}".`,
        'The manifest id must match its folder name so ids stay unambiguous.',
      );
    }
    if (!categoryIds.has(manifest.category)) {
      throw new GeneratorError(
        'INVALID_MANIFEST',
        `features/${entry.name} declares category "${manifest.category}", which has no wizard question.`,
        'Set "category" to one of config/categories.json\'s ids — that\'s where implement reads the selected provider from.',
      );
    }

    const providers = new Map<string, FeatureProviderContent>();
    for (const providerId of manifest.providers) {
      if (!byId.has(providerId)) {
        throw new GeneratorError(
          'INVALID_MANIFEST',
          `features/${entry.name} declares provider "${providerId}", which is not a real technology id.`,
          'Run --list-modules to see every available id, or drop the entry from "providers".',
        );
      }
      const providerRoot = path.join(featureRoot, 'providers', providerId);
      if (!fs.existsSync(providerRoot)) {
        throw new GeneratorError(
          'INVALID_MANIFEST',
          `features/${entry.name} declares provider "${providerId}" but has no providers/${providerId}/ directory.`,
        );
      }
      providers.set(providerId, {
        plan: readIfPresent(providerRoot, 'plan.md'),
        checklist: readIfPresent(providerRoot, 'checklist.md'),
        prompts: readTree(providerRoot, 'prompts'),
        scaffold: readTree(providerRoot, 'scaffold'),
      });
    }

    features.push({ manifest, root: featureRoot, providers });
  }

  return features;
}
