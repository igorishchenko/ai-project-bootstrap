import fs from 'node:fs';
import path from 'node:path';
import { CONFIG_FILENAME } from '../builders/configBuilder.js';
import { outputPath } from '../builders/reserved.js';
import { slugify } from '../core/pipeline/buildContext.js';
import {
  loadFeatures,
  type FeatureProviderContent,
  type LoadedFeature,
} from '../core/registry/loadFeatures.js';
import { loadRegistry } from '../core/registry/loadModules.js';
import { readGeneratorPackageInfo } from '../core/registry/packageInfo.js';
import { GeneratorError } from '../core/resolve/errors.js';
import { render } from '../core/template/render.js';
import { fingerprint } from '../core/vfs/fingerprint.js';
import { type Fingerprints, preservedPaths } from '../core/vfs/preserve.js';
import { VirtualFs } from '../core/vfs/virtualFs.js';
import { loadSelectionFile } from './configFile.js';
import type { Reporter } from './reporter.js';

export interface ImplementFlags {
  featureId?: string;
  dir?: string;
  dryRun: boolean;
  listFeatures: boolean;
  help: boolean;
}

const BOOLEANS = new Set(['--dry-run', '--list-features', '-h', '--help']);
const VALUED = new Set(['--dir']);

/** Parses `implement`'s own small flag set — deliberately separate from the main parser. */
export function parseImplementFlags(argv: string[]): ImplementFlags {
  const flags: ImplementFlags = { dryRun: false, listFeatures: false, help: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] as string;

    if (BOOLEANS.has(arg)) {
      if (arg === '--dry-run') flags.dryRun = true;
      if (arg === '--list-features') flags.listFeatures = true;
      if (arg === '-h' || arg === '--help') flags.help = true;
      continue;
    }

    if (VALUED.has(arg)) {
      const value = argv[++i];
      if (value === undefined) {
        throw new GeneratorError(
          'INVALID_CONFIG',
          `${arg} needs a value.`,
          `Example: ${arg} ./my-app`,
        );
      }
      flags.dir = value;
      continue;
    }

    if (arg.startsWith('-')) {
      throw new GeneratorError(
        'INVALID_CONFIG',
        `Unknown flag ${arg}.`,
        'Run `ai-project-bootstrap implement --help` to see every flag.',
      );
    }

    // First bare argument is the feature id — matches `add`'s technology id.
    flags.featureId ??= arg;
  }

  return flags;
}

export const IMPLEMENT_HELP_TEXT = `
ai-project-bootstrap implement — scaffold a specific feature into an already-generated project.

Usage
  npx ai-project-bootstrap implement <feature-id> [options]
  npx ai-project-bootstrap implement --list-features

Reads the project's ai-project.config.json to see which technology answers
the feature's category (e.g. authentication reads "auth"), and writes a
stack-tailored implementation plan, AI prompts, a validation checklist, and a
handful of skeleton files — not a full implementation; you (or your AI
assistant, using the generated prompts) write the actual logic.

Options
      --dir <path>       Project to write into (default: the current directory)
      --dry-run          Print what would change without touching disk
      --list-features    List every available feature and exit
  -h, --help              Show this help

Output
  implementation/<feature>/plan.md          the step-by-step plan
  implementation/<feature>/checklist.md     what to verify before shipping
  implementation/<feature>/prompts/*.md     ready to hand to your AI assistant
  (scaffold files land in the project's normal source layout — src/features/, etc.)

Re-running is safe: a file you have hand-edited since it was written is left
alone, the same fingerprint-based protection \`add\` and \`upgrade\` use.
`.trim();

const MANIFEST_FILENAME = '.manifest.json';

function manifestFile(targetDir: string, featureId: string): string {
  return path.join(targetDir, 'implementation', featureId, MANIFEST_FILENAME);
}

function readFeatureFingerprints(targetDir: string, featureId: string): Fingerprints | undefined {
  const file = manifestFile(targetDir, featureId);
  if (!fs.existsSync(file)) return undefined;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as { generated?: Fingerprints };
    return parsed.generated;
  } catch {
    return undefined;
  }
}

function writeFeatureFingerprints(
  targetDir: string,
  featureId: string,
  generated: Fingerprints,
): void {
  const file = manifestFile(targetDir, featureId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify({ generated }, null, 2)}\n`, 'utf8');
}

function ensureTrailingNewline(content: string): string {
  return content.endsWith('\n') ? content : `${content}\n`;
}

function listFeaturesText(features: LoadedFeature[]): string {
  if (features.length === 0) return 'No features are installed.';
  const width = Math.max(...features.map((feature) => feature.manifest.id.length));
  return features
    .map((feature) => `${feature.manifest.id.padEnd(width)}  ${feature.manifest.description}`)
    .join('\n');
}

/**
 * Works out which provider a project's own selection implies for `feature`,
 * and the content for it — or throws a clear, actionable error. Pure (no
 * disk access), so the two failure modes (nothing selected for the category;
 * something selected that this feature has no content for yet) are directly
 * testable without a real generated project on disk.
 */
export function resolveFeatureContent(
  feature: LoadedFeature,
  choices: Record<string, string | string[]>,
): { providerId: string; content: FeatureProviderContent } {
  const answer = choices[feature.manifest.category];
  const providerId = Array.isArray(answer) ? answer[0] : answer;

  if (!providerId || providerId === 'none') {
    throw new GeneratorError(
      'INVALID_CONFIG',
      `This project has no "${feature.manifest.category}" technology selected — "${feature.manifest.id}" needs one.`,
      `Run "add <id> --replace" first. Supported for this feature: ${feature.manifest.providers.join(', ')}.`,
    );
  }

  const content = feature.providers.get(providerId);
  if (!content) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      `No "${feature.manifest.id}" content yet for "${providerId}".`,
      `Supported providers for this feature: ${feature.manifest.providers.join(', ')}.`,
    );
  }

  return { providerId, content };
}

export async function runImplement(
  argv: string[],
  rootDir: string,
  reporter: Reporter,
): Promise<number> {
  const flags = parseImplementFlags(argv);

  if (flags.help) {
    reporter.plain(IMPLEMENT_HELP_TEXT);
    return 0;
  }

  const registry = loadRegistry(rootDir);
  const features = loadFeatures(rootDir, registry.byId, registry.categories);

  if (flags.listFeatures) {
    reporter.plain(listFeaturesText(features));
    return 0;
  }

  if (!flags.featureId) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      'implement needs a feature id.',
      features.length > 0
        ? `Example: ai-project-bootstrap implement ${features[0]?.manifest.id} — run --list-features to see every available one.`
        : 'No features are installed.',
    );
  }

  const feature = features.find((entry) => entry.manifest.id === flags.featureId);
  if (!feature) {
    throw new GeneratorError(
      'UNKNOWN_MODULE',
      `Unknown feature "${flags.featureId}".`,
      features.length > 0
        ? `Available features: ${features.map((entry) => entry.manifest.id).join(', ')}.`
        : 'No features are installed.',
    );
  }

  const targetDir = path.resolve(flags.dir ?? process.cwd());
  const configFile = path.join(targetDir, CONFIG_FILENAME);
  if (!fs.existsSync(configFile)) {
    throw new GeneratorError(
      'INVALID_CONFIG',
      `No ${CONFIG_FILENAME} found in ${targetDir}.`,
      'This must be a project ai-project-bootstrap already generated. Pass --dir to point at one.',
    );
  }
  const selection = loadSelectionFile(configFile);
  const { providerId, content } = resolveFeatureContent(feature, selection.choices);

  const providerModule = registry.byId.get(providerId);
  const providerName = providerModule?.manifest.name ?? providerId;

  reporter.intro(readGeneratorPackageInfo(rootDir).version);
  reporter.plain(
    `Implementing ${feature.manifest.name} (${providerName}) in ${selection.projectName}…\n`,
  );

  const data = { projectName: selection.projectName, projectSlug: slugify(selection.projectName) };
  const base = `implementation/${feature.manifest.id}`;

  const vfs = new VirtualFs();
  vfs.setOwner('implement');

  const planPath = content.plan ? `${base}/plan.md` : undefined;
  if (content.plan && planPath)
    vfs.write(planPath, ensureTrailingNewline(render(content.plan, data)));

  const checklistPath = content.checklist ? `${base}/checklist.md` : undefined;
  if (content.checklist && checklistPath) {
    vfs.write(checklistPath, ensureTrailingNewline(render(content.checklist, data)));
  }

  const promptPaths: string[] = [];
  for (const asset of content.prompts) {
    const target = `${base}/prompts/${asset.relativePath}`;
    vfs.write(target, ensureTrailingNewline(render(asset.content, data)));
    promptPaths.push(target);
  }

  const scaffoldPaths: string[] = [];
  for (const asset of content.scaffold) {
    const target = outputPath(asset.relativePath);
    vfs.write(target, ensureTrailingNewline(render(asset.content, data)));
    scaffoldPaths.push(target);
  }

  const allFiles = vfs.snapshot().files;
  const recorded = readFeatureFingerprints(targetDir, feature.manifest.id);
  const preserve = new Set(preservedPaths(targetDir, allFiles, recorded));

  const flushed = vfs.flush(targetDir, { dryRun: flags.dryRun, force: true, preserve });

  if (!flags.dryRun) {
    const generated: Fingerprints = {};
    for (const file of allFiles) {
      const fresh = vfs.read(file);
      if (fresh !== undefined) generated[file] = fingerprint(fresh);
    }
    writeFeatureFingerprints(targetDir, feature.manifest.id, generated);
  }

  reporter.implementSummary({
    targetDir,
    featureName: feature.manifest.name,
    providerName,
    planPath,
    checklistPath,
    promptPaths,
    scaffoldPaths,
    preserved: flushed.preserved,
    dryRun: flags.dryRun,
  });

  return 0;
}
